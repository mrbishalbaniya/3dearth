"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { latLngToVector3 } from "../../earth/utils/geo";
import { EARTH_RADIUS_M } from "../../earth/utils/zoomLevels";
import { peekElevation } from "../../earth/streaming";
import { useGameStore } from "../store/gameStore";
import { getAirport } from "../Services/AirportService";
import { useCockpitStore } from "../../cockpit/stores/cockpitStore";
import {
  SEAT_OFFSETS,
  isCockpitCameraMode,
  seatFromCameraMode,
} from "../../cockpit/camera/seats";
import { getAircraftSpec } from "../Aircraft/fleet";

const _pos = new Vector3();
const _up = new Vector3();
const _fwd = new Vector3();
const _right = new Vector3();
const _cam = new Vector3();
const _look = new Vector3();
const _yAxis = new Vector3(0, 1, 0);
const _lookSmoothed = new Vector3();
const _vel = new Vector3();

/**
 * Flight cameras — chase / multi-seat cockpit / wing / tower / drone / cinematic / free.
 * Seat offsets prevent clipping through deck geometry; look uses inertia.
 */
export function FlightCameraController({
  earthRotationY,
}: {
  earthRotationY: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const freeOffset = useRef(
    new Vector3(250 / EARTH_RADIUS_M, 80 / EARTH_RADIUS_M, 40 / EARTH_RADIUS_M),
  );
  const snap = useRef(true);
  const headYaw = useRef(0);
  const headPitch = useRef(0);
  const cineT = useRef(0);

  useEffect(() => {
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.mode === "flight" && prev.mode !== "flight") snap.current = true;
      if (s.cameraMode !== prev.cameraMode) snap.current = true;
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (useGameStore.getState().mode !== "flight") return;
      const mode = useGameStore.getState().cameraMode;
      if (!mode.startsWith("cockpit") && mode !== "instrument") return;
      if (e.buttons !== 2 && !e.shiftKey) return;
      headYaw.current = MathUtils.clamp(
        headYaw.current - e.movementX * 0.0025,
        -0.9,
        0.9,
      );
      headPitch.current = MathUtils.clamp(
        headPitch.current - e.movementY * 0.0025,
        -0.55,
        0.55,
      );
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((_, dt) => {
    const st = useGameStore.getState().flightState;
    if (!st || useGameStore.getState().mode !== "flight") return;

    const r = 1 + st.altM / EARTH_RADIUS_M;
    latLngToVector3(st.lat, st.lng, r, _pos);
    _up.copy(_pos).normalize();

    const hdg = st.yawDeg * MathUtils.DEG2RAD;
    const east = new Vector3().crossVectors(_yAxis, _up).normalize();
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
    const north = new Vector3().crossVectors(_up, east).normalize();
    _fwd
      .copy(north)
      .multiplyScalar(Math.cos(hdg))
      .addScaledVector(east, Math.sin(hdg));
    _fwd.normalize();
    const pitch = st.pitchDeg * MathUtils.DEG2RAD;
    _fwd.addScaledVector(_up, Math.sin(pitch)).normalize();
    _right.crossVectors(_fwd, _up).normalize();
    const bank = st.rollDeg * MathUtils.DEG2RAD;
    const camUp = _up
      .clone()
      .addScaledVector(_right, Math.sin(bank))
      .normalize();

    const mode = useGameStore.getState().cameraMode;
    const m = (meters: number) => meters / EARTH_RADIUS_M;
    const ground =
      peekElevation(st.lat, st.lng) ?? Math.max(0, st.altM - 50);
    const aglM = Math.max(2, st.altM - ground);

    const seatKey =
      seatFromCameraMode(mode) ??
      useCockpitStore.getState().seat ??
      "captain";
    const seat = seatKey as keyof typeof SEAT_OFFSETS;

    const internal = isCockpitCameraMode(mode);

    if (internal) {
      const off = SEAT_OFFSETS[seat];
      const vs =
        getAircraftSpec(useGameStore.getState().selectedAircraftId)
          .visualScale || 1;
      // Engine / landing vibration + accel lean
      const thr = st.throttle;
      const vib =
        (st.onGround && st.brakes ? 0.012 : 0) +
        thr * 0.004 +
        (st.stalled ? 0.02 : 0);
      const shakeX = Math.sin(performance.now() * 0.041) * vib;
      const shakeY = Math.cos(performance.now() * 0.053) * vib * 0.7;
      const lean =
        Math.max(-1, Math.min(1, (st.loadFactor ?? 1) - 1)) * 0.03;

      _cam
        .copy(_pos)
        .addScaledVector(_fwd, m(off.fwd * vs))
        .addScaledVector(_right, m((off.right + shakeX) * vs))
        .addScaledVector(_up, m((off.up + shakeY + lean) * vs));
      const lookDir = _fwd
        .clone()
        .addScaledVector(_right, Math.sin(headYaw.current))
        .addScaledVector(camUp, Math.sin(headPitch.current))
        .normalize();
      _look.copy(_cam).addScaledVector(lookDir, m(off.lookFwd * vs));
      const minCam = _pos.clone().addScaledVector(_up, m(0.9 * vs));
      if (_cam.dot(_up) < minCam.dot(_up)) {
        _cam.copy(minCam).addScaledVector(_fwd, m(off.fwd * vs * 0.4));
      }
      // Wider FOV in cockpit so windshield dominates (~75% world)
      const persp = camera as PerspectiveCamera;
      if ("fov" in persp && Math.abs(persp.fov - 72) > 0.5) {
        persp.fov = 72;
        persp.updateProjectionMatrix();
      }
    } else if (mode === "chase") {
      const persp = camera as PerspectiveCamera;
      if ("fov" in persp && Math.abs(persp.fov - 55) > 0.5) {
        persp.fov = 55;
        persp.updateProjectionMatrix();
      }
      // Map-first chase profile: keep enough distance/height to preserve 3D map readability.
      const back = m(550 + Math.min(aglM * 0.35, 4200));
      const up = m(220 + Math.min(aglM * 0.16, 2200));
      _cam.copy(_pos).addScaledVector(_fwd, -back).addScaledVector(_up, up);
      _look.copy(_pos).addScaledVector(_fwd, m(380));
    } else if (mode === "wing") {
      _cam
        .copy(_pos)
        .addScaledVector(_right, m(14))
        .addScaledVector(_up, m(3))
        .addScaledVector(_fwd, m(-4));
      _look.copy(_pos);
    } else if (mode === "tower") {
      const ap = getAirport(useGameStore.getState().spawnAirportIcao);
      if (ap) {
        latLngToVector3(
          ap.lat,
          ap.lng,
          1 + (ap.elevM + 80) / EARTH_RADIUS_M,
          _cam,
        );
      } else {
        _cam.copy(_pos).addScaledVector(_up, m(120));
      }
      _look.copy(_pos);
    } else if (mode === "drone") {
      const ang = performance.now() * 0.00015;
      _cam
        .copy(_pos)
        .addScaledVector(_fwd, m(Math.cos(ang) * 40))
        .addScaledVector(_right, m(Math.sin(ang) * 55))
        .addScaledVector(_up, m(25));
      _look.copy(_pos);
    } else if (mode === "cinematic") {
      cineT.current += dt;
      const a = cineT.current * 0.12;
      _cam
        .copy(_pos)
        .addScaledVector(_fwd, m(-80 + Math.sin(a) * 30))
        .addScaledVector(_right, m(Math.cos(a * 0.7) * 40))
        .addScaledVector(_up, m(20 + Math.sin(a * 0.5) * 10));
      _look.copy(_pos).addScaledVector(_fwd, m(40));
    } else {
      freeOffset.current.setLength(m(250));
      freeOffset.current.applyAxisAngle(_up, dt * 0.05);
      _cam.copy(_pos).add(freeOffset.current);
      _look.copy(_pos);
    }

    const ry = earthRotationY.current;
    if (Math.abs(ry) > 1e-8) {
      _cam.applyAxisAngle(_yAxis, ry);
      _look.applyAxisAngle(_yAxis, ry);
      _up.applyAxisAngle(_yAxis, ry);
      camUp.applyAxisAngle(_yAxis, ry);
    }

    const lerpRate = internal ? 14 : 8;
    if (snap.current || camera.position.distanceTo(_cam) > m(500)) {
      camera.position.copy(_cam);
      _lookSmoothed.copy(_look);
      snap.current = false;
    } else {
      camera.position.lerp(_cam, 1 - Math.exp(-dt * lerpRate));
      _lookSmoothed.lerp(_look, 1 - Math.exp(-dt * 10));
      // Camera inertia
      _vel.subVectors(_cam, camera.position);
    }
    camera.up.copy(internal ? camUp : _up);
    camera.lookAt(snap.current ? _look : _lookSmoothed);

    const near = Math.max(
      m(internal ? 0.15 : 0.5),
      m(Math.min(aglM * 0.12, internal ? 8 : 25)),
    );
    const far = 20;
    if (
      Math.abs(camera.near - near) / Math.max(near, 1e-12) > 0.2 ||
      Math.abs(camera.far - far) > 0.5
    ) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
