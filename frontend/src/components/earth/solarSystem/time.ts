/**
 * Shared simulation clock for solar-system bodies.
 * Always real UTC (+ optional store offset) — never a sped-up demo clock.
 */
import { useEarthStore } from "../store/earthStore";
import type { IauRotation } from "./physical";
import { iauPrimeMeridianRad } from "./physical";

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Current solar-system epoch (UTC ms + UI offset hours). */
export function getSolarSystemDate(now = Date.now()): Date {
  const offsetH = useEarthStore.getState().sunTimeOffsetHours;
  return new Date(now + offsetH * 3600_000);
}

/** Days since J2000.0 noon TT≈UTC for rotation / moon mean anomaly. */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / 86_400_000;
}

/**
 * Sidereal spin from period (legacy helper).
 * Prefer {@link iauRotationRad} for IAU W(d).
 */
export function siderealRotationRad(
  days: number,
  siderealDayDays: number,
  longitudeAtJ2000Deg = 0,
): number {
  if (!Number.isFinite(siderealDayDays) || Math.abs(siderealDayDays) < 1e-9) {
    return 0;
  }
  const turns = days / siderealDayDays;
  const lon0 = (longitudeAtJ2000Deg * Math.PI) / 180;
  return lon0 + turns * Math.PI * 2;
}

/** IAU WGCCRE prime-meridian orientation at date. */
export function iauRotationRad(days: number, rotation: IauRotation): number {
  return iauPrimeMeridianRad(days, rotation);
}
