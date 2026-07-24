/** Flight dynamics engine — public surface. */

export {
  stepFlightDynamics,
  createSpawnState,
  physicsModelFromSpec,
  wrap360,
  wrap180,
  clamp,
  type WindSample,
  type DynamicsEnv,
  type AircraftPhysicsModel,
} from "./FlightDynamics/step";

export { sampleISA, dynamicPressure } from "./Atmosphere/isa";
export { computeAero } from "./Aerodynamics/forces";
export type * from "./Aerodynamics/types";
export {
  G0,
  RHO0,
  EARTH_RADIUS_M,
  DEG2RAD,
  RAD2DEG,
} from "./Math/constants";
