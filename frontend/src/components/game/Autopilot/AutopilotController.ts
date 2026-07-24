/**
 * Functional autopilot — HDG / ALT / VS / SPD with soft rate limits.
 */

export type ApLateralMode = "off" | "hdg" | "lnav" | "loc";
export type ApVerticalMode = "off" | "alt" | "vs" | "flc" | "vnav" | "gs";
export type ApSpeedMode = "off" | "spd" | "mach";

export interface AutopilotState {
  master: boolean;
  lateral: ApLateralMode;
  vertical: ApVerticalMode;
  speed: ApSpeedMode;
  targetHdgDeg: number;
  targetAltM: number;
  targetVsMs: number;
  targetSpeedMs: number;
}

export function createAutopilot(hdg = 0, altM = 1000): AutopilotState {
  return {
    master: false,
    lateral: "off",
    vertical: "off",
    speed: "off",
    targetHdgDeg: hdg,
    targetAltM: altM,
    targetVsMs: 0,
    targetSpeedMs: 60,
  };
}

function wrap180(deg: number) {
  let d = ((deg + 180) % 360) - 180;
  if (d < -180) d += 360;
  return d;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function stepAutopilot(
  ap: AutopilotState,
  sensors: {
    hdgDeg: number;
    altM: number;
    vsMs: number;
    tasMs: number;
  },
  dt: number,
): {
  ap: AutopilotState;
  cmd: { pitch: number; roll: number; yaw: number; throttle: number };
} {
  const cmd = { pitch: 0, roll: 0, yaw: 0, throttle: 0 };
  if (!ap.master) return { ap, cmd };

  const t = Math.min(0.1, Math.max(0.001, dt));

  if (ap.lateral === "hdg" || ap.lateral === "lnav") {
    const err = wrap180(ap.targetHdgDeg - sensors.hdgDeg);
    cmd.roll = clamp(err / 25, -1, 1);
    cmd.yaw = clamp(err / 60, -0.4, 0.4);
  }

  if (ap.vertical === "alt") {
    const altErr = ap.targetAltM - sensors.altM;
    const vsCmd = clamp(altErr * 0.08, -8, 8);
    const vsErr = vsCmd - sensors.vsMs;
    cmd.pitch = clamp(vsErr * 0.12, -0.85, 0.85);
  } else if (ap.vertical === "vs") {
    const vsErr = ap.targetVsMs - sensors.vsMs;
    cmd.pitch = clamp(vsErr * 0.15, -0.85, 0.85);
  }

  if (ap.speed === "spd") {
    const spdErr = ap.targetSpeedMs - sensors.tasMs;
    cmd.throttle = clamp(spdErr * 0.04 * t * 20, -1, 1);
  }

  return { ap, cmd };
}

/** @deprecated use stepAutopilot */
export class AutopilotController {
  state: AutopilotState;
  constructor() {
    this.state = createAutopilot();
  }
  get enabled() {
    return this.state.master;
  }
  update() {
    /* scaffold */
  }
}
