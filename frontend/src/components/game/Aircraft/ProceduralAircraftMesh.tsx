"use client";

/**
 * Procedural aircraft — modeled in meters, nose toward −Z (Three.js lookAt).
 * Scale = 1 / EARTH_RADIUS_M so it matches the unit-sphere Earth.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Mesh } from "three";
import { EARTH_RADIUS_M } from "../../earth/utils/zoomLevels";
import type { AircraftSpec } from "../Types";
import { useGameStore } from "../store/gameStore";

/** Scene units per meter on the unit-radius Earth */
const METERS_TO_SCENE = 1 / EARTH_RADIUS_M;

export function ProceduralAircraftMesh({
  spec,
  hideCabin = false,
}: {
  spec: AircraftSpec;
  /** When true, hide fuselage/canopy so interior is visible */
  hideCabin?: boolean;
}) {
  const prop = useRef<Mesh>(null);
  const s = spec.visualScale;
  const isJet = spec.class === "business_jet" || spec.class === "airliner";
  const twin = spec.class === "tep";

  const paint = useMemo(() => new Color("#c8d4e8"), []);
  const accent = useMemo(() => new Color("#2a6db5"), []);

  useFrame((_, dt) => {
    const st = useGameStore.getState().flightState;
    if (prop.current && st) {
      prop.current.rotation.y +=
        st.throttle * 45 * dt + st.airspeedMs * 0.08 * dt;
    }
  });

  // Local coords: +X right, +Y up, −Z nose (lookAt convention)
  return (
    <group scale={METERS_TO_SCENE * s}>
      {!hideCabin && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.7, 6.5, 6, 12]} />
            <meshStandardMaterial color={paint} metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -4.2]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.65, 1.8, 10]} />
            <meshStandardMaterial color={accent} metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.55, -1.6]}>
            <boxGeometry args={[1.1, 0.55, 1.6]} />
            <meshStandardMaterial
              color="#7ec8ff"
              transparent
              opacity={0.45}
              metalness={0.8}
              roughness={0.1}
            />
          </mesh>
        </>
      )}
      {/* Wings always visible (peripheral FOV) */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <boxGeometry args={[12, 0.18, 2.2]} />
        <meshStandardMaterial color={paint} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.2, 3.2]} castShadow>
        <boxGeometry args={[0.15, 2.2, 1.4]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[0, 0.35, 3.5]}>
        <boxGeometry args={[4.2, 0.12, 1.0]} />
        <meshStandardMaterial color={paint} />
      </mesh>

      {!isJet && (
        <mesh ref={prop} position={[0, 0, -5.2]}>
          <boxGeometry args={[3.6, 0.12, 0.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      )}

      {twin && (
        <>
          <EnginePod x={-3.2} />
          <EnginePod x={3.2} />
        </>
      )}

      {isJet && (
        <>
          <mesh position={[-2.2, -0.5, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.4, 2.8, 12]} />
            <meshStandardMaterial color="#333" metalness={0.6} />
          </mesh>
          <mesh position={[2.2, -0.5, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.4, 2.8, 12]} />
            <meshStandardMaterial color="#333" metalness={0.6} />
          </mesh>
        </>
      )}

      <GearVisible />
    </group>
  );
}

function EnginePod({ x }: { x: number }) {
  return (
    <mesh position={[x, -0.25, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 2.0, 10]} />
      <meshStandardMaterial color="#334" />
    </mesh>
  );
}

function GearVisible() {
  const gearDown = useGameStore((s) => s.flightState?.gearDown ?? true);
  if (!gearDown) return null;
  return (
    <group>
      <mesh position={[0, -1.1, -1.5]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-1.6, -1.1, 0.8]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1.6, -1.1, 0.8]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}
