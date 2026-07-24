/**
 * Landing gear — extend/retract transit, strut compression, nose-wheel steering.
 */

import type { GearSystemState } from "../types";

export function createGear(down = true): GearSystemState {
  return {
    position: down ? 1 : 0,
    targetDown: down,
    transitioning: false,
    compression: [0.15, 0.15, 0.15],
    noseWheelSteeringDeg: 0,
    brakeTempC: 20,
  };
}

export function stepGear(
  gear: GearSystemState,
  opts: {
    toggle: boolean;
    onGround: boolean;
    hydraulicEff: number;
    yawInput: number;
    groundSpeedMs: number;
    brakes: boolean;
    weightOnWheels: boolean;
    dt: number;
  },
): GearSystemState {
  let targetDown = gear.targetDown;
  if (opts.toggle && !opts.onGround && opts.hydraulicEff > 0.3) {
    targetDown = !targetDown;
  }
  if (opts.onGround) targetDown = true;

  const rate = 0.45 * opts.hydraulicEff; // ~2.2 s full travel
  let position = gear.position;
  const goal = targetDown ? 1 : 0;
  if (Math.abs(position - goal) > 0.001) {
    position += Math.sign(goal - position) * Math.min(Math.abs(goal - position), rate * opts.dt);
  }

  // Strut compression when weight on wheels
  let compression: [number, number, number] = [...gear.compression];
  if (opts.weightOnWheels && position > 0.9) {
    const c = Math.min(0.85, 0.2 + opts.groundSpeedMs * 0.002);
    compression = [c * 0.9, c, c];
  } else {
    compression = compression.map((c) => Math.max(0, c - opts.dt * 2)) as [
      number,
      number,
      number,
    ];
  }

  // Nose-wheel steering (ground, low speed)
  let steer = gear.noseWheelSteeringDeg;
  if (opts.weightOnWheels && opts.groundSpeedMs < 40 && position > 0.9) {
    const maxSteer = opts.groundSpeedMs < 10 ? 55 : 20;
    steer = opts.yawInput * maxSteer;
  } else {
    steer *= Math.max(0, 1 - opts.dt * 3);
  }

  let brakeTemp = gear.brakeTempC;
  if (opts.brakes && opts.weightOnWheels) {
    brakeTemp += opts.dt * (8 + opts.groundSpeedMs * 0.4);
  } else {
    brakeTemp += (20 - brakeTemp) * Math.min(1, opts.dt * 0.05);
  }

  return {
    position,
    targetDown,
    transitioning: Math.abs(position - goal) > 0.02,
    compression,
    noseWheelSteeringDeg: steer,
    brakeTempC: brakeTemp,
  };
}
