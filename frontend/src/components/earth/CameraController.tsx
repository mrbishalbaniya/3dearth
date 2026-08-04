"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, MOUSE, Spherical, TOUCH, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEarthStore } from "./store/earthStore";
import {
  CAMERA_DAMPING,
  CAMERA_DEFAULT_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_POLAR,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_POLAR,
  CAMERA_PAN_SPEED,
  CAMERA_ROTATE_SPEED,
  CAMERA_ZOOM_INERTIA,
  CAMERA_ZOOM_SPEED,
  FLY_TO_DEFAULT_DURATION,
} from "./utils/constants";
import {
  altitudeAglM,
  minCameraRadius,
  minOrbitDistance,
  MIN_CAMERA_AGL_M,
} from "./utils/cameraClearance";
import { easeInOutCubic, latLngToVector3, vector3ToLatLng } from "./utils/geo";
import {
  altitudeMToOrbitDistance,
  altitudeToTileZoom,
  altitudeToZoomLevel,
  EARTH_RADIUS_M,
  SURFACE_MODE_ALTITUDE_M,
  zoomSensitivity,
} from "./utils/zoomLevels";
import { peekElevation, warmElevation } from "./streaming/ElevationService";
import { useGameStore } from "../game/store/gameStore";
import { solarBodyWorldPos } from "./solarSystem/view";
import { PLANET_DEFS } from "./solarSystem/catalog";
import { useEarthAppMode } from "./appMode";
import { NEPAL_BOUNDS } from "../game/NepalGame";

/**
 * Multi-stage Google Earth–style camera:
 * — exponential zoom with inertia
 * — surface focus (target on globe, not always origin)
 * — pan when close, tilt via polar angle
 * — spring fly-to / reset
 * — hard clamp so the eye never enters land / water / terrain
 */
