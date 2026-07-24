/**
 * Aircraft systems shared types — FAA/ICAO-inspired simulation contracts.
 * Systems interact through the AircraftSystemsBus; physics consumes a snapshot.
 */

export type EngineKind =
  | "piston_single"
  | "piston_twin"
  | "turboprop"
  | "turbofan"
  | "regional_jet"
  | "widebody";

export type EnginePhase =
  | "off"
  | "starting"
  | "idle"
  | "running"
  | "shutdown"
  | "failed";

export interface EngineState {
  id: string;
  kind: EngineKind;
  phase: EnginePhase;
  /** Throttle lever 0..1 */
  throttleLever: number;
  /** Prop RPM or N1 % (0..110) */
  rpmOrN1: number;
  /** N2 % for turbines (0..110) */
  n2: number;
  /** Exhaust gas temperature °C */
  egtC: number;
  oilPressurePsi: number;
  oilTempC: number;
  /** kg/s instantaneous */
  fuelFlowKgS: number;
  /** Newtons produced along body-X */
  thrustN: number;
  /** 0..1 health — future wear model */
  health: number;
  starter: boolean;
  mixture: number;
}

export interface FuelTankState {
  id: "left" | "right" | "center";
  capacityKg: number;
  qtyKg: number;
  pumpOn: boolean;
}

export interface FuelSystemState {
  tanks: FuelTankState[];
  /** Selected feed: both | left | right | center */
  selector: "both" | "left" | "right" | "center";
  totalKg: number;
  imbalanceKg: number;
  starved: boolean;
}

export interface ElectricalState {
  batteryV: number;
  batterySoc: number;
  alternatorOn: boolean;
  externalPower: boolean;
  /** Essential / main bus live */
  busLive: boolean;
  avionicsOn: boolean;
}

export interface HydraulicState {
  /** PSI — nominal ~3000 */
  pressurePsi: number;
  pumpOn: boolean;
  /** 0..1 authority to powered actuators */
  effectiveness: number;
}

export interface GearSystemState {
  /** 0 = up, 1 = down */
  position: number;
  targetDown: boolean;
  transitioning: boolean;
  /** Compression 0..1 per strut (nose, left, right) */
  compression: [number, number, number];
  noseWheelSteeringDeg: number;
  brakeTempC: number;
}

export interface AircraftSystemsState {
  engines: EngineState[];
  fuel: FuelSystemState;
  electrical: ElectricalState;
  hydraulic: HydraulicState;
  gear: GearSystemState;
  /** Empty + payload (no fuel) */
  emptyMassKg: number;
  /** empty + fuel */
  totalMassKg: number;
  /** Aggregate thrust */
  totalThrustN: number;
  /** Flaps commanded 0..1 after hydraulic limit */
  flapsActual: number;
}

/** What the 6DOF integrator needs each frame */
export interface SystemsSnapshot {
  thrustN: number;
  massKg: number;
  fuelKg: number;
  gearDown: boolean;
  gearPosition: number;
  brakeFactor: number;
  controlAuthority: number;
  flaps: number;
  enginesRunning: boolean;
  starved: boolean;
}
