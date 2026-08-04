"use client";

import { useMemo } from "react";
import { createAirportFrame, metersToScene, offsetToWorld } from "./airportMath";
import { TIA_LAYOUT, TIA_PALETTE } from "./data";
import type { AirportLayout } from "./types";

export function AirportPerimeter({ layout = TIA_LAYOUT }: { layout?: AirportLayout }) {
  const frame = useMemo(
    () => createAirportFrame(layout.position.lat, layout.position.lng, layout.runway.headingDeg),
    [layout],
  );

  const fencePoints = [
    [-900, -760],
    [-620, -890],
    [-200, -920],
    [260, -890],
    [700, -720],
    [930, -340],
    [980, 40],
    [900, 420],
    [680, 760],
    [220, 960],
    [-260, 900],
    [-690, 720],
    [-940, 300],
    [-980, -120],
  ] as const;

  return (
    <group name="tia-perimeter">
      {fencePoints.map(([x, z], index) => {
        const next = fencePoints[(index + 1) % fencePoints.length];
        const start = offsetToWorld(frame, x, z, 0.4);
        const end = offsetToWorld(frame, next[0], next[1], 0.4);
        const direction = end.clone().sub(start);
        const length = direction.length();
        const rotationY = Math.atan2(direction.x, direction.z);
        const center = start.clone().addScaledVector(direction, 0.5);

        return (
          <group key={`fence-${index}`} position={center} rotation={[0, rotationY, 0]}>
            <mesh>
              <boxGeometry args={[metersToScene(3), metersToScene(1.8), Math.max(length, metersToScene(3))]} />
              <meshStandardMaterial color="#475569" roughness={0.95} metalness={0.02} />
            </mesh>
          </group>
        );
      })}

      {fencePoints.map(([x, z], index) => (
        <mesh key={`pole-${index}`} position={offsetToWorld(frame, x, z, 0.5)}>
          <cylinderGeometry args={[metersToScene(0.18), metersToScene(0.18), metersToScene(4.2), 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}

      <mesh position={offsetToWorld(frame, -1020, -180, 1)}>
        <boxGeometry args={[metersToScene(260), metersToScene(12), metersToScene(180)]} />
        <meshStandardMaterial color={TIA_PALETTE.vegetation} roughness={1} metalness={0} />
      </mesh>
      <mesh position={offsetToWorld(frame, 1120, 420, 1)}>
        <boxGeometry args={[metersToScene(340), metersToScene(20), metersToScene(280)]} />
        <meshStandardMaterial color="#28472e" roughness={1} metalness={0} />
      </mesh>
      <mesh position={offsetToWorld(frame, 1080, -680, 1)}>
        <boxGeometry args={[metersToScene(320), metersToScene(18), metersToScene(240)]} />
        <meshStandardMaterial color="#355c3c" roughness={1} metalness={0} />
      </mesh>
      <mesh position={offsetToWorld(frame, -1200, 560, 1)}>
        <boxGeometry args={[metersToScene(280), metersToScene(22), metersToScene(260)]} />
        <meshStandardMaterial color="#243b2a" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
