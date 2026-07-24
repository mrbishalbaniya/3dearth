/**
 * Per-flight systems session — holds EngineSpec context outside React state.
 */

import type { AircraftSpec } from "../Types";
import {
  createAircraftSystems,
  type SystemsContext,
} from "./AircraftSystemsBus";
import type { AircraftSystemsState } from "./types";

let ctx: SystemsContext | null = null;

export interface FlightSessionMeta {
  departureIcao: string;
  aircraftId: string;
  startMs: number;
  startFuelKg: number;
  startLat: number;
  startLng: number;
  maxAltM: number;
  distanceM: number;
  wasAirborne: boolean;
  landingFpm: number | null;
}

let meta: FlightSessionMeta | null = null;

export function beginSystemsSession(
  spec: AircraftSpec,
  opts: {
    departureIcao: string;
    aircraftId: string;
    lat: number;
    lng: number;
  },
): AircraftSystemsState {
  const created = createAircraftSystems(spec);
  ctx = created.ctx;
  meta = {
    departureIcao: opts.departureIcao,
    aircraftId: opts.aircraftId,
    startMs: Date.now(),
    startFuelKg: created.state.fuel.totalKg,
    startLat: opts.lat,
    startLng: opts.lng,
    maxAltM: 0,
    distanceM: 0,
    wasAirborne: false,
    landingFpm: null,
  };
  return created.state;
}

export function getSystemsContext(): SystemsContext | null {
  return ctx;
}

export function getFlightSessionMeta(): FlightSessionMeta | null {
  return meta;
}

export function patchFlightSessionMeta(
  partial: Partial<FlightSessionMeta>,
): void {
  if (!meta) return;
  meta = { ...meta, ...partial };
}

export function endSystemsSession(): FlightSessionMeta | null {
  const m = meta;
  ctx = null;
  meta = null;
  return m;
}
