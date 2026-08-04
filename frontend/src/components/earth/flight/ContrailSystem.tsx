/**
 * Contrail System
 * High-performance contrail/vapor trail rendering for aircraft
 */

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Vector3,
  Color,
  Points,
  PointsMaterial,
  BufferAttribute,
  AdditiveBlending,
  Group,
  Line,
  LineBasicMaterial
} from "three";
import type { ContrailConfig } from "./types";

interface ContrailProps {
  /** Aircraft position */
  aircraftPosition: Vector3;
  
  /** Aircraft up vector */
  aircraftUp: Vector3;
  
  /** Whether contrail is active */
  active: boolean;
  
  /** Contrail configuration */
  config: ContrailConfig;
  
  /** Wind effect (optional) */
  windVector?: Vector3;
}

/**
 * Individual Contrail Component
 */
export const Contrail: React.FC<ContrailProps> = ({
  aircraftPosition,
  aircraftUp,
  active,
  config,
  windVector
}) => {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  
  // Contrail trail points history
  const trailPoints = useRef<Array<{
    position: Vector3;
    age: number;
    opacity: number;
  }>>([]);
  
  const maxPoints = config.length;
  
  // Geometry and material
  const { geometry, material } = useMemo(() => {
    const geometry = new BufferGeometry();
    
    // Pre-allocate arrays for performance
    const positions = new Float32Array(maxPoints * 3);
    const colors = new Float32Array(maxPoints * 3);
    const alphas = new Float32Array(maxPoints);
    
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new BufferAttribute(alphas, 1));
    
    const material = new PointsMaterial({
      size: config.width,
      transparent: true,
      opacity: config.opacity,
      blending: AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true
    });
    
    return { geometry, material };
  }, [config.width, config.opacity, maxPoints]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!pointsRef.current || !active) return;
    
    const points = pointsRef.current;
    const positionAttribute = points.geometry.getAttribute('position') as BufferAttribute;
    const colorAttribute = points.geometry.getAttribute('color') as BufferAttribute;
    const alphaAttribute = points.geometry.getAttribute('alpha') as BufferAttribute;
    
    // Add new point if aircraft is active
    if (active && aircraftPosition) {
      // Create slight offset for dual contrails (simulate engine positions)
      const rightWing = new Vector3().crossVectors(aircraftUp, new Vector3(0, 0, 1)).normalize();
      const leftOffset = aircraftPosition.clone().add(rightWing.clone().multiplyScalar(-0.02));
      const rightOffset = aircraftPosition.clone().add(rightWing.clone().multiplyScalar(0.02));
      
      trailPoints.current.push({
        position: leftOffset,
        age: 0,
        opacity: config.opacity
      });
      
      trailPoints.current.push({
        position: rightOffset,
        age: 0,
        opacity: config.opacity
      });
    }
    
    // Update existing points
    const fadeRate = config.fadeRate * delta;
    
    for (let i = trailPoints.current.length - 1; i >= 0; i--) {
      const point = trailPoints.current[i];
      point.age += delta;
      point.opacity = Math.max(0, point.opacity - fadeRate);
      
      // Apply wind effect
      if (windVector) {
        point.position.add(windVector.clone().multiplyScalar(delta * 0.1));
      }
      
      // Remove expired points
      if (point.opacity <= 0.01 || point.age > 30) {
        trailPoints.current.splice(i, 1);
      }
    }
    
    // Limit trail length
    while (trailPoints.current.length > maxPoints) {
      trailPoints.current.shift();
    }
    
    // Update geometry attributes
    const visiblePoints = Math.min(trailPoints.current.length, maxPoints);
    
    for (let i = 0; i < visiblePoints; i++) {
      const point = trailPoints.current[i];
      const index = i * 3;
      
      // Position
      positionAttribute.setXYZ(i, point.position.x, point.position.y, point.position.z);
      
      // Color (fade from white to transparent)
      const colorIntensity = point.opacity / config.opacity;
      colorAttribute.setXYZ(i, 
        config.color.r * colorIntensity,
        config.color.g * colorIntensity,
        config.color.b * colorIntensity
      );
      
      // Alpha
      alphaAttribute.setX(i, point.opacity);
    }
    
    // Update draw range
    points.geometry.setDrawRange(0, visiblePoints);
    
    // Mark attributes for update
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    alphaAttribute.needsUpdate = true;
  });
  
  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);
  
  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <primitive object={geometry} />
        <primitive object={material} />
      </points>
    </group>
  );
};

/**
 * Simplified Line-based Contrail (for better performance with many aircraft)
 */
export const SimpleContrail: React.FC<ContrailProps> = ({
  aircraftPosition,
  active,
  config
}) => {
  const lineRef = useRef<Line>(null);
  const trailPoints = useRef<Vector3[]>([]);
  
  const { geometry, material } = useMemo(() => {
    const geometry = new BufferGeometry();
    const material = new LineBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity * 0.6,
      blending: AdditiveBlending,
      linewidth: config.width
    });
    
    return { geometry, material };
  }, [config]);
  
  useFrame((state, delta) => {
    if (!lineRef.current || !active) return;
    
    // Add new point
    if (aircraftPosition) {
      trailPoints.current.push(aircraftPosition.clone());
    }
    
    // Limit trail length
    while (trailPoints.current.length > config.length) {
      trailPoints.current.shift();
    }
    
    // Update geometry
    if (trailPoints.current.length > 1) {
      const positions = new Float32Array(trailPoints.current.length * 3);
      trailPoints.current.forEach((point, i) => {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      });
      
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.attributes.position.needsUpdate = true;
    }
  });
  
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);
  
  if (trailPoints.current.length < 2) return null;
  
  return (
    <group>
      <line>
        <primitive object={geometry} />
        <primitive object={material} />
      </line>
    </group>
  );
};

/**
 * Multi-Contrail System for managing multiple aircraft contrails
 */
interface MultiContrailSystemProps {
  contrails: Array<{
    id: string;
    aircraftPosition: Vector3;
    aircraftUp: Vector3;
    active: boolean;
    config: ContrailConfig;
    windVector?: Vector3;
    useSimple?: boolean;
  }>;
}

export const MultiContrailSystem: React.FC<MultiContrailSystemProps> = ({
  contrails
}) => {
  return (
    <group>
      {contrails.map(contrail => {
        const ContrailComponent = contrail.useSimple ? SimpleContrail : Contrail;
        
        return (
          <ContrailComponent
            key={contrail.id}
            aircraftPosition={contrail.aircraftPosition}
            aircraftUp={contrail.aircraftUp}
            active={contrail.active}
            config={contrail.config}
            windVector={contrail.windVector}
          />
        );
      })}
    </group>
  );
};

/**
 * Default contrail configurations
 */
export const CONTRAIL_CONFIGS = {
  light: {
    length: 50,
    opacity: 0.3,
    width: 0.005,
    color: new Color(0xffffff),
    fadeRate: 0.02
  } as ContrailConfig,
  
  medium: {
    length: 80,
    opacity: 0.5,
    width: 0.008,
    color: new Color(0xf0f8ff),
    fadeRate: 0.015
  } as ContrailConfig,
  
  heavy: {
    length: 120,
    opacity: 0.7,
    width: 0.012,
    color: new Color(0xe6f3ff),
    fadeRate: 0.01
  } as ContrailConfig
};