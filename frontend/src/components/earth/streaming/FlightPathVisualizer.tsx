"use client";

import { useEffect, useRef } from "react";
import { BufferGeometry, LineBasicMaterial, Vector3, Line as ThreeLine, Group } from "three";
import type { FlightCorridor } from "./FlightCorridorEngine";

interface FlightPathVisualizerProps {
  corridor: FlightCorridor | null;
}

/**
 * Visualizes the flight path as a 3D line in the scene
 */
export function FlightPathVisualizer({ corridor }: FlightPathVisualizerProps) {
  const lineRef = useRef<ThreeLine | null>(null);
  const groupRef = useRef<Group | null>(null);

  useEffect(() => {
    if (!corridor || !groupRef.current || !corridor.routePoints) return;

    // Clear previous line
    if (lineRef.current) {
      groupRef.current.remove(lineRef.current);
      lineRef.current.geometry.dispose();
      (lineRef.current.material as LineBasicMaterial).dispose();
    }

    // Convert route coordinates to 3D points
    const points: Vector3[] = corridor.routePoints.map((coord) => {
      // Simple lat/lng to XZ projection (meters)
      const x = (coord.lng - 85.3) * 111000;
      const z = (coord.lat - 27.7) * 111000;
      const y = coord.altitudeM;

      return new Vector3(x, y, z);
    });

    // Create line geometry
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ 
      color: 0x00ff00,
      linewidth: 2,
    });

    const line = new ThreeLine(geometry, material);
    lineRef.current = line;
    groupRef.current.add(line);

  }, [corridor]);

  if (!corridor || !corridor.routePoints) return null;

  // Convert route coordinates for markers
  const points = corridor.routePoints.map((coord) => {
    const x = (coord.lng - 85.3) * 111000;
    const z = (coord.lat - 27.7) * 111000;
    const y = coord.altitudeM;
    return { x, y, z };
  });

  const departure = points[0];
  const arrival = points[points.length - 1];

  return (
    <group ref={groupRef}>
      {/* Departure airport marker (green cylinder) */}
      <mesh position={[departure.x, departure.y, departure.z]}>
        <cylinderGeometry args={[300, 300, 1000, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      {/* Arrival airport marker (red cylinder) */}
      <mesh position={[arrival.x, arrival.y, arrival.z]}>
        <cylinderGeometry args={[300, 300, 1000, 16]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Waypoint spheres every 10th point */}
      {points.map((point, idx) => {
        if (idx % 10 !== 0 || idx === 0 || idx === points.length - 1) return null;

        return (
          <mesh key={idx} position={[point.x, point.y, point.z]}>
            <sphereGeometry args={[150, 8, 8]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        );
      })}
    </group>
  );
}
