'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CockpitCameraComponent } from '@/engine/physics/aircraft/components/CockpitCameraComponent';
import { AircraftPhysicsComponent } from '@/engine/physics/aircraft/components/AircraftPhysicsComponent';

interface CockpitViewProps {
  cameraComponent: CockpitCameraComponent;
  physicsComponent: AircraftPhysicsComponent;
  cockpitModelUrl?: string;
}

const CockpitModel: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} scale={[1, 1, 1]} />;
};

const CockpitCamera: React.FC<{ 
  cameraComponent: CockpitCameraComponent;
  physicsComponent: AircraftPhysicsComponent;
}> = ({ cameraComponent, physicsComponent }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { set } = useThree();

  useFrame((state, deltaTime) => {
    if (!cameraRef.current || !cameraComponent.isActive) return;

    // Update camera component
    cameraComponent.updateCamera(deltaTime, physicsComponent.state, physicsComponent.flightData);

    // Apply camera position and rotation
    const cam = cameraRef.current;
    const pos = cameraComponent.smoothedPosition;
    const target = cameraComponent.smoothedTarget;

    cam.position.set(pos.x, pos.y, pos.z);
    cam.lookAt(target.x, target.y, target.z);
    cam.updateMatrixWorld();
  });

  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current });
    }
  }, [set]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={cameraComponent.isActive}
      fov={cameraComponent.config.fieldOfView}
      near={cameraComponent.config.nearClip}
      far={cameraComponent.config.farClip}
      position={[
        cameraComponent.config.position.x,
        cameraComponent.config.position.y,
        cameraComponent.config.position.z
      ]}
    />
  );
};

const CockpitEnvironment: React.FC = () => {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      
      {/* Directional light (sunlight) */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Interior lighting */}
      <pointLight position={[0, 1, 0]} intensity={0.2} color="#ffffff" />
      <spotLight
        position={[0, 0.8, 1]}
        angle={Math.PI / 4}
        intensity={0.1}
        color="#ffeeaa"
        castShadow
      />
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#87CEEB', 100, 20000]} />
    </>
  );
};

const DefaultCockpit: React.FC = () => {
  return (
    <group>
      {/* Basic cockpit geometry */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1.5, 3]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Instrument panel */}
      <mesh position={[0, 0.2, 1.2]}>
        <boxGeometry args={[1.8, 0.8, 0.1]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      
      {/* Yoke/Stick */}
      <mesh position={[0, -0.3, 0.8]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      
      {/* Throttle quadrant */}
      <mesh position={[-0.5, -0.2, 0.5]}>
        <boxGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      
      {/* Seats */}
      <mesh position={[0, -0.5, -0.5]}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </group>
  );
};

export const CockpitView: React.FC<CockpitViewProps> = ({
  cameraComponent,
  physicsComponent,
  cockpitModelUrl
}) => {
  return (
    <div className="w-full h-full">
      <Canvas shadows>
        <CockpitCamera
          cameraComponent={cameraComponent}
          physicsComponent={physicsComponent}
        />
        
        <CockpitEnvironment />
        
        {cockpitModelUrl ? (
          <CockpitModel modelUrl={cockpitModelUrl} />
        ) : (
          <DefaultCockpit />
        )}
        
        {/* Ground plane for reference */}
        <mesh
          position={[0, -1000, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[10000, 10000]} />
          <meshStandardMaterial color="#4a5d23" />
        </mesh>
      </Canvas>
    </div>
  );
};