/**
 * Propulsion — piston / twin / turbofan thrust & parameters.
 * Ref: FAA H-8083-25 (Pilot’s Handbook) engine instruments; simplified cycle model.
 */

import { sampleISA } from "../../Physics/Atmosphere/isa";
import type { EngineKind, EngineState, EnginePhase } from "../types";

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export interface EngineSpec {
  id: string;
  kind: EngineKind;
  maxThrustN: number;
  /** Idle fuel kg/s */
  idleFuelKgS: number;
  /** Full-power fuel kg/s */
  maxFuelKgS: number;
  densityExponent: number;
  staticThrustFactor: number;
}

export function enginesForClass(
  aircraftClass: string,
  maxThrustN: number,
  fuelBurnKgS: number,
): EngineSpec[] {
  if (aircraftClass === "tep") {
    return [
      {
        id: "eng-L",
        kind: "piston_twin",
        maxThrustN: maxThrustN * 0.5,
        idleFuelKgS: fuelBurnKgS * 0.12,
        maxFuelKgS: fuelBurnKgS * 0.5,
        densityExponent: 0.9,
        staticThrustFactor: 1.35,
      },
      {
        id: "eng-R",
        kind: "piston_twin",
        maxThrustN: maxThrustN * 0.5,
        idleFuelKgS: fuelBurnKgS * 0.12,
        maxFuelKgS: fuelBurnKgS * 0.5,
        densityExponent: 0.9,
        staticThrustFactor: 1.35,
      },
    ];
  }
  if (aircraftClass === "business_jet" || aircraftClass === "airliner") {
    const twin = aircraftClass === "airliner";
    const n = twin ? 2 : 2;
    const per = maxThrustN / n;
    return Array.from({ length: n }, (_, i) => ({
      id: i === 0 ? "eng-L" : "eng-R",
      kind: "turbofan" as EngineKind,
      maxThrustN: per,
      idleFuelKgS: fuelBurnKgS * 0.15 / n,
      maxFuelKgS: fuelBurnKgS / n,
      densityExponent: 0.7,
      staticThrustFactor: 1.05,
    }));
  }
  return [
    {
      id: "eng-1",
      kind: "piston_single",
      maxThrustN,
      idleFuelKgS: fuelBurnKgS * 0.15,
      maxFuelKgS: fuelBurnKgS,
      densityExponent: 0.9,
      staticThrustFactor: 1.35,
    },
  ];
}

export function createEngineState(spec: EngineSpec, running = true): EngineState {
  return {
    id: spec.id,
    kind: spec.kind,
    phase: running ? "idle" : "off",
    throttleLever: 0,
    rpmOrN1: running ? (spec.kind.includes("piston") ? 700 : 22) : 0,
    n2: running && !spec.kind.includes("piston") ? 55 : 0,
    egtC: running ? 420 : 15,
    oilPressurePsi: running ? 55 : 0,
    oilTempC: running ? 75 : 15,
    fuelFlowKgS: 0,
    thrustN: 0,
    health: 1,
    starter: false,
    mixture: 1,
  };
}

export function stepEngine(
  eng: EngineState,
  spec: EngineSpec,
  opts: {
    throttleLever: number;
    altM: number;
    tasMs: number;
    fuelAvailable: boolean;
    busLive: boolean;
    starterRequest: boolean;
    dt: number;
  },
): EngineState {
  const dt = opts.dt;
  let phase: EnginePhase = eng.phase;
  let rpm = eng.rpmOrN1;
  let n2 = eng.n2;
  let egt = eng.egtC;
  let oilP = eng.oilPressurePsi;
  let oilT = eng.oilTempC;
  const lever = clamp(opts.throttleLever, 0, 1);

  // Startup / shutdown state machine
  if (phase === "off" && opts.starterRequest && opts.busLive) {
    phase = "starting";
  }
  if (phase === "starting") {
    rpm = clamp(rpm + dt * 40, 0, spec.kind.includes("piston") ? 900 : 25);
    n2 = clamp(n2 + dt * 30, 0, 60);
    egt = clamp(egt + dt * 80, 15, 500);
    if (rpm > (spec.kind.includes("piston") ? 550 : 18) && opts.fuelAvailable) {
      phase = "idle";
    }
    if (!opts.busLive) phase = "off";
  }
  if ((phase === "idle" || phase === "running") && lever < 0.01 && opts.starterRequest === false) {
    // Allow intentional shutdown via mixture cut — if mixture 0
    if (eng.mixture < 0.05) phase = "shutdown";
  }
  if (phase === "shutdown") {
    rpm = Math.max(0, rpm - dt * 50);
    n2 = Math.max(0, n2 - dt * 40);
    if (rpm < 5) phase = "off";
  }
  if (!opts.fuelAvailable && (phase === "idle" || phase === "running")) {
    phase = "shutdown";
  }

  const running = phase === "idle" || phase === "running" || phase === "starting";
  if (running && lever > 0.05 && phase === "idle") phase = "running";
  if (running && lever <= 0.05 && phase === "running") phase = "idle";

  const atm = sampleISA(opts.altM);
  const dens = Math.pow(atm.densityKgM3 / 1.225, spec.densityExponent);
  const power = running && opts.fuelAvailable ? lever : 0;
  const vFactor =
    1 + (spec.staticThrustFactor - 1) * Math.exp(-opts.tasMs / 40);

  const thrustN =
    phase === "running" || phase === "idle"
      ? power * spec.maxThrustN * dens * vFactor * eng.health
      : phase === "starting"
        ? power * 0.05 * spec.maxThrustN
        : 0;

  const fuelFlow =
    running && opts.fuelAvailable
      ? spec.idleFuelKgS + power * (spec.maxFuelKgS - spec.idleFuelKgS)
      : 0;

  // Instrument dynamics
  const tgtRpm = spec.kind.includes("piston")
    ? running
      ? 700 + power * 2000
      : 0
    : running
      ? 22 + power * 78
      : 0;
  rpm += (tgtRpm - rpm) * Math.min(1, dt * 2.5);
  if (!spec.kind.includes("piston")) {
    const tgtN2 = running ? 55 + power * 45 : 0;
    n2 += (tgtN2 - n2) * Math.min(1, dt * 2);
  }
  const tgtEgt = running ? 400 + power * 350 : 15;
  egt += (tgtEgt - egt) * Math.min(1, dt * 1.2);
  oilP = running ? 40 + power * 40 : Math.max(0, oilP - dt * 20);
  oilT += ((running ? 70 + power * 40 : 15) - oilT) * Math.min(1, dt * 0.15);

  return {
    ...eng,
    phase,
    throttleLever: lever,
    rpmOrN1: rpm,
    n2,
    egtC: egt,
    oilPressurePsi: oilP,
    oilTempC: oilT,
    fuelFlowKgS: fuelFlow,
    thrustN,
    starter: opts.starterRequest,
  };
}
