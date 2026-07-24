/**
 * Living-world ATC / traffic contracts.
 * Inspired by ICAO Doc 4444 (PANS-ATM) roles — simplified for browser sim.
 */

export type TrafficLod = "global" | "regional" | "full";

export type FlightCategory =
  | "airline"
  | "cargo"
  | "business"
  | "ga"
  | "regional"
  | "emergency"
  | "sar";

/** AI pilot operational phases (decision-driven, not scripted timelines). */
export type AiPilotPhase =
  | "parked"
  | "boarding"
  | "pushback"
  | "engine_start"
  | "taxi_out"
  | "holding_short"
  | "lineup"
  | "takeoff"
  | "initial_climb"
  | "cruise"
  | "descent"
  | "approach"
  | "landing"
  | "taxi_in"
  | "shutdown"
  | "diverting";

export type AtcFacility =
  | "ground"
  | "tower"
  | "departure"
  | "approach"
  | "center"
  | "unicom";

export type ClearanceType =
  | "pushback"
  | "taxi"
  | "hold_short"
  | "lineup_wait"
  | "takeoff"
  | "climb"
  | "cruise"
  | "descend"
  | "approach"
  | "landing"
  | "taxi_in"
  | "go_around";

export interface AtcClearance {
  id: string;
  facility: AtcFacility;
  type: ClearanceType;
  text: string;
  runwayId?: string;
  altitudeM?: number;
  headingDeg?: number;
  issuedAtMs: number;
  /** Who it applies to — player callsign or AI id */
  targetId: string;
}

export interface TrafficAircraft {
  id: string;
  callsign: string;
  category: FlightCategory;
  lod: TrafficLod;
  phase: AiPilotPhase;
  lat: number;
  lng: number;
  altM: number;
  hdgDeg: number;
  tasMs: number;
  vsMs: number;
  /** Origin / destination ICAO */
  depIcao: string;
  destIcao: string;
  alternateIcao: string | null;
  runwayId: string | null;
  /** Great-circle progress 0..1 while airborne */
  routeProgress: number;
  /** Assigned cruise altitude */
  cruiseAltM: number;
  /** Pending / active clearance */
  clearance: ClearanceType | null;
  /** Seconds in current phase (decision timer) */
  phaseAgeSec: number;
  /** Squawk / emergency flag */
  emergency: boolean;
  /** Gate / parking index */
  gateIdx: number;
}

export interface RunwayOccupancy {
  airportIcao: string;
  runwayId: string;
  /** Aircraft id occupying or null */
  occupiedBy: string | null;
  /** Departure / arrival queue */
  depQueue: string[];
  arrQueue: string[];
  lastReleaseMs: number;
}

export interface AirportOpsState {
  icao: string;
  activeRunwayId: string;
  windFromDeg: number;
  /** Boarding / pushback slots in use */
  groundBusy: number;
  runways: RunwayOccupancy[];
}

export interface TrafficAnalytics {
  flightsCompleted: number;
  goArounds: number;
  conflictsResolved: number;
  avgTaxiSec: number;
  activeFull: number;
  activeRegional: number;
  activeGlobal: number;
}

export interface PlayerAtcState {
  facility: AtcFacility;
  callsign: string;
  pendingRequest: ClearanceType | null;
  lastClearance: AtcClearance | null;
  messages: AtcClearance[];
  frequencyMhz: number;
}
