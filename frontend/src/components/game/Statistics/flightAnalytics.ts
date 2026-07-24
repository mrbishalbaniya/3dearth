/**
 * In-flight / post-flight analytics — statistics for pilot scoring.
 */

import type { FlightState } from "../Types";

export interface FlightAnalytics {
  distanceM: number;
  fuelUsedKg: number;
  maxLoadFactor: number;
  maxVerticalSpeedMs: number;
  stallEvents: number;
  hardLanding: boolean;
  samples: number;
  sumSpeedMs: number;
}

export function createAnalytics(): FlightAnalytics {
  return {
    distanceM: 0,
    fuelUsedKg: 0,
    maxLoadFactor: 1,
    maxVerticalSpeedMs: 0,
    stallEvents: 0,
    hardLanding: false,
    samples: 0,
    sumSpeedMs: 0,
  };
}

export function updateAnalytics(
  a: FlightAnalytics,
  prev: FlightState | null,
  next: FlightState,
  dt: number,
  startFuelKg: number,
): FlightAnalytics {
  const gs = next.groundSpeedMs;
  return {
    distanceM: a.distanceM + gs * dt,
    fuelUsedKg: Math.max(0, startFuelKg - next.fuelKg),
    maxLoadFactor: Math.max(a.maxLoadFactor, Math.abs(next.loadFactor ?? 1)),
    maxVerticalSpeedMs: Math.max(
      a.maxVerticalSpeedMs,
      Math.abs(next.verticalSpeedMs),
    ),
    stallEvents: a.stallEvents + (next.stalled && !prev?.stalled ? 1 : 0),
    hardLanding:
      a.hardLanding ||
      (next.onGround &&
        !prev?.onGround &&
        Math.abs(prev?.verticalSpeedMs ?? 0) > 3.5),
    samples: a.samples + 1,
    sumSpeedMs: a.sumSpeedMs + gs,
  };
}

export function reportAnalytics(a: FlightAnalytics): {
  avgSpeedKt: number;
  distanceNm: number;
  smoothness: number;
  hardLanding: boolean;
} {
  const avgMs = a.samples > 0 ? a.sumSpeedMs / a.samples : 0;
  // Smoothness: inverse of peak load excursions (simple heuristic)
  const smoothness = Math.max(0, 100 - (a.maxLoadFactor - 1) * 40 - a.stallEvents * 5);
  return {
    avgSpeedKt: avgMs * 1.94384,
    distanceNm: a.distanceM / 1852,
    smoothness,
    hardLanding: a.hardLanding,
  };
}
