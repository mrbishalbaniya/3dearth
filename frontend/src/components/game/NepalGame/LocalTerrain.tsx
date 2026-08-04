"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { PlaneGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { useGameStore } from "../store/gameStore";

/**
 * LocalTerrain - Renders only a flat terrain patch around the airplane
 * instead of the full Earth globe. Follows airplane position for performance.
 */
export function LocalTerrain() {
  const meshRef = useRef<Mesh>(null);
  const { camera } = useThree();
  
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  
  const flightState = useGameStore((s) => s.flightState);

  // Create a large flat terrain patch
  const geometry = useMemo(() => {
    // 50km x 50km terrain patch, high detail for close viewing
    return new PlaneGeometry(50000, 50000, 200, 200);
  }, []);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: 0x8B7355, // Brown terrain color
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
    });
  }, []);

  useFrame(() => {
    if (!meshRef.current || !flightState) return;

    // Position terrain patch below the airplane
    // Convert lat/lng to approximate XZ coordinates (simplified flat projection)
    const x = focusLng * 111320 * Math.cos(focusLat * Math.PI / 180); // meters
    const z = -focusLat * 110540; // meters (negative because Z-up convention)
    
    meshRef.current.position.set(x, 0, z);
    
    // Rotate to be horizontal (flat ground)
    meshRef.current.rotation.x = -Math.PI / 2;
    
    // Add slight elevation variation based on Nepal terrain (simplified)
    const baseElevation = 1000; // 1km base elevation for Nepal
    meshRef.current.position.y = baseElevation;
  });

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} receiveShadow />
      
      {/* Ambient light for visibility */}
      <ambientLight intensity={0.6} />
      
      {/* Directional light (sun) */}
      <directionalLight
        position={[100000, 150000, 100000]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500000}
        shadow-camera-left={-50000}
        shadow-camera-right={50000}
        shadow-camera-top={50000}
        shadow-camera-bottom={-50000}
      />
      
      {/* Sky color */}
      <color attach="background" args={["#87CEEB"]} />
      
      {/* Fog for distance */}
      <fog attach="fog" args={["#87CEEB", 10000, 80000]} />
    </>
  );
}
