"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, MathUtils, Vector3 } from "three";
import { latLngToVector3 } from "../../earth/utils/geo";
import { peekElevation } from "../../earth/streaming";
import { EARTH_RADIUS_M } from "../../earth/utils/zoomLevels";
import { getAircraftSpec } from "./fleet";
import { AircraftExteriorMesh } from "./AircraftExteriorMesh";
import { CockpitInterior } from "../../cockpit/interior/CockpitInterior";
import { isCockpitCameraMode } from "../../cockpit/camera/seats";
import { stepFlightDynamics } from "../Physics/FlightDynamics";
import { sampleFlightWind } from "../Weather/WeatherBridge";
import { AudioBus } from "../Audio/AudioBus";
import { useGameStore } from "../store/gameStore";
import { useFlightInput } from "../Controls/useFlightInput";
import {
  etaSeconds,
  haversineNm,
  initialBearingDeg,
} from "../Navigation/greatCircle";
import { getAirport } from "../Services/AirportService";
import { syncFlightToEarth } from "../World/FlightWorldBridge";
import { saveProgress } from "../Save/SaveService";
import { stepAircraftSystems } from "../Systems/AircraftSystemsBus";
import {
  getSystemsContext,
  patchFlightSessionMeta,
  getFlightSessionMeta,
} from "../Systems/session";
import { worldTraffic } from "../World/WorldTrafficEngine";
import { evaluateProgressAchievements } from "../Achievements/achievements";
import { useAutopilotStore } from "../../cockpit/stores/autopilotStore";
import { useCockpitStore } from "../../cockpit/stores/cockpitStore";

const _pos = new Vector3();
const _up = new Vector3();
const _fwd = new Vector3();
const _east = new Vector3();
const _north = new Vector3();

