import type { FlightCategory, TrafficAircraft } from "../types";

export type AirportOperationKind =
  | "departure"
  | "arrival"
  | "ga"
  | "cargo"
  | "helicopter"
  | "military"
  | "domestic"
  | "international";

export interface AirportTrafficPlan {
  id: string;
  airportIcao: string;
  aircraftId: string;
  callsign: string;
  category: FlightCategory;
  kind: AirportOperationKind;
  depIcao: string;
  destIcao: string;
  runwayId?: string | null;
  gateId?: string | null;
  scheduledAtMs: number;
  boardingCompleteAtMs?: number;
}

export interface RunwayState {
  airportIcao: string;
  runwayId: string;
  occupiedBy: string | null;
  depQueue: string[];
  arrQueue: string[];
  closed: boolean;
  lastReleaseMs: number;
}

export interface GateAssignment {
  airportIcao: string;
  gateId: string;
  aircraftId: string | null;
  category: FlightCategory | null;
}

export interface ATCDebugState {
  routes: string[];
  taxiPaths: string[];
  runwayQueues: string[];
  gateAssignments: string[];
  conflictWarnings: string[];
  trafficDensity: number;
  fps: number;
}

export interface AirportTrafficSnapshot {
  airportIcao: string;
  runwayId: string;
  runwayQueue: string[];
  arrivalQueue: string[];
  gateCount: number;
  occupiedGates: number;
  activeTraffic: number;
}

export interface AirportTrafficContext {
  aircraft: Map<string, TrafficAircraft>;
  airportIcao: string;
}
