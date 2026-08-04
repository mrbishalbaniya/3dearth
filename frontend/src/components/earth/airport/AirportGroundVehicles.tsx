"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { createAirportFrame, metersToScene, offsetToWorld } from "./airportMath";
import { TIA_LAYOUT } from "./data";
import type { AirportLayout } from "./types";

function Vehicle({
  position,
  color,
  scale = 1,
  oscillation = 0.2,
}: {
  position: Vector3;
  color: string;
  scale?: number;
  oscillation?: number;
}) {
  const ref = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    const node = ref.current;
    if (!node) return;
    node.position.y = position.y + Math.sin(clock.elapsedTime * 2.2) * oscillation * metersToScene(0.5);
    node.rotation.y = Math.sin(clock.elapsedTime * 0.75) * 0.1;
  });

  return (
    <group ref={ref as never} position={position} scale={scale}>
      <mesh position={[0, 0.001, 0]}>
        <boxGeometry args={[metersToScene(8), metersToScene(2.8), metersToScene(3.8)]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.08} />
      </mesh>
      <mesh position={[metersToScene(-2.3), 0, metersToScene(1.7)]}>
        <sphereGeometry args={[metersToScene(0.75), 10, 10]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[metersToScene(2.3), 0, metersToScene(1.7)]}>
        <sphereGeometry args={[metersToScene(0.75), 10, 10]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[metersToScene(-2.3), 0, metersToScene(-1.7)]}>
        <sphereGeometry args={[metersToScene(0.75), 10, 10]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[metersToScene(2.3), 0, metersToScene(-1.7)]}>
        <sphereGeometry args={[metersToScene(0.75), 10, 10]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0, metersToScene(2), metersToScene(-1.3)]}>
        <boxGeometry args={[metersToScene(1.8), metersToScene(1.2), metersToScene(1.5)]} />
        <meshStandardMaterial color="#c7d2fe" emissive="#c7d2fe" emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
}

export function AirportGroundVehicles({ layout = TIA_LAYOUT }: { layout?: AirportLayout }) {
  const frame = useMemo(
    () => createAirportFrame(layout.position.lat, layout.position.lng, layout.runway.headingDeg),
    [layout],
  );

  const positions = [
    { position: offsetToWorld(frame, -300, -290, 1), color: "#f59e0b", scale: 1.1 },
    { position: offsetToWorld(frame, -160, -250, 1), color: "#60a5fa", scale: 0.95 },
    { position: offsetToWorld(frame, -80, -190, 1), color: "#ef4444", scale: 0.82 },
    { position: offsetToWorld(frame, 210, -130, 1), color: "#22c55e", scale: 0.9 },
    { position: offsetToWorld(frame, 390, 190, 1), color: "#eab308", scale: 1.0 },
    { position: offsetToWorld(frame, 530, 280, 1), color: "#94a3b8", scale: 0.88 },
  ];

  return (
    <group name="tia-ground-vehicles">
      {positions.map((entry, index) => (
        <Vehicle key={`vehicle-${index}`} position={entry.position} color={entry.color} scale={entry.scale} />
      ))}

      <mesh position={offsetToWorld(frame, -520, -120, 1)}>
        <boxGeometry args={[metersToScene(18), metersToScene(4), metersToScene(6)]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={offsetToWorld(frame, -510, -120, 5)}>
        <sphereGeometry args={[metersToScene(1.5), 12, 12]} />
        <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}
