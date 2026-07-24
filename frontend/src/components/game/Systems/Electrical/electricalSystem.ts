/**
 * Electrical system — battery, alternator, bus power for avionics & starters.
 */

import type { ElectricalState } from "../types";

export function createElectrical(running = true): ElectricalState {
  return {
    batteryV: running ? 28 : 24,
    batterySoc: 0.95,
    alternatorOn: running,
    externalPower: false,
    busLive: true,
    avionicsOn: true,
  };
}

export function stepElectrical(
  elec: ElectricalState,
  opts: {
    enginesProducing: boolean;
    loadAmps: number;
    dt: number;
  },
): ElectricalState {
  const altOn = opts.enginesProducing || elec.externalPower;
  let soc = elec.batterySoc;
  let v = elec.batteryV;

  if (altOn) {
    soc = Math.min(1, soc + opts.dt * 0.002);
    v = 28;
  } else {
    // Battery discharge under load
    soc = Math.max(0, soc - opts.dt * (0.0008 + opts.loadAmps * 0.00005));
    v = 20 + soc * 8;
  }

  const busLive = elec.externalPower || soc > 0.08 || altOn;
  return {
    ...elec,
    alternatorOn: altOn,
    batterySoc: soc,
    batteryV: v,
    busLive,
    avionicsOn: busLive && elec.avionicsOn,
  };
}