export function CameraController({
  earthRotationY,
}: {
  earthRotationY: React.MutableRefObject<number>;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();
  const flightMode = useGameStore((s) => s.mode === "flight");

  const flyToTarget = useEarthStore((s) => s.flyToTarget);
  const flyToNonce = useEarthStore((s) => s.flyToNonce);
  const clearFlyTo = useEarthStore((s) => s.clearFlyTo);
  const resetCameraRequest = useEarthStore((s) => s.resetCameraRequest);
  const zoomRequest = useEarthStore((s) => s.zoomRequest);
  const zoomRequestDelta = useEarthStore((s) => s.zoomRequestDelta);
  const setCameraDistance = useEarthStore((s) => s.setCameraDistance);
  const setPointerCoords = useEarthStore((s) => s.setPointerCoords);
  const setIdleRotation = useEarthStore((s) => s.setIdleRotation);
  const setTelemetry = useEarthStore((s) => s.setTelemetry);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const northLock = useEarthStore((s) => s.northLock);
  const terrainExaggeration = useEarthStore((s) => s.terrainExaggeration);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  const solarFocusNonce = useEarthStore((s) => s.solarFocusNonce);
  const minClearanceRef = useRef(CAMERA_MIN_DISTANCE);
  const minRadiusRef = useRef(1 + MIN_CAMERA_AGL_M / EARTH_RADIUS_M);

  const flying = useRef(false);
  const flyProgress = useRef(1);
  const flyDuration = useRef(FLY_TO_DEFAULT_DURATION);
  const flyStaged = useRef(false);
  const solarTourCam = useRef(false);
  const pendingSolarBody = useRef<string | null>(null);
  const lastSolarFocusReq = useRef(0);
  const startPos = useRef(new Vector3());
  const midPos = useRef(new Vector3());
  const endPos = useRef(new Vector3());
  const startTarget = useRef(new Vector3());
  const midTarget = useRef(new Vector3());
  const endTarget = useRef(new Vector3());
  const flyTmpA = useRef(new Vector3());
  const flyTmpB = useRef(new Vector3());
  const lastZoomReq = useRef(0);
  const lastResetReq = useRef(0);
  const spherical = useRef(new Spherical());
  const offset = useRef(new Vector3());
  const tmpLocal = useRef(new Vector3());
  const tmpWorld = useRef(new Vector3());
  const tmpRight = useRef(new Vector3());
  const tmpForward = useRef(new Vector3());
  const tmpUp = useRef(new Vector3());
  const zoomVelocity = useRef(0);
  const focusLatLng = useRef({ lat: 20, lng: 0 });
  const telemetryThrottle = useRef(0);
  const appMode = useEarthAppMode();
  const initializedNepal = useRef(false);

  /** Clamp lat/lng to Nepal bounds in game mode */
  const clampToNepalBounds = (lat: number, lng: number) => {
    if (appMode !== "game") return { lat, lng };
    return {
      lat: MathUtils.clamp(lat, NEPAL_BOUNDS.south, NEPAL_BOUNDS.north),
      lng: MathUtils.clamp(lng, NEPAL_BOUNDS.west, NEPAL_BOUNDS.east),
    };
  };

  /** Spherical lerp of positions — keeps the path outside the globe. */
  const slerpVectors = (
    a: Vector3,
    b: Vector3,
    t: number,
    out: Vector3,
  ) => {
    const aN = flyTmpA.current.copy(a).normalize();
    const bN = flyTmpB.current.copy(b).normalize();
    let dot = MathUtils.clamp(aN.dot(bN), -1, 1);
    const theta = Math.acos(dot);
    const ra = a.length();
    const rb = b.length();
    const r = ra + (rb - ra) * t;
    if (theta < 1e-4) {
      return out.copy(a).lerp(b, t);
    }
    const sinT = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinT;
    const wb = Math.sin(t * theta) / sinT;
    out
      .set(0, 0, 0)
      .addScaledVector(aN, wa)
      .addScaledVector(bN, wb)
      .normalize()
      .multiplyScalar(r);
    return out;
  };

  const toWorld = (local: Vector3, target: Vector3) => {
    const cos = Math.cos(earthRotationY.current);
    const sin = Math.sin(earthRotationY.current);
    target.set(
      local.x * cos + local.z * sin,
      local.y,
      -local.x * sin + local.z * cos,
    );
    return target;
  };

  const toLocal = (world: Vector3, target: Vector3) => {
    const cos = Math.cos(-earthRotationY.current);
    const sin = Math.sin(-earthRotationY.current);
    target.set(
      world.x * cos - world.z * sin,
      world.y,
      world.x * sin + world.z * cos,
    );
    return target;
  };

  const surfaceFocusWorld = (lat: number, lng: number, out: Vector3) => {
    latLngToVector3(lat, lng, 1, tmpLocal.current);
    return toWorld(tmpLocal.current, out);
  };

  /** Keep camera outside opaque land / water / terrain shells. */
  const enforceSurfaceClearance = () => {
    const minR = minRadiusRef.current;
    const len = camera.position.length();
    if (len > 1e-8 && len < minR) {
      camera.position.multiplyScalar(minR / len);
      if (zoomVelocity.current < 0) zoomVelocity.current = 0;
      return true;
    }
    return false;
  };

  // Adaptive clip planes — fixed near=1e-5 destroys depth precision (sawtooth bands)
  useEffect(() => {
    camera.near = 0.01;
    camera.far = 400;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Initialize camera to Nepal in game mode
  useEffect(() => {
    if (appMode !== "game" || initializedNepal.current || !controlsRef.current) return;
    
    // Wait a bit for the scene to be ready
    const timer = setTimeout(() => {
      if (!controlsRef.current) return;
      
      initializedNepal.current = true;
      const NEPAL_LAT = 28.3949;
      const NEPAL_LNG = 84.1240;
      const NEPAL_ALTITUDE_M = 100000; // 100km starting altitude
      
      // Calculate Nepal position in world space
      const nepalFocus = surfaceFocusWorld(NEPAL_LAT, NEPAL_LNG, tmpWorld.current);
      const nepalOrbit = altitudeMToOrbitDistance(NEPAL_ALTITUDE_M);
      
      // Position camera ABOVE Nepal looking DOWN (not at the side)
      // The camera should be along the normal vector from Earth's center through Nepal
      const camPos = nepalFocus.clone().normalize().multiplyScalar(1 + nepalOrbit);
      
      // Set camera position and look at Nepal surface
      camera.position.copy(camPos);
      controlsRef.current.target.copy(nepalFocus);
      focusLatLng.current = { lat: NEPAL_LAT, lng: NEPAL_LNG };
      
      // Make camera look directly at the focus point
      camera.lookAt(nepalFocus);
      camera.updateProjectionMatrix();
      controlsRef.current.update();
      
      console.log("Nepal camera initialized:", {
        camPos: camPos.toArray(),
        target: nepalFocus.toArray(),
        altitude: NEPAL_ALTITUDE_M
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [appMode, camera]);

  const beginSolarFly = (body: string) => {
    if (!controlsRef.current) return false;

    startPos.current.copy(camera.position);
    startTarget.current.copy(controlsRef.current.target);

    if (body === "overview" || body === "earth") {
      solarTourCam.current = false;
      endTarget.current.set(0, 0, 0);
      if (body === "earth") {
        endPos.current.set(0, 0.4, 2.35);
      } else {
        endPos.current.set(0, 0.55, CAMERA_DEFAULT_DISTANCE);
      }
    } else {
      const p = solarBodyWorldPos[body];
      if (!p) return false;
      const px = p.x;
      const py = p.y;
      const pz = p.z;
      const dist = Math.hypot(px, py, pz);
      if (dist < 0.15) return false;

      solarTourCam.current = true;
      endTarget.current.set(px, py, pz);
      const dirX = px / dist;
      const dirY = py / dist;
      const dirZ = pz / dist;

      const def = PLANET_DEFS.find((d) => d.id === body);
      const bodyR =
        body === "sun" ? 0.55 : Math.max(0.08, def?.radius ?? 0.12);
      const approach =
        body === "sun"
          ? Math.max(2.4, bodyR * 4.5)
          : Math.max(1.05, Math.min(2.8, bodyR * 5.5 + dist * 0.08));

      endPos.current.set(
        px - dirX * approach,
        py - dirY * approach,
        pz - dirZ * approach,
      );

      // Inner planets: avoid sitting inside Earth — swing to a side view
      if (endPos.current.length() < 1.85) {
        let sx = -dirZ;
        let sy = 0;
        let sz = dirX;
        let sl = Math.hypot(sx, sy, sz);
        if (sl < 0.2) {
          sx = 1;
          sy = 0;
          sz = 0;
          sl = 1;
        }
        sx /= sl;
        sz /= sl;
        endPos.current.set(
          px + sx * approach * 0.85 - dirX * approach * 0.35,
          py + 0.25 * approach - dirY * approach * 0.2,
          pz + sz * approach * 0.85 - dirZ * approach * 0.35,
        );
      }
    }

    flyStaged.current = false;
    flyDuration.current = reducedMotion ? 0.35 : 2.1;
    flyProgress.current = 0;
    flying.current = true;
    zoomVelocity.current = 0;
    setIdleRotation(false);
    clearFlyTo();
    return true;
  };

  // Planet tour fly-to (deep space)
  useEffect(() => {
    if (solarFocusNonce === lastSolarFocusReq.current) return;
    lastSolarFocusReq.current = solarFocusNonce;
    const body = useEarthStore.getState().selectedSolarBody;
    pendingSolarBody.current = body;
    if (!beginSolarFly(body)) {
      // Positions not ready yet — retry in useFrame
      pendingSolarBody.current = body;
    } else {
      pendingSolarBody.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solarFocusNonce, camera, reducedMotion, setIdleRotation, clearFlyTo]);

  // Fly-to — optional rotate-then-zoom so we never tunnel through the globe
  useEffect(() => {
    if (!flyToTarget || !controlsRef.current) return;
    solarTourCam.current = false;

    const altitudeM = Math.max(
      MIN_CAMERA_AGL_M,
      flyToTarget.altitudeM ??
        (flyToTarget.altitude != null && flyToTarget.altitude > 2
          ? (flyToTarget.altitude - 1) * EARTH_RADIUS_M
          : flyToTarget.altitude != null
            ? flyToTarget.altitude * EARTH_RADIUS_M
            : 250_000),
    );

    // Clamp to Nepal bounds in game mode
    const clampedTarget = clampToNepalBounds(flyToTarget.lat, flyToTarget.lng);
    focusLatLng.current = clampedTarget;
    const focus = surfaceFocusWorld(
      clampedTarget.lat,
      clampedTarget.lng,
      tmpWorld.current,
    );

    const controls = controlsRef.current;
    startPos.current.copy(camera.position);
    startTarget.current.copy(controls.target);

    let camDir = camera.position.clone().sub(controls.target);
    if (camDir.lengthSq() < 1e-8) {
      camDir = camera.position.clone().sub(focus);
    }
    if (camDir.lengthSq() < 1e-8) {
      camDir.copy(focus);
    }
    camDir.normalize();

    const startAlt = Math.max(
      MIN_CAMERA_AGL_M,
      altitudeAglM(
        camera.position.length(),
        peekElevation(focusLatLng.current.lat, focusLatLng.current.lng),
        useEarthStore.getState().terrainExaggeration,
      ),
    );
    // Stay at current altitude while rotating — never dive (or jump) during spin
    const rotateAltM = Math.max(startAlt, altitudeM);
    const midOrbit = altitudeMToOrbitDistance(rotateAltM);
    const endOrbit = altitudeMToOrbitDistance(altitudeM);

    midTarget.current.copy(focus);
    midPos.current.copy(focus).addScaledVector(camDir, midOrbit);
    endTarget.current.copy(focus);
    endPos.current.copy(focus).addScaledVector(camDir, endOrbit);

    const floorR = minCameraRadius(
      peekElevation(flyToTarget.lat, flyToTarget.lng),
      useEarthStore.getState().terrainExaggeration,
      {
        lowAltitude: altitudeM < 3_000,
        dryEarth: useEarthStore.getState().dryEarth.enabled,
        altitudeM,
      },
    );
    for (const p of [midPos.current, endPos.current]) {
      const len = p.length();
      if (len < floorR) p.multiplyScalar(floorR / Math.max(len, 1e-8));
    }

    const startFocusDir = startPos.current.clone().normalize();
    const endFocusDir = focus.clone().normalize();
    const ang = Math.acos(
      MathUtils.clamp(startFocusDir.dot(endFocusDir), -1, 1),
    );
    const wantStaged =
      flyToTarget.approach === "rotateThenZoom" ||
      (flyToTarget.approach !== "direct" && ang > 0.35);

    flyStaged.current = wantStaged;
    flyDuration.current = reducedMotion
      ? 0.35
      : (flyToTarget.duration ??
        (wantStaged ? Math.min(3.2, 1.4 + ang * 0.9) : FLY_TO_DEFAULT_DURATION));
    flyProgress.current = 0;
    flying.current = true;
    zoomVelocity.current = 0;
    setIdleRotation(false);
  }, [flyToNonce, flyToTarget, camera, reducedMotion, setIdleRotation, earthRotationY]);

  // Reset to deep space
  useEffect(() => {
    if (resetCameraRequest === lastResetReq.current) return;
    lastResetReq.current = resetCameraRequest;
    if (!controlsRef.current) return;

    solarTourCam.current = false;
    pendingSolarBody.current = null;
    startPos.current.copy(camera.position);
    startTarget.current.copy(controlsRef.current.target);
    endPos.current.set(0, 0.55, CAMERA_DEFAULT_DISTANCE);
    endTarget.current.set(0, 0, 0);
    focusLatLng.current = { lat: 20, lng: 0 };
    flyDuration.current = reducedMotion ? 0.3 : 1.6;
    flyProgress.current = 0;
    flying.current = true;
    flyStaged.current = false;
    zoomVelocity.current = 0;
    clearFlyTo();
  }, [resetCameraRequest, camera, clearFlyTo, reducedMotion]);

  // HUD zoom buttons → inertial zoom
  useEffect(() => {
    if (zoomRequest === lastZoomReq.current) return;
    lastZoomReq.current = zoomRequest;
    const altitudeM = useEarthStore.getState().altitudeM;
    const sens = zoomSensitivity(altitudeM);
    zoomVelocity.current += zoomRequestDelta > 0 ? -sens * 1.15 : sens * 1.15;
    setIdleRotation(false);
  }, [zoomRequest, zoomRequestDelta, setIdleRotation]);

  // Wheel with progressive inertia
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const altitudeM = useEarthStore.getState().altitudeM;
      const sens = zoomSensitivity(altitudeM) * CAMERA_ZOOM_SPEED;
      
      // Reduce zoom speed in game mode to prevent accidental crash-inducing zooms
      const gameModeFactor = appMode === "game" ? 0.3 : 1.0;
      
      // Normalize wheel deltas so trackpads / mice feel similar and less snappy
      let steps = event.deltaY;
      if (event.deltaMode === 1) steps *= 16; // lines → pixels-ish
      if (event.deltaMode === 2) steps *= 32; // pages
      const clamped = MathUtils.clamp(steps, -120, 120);
      const direction = Math.sign(clamped) || 1;
      const magnitude = Math.min(1, Math.abs(clamped) / 100);
      zoomVelocity.current += direction * sens * magnitude * gameModeFactor;
      setIdleRotation(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, setIdleRotation, appMode]);

  // Double-click / double-tap fly-in
  useEffect(() => {
    const el = gl.domElement;
    let lastTap = 0;

    const onDblClick = (event: MouseEvent) => {
      if (!controlsRef.current) return;
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const vec = new Vector3(x, y, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const a = dir.dot(dir);
      const b = 2 * camera.position.dot(dir);
      const c = camera.position.dot(camera.position) - 1;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return;

      const t = (-b - Math.sqrt(disc)) / (2 * a);
      const hit = camera.position.clone().addScaledVector(dir, t);
      const { lat, lng } = vector3ToLatLng(toLocal(hit, tmpLocal.current));
      const currentAlt = useEarthStore.getState().altitudeM;
      const nextAlt = Math.max(MIN_CAMERA_AGL_M, currentAlt * 0.28);

      useEarthStore.getState().requestFlyTo({
        lat,
        lng,
        altitudeM: nextAlt,
        duration: reducedMotion ? 0.4 : 1.35,
      });
    };

    const onTouchEnd = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap < 300 && event.changedTouches[0]) {
        const touch = event.changedTouches[0];
        onDblClick({
          clientX: touch.clientX,
          clientY: touch.clientY,
        } as MouseEvent);
      }
      lastTap = now;
    };

    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [gl, camera, earthRotationY, reducedMotion]);

  // Pointer coords
  useEffect(() => {
    const el = gl.domElement;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const vec = new Vector3(x, y, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const a = dir.dot(dir);
      const b = 2 * camera.position.dot(dir);
      const c = camera.position.dot(camera.position) - 1;
      const disc = b * b - 4 * a * c;

      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        const hit = camera.position.clone().addScaledVector(dir, t);
        const { lat, lng } = vector3ToLatLng(toLocal(hit, tmpLocal.current));
        setPointerCoords({
          lat,
          lng,
          screenX: event.clientX,
          screenY: event.clientY,
        });
      } else {
        setPointerCoords({
          lat: null,
          lng: null,
          screenX: event.clientX,
          screenY: event.clientY,
        });
      }
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [gl, camera, setPointerCoords, earthRotationY]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Flight mode owns the camera — disable orbit
    if (useGameStore.getState().mode === "flight") {
      controls.enabled = false;
      return;
    }
    controls.enabled = true;

    const dt = Math.min(delta, 0.05);

    // Retry planet-tour fly once ephemeris positions exist
    if (pendingSolarBody.current) {
      if (beginSolarFly(pendingSolarBody.current)) {
        pendingSolarBody.current = null;
      }
    }

    const solarCam = solarTourCam.current;

    // Camera nadir + focus elevation for opaque surface floor
    const camLocal = toLocal(camera.position, tmpLocal.current);
    const camLl = vector3ToLatLng(camLocal);
    const elevFocus = peekElevation(
      focusLatLng.current.lat,
      focusLatLng.current.lng,
    );
    const elevCam = peekElevation(camLl.lat, camLl.lng);
    // Unknown DEM at low altitude → assume highland so we don't dive under mountains
    const provisional =
      elevFocus == null && elevCam == null && useEarthStore.getState().altitudeM < 50_000
        ? 2_500
        : null;
    const elev =
      elevFocus == null && elevCam == null
        ? provisional
        : Math.max(
            elevFocus ?? Number.NEGATIVE_INFINITY,
            elevCam ?? Number.NEGATIVE_INFINITY,
          );
    if (elevFocus == null || elevCam == null) {
      const altHint = useEarthStore.getState().altitudeM;
      if (altHint < 400_000) {
        const z = Math.min(
          14,
          Math.max(8, Math.round(altitudeToTileZoom(altHint))),
        );
        warmElevation(focusLatLng.current.lat, focusLatLng.current.lng, z);
        warmElevation(camLl.lat, camLl.lng, z);
      }
    }
    const lowAlt = useEarthStore.getState().altitudeM < 3_000;
    const altNow = useEarthStore.getState().altitudeM;
    const floorR = minCameraRadius(elev, terrainExaggeration, {
      lowAltitude: lowAlt,
      dryEarth: dryEarthOn,
      altitudeM: altNow,
    });
    minRadiusRef.current = floorR;

    // Keep focus on the globe once close — mid-lerp targets used to inflate
    // minDistance and freeze Street zoom.
    if (!flying.current && !solarCam && camera.position.length() < 2.2) {
      const desired = camera.position.clone().normalize();
      if (controls.target.length() < 0.55) {
        controls.target.lerp(desired, 1 - Math.exp(-10 * dt));
      } else {
        controls.target.copy(desired);
      }
    }

    const targetLen = controls.target.length();
    
    // In game mode, enforce HIGHER minimum altitude to prevent OOM crashes
    let gameMinDistance = CAMERA_MIN_DISTANCE;
    if (appMode === "game") {
      const MIN_GAME_ALT_SCENE_UNITS = 60_000 / EARTH_RADIUS_M; // 60km minimum for stability
      gameMinDistance = Math.max(CAMERA_MIN_DISTANCE, 1 + MIN_GAME_ALT_SCENE_UNITS);
    }
    
    minClearanceRef.current = solarCam
      ? 0.35
      : Math.max(
          gameMinDistance,
          minOrbitDistance(targetLen, floorR),
        );
    controls.minDistance = minClearanceRef.current;
    controls.maxDistance = solarCam ? 18 : CAMERA_MAX_DISTANCE;

    // Apply inertial zoom toward/away from focus
    if (Math.abs(zoomVelocity.current) > 0.00001 && !flying.current) {
      const dist = camera.position.distanceTo(controls.target);
      const factor = Math.exp(zoomVelocity.current);
      const next = MathUtils.clamp(
        dist * factor,
        minClearanceRef.current,
        CAMERA_MAX_DISTANCE,
      );
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, next);
      if (enforceSurfaceClearance() && zoomVelocity.current < 0) {
        zoomVelocity.current = 0;
      }
      zoomVelocity.current *= CAMERA_ZOOM_INERTIA;
      if (Math.abs(zoomVelocity.current) < 0.00008) zoomVelocity.current = 0;
      controls.update();
    }

    // Virtual gamepad — left stick moves/pans, right stick looks 360°
    const gp = useEarthStore.getState().gamepad;
    const moving =
      Math.abs(gp.moveX) > 0.01 || Math.abs(gp.moveY) > 0.01;
    const looking =
      Math.abs(gp.lookX) > 0.01 || Math.abs(gp.lookY) > 0.01;
    const altHint = useEarthStore.getState().altitudeM;

    if (!flying.current && (moving || looking)) {
      setIdleRotation(false);
      offset.current.copy(camera.position).sub(controls.target);
      spherical.current.setFromVector3(offset.current);
      const orbitR = Math.max(
        spherical.current.radius,
        minClearanceRef.current,
      );

      if (looking) {
        const lookSpeed = 1.55 * (altHint < 50_000 ? 0.7 : 1);
        spherical.current.theta -= gp.lookX * lookSpeed * dt;
        spherical.current.phi = MathUtils.clamp(
          spherical.current.phi + gp.lookY * lookSpeed * 0.85 * dt,
          0.08,
          Math.PI - 0.08,
        );
      }

      if (moving) {
        const panScale =
          Math.max(orbitR, 0.002) * (altHint < 5_000 ? 0.55 : 1.1) * dt;
        tmpUp.current.set(0, 1, 0);
        tmpRight.current
          .crossVectors(tmpUp.current, offset.current)
          .normalize();
        if (tmpRight.current.lengthSq() < 1e-6) {
          tmpRight.current.set(1, 0, 0);
        }
        tmpForward.current
          .crossVectors(offset.current, tmpRight.current)
          .normalize();

        const dx = gp.moveX * panScale;
        const dy = -gp.moveY * panScale;

        if (controls.target.length() > 0.4) {
          controls.target
            .addScaledVector(tmpRight.current, dx)
            .addScaledVector(tmpForward.current, dy);
          const tLen = controls.target.length();
          if (tLen > 1e-6) controls.target.multiplyScalar(1 / tLen);
        } else {
          spherical.current.theta -= gp.moveX * 0.9 * dt;
          spherical.current.phi = MathUtils.clamp(
            spherical.current.phi + gp.moveY * 0.55 * dt,
            0.08,
            Math.PI - 0.08,
          );
        }
      }

      offset.current.setFromSpherical(spherical.current);
      camera.position.copy(controls.target).add(offset.current);
      enforceSurfaceClearance();
      controls.update();
    }

    // North lock — ease bearing toward 0° (looking north)
    if (northLock && !flying.current) {
      offset.current.copy(camera.position).sub(controls.target);
      spherical.current.setFromVector3(offset.current);
      const targetTheta = 0;
      let theta = spherical.current.theta;
      let diff = targetTheta - theta;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      spherical.current.theta = theta + diff * (1 - Math.exp(-3.5 * dt));
      offset.current.setFromSpherical(spherical.current);
      camera.position.copy(controls.target).add(offset.current);
      enforceSurfaceClearance();
      controls.update();
    }

    if (flying.current) {
      flyProgress.current = Math.min(
        1,
        flyProgress.current + dt / flyDuration.current,
      );
      const p = flyProgress.current;

      if (flyStaged.current) {
        const split = 0.55;
        if (p <= split) {
          const u = easeInOutCubic(p / split);
          slerpVectors(startPos.current, midPos.current, u, camera.position);
          controls.target.lerpVectors(
            startTarget.current,
            midTarget.current,
            u,
          );
        } else {
          const u = easeInOutCubic((p - split) / (1 - split));
          camera.position.lerpVectors(midPos.current, endPos.current, u);
          controls.target.lerpVectors(midTarget.current, endTarget.current, u);
        }
      } else {
        const t = easeInOutCubic(p);
        if (solarCam) {
          camera.position.lerpVectors(startPos.current, endPos.current, t);
        } else {
          slerpVectors(startPos.current, endPos.current, t, camera.position);
        }
        controls.target.lerpVectors(startTarget.current, endTarget.current, t);
      }

      if (!solarCam) enforceSurfaceClearance();
      controls.update();
      if (flyProgress.current >= 1) {
        flying.current = false;
        flyStaged.current = false;
        clearFlyTo();
      }
    }

    const distFromOrigin = camera.position.length();

    // Zoom level uses height above local ground (AGL), not sea-level ellipsoid
    const altitudeM = Math.max(
      MIN_CAMERA_AGL_M,
      altitudeAglM(distFromOrigin, elev, terrainExaggeration, {
        dryEarth: dryEarthOn,
        altitudeM: useEarthStore.getState().altitudeM,
      }),
    );

    // Near plane ~5% of AGL (min ~0.5 m) so ground/tiles aren't clipped
    {
      const aglScene = Math.max(altitudeM, MIN_CAMERA_AGL_M) / EARTH_RADIUS_M;
      const nextNear = solarCam
        ? 0.02
        : Math.max(0.5 / EARTH_RADIUS_M, Math.min(0.2, aglScene * 0.05));
      const nextFar = solarCam
        ? Math.max(80, distFromOrigin * 20 + 40)
        : Math.max(40, distFromOrigin * 50 + 20);
      if (
        Math.abs(camera.near - nextNear) / Math.max(nextNear, 1e-12) > 0.2 ||
        Math.abs(camera.far - nextFar) > 8
      ) {
        camera.near = nextNear;
        camera.far = nextFar;
        camera.updateProjectionMatrix();
      }
    }

    // Far from globe: ease target toward origin; mid/close handled above
    if (!flying.current && !solarCam && distFromOrigin > 2.5) {
      if (controls.target.lengthSq() > 0.002) {
        controls.target.multiplyScalar(Math.exp(-1.8 * dt));
      } else {
        controls.target.set(0, 0, 0);
      }
      controls.update();
    }

    const level = altitudeToZoomLevel(altitudeM);
    controls.enablePan = level.enablePan;
    controls.panSpeed = CAMERA_PAN_SPEED * (level.id >= 5 ? 0.55 : 1);
    controls.rotateSpeed =
      CAMERA_ROTATE_SPEED * (level.id >= 5 ? 0.45 : level.id >= 3 ? 0.7 : 1);
    controls.zoomSpeed = 0;

    if (!flying.current) {
      const od = camera.position.distanceTo(controls.target);
      if (od < minClearanceRef.current) {
        const dir = camera.position.clone().sub(controls.target).normalize();
        camera.position
          .copy(controls.target)
          .addScaledVector(dir, minClearanceRef.current);
      }
      if (!solarCam) enforceSurfaceClearance();
      controls.update();
    } else if (!solarCam) {
      enforceSurfaceClearance();
    }

    if (altitudeM < 3_000_000) {
      setIdleRotation(false);
    }

    setCameraDistance(camera.position.distanceTo(controls.target));

    offset.current.copy(camera.position).sub(controls.target);
    spherical.current.setFromVector3(offset.current);
    const heading =
      ((MathUtils.radToDeg(spherical.current.theta) % 360) + 360) % 360;
    const pitch = 90 - MathUtils.radToDeg(spherical.current.phi);

    const focusLocal = toLocal(
      controls.target.lengthSq() > 0.01
        ? controls.target
        : camera.position.clone().normalize(),
      tmpLocal.current,
    );
    const unclampedFocus = vector3ToLatLng(focusLocal);
    let focus = unclampedFocus;

    // Clamp focus to Nepal bounds in game mode and hard-correct the control target
    // so telemetry and camera view stay in sync.
    if (appMode === "game") {
      const clamped = clampToNepalBounds(unclampedFocus.lat, unclampedFocus.lng);
      const movedByClamp =
        Math.abs(clamped.lat - unclampedFocus.lat) > 1e-6 ||
        Math.abs(clamped.lng - unclampedFocus.lng) > 1e-6;

      if (movedByClamp) {
        const prevTarget = controls.target.clone();
        const clampedFocusWorld = surfaceFocusWorld(
          clamped.lat,
          clamped.lng,
          tmpWorld.current,
        );
        controls.target.copy(clampedFocusWorld);

        // Keep the current camera offset when clamping, unless a fly animation is running.
        if (!flying.current) {
          const deltaTarget = clampedFocusWorld.clone().sub(prevTarget);
          camera.position.add(deltaTarget);
        }
      }

      focus = clamped;
    }
    focusLatLng.current = focus;

    const safeAltitudeM = altitudeM;

    telemetryThrottle.current += dt;
    if (telemetryThrottle.current > 0.08) {
      telemetryThrottle.current = 0;
      const zl = altitudeToZoomLevel(safeAltitudeM);
      setTelemetry({
        zoomLevel: zl.id,
        zoomLevelName: zl.name,
        altitudeM: safeAltitudeM,
        heading,
        pitch,
        focusLat: focus.lat,
        focusLng: focus.lng,
        surfaceMode: safeAltitudeM < SURFACE_MODE_ALTITUDE_M,
      });
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!flightMode}
      enableDamping
      dampingFactor={CAMERA_DAMPING}
      rotateSpeed={CAMERA_ROTATE_SPEED}
      zoomSpeed={0}
      panSpeed={CAMERA_PAN_SPEED}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={appMode === "game" ? 1.35 : CAMERA_MAX_DISTANCE} // Restrict max distance in game mode to keep Nepal focused
      minPolarAngle={CAMERA_MIN_POLAR}
      maxPolarAngle={CAMERA_MAX_POLAR}
      enablePan
      screenSpacePanning
      makeDefault
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      touches={{
        ONE: TOUCH.ROTATE,
        TWO: TOUCH.DOLLY_PAN,
      }}
      onStart={() => setIdleRotation(false)}
    />
  );
}
