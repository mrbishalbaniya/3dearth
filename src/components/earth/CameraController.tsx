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
  altitudeToZoomLevel,
  EARTH_RADIUS_M,
  SURFACE_MODE_ALTITUDE_M,
  zoomSensitivity,
} from "./utils/zoomLevels";
import { peekElevation, warmElevation } from "./streaming/ElevationService";

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
  const minClearanceRef = useRef(CAMERA_MIN_DISTANCE);
  const minRadiusRef = useRef(1 + MIN_CAMERA_AGL_M / EARTH_RADIUS_M);

  const flying = useRef(false);
  const flyProgress = useRef(1);
  const flyDuration = useRef(FLY_TO_DEFAULT_DURATION);
  const startPos = useRef(new Vector3());
  const endPos = useRef(new Vector3());
  const startTarget = useRef(new Vector3());
  const endTarget = useRef(new Vector3());
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

  // Enable logarithmic depth for extreme near/far range
  useEffect(() => {
    camera.near = 0.00001;
    camera.far = 200;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Fly-to
  useEffect(() => {
    if (!flyToTarget || !controlsRef.current) return;

    const altitudeM = Math.max(
      MIN_CAMERA_AGL_M,
      flyToTarget.altitudeM ??
        (flyToTarget.altitude != null && flyToTarget.altitude > 2
          ? (flyToTarget.altitude - 1) * EARTH_RADIUS_M
          : flyToTarget.altitude != null
            ? flyToTarget.altitude * EARTH_RADIUS_M
            : 250_000),
    );

    focusLatLng.current = { lat: flyToTarget.lat, lng: flyToTarget.lng };
    const focus = surfaceFocusWorld(
      flyToTarget.lat,
      flyToTarget.lng,
      tmpWorld.current,
    );
    const orbit = altitudeMToOrbitDistance(altitudeM);
    const camDir = camera.position
      .clone()
      .sub(controlsRef.current.target)
      .normalize();
    if (camDir.lengthSq() < 0.01) camDir.copy(focus).normalize();
    endTarget.current.copy(focus);
    endPos.current.copy(focus).addScaledVector(camDir, orbit);
    const endLen = endPos.current.length();
    const floorR = minCameraRadius(
      peekElevation(flyToTarget.lat, flyToTarget.lng),
      useEarthStore.getState().terrainExaggeration,
      { lowAltitude: altitudeM < 3_000 },
    );
    if (endLen < floorR) {
      endPos.current.multiplyScalar(floorR / Math.max(endLen, 1e-8));
    }

    startPos.current.copy(camera.position);
    startTarget.current.copy(controlsRef.current.target);
    flyDuration.current = reducedMotion
      ? 0.35
      : (flyToTarget.duration ?? FLY_TO_DEFAULT_DURATION);
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

    startPos.current.copy(camera.position);
    startTarget.current.copy(controlsRef.current.target);
    endPos.current.set(0, 0.55, CAMERA_DEFAULT_DISTANCE);
    endTarget.current.set(0, 0, 0);
    focusLatLng.current = { lat: 20, lng: 0 };
    flyDuration.current = reducedMotion ? 0.3 : 1.6;
    flyProgress.current = 0;
    flying.current = true;
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
      // Normalize wheel deltas so trackpads / mice feel similar and less snappy
      let steps = event.deltaY;
      if (event.deltaMode === 1) steps *= 16; // lines → pixels-ish
      if (event.deltaMode === 2) steps *= 32; // pages
      const clamped = MathUtils.clamp(steps, -120, 120);
      const direction = Math.sign(clamped) || 1;
      const magnitude = Math.min(1, Math.abs(clamped) / 100);
      zoomVelocity.current += direction * sens * magnitude;
      setIdleRotation(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, setIdleRotation]);

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

    const dt = Math.min(delta, 0.05);

    // Camera nadir + focus elevation for opaque surface floor
    const camLocal = toLocal(camera.position, tmpLocal.current);
    const camLl = vector3ToLatLng(camLocal);
    const elevFocus = peekElevation(
      focusLatLng.current.lat,
      focusLatLng.current.lng,
    );
    const elevCam = peekElevation(camLl.lat, camLl.lng);
    const elev =
      elevFocus == null && elevCam == null
        ? null
        : Math.max(elevFocus ?? Number.NEGATIVE_INFINITY, elevCam ?? Number.NEGATIVE_INFINITY);
    if (elevFocus == null || elevCam == null) {
      const altHint = useEarthStore.getState().altitudeM;
      if (altHint < 400_000) {
        warmElevation(focusLatLng.current.lat, focusLatLng.current.lng, 10);
        warmElevation(camLl.lat, camLl.lng, 10);
      }
    }
    const lowAlt = useEarthStore.getState().altitudeM < 3_000;
    const floorR = minCameraRadius(elev, terrainExaggeration, {
      lowAltitude: lowAlt,
    });
    minRadiusRef.current = floorR;

    // Keep focus on the globe once close — mid-lerp targets used to inflate
    // minDistance and freeze Street zoom.
    if (!flying.current && camera.position.length() < 2.2) {
      const desired = camera.position.clone().normalize();
      if (controls.target.length() < 0.55) {
        controls.target.lerp(desired, 1 - Math.exp(-10 * dt));
      } else {
        controls.target.copy(desired);
      }
    }

    const targetLen = controls.target.length();
    minClearanceRef.current = Math.max(
      CAMERA_MIN_DISTANCE,
      minOrbitDistance(targetLen, floorR),
    );
    controls.minDistance = minClearanceRef.current;
    controls.maxDistance = CAMERA_MAX_DISTANCE;

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
      const t = easeInOutCubic(flyProgress.current);
      camera.position.lerpVectors(startPos.current, endPos.current, t);
      controls.target.lerpVectors(startTarget.current, endTarget.current, t);
      enforceSurfaceClearance();
      controls.update();
      if (flyProgress.current >= 1) {
        flying.current = false;
        clearFlyTo();
      }
    }

    const distFromOrigin = camera.position.length();
    // Zoom level uses height above local ground (AGL), not sea-level ellipsoid
    const altitudeM = Math.max(
      MIN_CAMERA_AGL_M,
      altitudeAglM(distFromOrigin, elev, terrainExaggeration),
    );

    // Far from globe: ease target toward origin; mid/close handled above
    if (!flying.current && distFromOrigin > 2.5) {
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
      enforceSurfaceClearance();
      controls.update();
    } else {
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
    const focus = vector3ToLatLng(focusLocal);
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
      enableDamping
      dampingFactor={CAMERA_DAMPING}
      rotateSpeed={CAMERA_ROTATE_SPEED}
      zoomSpeed={0}
      panSpeed={CAMERA_PAN_SPEED}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
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
