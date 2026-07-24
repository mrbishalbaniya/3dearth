"use client";

/**
 * Live GPS marker — small pin + subtle accuracy ring.
 */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";

export function UserLocationLayer() {
  const loc = useEarthStore((s) => s.userLocation);
  const tracking = useEarthStore((s) => s.locationTracking);
  const groupRef = useRef<Group>(null);
  const pulseRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);

  const coreGeo = useMemo(() => new SphereGeometry(1, 12, 12), []);
  const pulseGeo = useMemo(() => new SphereGeometry(1, 12, 12), []);
  const ringGeo = useMemo(() => new RingGeometry(0.9, 1.05, 32), []);

  const coreMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#3b82f6",
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    [],
  );
  const pulseMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#60a5fa",
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    [],
  );
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#93c5fd",
        transparent: true,
        opacity: 0.35,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    if (!tracking || !loc || !groupRef.current) return;
    const r = EARTH_RADIUS * 1.0008;
    const pos = latLngToVector3(loc.lat, loc.lng, r);
    groupRef.current.position.copy(pos);
    groupRef.current.lookAt(0, 0, 0);
    groupRef.current.rotateX(Math.PI / 2);

    const alt = useEarthStore.getState().altitudeM;
    // Tiny on-screen pin — scales gently with altitude, hard-capped small
    const base = Math.min(
      0.00055,
      Math.max(0.00008, (alt / EARTH_RADIUS_M) * 0.006),
    );

    if (coreRef.current) coreRef.current.scale.setScalar(base);

    if (pulseRef.current) {
      const t =
        1 +
        (Math.sin(performance.now() * 0.0026) * 0.5 + 0.5) * 0.55;
      pulseRef.current.scale.setScalar(base * 1.7 * t);
      (pulseRef.current.material as MeshBasicMaterial).opacity =
        0.28 * (1.2 - (t - 1));
    }

    if (ringRef.current) {
      // Accuracy ring in meters → scene units, capped so it never dominates
      const acc = Math.min(120, Math.max(12, loc.accuracyM));
      const ringR = Math.min(
        base * 3.5,
        Math.max(base * 1.8, (acc / EARTH_RADIUS_M) * 0.35),
      );
      ringRef.current.scale.setScalar(ringR);
    }
  });

  const altitudeM = useEarthStore((s) => s.altitudeM);
  const showLabel = altitudeM < 25_000;

  if (!tracking || !loc) return null;

  return (
    <group ref={groupRef} renderOrder={20}>
      <mesh
        ref={coreRef}
        name="user-core"
        geometry={coreGeo}
        material={coreMat}
        renderOrder={22}
      />
      <mesh
        ref={pulseRef}
        geometry={pulseGeo}
        material={pulseMat}
        renderOrder={21}
      />
      <mesh
        ref={ringRef}
        geometry={ringGeo}
        material={ringMat}
        renderOrder={20}
      />
      {showLabel && (
        <Html
          center
          distanceFactor={14}
          style={{ pointerEvents: "none" }}
          zIndexRange={[30, 0]}
        >
          <div className="earth-user-pin">You</div>
        </Html>
      )}
    </group>
  );
}
