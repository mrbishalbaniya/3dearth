/**
 * Control surface command → deflection (rad) with rate limits.
 * Pilot stick (−1..1) maps to max surface travel.
 */

import { DEG2RAD } from "../Math/constants";

export interface SurfaceLimits {
  elevMaxRad: number;
  ailMaxRad: number;
  rudMaxRad: number;
  /** rad/s */
  elevRate: number;
  ailRate: number;
  rudRate: number;
}

export const DEFAULT_SURFACE_LIMITS: SurfaceLimits = {
  elevMaxRad: 25 * DEG2RAD,
  ailMaxRad: 20 * DEG2RAD,
  rudMaxRad: 25 * DEG2RAD,
  elevRate: 60 * DEG2RAD,
  ailRate: 80 * DEG2RAD,
  rudRate: 60 * DEG2RAD,
};

function approach(current: number, target: number, rate: number, dt: number) {
  const d = target - current;
  const max = rate * dt;
  if (Math.abs(d) <= max) return target;
  return current + Math.sign(d) * max;
}

export function stepSurfaces(
  elev: number,
  ail: number,
  rud: number,
  cmdPitch: number,
  cmdRoll: number,
  cmdYaw: number,
  lim: SurfaceLimits,
  dt: number,
): { elevatorRad: number; aileronRad: number; rudderRad: number } {
  // Stick: pitch+ = pull back = positive elevator (nose up → usually +δe in our CmDe < 0)
  // Convention: positive elevator = trailing-edge down = nose-down moment if CmDe < 0 wait:
  // Standard: positive δe = TE down → negative Cm. Pilot pull (nose up) = TE up = negative δe.
  // cmdPitch > 0 means pull back → negative elevator deflection.
  const elevT = -cmdPitch * lim.elevMaxRad;
  const ailT = cmdRoll * lim.ailMaxRad;
  const rudT = cmdYaw * lim.rudMaxRad;
  return {
    elevatorRad: approach(elev, elevT, lim.elevRate, dt),
    aileronRad: approach(ail, ailT, lim.ailRate, dt),
    rudderRad: approach(rud, rudT, lim.rudRate, dt),
  };
}

export function stepThrottle(current: number, cmd: number, dt: number): number {
  // cmd is delta from input (−1..1) or absolute depending on binding — here rate
  const next = current + cmd * dt * 0.55;
  return Math.min(1, Math.max(0, next));
}
