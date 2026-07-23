"use client";

/**
 * Live GPS marker — pulse + accuracy ring at the device position.
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

  const coreGeo = useMemo(() => new SphereGeometry(1, 16, 16), []);
  const pulseGeo = useMemo(() => new SphereGeometry(1, 16, 16), []);
  const ringGeo = useMemo(
    () => new RingGeometry(0.85, 1.05, 48),
    [],
  );

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
        opacity: 0.35,
        depthWrite: false,
      }),
    [],
  );
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#93c5fd",
        transparent: true,
        opacity: 0.45,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!tracking || !loc || !groupRef.current) return;
    const r = EARTH_RADIUS * 1.0012;
    const pos = latLngToVector3(loc.lat, loc.lng, r);
    groupRef.current.position.copy(pos);
    groupRef.current.lookAt(0, 0, 0);
    groupRef.current.rotateX(Math.PI / 2);

    // Marker size — keep tiny; Html label only when reasonably close
    const alt = useEarthStore.getState().altitudeM;
    const base = Math.min(
      0.004,
      Math.max(0.00025, (alt / EARTH_RADIUS_M) * 0.08),
    );
    if (pulseRef.current) {
      const t = 1 + (Math.sin(clock.elapsedTime * 2.4) * 0.5 + 0.5) * 0.85;
      pulseRef.current.scale.setScalar(base * 1.6 * t);
      (pulseRef.current.material as MeshBasicMaterial).opacity =
        0.4 * (1.15 - (t - 1));
    }
    if (ringRef.current) {
      const acc = Math.min(800, Math.max(25, loc.accuracyM));
      const ringR = Math.min(0.04, Math.max(base * 2.2, (acc / EARTH_RADIUS_M) * 1.2));
      ringRef.current.scale.setScalar(ringR);
    }
    const core = groupRef.current.children.find(
      (c) => c.name === "user-core",
    ) as Mesh | undefined;
    if (core) core.scale.setScalar(base);
  });

  const altitudeM = useEarthStore((s) => s.altitudeM);
  const showLabel = altitudeM < 80_000;

  if (!tracking || !loc) return null;

  return (
    <group ref={groupRef} renderOrder={20}>
      <mesh
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
          distanceFactor={Math.max(1.2, Math.min(8, altitudeM / 8_000))}
          style={{ pointerEvents: "none" }}
        >
          <div className="earth-user-pin">You</div>
        </Html>
      )}
    </group>
  );
}
