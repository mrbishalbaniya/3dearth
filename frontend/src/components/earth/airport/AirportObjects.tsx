"use client";

import { useMemo } from "react";
import { DoubleSide, Quaternion, Vector3 } from "three";
import { createAirportFrame, metersToScene, offsetToWorld } from "./airportMath";
import { TIA_LAYOUT, TIA_PALETTE } from "./data";
import type { AirportLayout, AirportLightingState } from "./types";

function LightDot({ position, color, scale = 1 }: { position: Vector3; color: string; scale?: number }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export function AirportObjects({
  layout = TIA_LAYOUT,
  lighting,
}: {
  layout?: AirportLayout;
  lighting: AirportLightingState;
}) {
  const frame = useMemo(
    () => createAirportFrame(layout.position.lat, layout.position.lng, layout.runway.headingDeg),
    [layout],
  );

  const runwayPos = frame.origin.clone();
  const runwayLength = metersToScene(layout.runway.lengthM);
  const runwayWidth = metersToScene(layout.runway.widthM);
  const terminalPos = offsetToWorld(frame, -420, -520, 18);
  const towerPos = offsetToWorld(frame, 180, -260, 32);
  const cargoPos = offsetToWorld(frame, 520, 180, 12);
  const firePos = offsetToWorld(frame, 680, 420, 10);
  const fuelPos = offsetToWorld(frame, 430, 360, 10);

  const runwaySegments = 20;
  const stripColor = lighting.wetRunway ? "#2a2f35" : "#343a40";
  const paintColor = lighting.wetRunway ? "#f1efc8" : "#f7f3d1";

  const taxiMarkers = layout.taxiways.map((taxiway) => {
    const pos = offsetToWorld(frame, taxiway.offsetXM, taxiway.offsetZM, 0.5);
    return { name: taxiway.name, position: pos, heading: taxiway.headingDeg };
  });

  const stands = layout.stands.map((stand) => ({
    id: stand.id,
    type: stand.type,
    position: offsetToWorld(frame, stand.offsetXM, stand.offsetZM, 0.5),
    heading: stand.headingDeg,
  }));

  return (
    <group name="vnkt-airport">
      <group position={runwayPos} quaternion={frame.quaternion as Quaternion}>
        <mesh position={[0, 0.001, 0]}>
          <boxGeometry args={[runwayWidth, 0.003, runwayLength]} />
          <meshStandardMaterial color={stripColor} roughness={0.94} metalness={0.02} />
        </mesh>

        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[runwayWidth + 0.03, 0.001, runwayLength + 0.03]} />
          <meshStandardMaterial color="#121212" transparent opacity={0.15} />
        </mesh>

        {Array.from({ length: runwaySegments }).map((_, index) => {
          const z = -runwayLength / 2 + (index + 0.5) * (runwayLength / runwaySegments);
          return (
            <mesh key={`centerline-${index}`} position={[0, 0.007, z]}>
              <boxGeometry args={[0.0025, 0.0008, runwayLength / runwaySegments * 0.42]} />
              <meshStandardMaterial color={paintColor} emissive={paintColor} emissiveIntensity={0.12} />
            </mesh>
          );
        })}

        {[-1, 1].map((side) => (
          <mesh key={`edge-${side}`} position={[side * runwayWidth * 0.47, 0.007, 0]}>
            <boxGeometry args={[0.0015, 0.0008, runwayLength * 0.92]} />
            <meshStandardMaterial color={paintColor} emissive={paintColor} emissiveIntensity={0.08} />
          </mesh>
        ))}

        <mesh position={[0, 0.006, runwayLength * 0.42]}>
          <boxGeometry args={[runwayWidth * 0.72, 0.0008, 0.06]} />
          <meshStandardMaterial color={paintColor} />
        </mesh>

        <mesh position={[0, 0.006, -runwayLength * 0.42]}>
          <boxGeometry args={[runwayWidth * 0.72, 0.0008, 0.06]} />
          <meshStandardMaterial color={paintColor} />
        </mesh>

        <mesh position={[0, 0.008, runwayLength * 0.44]}>
          <boxGeometry args={[runwayWidth * 0.52, 0.0008, 0.05]} />
          <meshStandardMaterial color={paintColor} />
        </mesh>

        <mesh position={[0, 0.008, -runwayLength * 0.44]}>
          <boxGeometry args={[runwayWidth * 0.52, 0.0008, 0.05]} />
          <meshStandardMaterial color={paintColor} />
        </mesh>

        <LightDot position={new Vector3(0, 0.01, runwayLength * 0.48)} color="#f8fafc" scale={0.0018} />
        <LightDot position={new Vector3(0, 0.01, -runwayLength * 0.48)} color="#f8fafc" scale={0.0018} />

        {Array.from({ length: 18 }).map((_, index) => {
          const z = -runwayLength / 2 + index * (runwayLength / 17);
          return <LightDot key={`center-light-${index}`} position={new Vector3(0, 0.012, z)} color={lighting.night ? "#dff8ff" : "#f0fbff"} scale={0.0012} />;
        })}

        {Array.from({ length: 8 }).map((_, index) => {
          const z = -runwayLength / 2 - 0.01 - index * 0.025;
          return <LightDot key={`approach-a-${index}`} position={new Vector3(0, 0.01, z)} color="#d6f3ff" scale={0.0011} />;
        })}
        {Array.from({ length: 8 }).map((_, index) => {
          const z = runwayLength / 2 + 0.01 + index * 0.025;
          return <LightDot key={`approach-b-${index}`} position={new Vector3(0, 0.01, z)} color="#d6f3ff" scale={0.0011} />;
        })}

        <mesh position={[0, 0.009, runwayLength * 0.01]}>
          <planeGeometry args={[0.14, 0.08]} />
          <meshStandardMaterial color="#ffffff" side={DoubleSide} />
        </mesh>
      </group>

      <mesh position={terminalPos} rotation={[0, Math.PI * 1.05, 0]}>
        <boxGeometry args={[metersToScene(260), metersToScene(28), metersToScene(68)]} />
        <meshStandardMaterial color="#dbe5ea" roughness={0.55} metalness={0.06} />
      </mesh>
      <mesh position={terminalPos.clone().add(new Vector3(0, metersToScene(18), metersToScene(30)))} rotation={[0, Math.PI * 1.05, 0]}>
        <boxGeometry args={[metersToScene(250), metersToScene(16), metersToScene(10)]} />
        <meshStandardMaterial color="#a7d3f0" roughness={0.1} metalness={0.25} transparent opacity={0.88} />
      </mesh>
      <mesh position={towerPos}>
        <cylinderGeometry args={[metersToScene(7), metersToScene(9), metersToScene(48), 18]} />
        <meshStandardMaterial color={TIA_PALETTE.tower} roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh position={towerPos.clone().add(new Vector3(0, metersToScene(32), 0))}>
        <cylinderGeometry args={[metersToScene(11), metersToScene(12), metersToScene(12), 18]} />
        <meshStandardMaterial color="#b8d8f0" roughness={0.15} metalness={0.22} />
      </mesh>
      <mesh position={towerPos.clone().add(new Vector3(0, metersToScene(41), 0))}>
        <sphereGeometry args={[metersToScene(9), 18, 18]} />
        <meshStandardMaterial color="#88bfe6" roughness={0.08} metalness={0.3} transparent opacity={0.94} />
      </mesh>

      <mesh position={cargoPos}>
        <boxGeometry args={[metersToScene(180), metersToScene(26), metersToScene(82)]} />
        <meshStandardMaterial color="#9ea7ad" roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh position={firePos}>
        <boxGeometry args={[metersToScene(92), metersToScene(15), metersToScene(42)]} />
        <meshStandardMaterial color="#cf4a36" roughness={0.65} metalness={0.08} />
      </mesh>
      <mesh position={fuelPos}>
        <cylinderGeometry args={[metersToScene(12), metersToScene(12), metersToScene(36), 18]} />
        <meshStandardMaterial color="#6f8086" roughness={0.55} metalness={0.12} />
      </mesh>

      {taxiMarkers.map((taxiway) => (
        <group key={taxiway.name} position={taxiway.position} rotation={[0, (taxiway.heading * Math.PI) / 180, 0]}>
          <mesh>
            <boxGeometry args={[metersToScene(taxiway.name === "C" || taxiway.name === "D" ? 16 : 23), metersToScene(0.8), metersToScene(120)]} />
            <meshStandardMaterial color={TIA_PALETTE.taxiway} roughness={0.96} metalness={0.01} />
          </mesh>
          <mesh position={[0, 0.001, 0]}>
            <boxGeometry args={[metersToScene(0.5), metersToScene(0.3), metersToScene(100)]} />
            <meshStandardMaterial color="#f8d94f" emissive="#f8d94f" emissiveIntensity={0.12} />
          </mesh>
        </group>
      ))}

      {stands.map((stand) => (
        <group key={stand.id} position={stand.position} rotation={[0, (stand.heading * Math.PI) / 180, 0]}>
          <mesh>
            <boxGeometry args={[metersToScene(26), metersToScene(0.25), metersToScene(32)]} />
            <meshStandardMaterial color={TIA_PALETTE.apron} roughness={0.96} metalness={0.01} />
          </mesh>
          <mesh position={[0, 0.003, 0]}>
            <boxGeometry args={[metersToScene(0.4), metersToScene(0.12), metersToScene(22)]} />
            <meshStandardMaterial color="#f5d34b" />
          </mesh>
        </group>
      ))}

      {Array.from({ length: 28 }).map((_, index) => {
        const angle = (index / 28) * Math.PI * 2;
        const ringRadius = metersToScene(720);
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius;
        return <LightDot key={`apron-flood-${index}`} position={offsetToWorld(frame, x / metersToScene(1), z / metersToScene(1), 18)} color={lighting.night ? "#eaf8ff" : "#fff8d8"} scale={0.0015} />;
      })}

      <mesh position={offsetToWorld(frame, -760, -620, 2)}>
        <boxGeometry args={[metersToScene(620), metersToScene(0.7), metersToScene(260)]} />
        <meshStandardMaterial color="#58686a" roughness={0.9} metalness={0.04} />
      </mesh>

      <mesh position={offsetToWorld(frame, 760, 520, 0)}>
        <boxGeometry args={[metersToScene(300), metersToScene(0.8), metersToScene(120)]} />
        <meshStandardMaterial color="#4c5c61" roughness={0.95} metalness={0.04} />
      </mesh>

      <mesh position={offsetToWorld(frame, 920, 180, 0)}>
        <boxGeometry args={[metersToScene(180), metersToScene(0.9), metersToScene(90)]} />
        <meshStandardMaterial color="#76858a" roughness={0.9} metalness={0.03} />
      </mesh>

      <mesh position={offsetToWorld(frame, -940, 100, 0)}>
        <boxGeometry args={[metersToScene(120), metersToScene(0.9), metersToScene(60)]} />
        <meshStandardMaterial color="#314935" roughness={0.95} metalness={0.02} />
      </mesh>
    </group>
  );
}
