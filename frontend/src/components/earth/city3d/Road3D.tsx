/**
 * 3D Road Component
 * Based on map3d by cartesiancs - MIT License
 * https://github.com/cartesiancs/map3d
 */

"use client";

import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { OSMRoad } from "./types";

interface Road3DProps {
  road: OSMRoad;
  refLat: number;
  refLng: number;
  scale: number;
}

export function Road3D({ road, refLat, refLng, scale }: Road3DProps) {
  if (!road.geometry || road.geometry.length < 2) {
    return null;
  }

  // Project lat/lng to local coordinates
  const points = road.geometry.map((pt) => {
    const x = (pt.lon - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
    const y = (pt.lat - refLat) * scale;
    return new THREE.Vector3(x, 0.1, -y);
  });

  // Determine road width based on highway type
  const getLineWidth = (highwayType: string): number => {
    switch (highwayType) {
      case "motorway":
        return 3;
      case "trunk":
      case "primary":
        return 2.5;
      case "secondary":
        return 2;
      case "tertiary":
        return 1.5;
      case "residential":
      case "service":
        return 1;
      default:
        return 0.8;
    }
  };

  const lineWidth = getLineWidth(road.tags.highway);

  return (
    <Line
      points={points}
      color="#34f516"
      lineWidth={lineWidth}
      userData={{ exportToGLB: true }}
    />
  );
}