export function AircraftEntity() {
  const group = useRef<Group>(null);
  const input = useFlightInput();
  const aircraftId = useGameStore((s) => s.selectedAircraftId);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const inCockpit = isCockpitCameraMode(cameraMode);
  const spec = getAircraftSpec(aircraftId);
  const syncAcc = useRef(0);
  const hoursAcc = useRef(0);
  const prevOnGround = useRef(true);

  useFrame((_, dt) => {
    const store = useGameStore.getState();
    if (store.mode !== "flight" || !store.flightState || !store.systemsState)
      return;

    const meta = input.consumeMeta();
    if (meta.camera) store.cycleCamera();
    if (meta.pause) store.setPaused(!store.paused);

    if (store.paused) return;

    const ctrl = input.sample();
    if (ctrl.throttle > 0.2 && store.flightState.onGround) {
      ctrl.brakes = false;
    }

    // Autopilot command blend
    const apCmd = useAutopilotStore.getState().step(
      {
        hdgDeg: store.flightState.yawDeg,
        altM: store.flightState.altM,
        vsMs: store.flightState.verticalSpeedMs,
        tasMs: store.flightState.airspeedMs,
      },
      dt,
    );
    ctrl.pitch = Math.max(-1, Math.min(1, ctrl.pitch + apCmd.pitch));
    ctrl.roll = Math.max(-1, Math.min(1, ctrl.roll + apCmd.roll));
    ctrl.yaw = Math.max(-1, Math.min(1, ctrl.yaw + apCmd.yaw));
    ctrl.throttle = Math.max(
      -1,
      Math.min(1, ctrl.throttle + apCmd.throttle),
    );

    // Cockpit throttle lever absolute setpoint
    const thrSet = useCockpitStore.getState().throttleSetpoint;
    let flightThrottle = store.flightState.throttle;
    if (thrSet != null) {
      flightThrottle = thrSet;
      ctrl.throttle = 0;
    }

    const park = useCockpitStore.getState().parkingBrake;
    if (park) ctrl.brakes = true;
    if (useCockpitStore.getState().consumeGearToggle()) {
      ctrl.toggleGear = true;
    }

    const ctx = getSystemsContext();
    if (!ctx) return;

    const systemsStep = stepAircraftSystems(
      store.systemsState,
      ctx,
      { ...store.flightState, throttle: flightThrottle },
      ctrl,
      dt,
    );
    store.setSystemsState(systemsStep.state);

    const ground =
      peekElevation(store.flightState.lat, store.flightState.lng) ??
      store.flightState.altM - (store.flightState.onGround ? 1.5 : 200);

    // Dynamics consumes systems snapshot; toggles already applied in systems
    const dynInput = {
      ...ctrl,
      toggleFlaps: false,
      toggleGear: false,
      throttle: 0, // lever already integrated in systems via flight.throttle
    };

    const next = stepFlightDynamics(
      {
        ...store.flightState,
        throttle: systemsStep.state.engines[0]?.throttleLever ?? store.flightState.throttle,
        flaps: systemsStep.snapshot.flaps,
        gearDown: systemsStep.snapshot.gearDown,
        fuelKg: systemsStep.snapshot.fuelKg,
      },
      spec,
      dynInput,
      {
        groundElevM: ground,
        wind: sampleFlightWind(store.flightState.lat, store.flightState.lng),
        systems: systemsStep.snapshot,
      },
      dt,
    );
    store.setFlightState(next);

    AudioBus.setMuted(store.muteAudio);
    AudioBus.syncEngine(
      systemsStep.snapshot.enginesRunning ? next.throttle : 0,
      next.airspeedMs,
    );

    // Session analytics
    const session = getFlightSessionMeta();
    if (session) {
      patchFlightSessionMeta({
        maxAltM: Math.max(session.maxAltM, next.altM),
        distanceM: session.distanceM + next.groundSpeedMs * dt,
        wasAirborne: session.wasAirborne || !next.onGround,
      });
      if (prevOnGround.current && !next.onGround) {
        // liftoff
      }
      if (!prevOnGround.current && next.onGround) {
        const fpm = next.verticalSpeedMs * 196.85;
        patchFlightSessionMeta({ landingFpm: fpm });
      }
      prevOnGround.current = next.onGround;
    }

    worldTraffic.setFocus(next.lat, next.lng);
    worldTraffic.step(dt);

    if (store.route.destIcao) {
      const dest = getAirport(store.route.destIcao);
      if (dest) {
        const dist = haversineNm(next.lat, next.lng, dest.lat, dest.lng);
        const brg = initialBearingDeg(next.lat, next.lng, dest.lat, dest.lng);
        store.setRoute({
          ...store.route,
          distanceNm: dist,
          bearingDeg: brg,
          etaSec: etaSeconds(dist, next.groundSpeedMs),
        });
      }
    }

    const r = 1 + next.altM / EARTH_RADIUS_M;
    latLngToVector3(next.lat, next.lng, r, _pos);
    _up.copy(_pos).normalize();
    _east.crossVectors(new Vector3(0, 1, 0), _up).normalize();
    if (_east.lengthSq() < 1e-6) _east.set(1, 0, 0);
    _north.crossVectors(_up, _east).normalize();
    const hdg = next.yawDeg * MathUtils.DEG2RAD;
    _fwd
      .copy(_north)
      .multiplyScalar(Math.cos(hdg))
      .addScaledVector(_east, Math.sin(hdg))
      .normalize();
    const pitch = next.pitchDeg * MathUtils.DEG2RAD;
    _fwd.addScaledVector(_up, Math.sin(pitch)).normalize();
    const right = new Vector3().crossVectors(_fwd, _up).normalize();
    const bank = next.rollDeg * MathUtils.DEG2RAD;
    const upBanked = _up.clone().addScaledVector(right, Math.sin(bank)).normalize();

    if (group.current) {
      group.current.position.copy(_pos);
      group.current.up.copy(upBanked);
      group.current.lookAt(_pos.clone().add(_fwd));
    }

    syncAcc.current += dt;
    if (syncAcc.current > 0.08) {
      syncAcc.current = 0;
      syncFlightToEarth(next);
    }

    hoursAcc.current += dt;
    if (hoursAcc.current > 30) {
      const hrs = hoursAcc.current / 3600;
      hoursAcc.current = 0;
      let nextProgress = {
        ...store.progress,
        flightHours: store.progress.flightHours + hrs,
      };
      nextProgress = evaluateProgressAchievements(nextProgress);
      store.setProgress(nextProgress);
      saveProgress(nextProgress);
    }
  });

  return (
    <group ref={group}>
      <AircraftExteriorMesh spec={spec} hideCabin={inCockpit} />
      {inCockpit && (
        <group scale={1 / EARTH_RADIUS_M}>
          <CockpitInterior
            aircraftId={aircraftId}
            visualScale={spec.visualScale}
          />
        </group>
      )}
    </group>
  );
}
