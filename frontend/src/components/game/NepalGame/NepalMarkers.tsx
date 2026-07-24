"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NEPAL_CITIES, NEPAL_MOUNTAINS } from "./nepalConfig";
import { useNepalGameStore } from "./nepalGameStore";
import { useEarthStore } from "@/components/earth/store/earthStore";

const EARTH_RADIUS = 6.371; // in scene units

function latLngToVector3(lat: number, lng: number, altitude: number = 0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const radius = EARTH_RADIUS + altitude * 0.001;

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function NepalMarkers() {
  const citiesFound = useNepalGameStore((s) => s.citiesFound);
  const mountainsFound = useNepalGameStore((s) => s.mountainsFound);
  const addFoundCity = useNepalGameStore((s) => s.addFoundCity);
  const addFoundMountain = useNepalGameStore((s) => s.addFoundMountain);
  const addScore = useNepalGameStore((s) => s.addScore);

  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);

  const cityMarkersRef = useRef<THREE.Group>(null);
  const mountainMarkersRef = useRef<THREE.Group>(null);

  // Check proximity for discovery
  useEffect(() => {
    const discoveryRadius = Math.max(10000, altitudeM * 0.2); // 20% of altitude or min 10km

    // Check cities
    NEPAL_CITIES.forEach((city) => {
      if (citiesFound.includes(city.id)) return;
      
      const distance = calculateDistance(focusLat, focusLng, city.lat, city.lng);
      if (distance < discoveryRadius) {
        addFoundCity(city.id);
        addScore(50);
      }
    });

    // Check mountains
    NEPAL_MOUNTAINS.forEach((mountain) => {
      if (mountainsFound.includes(mountain.id)) return;
      
      const distance = calculateDistance(focusLat, focusLng, mountain.lat, mountain.lng);
      if (distance < discoveryRadius) {
        addFoundMountain(mountain.id);
        addScore(100);
      }
    });
  }, [focusLat, focusLng, altitudeM, citiesFound, mountainsFound, addFoundCity, addFoundMountain, addScore]);

  useFrame(({ camera }) => {
    // Billboard effect - markers always face camera
    if (cityMarkersRef.current) {
      cityMarkersRef.current.children.forEach((marker) => {
        marker.quaternion.copy(camera.quaternion);
      });
    }
    if (mountainMarkersRef.current) {
      mountainMarkersRef.current.children.forEach((marker) => {
        marker.quaternion.copy(camera.quaternion);
      });
    }
  });

  return (
    <>
      {/* City Markers */}
      <group ref={cityMarkersRef}>
        {NEPAL_CITIES.map((city) => {
          const position = latLngToVector3(city.lat, city.lng, city.elevationM);
          const found = citiesFound.includes(city.id);
          const isCapital = city.type === "capital";

          return (
            <group key={city.id} position={position}>
              {/* Marker Pin */}
              <mesh>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshBasicMaterial
                  color={found ? (isCapital ? "#fbbf24" : "#10b981") : "#6b7280"}
                  transparent
                  opacity={found ? 1 : 0.5}
                />
              </mesh>
              
              {/* Pulse effect for undiscovered */}
              {!found && (
                <mesh>
                  <ringGeometry args={[0.02, 0.03, 32]} />
                  <meshBasicMaterial
                    color="#6b7280"
                    transparent
                    opacity={0.3}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}

              {/* Label */}
              {found && (
                <sprite scale={[0.3, 0.1, 1]} position={[0, 0.05, 0]}>
                  <spriteMaterial
                    color={isCapital ? "#fbbf24" : "#10b981"}
                    transparent
                    opacity={0.9}
                  />
                </sprite>
              )}
            </group>
          );
        })}
      </group>

      {/* Mountain Markers */}
      <group ref={mountainMarkersRef}>
        {NEPAL_MOUNTAINS.map((mountain) => {
          const position = latLngToVector3(mountain.lat, mountain.lng, mountain.elevationM);
          const found = mountainsFound.includes(mountain.id);
          const isEverest = mountain.rank === 1;

          return (
            <group key={mountain.id} position={position}>
              {/* Mountain Peak Marker */}
              <mesh>
                <coneGeometry args={[0.025, 0.06, 4]} />
                <meshBasicMaterial
                  color={found ? (isEverest ? "#dc2626" : "#3b82f6") : "#6b7280"}
                  transparent
                  opacity={found ? 1 : 0.5}
                />
              </mesh>

              {/* Glow for discovered */}
              {found && (
                <pointLight
                  color={isEverest ? "#dc2626" : "#3b82f6"}
                  intensity={0.5}
                  distance={0.5}
                />
              )}

              {/* Label */}
              {found && (
                <sprite scale={[0.4, 0.12, 1]} position={[0, 0.08, 0]}>
                  <spriteMaterial
                    color={isEverest ? "#dc2626" : "#3b82f6"}
                    transparent
                    opacity={0.9}
                  />
                </sprite>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
