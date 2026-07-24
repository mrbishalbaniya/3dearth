/**
 * Stability & control derivatives + geometry for linear aero model.
 * Sign conventions: body axes (x forward, y right, z down — NED-aligned body).
 * Ref: Etkin & Reid, Dynamics of Flight; Roskam Airplane Flight Dynamics.
 */

export interface AeroDerivatives {
  /** CL at α=0 */
  Cl0: number;
  /** dCL/dα (per rad) */
  ClAlpha: number;
  /** dCL/d(q̂) */
  ClQ: number;
  /** dCL/dδe (per rad) */
  ClDe: number;
  /** Parasite drag CD0 */
  Cd0: number;
  /** Induced drag factor k ≈ 1/(π e AR) */
  inducedDragK: number;
  /** Side-force Cyβ (per rad) */
  CyBeta: number;
  /** Cy_δr */
  CyDr: number;
  /** Rolling Clβ (per rad) — typically negative (dihedral) */
  ClBeta: number;
  /** Cl_p roll damping */
  ClP: number;
  /** Cl_r */
  ClR: number;
  /** Cl_δa */
  ClDa: number;
  /** Cl_δr */
  ClDr: number;
  /** Pitching Cm0 */
  Cm0: number;
  /** Cmα — static stability (negative) */
  CmAlpha: number;
  /** Cm_q pitch damping */
  CmQ: number;
  /** Cm_δe */
  CmDe: number;
  /** Cnβ weathercock (positive) */
  CnBeta: number;
  /** Cn_p */
  CnP: number;
  /** Cn_r yaw damping */
  CnR: number;
  /** Cn_δa adverse yaw */
  CnDa: number;
  /** Cn_δr */
  CnDr: number;
  /** Critical AoA (rad) */
  alphaStallRad: number;
  /** Oswald efficiency e */
  oswaldE: number;
}

export interface InertiaTensor {
  Ixx: number;
  Iyy: number;
  Izz: number;
  /** Product of inertia — kept 0 for principal-axis approx */
  Ixz: number;
}

export interface PropulsionModel {
  /** Max static thrust at sea level (N) */
  maxThrustN: number;
  /** Thrust falls with density^exponent */
  densityExponent: number;
  /** Prop efficiency factor for low-speed thrust boost (props) */
  staticThrustFactor: number;
}

export interface GearModel {
  /** Rolling resistance coeff μ_roll */
  muRoll: number;
  /** Brake friction μ_brake */
  muBrake: number;
  /** Parasite CD increment gear down */
  cdGear: number;
  /** Wheel contact height above CG (m) — CG above ground */
  cgHeightM: number;
}

export interface FlapModel {
  /** ΔCL at full flaps */
  dCl: number;
  /** ΔCD at full flaps */
  dCd: number;
  /** ΔCm at full flaps */
  dCm: number;
}

/** Complete physics package for one airframe */
export interface AircraftPhysicsModel {
  aero: AeroDerivatives;
  inertia: InertiaTensor;
  propulsion: PropulsionModel;
  gear: GearModel;
  flaps: FlapModel;
  wingSpanM: number;
  macM: number;
}
