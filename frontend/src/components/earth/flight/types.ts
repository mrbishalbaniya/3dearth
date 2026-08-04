/**
 * Flight System Types
 * Production-ready types for realistic airplane flight simulation
 */

import { Vector3, Color, Object3D } from "three";

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface FlightConfiguration {
  /** Unique identifier for the flight */
  id: string;
  
  /** Origin coordinates */
  origin: GeoPosition;
  
  /** Destination coordinates */
  destination: GeoPosition;
  
  /** Flight speed in km/h */
  speedKmh: number;
  
  /** Altitude above Earth surface (default: Earth radius + 0.05) */
  altitude?: number;
  
  /** 3D model path or aircraft type */
  model: string;
  
  /** Scale of the aircraft model */
  scale: number;
  
  /** Flight path color */
  color: string | Color;
  
  /** Whether the flight should loop continuously */
  loop: boolean;
  
  /** Show contrails behind aircraft */
  contrails: boolean;
  
  /** Flight progress (0-1) */
  progress?: number;
  
  /** Whether flight is active */
  active?: boolean;
}

export interface FlightState {
  /** Current position on Earth surface */
  position: Vector3;
  
  /** Direction of travel (normalized) */
  direction: Vector3;
  
  /** Up vector (away from Earth center) */
  up: Vector3;
  
  /** Banking angle for turns */
  bankAngle: number;
  
  /** Current progress along route (0-1) */
  progress: number;
  
  /** Whether flight is complete */
  completed: boolean;
  
  /** Reference to the 3D object */
  aircraft?: Object3D;
  
  /** Reference to the flight path */
  flightPath?: Object3D;
  
  /** Reference to contrail system */
  contrails?: Object3D[];
}

export interface FlightCallbacks {
  /** Called when flight reaches destination */
  onComplete?: (flightId: string) => void;
  
  /** Called during flight progress */
  onProgress?: (flightId: string, progress: number) => void;
  
  /** Called when flight starts */
  onStart?: (flightId: string) => void;
}

export interface FlightManagerConfig {
  /** Earth radius for calculations */
  earthRadius: number;
  
  /** Default flight altitude offset */
  defaultAltitude: number;
  
  /** Maximum number of concurrent flights */
  maxFlights: number;
  
  /** Performance optimization level */
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}

export interface GreatCirclePoint {
  /** Position in 3D space */
  position: Vector3;
  
  /** Geographic coordinates */
  geo: GeoPosition;
  
  /** Distance along path (0-1) */
  t: number;
  
  /** Bearing at this point */
  bearing: number;
}

export interface ContrailConfig {
  /** Length of contrail trail */
  length: number;
  
  /** Opacity of contrail */
  opacity: number;
  
  /** Width of contrail */
  width: number;
  
  /** Color of contrail */
  color: Color;
  
  /** Fade rate */
  fadeRate: number;
}

export type FlightEventType = 'start' | 'progress' | 'complete' | 'loop';

export interface FlightEvent {
  type: FlightEventType;
  flightId: string;
  progress?: number;
  position?: Vector3;
}