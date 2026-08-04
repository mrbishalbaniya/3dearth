"use client";

import { useMemo } from "react";
import { Vector3 } from "three";
import { createAirportFrame, metersToScene, offsetToWorld } from "./airportMath";
import { TIA_LAYOUT } from "./data";
import type { AirportLayout } from "./types";

function Beacon({ position, color }: { position: Vector3; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[metersToScene(4), 14, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

export function AirportNavaids({ layout = TIA_LAYOUT }: { layout?: AirportLayout }) {
  const frame = useMemo(
    () => createAirportFrame(layout.position.lat, layout.position.lng, layout.runway.headingDeg),
    [layout],
  );

  const runwayHeading = (layout.runway.headingDeg * Math.PI) / 180;
  const oppositeHeading = ((layout.runway.headingDeg + 180) % 360 * Math.PI) / 180;
  const approach02 = Array.from({ length: 8 }, (_, index) => offsetToWorld(frame, 0, -900 - index * 120, 1.2));
  const approach20 = Array.from({ length: 8 }, (_, index) => offsetToWorld(frame, 0, 900 + index * 120, 1.2));
  const papi02 = [
    offsetToWorld(frame, -45, -510, 1.5),
    offsetToWorld(frame, -30, -510, 1.5),
    offsetToWorld(frame, -15, -510, 1.5),
    offsetToWorld(frame, 0, -510, 1.5),
  ];
  const papi20 = [
    offsetToWorld(frame, -45, 510, 1.5),
    offsetToWorld(frame, -30, 510, 1.5),
    offsetToWorld(frame, -15, 510, 1.5),
    offsetToWorld(frame, 0, 510, 1.5),
  ];

  return (
    <group name="tia-navaids">
      <mesh position={offsetToWorld(frame, 0, -1120, 8)} rotation={[0, runwayHeading, 0]}>
        <coneGeometry args={[metersToScene(2.2), metersToScene(8), 10]} />
        <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={offsetToWorld(frame, 0, 1120, 8)} rotation={[0, oppositeHeading, 0]}>
        <coneGeometry args={[metersToScene(2.2), metersToScene(8), 10]} />
        <meshStandardMaterial color="#38bdf8" emissive="#7dd3fc" emissiveIntensity={0.2} />
      </mesh>

      {approach02.map((position, index) => (
        <Beacon key={`app-02-${index}`} position={position} color={index < 4 ? "#dbeafe" : "#f8fafc"} />
      ))}
      {approach20.map((position, index) => (
        <Beacon key={`app-20-${index}`} position={position} color={index < 4 ? "#dbeafe" : "#f8fafc"} />
      ))}

      {papi02.map((position, index) => (
        <mesh key={`papi-02-${index}`} position={position}>
          <boxGeometry args={[metersToScene(4), metersToScene(2), metersToScene(2)]} />
          <meshStandardMaterial color={index < 2 ? "#ef4444" : "#facc15"} emissive={index < 2 ? "#ef4444" : "#facc15"} emissiveIntensity={0.45} />
        </mesh>
      ))}
      {papi20.map((position, index) => (
        <mesh key={`papi-20-${index}`} position={position}>
          <boxGeometry args={[metersToScene(4), metersToScene(2), metersToScene(2)]} />
          <meshStandardMaterial color={index < 2 ? "#ef4444" : "#facc15"} emissive={index < 2 ? "#ef4444" : "#facc15"} emissiveIntensity={0.45} />
        </mesh>
      ))}

      <mesh position={offsetToWorld(frame, 760, -280, 10)}>
        <cylinderGeometry args={[metersToScene(2), metersToScene(2), metersToScene(22), 12]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={offsetToWorld(frame, 760, -280, 22)}>
        <sphereGeometry args={[metersToScene(2.8), 12, 12]} />
        <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.2} />
      </mesh>

      <mesh position={offsetToWorld(frame, -720, -430, 2)} rotation={[0, Math.PI * 0.1, 0]}>
        <cylinderGeometry args={[metersToScene(0.22), metersToScene(0.22), metersToScene(5), 8]} />
        <meshStandardMaterial color="#d1a45a" />
      </mesh>
      <mesh position={offsetToWorld(frame, -720, -430, 4)} rotation={[0, Math.PI * 0.1, 0]}>
        <boxGeometry args={[metersToScene(5), metersToScene(0.45), metersToScene(0.4)]} />
        <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}
