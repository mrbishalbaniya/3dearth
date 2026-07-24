/**
 * Hydraulic system — powers gear, flaps, brakes, flight controls (boost).
 * Pressure decay models pump-off / leak scenarios.
 */

import type { HydraulicState } from "../types";

const NOMINAL_PSI = 3000;

export function createHydraulic(running = true): HydraulicState {
  return {
    pressurePsi: running ? NOMINAL_PSI : 0,
    pumpOn: running,
    effectiveness: running ? 1 : 0,
  };
}

export function stepHydraulic(
  hyd: HydraulicState,
  opts: {
    engineRunning: boolean;
    demand: number;
    dt: number;
  },
): HydraulicState {
  const pumpOn = opts.engineRunning;
  let p = hyd.pressurePsi;
  if (pumpOn) {
    p += (NOMINAL_PSI - p) * Math.min(1, opts.dt * 2);
    p -= opts.demand * opts.dt * 80;
  } else {
    p = Math.max(0, p - opts.dt * (120 + opts.demand * 200));
  }
  p = Math.min(NOMINAL_PSI, Math.max(0, p));
  const effectiveness = Math.min(1, p / (NOMINAL_PSI * 0.55));
  return { pressurePsi: p, pumpOn, effectiveness };
}
