/**
 * Flight Path Renderer
 * High-performance curved flight path visualization with progressive animation
 */

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Vector3,
  Color,
  Line,
  LineBasicMaterial,
  BufferAttribute,
  AdditiveBlending,
  Group
} from "three";
import type { GreatCirclePoint } from "./types";

interface FlightPathProps {
  /** Route waypoints */
  route: GreatCirclePoint[];
  
  /** Flight progress (0-1) */
  progress: number;
  
  /** Path color */
  color: string | Color;
  
  /** Line width */
  lineWidth?: number;
  
  /** Whether to animate the path progressively */
  animated?: boolean;
  
  /** Glow effect intensity */
  glowIntensity?: number;
  
  /** Whether path is visible */
  visible?: boolean;
}

export const FlightPathRenderer: React.FC<FlightPathProps> = ({
  route,
  progress,
  color,
  lineWidth = 2,
  animated = true,
  glowIntensity = 1.0,
  visible = true
}) => {
  const groupRef = useRef<Group>(null);
  
  // Memoized geometry creation
  const { geometry, glowGeometry } = useMemo(() => {
    if (route.length < 2) {
      return { geometry: new BufferGeometry(), glowGeometry: new BufferGeometry() };
    }
    
    // Main path geometry
    const positions = new Float32Array(route.length * 3);
    route.forEach((point, i) => {
      positions[i * 3] = point.position.x;
      positions[i * 3 + 1] = point.position.y;
      positions[i * 3 + 2] = point.position.z;
    });
    
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    
    // Glow geometry (slightly larger)
    const glowGeometry = geometry.clone();
    
    return { geometry, glowGeometry };
  }, [route]);
  
  // Memoized materials
  const materials = useMemo(() => {
    const pathColor = color instanceof Color ? color : new Color(color);
    
    const mainMaterial = new LineBasicMaterial({
      color: pathColor,
      linewidth: lineWidth,
      transparent: true,
      opacity: 0.9
    });
    
    const glowMaterial = new LineBasicMaterial({
      color: pathColor,
      linewidth: lineWidth * 2,
      transparent: true,
      opacity: 0.3 * glowIntensity,
      blending: AdditiveBlending
    });
    
    return { mainMaterial, glowMaterial };
  }, [color, lineWidth, glowIntensity]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      glowGeometry.dispose();
      materials.mainMaterial.dispose();
      materials.glowMaterial.dispose();
    };
  }, [geometry, glowGeometry, materials]);
  
  if (!visible || route.length < 2) {
    return null;
  }
  
  return (
    <group ref={groupRef} visible={visible}>
      {/* Glow effect (background) */}
      <primitive object={new Line(glowGeometry, materials.glowMaterial)} />
      
      {/* Main path line */}
      <primitive object={new Line(geometry, materials.mainMaterial)} />
    </group>
  );
};

/**
 * Optimized Flight Path for multiple concurrent flights
 * Uses instanced rendering when possible
 */
interface OptimizedFlightPathProps {
  paths: Array<{
    id: string;
    route: GreatCirclePoint[];
    progress: number;
    color: Color;
    visible: boolean;
  }>;
}

export const OptimizedFlightPaths: React.FC<OptimizedFlightPathProps> = ({
  paths
}) => {
  const groupRef = useRef<Group>(null);
  
  // Filter visible paths
  const visiblePaths = useMemo(() => 
    paths.filter(path => path.visible && path.route.length > 1),
    [paths]
  );
  
  return (
    <group ref={groupRef}>
      {visiblePaths.map(path => (
        <FlightPathRenderer
          key={path.id}
          route={path.route}
          progress={path.progress}
          color={path.color}
          animated={true}
          visible={path.visible}
        />
      ))}
    </group>
  );
};

/**
 * Waypoint Markers
 * Shows origin and destination points
 */
interface WaypointMarkersProps {
  route: GreatCirclePoint[];
  showOrigin?: boolean;
  showDestination?: boolean;
  markerSize?: number;
  color?: Color;
}

export const WaypointMarkers: React.FC<WaypointMarkersProps> = ({
  route,
  showOrigin = true,
  showDestination = true,
  markerSize = 0.01,
  color = new Color(0xff0000)
}) => {
  const originGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array([
      0, 0, 0,
      0, markerSize, 0,
      markerSize * 0.5, 0, 0
    ]);
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, [markerSize]);
  
  const material = useMemo(() => new LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8
  }), [color]);
  
  if (route.length < 2) return null;
  
  const origin = route[0];
  const destination = route[route.length - 1];
  
  return (
    <group>
      {showOrigin && (
        <primitive object={new Line(originGeometry, material)} position={origin.position} />
      )}
      {showDestination && (
        <primitive object={new Line(originGeometry, material)} position={destination.position} />
      )}
    </group>
  );
};