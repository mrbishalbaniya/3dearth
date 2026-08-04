'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useAircraftPhysics } from '../../engine/physics/aircraft/hooks/useAircraftPhysics';
import { AircraftHUD } from '../../engine/physics/aircraft/ui/AircraftHUD';
import { AircraftControls } from '../../engine/physics/aircraft/ui/AircraftControls';
import { CESSNA_172_CONFIG } from '../../engine/physics/aircraft/presets/AircraftPresets';
import { AircraftPhysicsConfig, Vector3D } from '../../engine/physics/aircraft/types/AircraftTypes';
import * as THREE from 'three';

interface AircraftModelProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface AircraftSimulatorProps {
  aircraftConfig?: Partial<AircraftPhysicsConfig>;
  initialPosition?: Vector3D;
}

function AircraftModel({ position, rotation }: AircraftModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position);
      meshRef.current.rotation.set(...rotation);
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Simple aircraft representation */}
      <group>
        {/* Fuselage */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.2, 4, 8]} />
          <meshStandardMaterial color="#c0c0c0" />
        </mesh>
        
        {/* Wings */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.2, 8, 1]} />
          <meshStandardMaterial color="#d0d0d0" />
        </mesh>
        
        {/* Tail */}
        <mesh position={[0, 0, -1.5]}>
          <boxGeometry args={[0.1, 2, 1]} />
          <meshStandardMaterial color="#d0d0d0" />
        </mesh>
        
        {/* Vertical stabilizer */}
        <mesh position={[0, 1, -1.5]}>
          <boxGeometry args={[0.1, 1, 1.5]} />
          <meshStandardMaterial color="#d0d0d0" />
        </mesh>
        
        {/* Propeller */}
        <mesh position={[0, 0, 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3, 4]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    </mesh>
  );
}

function CockpitCamera({ 
  position, 
  target, 
  shake 
}: { 
  position: [number, number, number];
  target: [number, number, number];
  shake: { intensity: number; frequency: number };
}) {
  const { camera } = useThree();
  const shakeTime = useRef(0);

  useFrame((_, delta) => {
    shakeTime.current += delta;
    
    // Apply shake
    const shakeX = Math.sin(shakeTime.current * shake.frequency * 2.1) * shake.intensity;
    const shakeY = Math.sin(shakeTime.current * shake.frequency * 1.7) * shake.intensity;
    const shakeZ = Math.sin(shakeTime.current * shake.frequency * 2.3) * shake.intensity * 0.5;
    
    camera.position.set(
      position[0] + shakeX,
      position[1] + shakeY,
      position[2] + shakeZ
    );
    
    camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10000, 10000]} />
      <meshStandardMaterial color="#4a5c3a" />
    </mesh>
  );
}

export function AircraftSimulator({
  aircraftConfig,
  initialPosition = { x: 0, y: 0, z: 50 }
}: AircraftSimulatorProps) {
  const [cameraMode, setCameraMode] = useState<'cockpit' | 'external'>('external');
  const [showHUD, setShowHUD] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const mergedConfig: AircraftPhysicsConfig = {
    ...CESSNA_172_CONFIG,
    ...(aircraftConfig ?? {})
  };

  const aircraft = useAircraftPhysics({
    config: mergedConfig,
    initialPosition,
    autoUpdate: true
  });

  const aircraftPosition = aircraft.getAircraftPosition();
  const aircraftOrientation = aircraft.getAircraftOrientation();

  // Convert physics data to Three.js format
  const position: [number, number, number] = aircraftPosition 
    ? [aircraftPosition.x, aircraftPosition.z, -aircraftPosition.y] 
    : [0, 50, 0];

  const rotation: [number, number, number] = aircraftOrientation
    ? [
        aircraft.flightData.pitch * Math.PI / 180,
        aircraft.flightData.heading * Math.PI / 180,
        -aircraft.flightData.roll * Math.PI / 180
      ]
    : [0, 0, 0];

  const cockpitPosition: [number, number, number] = [
    position[0],
    position[1] + 0.5,
    position[2]
  ];

  const cockpitTarget: [number, number, number] = [
    position[0] + Math.sin(rotation[1]) * 10,
    position[1],
    position[2] - Math.cos(rotation[1]) * 10
  ];

  return (
    <div className="w-full h-screen relative">
      {/* 3D Scene */}
      <Canvas>
        <Environment preset="sunset" />
        <ambientLight intensity={0.3} />
        <directionalLight 
          position={[100, 100, 50]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Camera */}
        {cameraMode === 'cockpit' ? (
          <>
            <CockpitCamera
              position={cockpitPosition}
              target={cockpitTarget}
              shake={{
                intensity: aircraft.flightData.gForce > 1 ? (aircraft.flightData.gForce - 1) * 0.02 : 0,
                frequency: aircraft.engine.rpm / 100
              }}
            />
          </>
        ) : (
          <>
            <OrbitControls 
              target={position}
              enableDamping
              dampingFactor={0.05}
            />
          </>
        )}

        {/* Ground */}
        <Ground />

        {/* Aircraft */}
        <AircraftModel position={position} rotation={rotation} />

        {/* Clouds */}
        <group position={[0, 200, 0]}>
          {Array.from({ length: 20 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * 2000,
              Math.random() * 100,
              (Math.random() - 0.5) * 2000
            ]}>
              <sphereGeometry args={[20, 8, 6]} />
              <meshBasicMaterial color="white" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      </Canvas>

      {/* UI Overlays */}
      {showHUD && (
        <AircraftHUD
          flightData={aircraft.flightData}
          engine={aircraft.engine}
          landingGear={aircraft.landingGear}
          flaps={aircraft.flaps}
          fuel={aircraft.fuel}
        />
      )}

      {showControls && (
        <AircraftControls
          controls={aircraft.controls}
          onControlChange={aircraft.updateControls}
        />
      )}

      {/* Control Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 rounded p-2 flex space-x-2">
        <button
          onClick={() => setCameraMode(cameraMode === 'cockpit' ? 'external' : 'cockpit')}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          {cameraMode === 'cockpit' ? 'External View' : 'Cockpit View'}
        </button>
        
        <button
          onClick={() => setShowHUD(!showHUD)}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
        >
          {showHUD ? 'Hide HUD' : 'Show HUD'}
        </button>
        
        <button
          onClick={() => setShowControls(!showControls)}
          className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
        
        <button
          onClick={aircraft.resetAircraft}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}