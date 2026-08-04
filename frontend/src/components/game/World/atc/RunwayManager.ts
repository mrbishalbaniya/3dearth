/**
 * Runway assignment & occupancy — prevents dual occupancy / sequences dep/arr.
 */

import type { Airport } from "../../Types";
import { primaryRunway } from "../../Services/AirportService";
import type { AirportOpsState, RunwayOccupancy, TrafficAircraft } from "../types";

export function createAirportOps(airport: Airport, windFromDeg: number): AirportOpsState {
  const rw = primaryRunway(airport);
  // Prefer runway aligned into wind (reciprocal of wind-from)
  let active = rw;
  let bestDot = -Infinity;
  const intoWind = (windFromDeg + 180) % 360;
  for (const r of airport.runways.length ? airport.runways : [rw]) {
    const d = Math.cos(((r.headingDeg - intoWind) * Math.PI) / 180);
    if (d > bestDot) {
      bestDot = d;
      active = r;
    }
  }
  const runways: RunwayOccupancy[] = (airport.runways.length
    ? airport.runways
    : [rw]
  ).map((r) => ({
    airportIcao: airport.icao,
    runwayId: r.id,
    occupiedBy: null,
    depQueue: [],
    arrQueue: [],
    lastReleaseMs: 0,
  }));
  return {
    icao: airport.icao,
    activeRunwayId: active.id,
    windFromDeg,
    groundBusy: 0,
    runways,
  };
}

export function requestDepartureSlot(
  ops: AirportOpsState,
  ac: TrafficAircraft,
): { ok: boolean; runwayId: string; waitSec: number } {
  const rw =
    ops.runways.find((r) => r.runwayId === ops.activeRunwayId) ?? ops.runways[0];
  if (!rw) return { ok: false, runwayId: "00", waitSec: 60 };
  if (rw.occupiedBy && rw.occupiedBy !== ac.id) {
    if (!rw.depQueue.includes(ac.id)) rw.depQueue.push(ac.id);
    const idx = rw.depQueue.indexOf(ac.id);
    return { ok: false, runwayId: rw.runwayId, waitSec: 45 + idx * 40 };
  }
  const spacing = Date.now() - rw.lastReleaseMs < 50_000;
  if (spacing && rw.depQueue[0] && rw.depQueue[0] !== ac.id) {
    if (!rw.depQueue.includes(ac.id)) rw.depQueue.push(ac.id);
    return { ok: false, runwayId: rw.runwayId, waitSec: 40 };
  }
  rw.occupiedBy = ac.id;
  rw.depQueue = rw.depQueue.filter((id) => id !== ac.id);
  return { ok: true, runwayId: rw.runwayId, waitSec: 0 };
}

export function requestArrivalSlot(
  ops: AirportOpsState,
  ac: TrafficAircraft,
): { ok: boolean; runwayId: string; waitSec: number } {
  const rw =
    ops.runways.find((r) => r.runwayId === ops.activeRunwayId) ?? ops.runways[0];
  if (!rw) return { ok: false, runwayId: "00", waitSec: 60 };
  if (rw.occupiedBy && rw.occupiedBy !== ac.id) {
    if (!rw.arrQueue.includes(ac.id)) rw.arrQueue.push(ac.id);
    const idx = rw.arrQueue.indexOf(ac.id);
    return { ok: false, runwayId: rw.runwayId, waitSec: 60 + idx * 50 };
  }
  rw.occupiedBy = ac.id;
  rw.arrQueue = rw.arrQueue.filter((id) => id !== ac.id);
  return { ok: true, runwayId: rw.runwayId, waitSec: 0 };
}

export function releaseRunway(ops: AirportOpsState, runwayId: string, acId: string) {
  const rw = ops.runways.find((r) => r.runwayId === runwayId);
  if (!rw) return;
  if (rw.occupiedBy === acId) {
    rw.occupiedBy = null;
    rw.lastReleaseMs = Date.now();
  }
}

/** Horizontal separation check — returns true if conflict (< sepNm). */
export function hasSeparationConflict(
  a: TrafficAircraft,
  b: TrafficAircraft,
  sepNm = 3,
): boolean {
  if (a.id === b.id) return false;
  const dNm = Math.hypot(a.lat - b.lat, a.lng - b.lng) * 60;
  const dAlt = Math.abs(a.altM - b.altM);
  return dNm < sepNm && dAlt < 300;
}

export class RunwayManager {
  createAirportOps(airport: Airport, windFromDeg: number): AirportOpsState {
    return createAirportOps(airport, windFromDeg);
  }

  requestDepartureSlot(
    ops: AirportOpsState,
    ac: TrafficAircraft,
  ): { ok: boolean; runwayId: string; waitSec: number } {
    return requestDepartureSlot(ops, ac);
  }

  requestArrivalSlot(
    ops: AirportOpsState,
    ac: TrafficAircraft,
  ): { ok: boolean; runwayId: string; waitSec: number } {
    return requestArrivalSlot(ops, ac);
  }

  releaseRunway(ops: AirportOpsState, runwayId: string, acId: string): void {
    releaseRunway(ops, runwayId, acId);
  }

  selectActiveRunway(airport: Airport): string {
    return primaryRunway(airport).id;
  }

  runwayBusy(ops: AirportOpsState, runwayId: string): boolean {
    return !!ops.runways.find((entry) => entry.runwayId === runwayId)?.occupiedBy;
  }
}
