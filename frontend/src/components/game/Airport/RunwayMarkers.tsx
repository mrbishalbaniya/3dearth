"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";
import { latLngToVector3 } from "../../earth/utils/geo";
import { EARTH_RADIUS_M } from "../../earth/utils/zoomLevels";
import type { Airport } from "../Types";
import { primaryRunway } from "../Services/AirportService";

/** Simple runway strip + threshold lights at spawn airport. */
export function RunwayMarkers({ airport }: { airport: Airport }) {
  const rw = primaryRunway(airport);
  const r = 1 + (airport.elevM + 1) / EARTH_RADIUS_M;
  const center = useMemo(
    () => latLngToVector3(airport.lat, airport.lng, r),
    [airport.lat, airport.lng, r],
  );

  const len = rw.lengthM / EARTH_RADIUS_M;
  const width = Math.max(rw.widthM, 40) / EARTH_RADIUS_M;

  return (
    <group position={center}>
      {/* Align local +Z with runway heading approximately via lookAt north+east */}
      <RunwayAligned headingDeg={rw.headingDeg} len={len} width={width} />
    </group>
  );
}

function RunwayAligned({
  headingDeg,
  len,
  width,
}: {
  headingDeg: number;
  len: number;
  width: number;
}) {
  // Parent already at airport; rotate around local up by heading
  const rad = (headingDeg * Math.PI) / 180;
  return (
    <group rotation={[0, -rad, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.000002, 0]}>
        <planeGeometry args={[width * 2.2, len]} />
        <meshBasicMaterial
          color="#3a3a42"
          side={DoubleSide}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      {/* Centerline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.000003, 0]}>
        <planeGeometry args={[width * 0.08, len * 0.9]} />
        <meshBasicMaterial color="#e8e8f0" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {/* Threshold lights */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * width * 0.9, 0.00001, len * 0.45]}
        >
          <sphereGeometry args={[width * 0.12, 6, 6]} />
          <meshBasicMaterial color="#ffe08a" />
        </mesh>
      ))}
    </group>
  );
}
