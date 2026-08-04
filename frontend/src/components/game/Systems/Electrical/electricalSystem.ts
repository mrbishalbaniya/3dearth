/**
 * Electrical system — battery, alternator, bus power for avionics & starters.
 */

import type { ElectricalState } from "../types";

export function createElectrical(running = true): ElectricalState {
  return {
    batteryOn: running,
    batteryV: running ? 28 : 22,
    batterySoc: running ? 0.95 : 0.62,
    alternatorOn: running,
    externalPower: false,
    busLive: running,
    avionicsOn: running,
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

  if (elec.batteryOn || altOn) {
    if (elec.batteryOn && !altOn) {
      soc = Math.min(1, soc + opts.dt * 0.0012);
      v = Math.max(22, 22 + soc * 6.5);
    }
  }

  if (altOn) {
    soc = Math.min(1, soc + opts.dt * 0.002);
    v = 28;
  } else {
    // Battery discharge under load
    if (elec.batteryOn) {
      soc = Math.max(0, soc - opts.dt * (0.0008 + opts.loadAmps * 0.00005));
      v = 20 + soc * 8;
    } else {
      soc = Math.max(0, soc - opts.dt * 0.00008);
      v = 0;
    }
  }

  const busLive = elec.externalPower || altOn || (elec.batteryOn && soc > 0.08);
  return {
    ...elec,
    batteryOn: elec.batteryOn,
    alternatorOn: altOn,
    batterySoc: soc,
    batteryV: v,
    busLive,
    avionicsOn: busLive && elec.avionicsOn,
  };
}
