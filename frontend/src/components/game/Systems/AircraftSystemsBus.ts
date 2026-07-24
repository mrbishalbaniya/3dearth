/**
 * AircraftSystemsBus — steps all aircraft systems and produces a physics snapshot.
 * Order: electrical → engines → fuel burn → hydraulic → gear/flaps.
 */

import type { AircraftSpec, FlightControlsInput, FlightState } from "../Types";
import {
  createEngineState,
  enginesForClass,
  stepEngine,
  type EngineSpec,
} from "./Engine/engineSystem";
import { createElectrical, stepElectrical } from "./Electrical/electricalSystem";
import { burnFuel, createFuelSystem } from "./Fuel/fuelSystem";
import { createHydraulic, stepHydraulic } from "./Hydraulic/hydraulicSystem";
import { createGear, stepGear } from "./Gear/gearSystem";
import type { AircraftSystemsState, SystemsSnapshot } from "./types";

export interface SystemsContext {
  engineSpecs: EngineSpec[];
}

export function createAircraftSystems(spec: AircraftSpec): {
  state: AircraftSystemsState;
  ctx: SystemsContext;
} {
  const engineSpecs = enginesForClass(
    spec.class,
    spec.maxThrustN,
    spec.fuelBurnKgS,
  );
  const engines = engineSpecs.map((e) => createEngineState(e, true));
  const fuel = createFuelSystem(spec.fuelCapacityKg, 0.85);
  const emptyMassKg = spec.massKg; // treat published mass as OE W approx
  return {
    ctx: { engineSpecs },
    state: {
      engines,
      fuel,
      electrical: createElectrical(true),
      hydraulic: createHydraulic(true),
      gear: createGear(true),
      emptyMassKg,
      totalMassKg: emptyMassKg + fuel.totalKg,
      totalThrustN: 0,
      flapsActual: 0,
    },
  };
}

export function stepAircraftSystems(
  state: AircraftSystemsState,
  ctx: SystemsContext,
  flight: FlightState,
  input: FlightControlsInput,
  dt: number,
): { state: AircraftSystemsState; snapshot: SystemsSnapshot } {
  const t = Math.min(0.1, Math.max(0.0005, dt));

  // Flaps command
  let flapsCmd = flight.flaps;
  if (input.toggleFlaps) {
    flapsCmd = flapsCmd < 0.25 ? 0.5 : flapsCmd < 0.75 ? 1 : 0;
  }

  // Electrical first (starter / bus)
  let electrical = stepElectrical(state.electrical, {
    enginesProducing: state.engines.some(
      (e) => e.phase === "running" || e.phase === "idle",
    ),
    loadAmps: 25 + (state.electrical.avionicsOn ? 15 : 0),
    dt: t,
  });

  // Engines
  const throttle =
    Math.min(1, Math.max(0, flight.throttle + input.throttle * t * 0.55));
  const engines = state.engines.map((eng, i) => {
    const spec = ctx.engineSpecs[i] ?? ctx.engineSpecs[0];
    return stepEngine(eng, spec, {
      throttleLever: throttle,
      altM: flight.altM,
      tasMs: flight.airspeedMs,
      fuelAvailable: !state.fuel.starved && state.fuel.totalKg > 0.5,
      busLive: electrical.busLive,
      starterRequest: false,
      dt: t,
    });
  });

  const demandFuel = engines.reduce((s, e) => s + e.fuelFlowKgS, 0);
  const burned = burnFuel(state.fuel, demandFuel, t);

  // Hydraulic
  const hydDemand =
    (input.toggleGear ? 0.8 : 0) +
    (Math.abs(flapsCmd - state.flapsActual) > 0.01 ? 0.4 : 0.05) +
    (input.brakes ? 0.3 : 0);
  const hydraulic = stepHydraulic(state.hydraulic, {
    engineRunning: engines.some((e) => e.phase === "running" || e.phase === "idle"),
    demand: hydDemand,
    dt: t,
  });

  // Gear
  const gear = stepGear(state.gear, {
    toggle: input.toggleGear,
    onGround: flight.onGround,
    hydraulicEff: hydraulic.effectiveness,
    yawInput: input.yaw,
    groundSpeedMs: flight.groundSpeedMs,
    brakes: input.brakes,
    weightOnWheels: flight.onGround,
    dt: t,
  });

  // Flaps limited by hydraulics
  const flapRate = 0.35 * hydraulic.effectiveness;
  let flapsActual = state.flapsActual;
  if (Math.abs(flapsCmd - flapsActual) > 0.001) {
    flapsActual +=
      Math.sign(flapsCmd - flapsActual) *
      Math.min(Math.abs(flapsCmd - flapsActual), flapRate * t);
  }

  const totalThrustN = engines.reduce((s, e) => s + e.thrustN, 0);
  const totalMassKg = state.emptyMassKg + burned.fuel.totalKg;

  const next: AircraftSystemsState = {
    engines,
    fuel: burned.fuel,
    electrical,
    hydraulic,
    gear,
    emptyMassKg: state.emptyMassKg,
    totalMassKg,
    totalThrustN,
    flapsActual,
  };

  const snapshot: SystemsSnapshot = {
    thrustN: burned.starved ? 0 : totalThrustN,
    massKg: totalMassKg,
    fuelKg: burned.fuel.totalKg,
    gearDown: gear.position > 0.85,
    gearPosition: gear.position,
    brakeFactor: input.brakes
      ? 0.3 + 0.7 * hydraulic.effectiveness
      : 0,
    controlAuthority: 0.35 + 0.65 * hydraulic.effectiveness,
    flaps: flapsActual,
    enginesRunning: engines.some(
      (e) => e.phase === "running" || e.phase === "idle",
    ),
    starved: burned.starved,
  };

  return { state: next, snapshot };
}

export function systemsToSnapshot(state: AircraftSystemsState): SystemsSnapshot {
  return {
    thrustN: state.totalThrustN,
    massKg: state.totalMassKg,
    fuelKg: state.fuel.totalKg,
    gearDown: state.gear.position > 0.85,
    gearPosition: state.gear.position,
    brakeFactor: state.hydraulic.effectiveness,
    controlAuthority: 0.35 + 0.65 * state.hydraulic.effectiveness,
    flaps: state.flapsActual,
    enginesRunning: state.engines.some(
      (e) => e.phase === "running" || e.phase === "idle",
    ),
    starved: state.fuel.starved,
  };
}
