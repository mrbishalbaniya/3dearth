/**
 * Aircraft Renderer
 * High-performance 3D aircraft rendering with realistic orientation and banking
 */

import React, { useRef, useMemo, useEffect, Suspense } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Group,
  Vector3,
  Quaternion,
  Euler,
  Matrix4,
  Object3D,
  Mesh,
  MeshStandardMaterial,
  Color
} from "three";
import type { FlightState } from "./types";

interface AircraftProps {
  /** Current flight state */
  flightState: FlightState;
  
  /** 3D model path */
  modelPath: string;
  
  /** Aircraft scale */
  scale: number;
  
  /** Aircraft color/livery */
  color?: string | Color;
  
  /** Whether aircraft is visible */
  visible?: boolean;
  
  /** Banking sensitivity for turns */
  bankSensitivity?: number;
  
  /** Smooth orientation transitions */
  smoothing?: number;
}

/**
 * Individual Aircraft Component
 */
const Aircraft: React.FC<AircraftProps> = ({
  flightState,
  modelPath,
  scale,
  color,
  visible = true,
  bankSensitivity = 1.0,
  smoothing = 0.1
}) => {
  const groupRef = useRef<Group>(null);
  const aircraftRef = useRef<Group>(null);
  
  // Load 3D model
  const gltf = useLoader(GLTFLoader, modelPath);
  
  // Smooth orientation tracking
  const targetRotation = useRef(new Quaternion());
  const currentRotation = useRef(new Quaternion());
  const targetPosition = useRef(new Vector3());
  
  // Clone and prepare model
  const aircraftModel = useMemo(() => {
    const model = gltf.scene.clone();
    model.scale.setScalar(scale);
    
    // Apply color if specified
    if (color) {
      const aircraftColor = color instanceof Color ? color : new Color(color);
      model.traverse((child) => {
        if (child instanceof Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat instanceof MeshStandardMaterial) {
                mat.color.copy(aircraftColor);
              }
            });
          } else if (child.material instanceof MeshStandardMaterial) {
            child.material.color.copy(aircraftColor);
          }
        }
      });
    }
    
    return model;
  }, [gltf.scene, scale, color]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current || !visible || !flightState.position) return;
    
    const group = groupRef.current;
    
    // Update position
    targetPosition.current.copy(flightState.position);
    group.position.lerp(targetPosition.current, smoothing);
    
    // Calculate orientation matrix
    const forward = flightState.direction.clone().normalize();
    const up = flightState.up.clone().normalize();
    const right = new Vector3().crossVectors(forward, up).normalize();
    
    // Recalculate up vector to ensure orthogonality
    up.crossVectors(right, forward).normalize();
    
    // Apply banking for turns
    const bankRadians = (flightState.bankAngle * Math.PI) / 180 * bankSensitivity;
    const bankRotation = new Quaternion().setFromAxisAngle(forward, bankRadians);
    
    // Create orientation matrix
    const matrix = new Matrix4();
    matrix.makeBasis(right, up, forward.negate()); // Negate forward for correct orientation
    
    // Extract quaternion and apply banking
    const orientation = new Quaternion().setFromRotationMatrix(matrix);
    targetRotation.current.multiplyQuaternions(orientation, bankRotation);
    
    // Smooth rotation interpolation
    currentRotation.current.slerp(targetRotation.current, smoothing);
    group.setRotationFromQuaternion(currentRotation.current);
    
    // Update visibility
    group.visible = visible && !flightState.completed;
  });
  
  useEffect(() => {
    // Initialize position and rotation
    if (groupRef.current && flightState.position) {
      groupRef.current.position.copy(flightState.position);
      targetPosition.current.copy(flightState.position);
    }
  }, [flightState.position]);
  
  return (
    <group ref={groupRef} visible={visible}>
      <group ref={aircraftRef}>
        <primitive object={aircraftModel} />
      </group>
    </group>
  );
};

/**
 * Fallback simple aircraft (when 3D model fails to load)
 */
const SimpleAircraft: React.FC<Omit<AircraftProps, 'modelPath'>> = ({
  flightState,
  scale,
  color = new Color(0x0066cc),
  visible = true
}) => {
  const groupRef = useRef<Group>(null);
  
  const aircraftColor = color instanceof Color ? color : new Color(color);
  
  useFrame(() => {
    if (!groupRef.current || !visible || !flightState.position) return;
    
    const group = groupRef.current;
    group.position.copy(flightState.position);
    
    // Simple orientation
    const forward = flightState.direction.clone().normalize();
    const up = flightState.up.clone().normalize();
    group.lookAt(group.position.clone().add(forward));
    group.up.copy(up);
  });
  
  return (
    <group ref={groupRef} visible={visible}>
      <mesh scale={[scale * 2, scale * 0.5, scale * 0.3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={aircraftColor} />
      </mesh>
    </group>
  );
};

/**
 * Aircraft Renderer with Error Boundary
 */
interface AircraftRendererProps extends AircraftProps {
  fallbackToSimple?: boolean;
}

export const AircraftRenderer: React.FC<AircraftRendererProps> = ({
  fallbackToSimple = true,
  ...props
}) => {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary fallback={fallbackToSimple ? <SimpleAircraft {...props} /> : null}>
        <Aircraft {...props} />
      </ErrorBoundary>
    </Suspense>
  );
};

/**
 * Simple Error Boundary for 3D model loading
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.warn('Aircraft model failed to load:', error.message);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

/**
 * Multi-Aircraft Renderer for performance optimization
 */
interface MultiAircraftRendererProps {
  flights: Array<{
    id: string;
    flightState: FlightState;
    modelPath: string;
    scale: number;
    color?: Color;
    visible: boolean;
  }>;
}

export const MultiAircraftRenderer: React.FC<MultiAircraftRendererProps> = ({
  flights
}) => {
  // Group flights by model for potential instancing optimization
  const flightsByModel = useMemo(() => {
    const groups = new Map<string, typeof flights>();
    
    flights.forEach(flight => {
      if (!groups.has(flight.modelPath)) {
        groups.set(flight.modelPath, []);
      }
      groups.get(flight.modelPath)!.push(flight);
    });
    
    return groups;
  }, [flights]);
  
  return (
    <group>
      {Array.from(flightsByModel.entries()).map(([modelPath, modelFlights]) =>
        modelFlights.map(flight => (
          <AircraftRenderer
            key={flight.id}
            flightState={flight.flightState}
            modelPath={modelPath}
            scale={flight.scale}
            color={flight.color}
            visible={flight.visible}
          />
        ))
      )}
    </group>
  );
};