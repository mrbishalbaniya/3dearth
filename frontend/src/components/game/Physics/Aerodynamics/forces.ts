/**
 * Aerodynamic forces & moments in body axes.
 * Wind axes: lift ⊥ V_rel, drag ∥ −V_rel, then rotated to body via α, β.
 *
 * Ref: Etkin & Reid §2–3; NASA TP-1998-206920 (common aero conventions).
 */

import { dynamicPressure } from "../Atmosphere/isa";
import type { AeroDerivatives, FlapModel, GearModel } from "./types";
import type { Vec3 } from "../Math/quat";
import { DEG2RAD } from "../Math/constants";

export interface AeroState {
  /** Body velocity u,v,w (m/s) */
  velBody: Vec3;
  /** Body rates p,q,r (rad/s) */
  omega: Vec3;
  /** Elevator / aileron / rudder (rad) */
  elevatorRad: number;
  aileronRad: number;
  rudderRad: number;
  /** Flaps 0..1 */
  flaps: number;
  gearDown: boolean;
  /** Altitude AGL for ground effect (m) */
  aglM: number;
  /** Wing span (m) — ground effect scale */
  wingSpanM: number;
  /** Mean aerodynamic chord (m) */
  macM: number;
  wingAreaM2: number;
  rho: number;
}

export interface AeroResult {
  /** Body forces Fx,Fy,Fz (N) — z positive down */
  forceBody: Vec3;
  /** Body moments L,M,N (N·m) */
  momentBody: Vec3;
  alphaRad: number;
  betaRad: number;
  Cl: number;
  Cd: number;
  tasMs: number;
  qBar: number;
  stalled: boolean;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Ground-effect CL multiplier — approximate mirror-image method.
 * σ ≈ (16 h/b)² / (1 + (16 h/b)²) → lift↑ as h→0.
 * We use effective k reduction + CL boost.
 */
function groundEffectFactor(aglM: number, spanM: number): number {
  const hb = Math.max(0.05, aglM) / Math.max(1, spanM);
  const denom = 1 + (16 * hb) * (16 * hb);
  // Returns 1 at high altitude, up to ~1.25 near ground
  return 1 + 0.25 / denom;
}

/**
 * Post-stall CL: linear to stall, then soft drop (not abrupt departure model).
 */
function liftCurve(
  alpha: number,
  alphaStall: number,
  Cl0: number,
  ClAlpha: number,
  flapCl: number,
): { Cl: number; stalled: boolean } {
  const ClLinear = Cl0 + ClAlpha * alpha + flapCl;
  if (alpha <= alphaStall && alpha >= -alphaStall * 0.7) {
    return { Cl: ClLinear, stalled: false };
  }
  // Soft stall — CL falls toward ~0.4 of peak
  const over = Math.abs(alpha) - alphaStall;
  const peak = Cl0 + ClAlpha * alphaStall + flapCl;
  const sign = Math.sign(alpha) || 1;
  const Cl =
    sign *
    Math.max(
      0.15,
      Math.abs(peak) * (1 - 0.55 * clamp(over / (12 * DEG2RAD), 0, 1.2)),
    );
  return { Cl, stalled: true };
}

export function computeAero(
  d: AeroDerivatives,
  flaps: FlapModel,
  gear: GearModel,
  s: AeroState,
): AeroResult {
  const [u, v, w] = s.velBody;
  const [p, q, r] = s.omega;
  const tas = Math.hypot(u, v, w);
  const tasSafe = Math.max(tas, 0.5);

  // Angle of attack α = atan(w/u); sideslip β = asin(v/V)
  const alpha = Math.atan2(w, Math.max(0.1, u));
  const beta = Math.asin(clamp(v / tasSafe, -1, 1));

  const qBar = dynamicPressure(s.rho, tasSafe);
  const S = s.wingAreaM2;
  const b = s.wingSpanM;
  const c = s.macM;

  // Non-dimensional rates
  const qHat = (q * c) / (2 * tasSafe);
  const pHat = (p * b) / (2 * tasSafe);
  const rHat = (r * b) / (2 * tasSafe);

  const flapCl = flaps.dCl * s.flaps;
  const flapCd = flaps.dCd * s.flaps;
  const flapCm = flaps.dCm * s.flaps;

  const { Cl: ClRaw, stalled } = liftCurve(
    alpha,
    d.alphaStallRad,
    d.Cl0,
    d.ClAlpha,
    flapCl,
  );

  const ge = groundEffectFactor(s.aglM, b);
  const Cl =
    (ClRaw + d.ClQ * qHat + d.ClDe * s.elevatorRad) * (stalled ? 1 : ge);

  // Drag polar: CD = CD0 + k CL² + gear + flaps
  const Cd =
    d.Cd0 +
    d.inducedDragK * Cl * Cl * (stalled ? 1.8 : 1) +
    flapCd +
    (s.gearDown ? gear.cdGear : 0) +
    (stalled ? 0.04 * Math.abs(alpha) : 0);

  const Cy = d.CyBeta * beta + d.CyDr * s.rudderRad;

  const L = qBar * S * Cl;
  const D = qBar * S * Cd;
  const Y = qBar * S * Cy;
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  const cb = Math.cos(beta);
  const sb = Math.sin(beta);

  // Wind axes → body (Etkin):
  // Fx = −D cosα cosβ − Y cosα sinβ + L sinα
  // Fy = −D sinβ + Y cosβ
  // Fz = −D sinα cosβ − Y sinα sinβ − L cosα
  const FxB = -D * ca * cb - Y * ca * sb + L * sa;
  const FyB = -D * sb + Y * cb;
  const FzB = -D * sa * cb - Y * sa * sb - L * ca;

  // Moments (body)
  const ClMoment =
    d.ClBeta * beta +
    d.ClP * pHat +
    d.ClR * rHat +
    d.ClDa * s.aileronRad +
    d.ClDr * s.rudderRad;
  const Cm =
    d.Cm0 +
    d.CmAlpha * alpha +
    d.CmQ * qHat +
    d.CmDe * s.elevatorRad +
    flapCm;
  const Cn =
    d.CnBeta * beta +
    d.CnP * pHat +
    d.CnR * rHat +
    d.CnDa * s.aileronRad +
    d.CnDr * s.rudderRad;

  const Lmom = qBar * S * b * ClMoment;
  const Mmom = qBar * S * c * Cm;
  const Nmom = qBar * S * b * Cn;

  return {
    forceBody: [FxB, FyB, FzB],
    momentBody: [Lmom, Mmom, Nmom],
    alphaRad: alpha,
    betaRad: beta,
    Cl,
    Cd,
    tasMs: tas,
    qBar,
    stalled,
  };
}
