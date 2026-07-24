/** Shared flight-sim types — future-ready for multiplayer / ATC / VR. */

import type { AircraftPhysicsModel } from "../Physics/Aerodynamics/types";

export type {
  AeroDerivatives,
  InertiaTensor,
  PropulsionModel,
  GearModel,
  FlapModel,
  AircraftPhysicsModel,
} from "../Physics/Aerodynamics/types";

export type GameMode = "explore" | "flight";

export type CameraMode =
  | "chase"
  | "cockpit"
  | "cockpit_fo"
  | "cockpit_jump"
  | "cockpit_overhead"
  | "cockpit_pedestal"
  | "instrument"
  | "free"
  | "wing"
  | "tower"
  | "drone"
  | "cinematic";

export type AircraftClass =
  | "sep"
  | "tep"
  | "business_jet"
  | "airliner"
  | "cargo"
  | "helicopter"
  | "fighter";

export interface AircraftSpec {
  id: string;
  name: string;
  class: AircraftClass;
  description: string;
  /** kg */
  massKg: number;
  /** m² */
  wingAreaM2: number;
  /** Wing aspect ratio AR = b²/S — used to seed induced drag */
  aspectRatio?: number;
  /** Newtons at full throttle (sea level) */
  maxThrustN: number;
  /** m/s IAS */
  stallSpeedMs: number;
  /** m/s IAS */
  maxSpeedMs: number;
  /** m/s cruise */
  cruiseSpeedMs: number;
  /** Critical AoA degrees */
  stallAoADeg: number;
  flapLiftFactor: number;
  flapDragFactor: number;
  gearDragFactor: number;
  /** kg */
  fuelCapacityKg: number;
  /** kg/s at full throttle */
  fuelBurnKgS: number;
  /** Visual scale for procedural exterior mesh */
  visualScale: number;
  unlocked: boolean;
  /**
   * Optional first-person cockpit GLB (public URL).
   * Overrides registry default for this aircraft.
   */
  cockpitModelUrl?: string | null;
  /** Uniform scale for cockpit GLB */
  cockpitModelScale?: number;
  /**
   * Optional exterior airframe GLB (Sketchfab / FR24 / custom).
   * When set (or registered), replaces procedural exterior mesh.
   */
  exteriorModelUrl?: string | null;
  /** Extra scale for exterior GLB */
  exteriorModelScale?: number;
  /** Optional full 6DOF aero package — auto-derived if omitted */
  physics?: AircraftPhysicsModel;
}

export interface RunwayInfo {
  id: string;
  headingDeg: number;
  lengthM: number;
  widthM: number;
}

export interface Airport {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** meters MSL */
  elevM: number;
  runways: RunwayInfo[];
  frequencies?: Array<{ type: string; mhz: number; name: string }>;
  gates?: Array<{ id: string; lat: number; lng: number }>;
}

export interface FlightControlsInput {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  flapsDelta: number;
  toggleGear: boolean;
  toggleFlaps: boolean;
  brakes: boolean;
}

/**
 * Public flight state — Euler for HUD, optional 6DOF continuity fields
 * for quaternion / body-axis integration between frames.
 */
export interface FlightState {
  lat: number;
  lng: number;
  /** meters MSL */
  altM: number;
  /** degrees — derived from quaternion each frame */
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
  /** m/s true airspeed magnitude */
  airspeedMs: number;
  /** m/s vertical (positive up) */
  verticalSpeedMs: number;
  throttle: number;
  /** 0 | 0.5 | 1 */
  flaps: number;
  gearDown: boolean;
  brakes: boolean;
  onGround: boolean;
  fuelKg: number;
  /** groundspeed m/s */
  groundSpeedMs: number;

  // —— 6DOF continuity (optional on first frame) ——
  quatW?: number;
  quatX?: number;
  quatY?: number;
  quatZ?: number;
  /** Body-axis velocity u,v,w (m/s) */
  uMs?: number;
  vMs?: number;
  wMs?: number;
  /** Body rates p,q,r (rad/s) */
  pRadS?: number;
  qRadS?: number;
  rRadS?: number;
  elevatorRad?: number;
  aileronRad?: number;
  rudderRad?: number;
  alphaDeg?: number;
  betaDeg?: number;
  loadFactor?: number;
  stalled?: boolean;
}

export interface NavRoute {
  destIcao: string | null;
  /** Departure airport (for corridor preload + airport scenery). */
  departureIcao?: string | null;
  /** Alternate airport — preloaded before diversion. */
  alternateIcao?: string | null;
  /** Optional corridor half-width override (km). */
  corridorBufferKm?: number;
  waypoints: Array<{ lat: number; lng: number; name?: string }>;
  distanceNm: number;
  etaSec: number | null;
  bearingDeg: number;
}

export type MissionId =
  | "free_flight"
  | "precision_landing"
  | "long_distance"
  | "island_hopping"
  | "mountain"
  | "emergency"
  | "weather_challenge"
  | "airport_challenge";

export interface MissionDef {
  id: MissionId;
  title: string;
  description: string;
  active: boolean;
}

export interface PlayerProgress {
  flightHours: number;
  unlocks: string[];
  achievements: string[];
  airportsVisited: string[];
  bindings: Record<string, string>;
}

export interface InputBindings {
  pitchUp: string;
  pitchDown: string;
  rollLeft: string;
  rollRight: string;
  yawLeft: string;
  yawRight: string;
  throttleUp: string;
  throttleDown: string;
  flaps: string;
  gear: string;
  brakes: string;
  camera: string;
  pause: string;
}
