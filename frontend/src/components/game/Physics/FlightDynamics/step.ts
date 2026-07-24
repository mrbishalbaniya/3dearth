/**
 * Rigid-body equations of motion in body axes + NED navigation.
 * Ref: Stevens & Lewis, Aircraft Control and Simulation §1.3–1.5;
 *      Etkin & Reid, Dynamics of Atmospheric Flight.
 *
 * State (internal):
 *   quat body→NED, vel_body (u,v,w), omega (p,q,r), lat/lng/alt
 */

import { sampleISA } from "../Atmosphere/isa";
import { computeAero } from "../Aerodynamics/forces";
import type {
  AircraftPhysicsModel,
  PropulsionModel,
} from "../Aerodynamics/types";
import {
  G0,
  MAX_BODY_RATE_RAD,
  MAX_BODY_SPEED_MS,
  MAX_DT,
  METERS_PER_DEG_LAT,
  DEG2RAD,
} from "../Math/constants";
import { allocScratch, rk4Step, type StateVec } from "../Math/integrate";
import {
  gravityBody,
  headingPitchRollFromQuat,
  quatDerivative,
  quatFromHeadingPitchRoll,
  quatNormalize,
  quatRotate,
  type Quat,
  type Vec3,
} from "../Math/quat";
import {
  DEFAULT_SURFACE_LIMITS,
  stepSurfaces,
  stepThrottle,
} from "../Controls/surfaces";
import type { AircraftSpec, FlightControlsInput, FlightState } from "../../Types";
import type { SystemsSnapshot } from "../../Systems/types";

export type { AircraftPhysicsModel };

export interface WindSample {
  speedMs: number;
  fromDeg: number;
  turbulence: number;
}

export interface DynamicsEnv {
  groundElevM: number;
  wind: WindSample;
  /** When set, thrust/mass/fuel/gear/flaps come from aircraft systems */
  systems?: SystemsSnapshot;
}

const STATE_DIM = 13;
// layout: qw,qx,qy,qz, u,v,w, p,q,r, lat,lng,alt

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function wrap180(d: number) {
  let x = ((d % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

function wrap360(d: number) {
  return ((d % 360) + 360) % 360;
}

function readQuat(y: StateVec): Quat {
  return [y[0], y[1], y[2], y[3]];
}

function packState(
  q: Quat,
  vel: Vec3,
  omega: Vec3,
  lat: number,
  lng: number,
  alt: number,
  out: StateVec,
): void {
  out[0] = q[0];
  out[1] = q[1];
  out[2] = q[2];
  out[3] = q[3];
  out[4] = vel[0];
  out[5] = vel[1];
  out[6] = vel[2];
  out[7] = omega[0];
  out[8] = omega[1];
  out[9] = omega[2];
  out[10] = lat;
  out[11] = lng;
  out[12] = alt;
}

function thrustForce(
  prop: PropulsionModel,
  throttle: number,
  rho: number,
  tas: number,
  fuelKg: number,
): number {
  if (fuelKg < 0.5 || throttle < 0.01) return 0;
  const dens = Math.pow(rho / 1.225, prop.densityExponent);
  // Prop static boost at low speed
  const vFactor =
    1 +
    (prop.staticThrustFactor - 1) * Math.exp(-tas / 40);
  return throttle * prop.maxThrustN * dens * vFactor;
}

function windNed(wind: WindSample, tSec: number): Vec3 {
  // Meteorological "from" → velocity TO direction
  const toRad = (wind.fromDeg + 180) * DEG2RAD;
  const n = Math.cos(toRad) * wind.speedMs;
  const e = Math.sin(toRad) * wind.speedMs;
  const turb =
    (Math.sin(tSec * 2.1) + Math.sin(tSec * 5.3 + 1.2)) *
    0.5 *
    wind.turbulence;
  return [n + turb, e + turb * 0.7, 0];
}

/**
 * Build default physics model from AircraftSpec (fleet table).
 * Uses mass / wing area / stall AoA to seed plausible derivatives.
 */
export function physicsModelFromSpec(spec: AircraftSpec): AircraftPhysicsModel {
  if (spec.physics) return spec.physics;

  const AR = spec.aspectRatio ?? 8.5;
  const e = 0.78;
  const k = 1 / (Math.PI * e * AR);
  const span = Math.sqrt(Math.max(1, AR * spec.wingAreaM2));
  const mac = spec.wingAreaM2 / span;
  const m = spec.massKg;
  // Rough radii of gyration
  const Ixx = 0.15 * m * (span * 0.25) ** 2;
  const Iyy = 0.35 * m * (mac * 3) ** 2;
  const Izz = Ixx + Iyy * 0.85;

  return {
    wingSpanM: span,
    macM: mac,
    inertia: { Ixx, Iyy, Izz, Ixz: 0 },
    propulsion: {
      maxThrustN: spec.maxThrustN,
      densityExponent: spec.class.includes("jet") ? 0.7 : 0.9,
      staticThrustFactor: spec.class === "sep" || spec.class === "tep" ? 1.35 : 1.05,
    },
    gear: {
      muRoll: 0.03,
      muBrake: 0.45,
      cdGear: 0.02 * (spec.gearDragFactor - 1),
      cgHeightM: 1.2,
    },
    flaps: {
      dCl: 0.55 * (spec.flapLiftFactor - 1),
      dCd: 0.08 * (spec.flapDragFactor - 1),
      dCm: -0.05,
    },
    aero: {
      Cl0: 0.25,
      ClAlpha: 4.8, // /rad ≈ 0.084/deg
      ClQ: 4.0,
      ClDe: 0.35,
      Cd0: 0.028,
      inducedDragK: k,
      CyBeta: -0.4,
      CyDr: 0.15,
      ClBeta: -0.12,
      ClP: -0.45,
      ClR: 0.1,
      ClDa: 0.18,
      ClDr: 0.02,
      Cm0: 0.02,
      CmAlpha: -0.7,
      CmQ: -12,
      CmDe: -1.1,
      CnBeta: 0.1,
      CnP: -0.03,
      CnR: -0.15,
      CnDa: -0.02,
      CnDr: -0.08,
      alphaStallRad: (spec.stallAoADeg ?? 15) * DEG2RAD,
      oswaldE: e,
    },
  };
}

const scratch = allocScratch(STATE_DIM);

/**
 * One simulation frame — substeps RK4, then ground contact projection.
 */
export function stepFlightDynamics(
  state: FlightState,
  spec: AircraftSpec,
  input: FlightControlsInput,
  env: DynamicsEnv,
  dt: number,
): FlightState {
  const model = physicsModelFromSpec(spec);
  const tTotal = clamp(dt, 0.0005, 0.1);
  let remaining = tTotal;

  let throttle = stepThrottle(state.throttle, input.throttle, tTotal);
  let flaps = state.flaps;
  let gearDown = state.gearDown;
  let brakes = input.brakes;
  let fuelKg = state.fuelKg;
  let onGround = state.onGround;

  const sys = env.systems;
  if (sys) {
    flaps = sys.flaps;
    gearDown = sys.gearDown;
    fuelKg = sys.fuelKg;
  } else {
    if (input.toggleFlaps) {
      flaps = flaps < 0.25 ? 0.5 : flaps < 0.75 ? 1 : 0;
    }
    if (input.toggleGear && !onGround) gearDown = !gearDown;
  }
  if (onGround) gearDown = true;

  let elev = state.elevatorRad ?? 0;
  let ail = state.aileronRad ?? 0;
  let rud = state.rudderRad ?? 0;

  const authority = sys?.controlAuthority ?? 1;
  const surfaces = stepSurfaces(
    elev,
    ail,
    rud,
    input.pitch * authority,
    input.roll * authority,
    input.yaw * authority,
    DEFAULT_SURFACE_LIMITS,
    tTotal,
  );
  elev = surfaces.elevatorRad;
  ail = surfaces.aileronRad;
  rud = surfaces.rudderRad;

  // Restore continuous attitude from stored quat or Euler
  let q: Quat =
    state.quatW != null
      ? quatNormalize([
          state.quatW,
          state.quatX ?? 0,
          state.quatY ?? 0,
          state.quatZ ?? 0,
        ])
      : quatFromHeadingPitchRoll(state.yawDeg, state.pitchDeg, state.rollDeg);

  let vel: Vec3 =
    state.uMs != null
      ? [state.uMs, state.vMs ?? 0, state.wMs ?? 0]
      : (() => {
          // Bootstrap body velocity from airspeed + pitch
          const V = state.airspeedMs;
          const th = state.pitchDeg * DEG2RAD;
          return [V * Math.cos(th), 0, V * Math.sin(th)];
        })();

  let omega: Vec3 = [
    state.pRadS ?? 0,
    state.qRadS ?? 0,
    state.rRadS ?? 0,
  ];

  let lat = state.lat;
  let lng = state.lng;
  let altM = state.altM;

  const y = new Float64Array(STATE_DIM);
  const simTime = performance.now() * 0.001;

  let lastAlpha = 0;
  let lastBeta = 0;
  let lastLoad = 1;
  let lastStalled = false;
  let tas = state.airspeedMs;
  let vs = state.verticalSpeedMs;
  let gs = state.groundSpeedMs;

  while (remaining > 1e-6) {
    const h = Math.min(MAX_DT, remaining);
    remaining -= h;

    const { Ixx, Iyy, Izz } = model.inertia;
    const mass = sys?.massKg ?? spec.massKg;

    packState(q, vel, omega, lat, lng, altM, y);

    const fDeriv = (yin: StateVec, out: StateVec) => {
      const qq = quatNormalize([yin[0], yin[1], yin[2], yin[3]]);
      const vv: Vec3 = [yin[4], yin[5], yin[6]];
      const ww: Vec3 = [yin[7], yin[8], yin[9]];
      const la = yin[10];
      const ln = yin[11];
      const al = yin[12];

      const atm = sampleISA(al);
      const agl = al - env.groundElevM;

      const windN = windNed(env.wind, simTime);
      const windB = quatRotate(
        [qq[0], -qq[1], -qq[2], -qq[3]],
        windN,
      );
      const vRel: Vec3 = [vv[0] - windB[0], vv[1] - windB[1], vv[2] - windB[2]];

      const aero = computeAero(model.aero, model.flaps, model.gear, {
        velBody: vRel,
        omega: ww,
        elevatorRad: elev,
        aileronRad: ail,
        rudderRad: rud,
        flaps,
        gearDown,
        aglM: Math.max(0, agl),
        wingSpanM: model.wingSpanM,
        macM: model.macM,
        wingAreaM2: spec.wingAreaM2,
        rho: atm.densityKgM3,
      });

      lastAlpha = aero.alphaRad;
      lastBeta = aero.betaRad;
      lastStalled = aero.stalled;
      tas = aero.tasMs;

      const T =
        sys != null
          ? sys.thrustN
          : thrustForce(
              model.propulsion,
              throttle,
              atm.densityKgM3,
              aero.tasMs,
              fuelKg,
            );

      const gB = gravityBody(qq, G0);
      const Fx = aero.forceBody[0] + T + mass * gB[0];
      const Fy = aero.forceBody[1] + mass * gB[1];
      const Fz = aero.forceBody[2] + mass * gB[2];

      lastLoad = onGround ? 1 : -Fz / (mass * G0);

      const [u, v, w] = vv;
      const [p, qqR, r] = ww;

      const ud = r * v - qqR * w + Fx / mass;
      const vd = p * w - r * u + Fy / mass;
      const wd = qqR * u - p * v + Fz / mass;

      const auth = sys?.controlAuthority ?? 1;
      const L = aero.momentBody[0] * auth;
      const M = aero.momentBody[1] * auth;
      const N = aero.momentBody[2] * auth;
      const pd = ((Iyy - Izz) * qqR * r + L) / Ixx;
      const qd = ((Izz - Ixx) * p * r + M) / Iyy;
      const rd = ((Ixx - Iyy) * p * qqR + N) / Izz;

      const dq = quatDerivative(qq, ww);

      // NED velocity from body
      const vNed = quatRotate(qq, vv);
      // vNed = [vn, ve, vd] with vd positive down → altitude rate = −vd
      const cosLat = Math.max(0.15, Math.cos(la * DEG2RAD));
      const latDot = vNed[0] / METERS_PER_DEG_LAT;
      const lngDot = vNed[1] / (METERS_PER_DEG_LAT * cosLat);
      const altDot = -vNed[2];

      out[0] = dq[0];
      out[1] = dq[1];
      out[2] = dq[2];
      out[3] = dq[3];
      out[4] = ud;
      out[5] = vd;
      out[6] = wd;
      out[7] = pd;
      out[8] = qd;
      out[9] = rd;
      out[10] = latDot;
      out[11] = lngDot;
      out[12] = altDot;

      vs = altDot;
      gs = Math.hypot(vNed[0], vNed[1]);
      void ln;
    };

    rk4Step(y, h, fDeriv, scratch);

    // Renormalize quaternion + clamp velocities
    q = quatNormalize([y[0], y[1], y[2], y[3]]);
    vel = [
      clamp(y[4], -MAX_BODY_SPEED_MS, MAX_BODY_SPEED_MS),
      clamp(y[5], -MAX_BODY_SPEED_MS, MAX_BODY_SPEED_MS),
      clamp(y[6], -MAX_BODY_SPEED_MS, MAX_BODY_SPEED_MS),
    ];
    omega = [
      clamp(y[7], -MAX_BODY_RATE_RAD, MAX_BODY_RATE_RAD),
      clamp(y[8], -MAX_BODY_RATE_RAD, MAX_BODY_RATE_RAD),
      clamp(y[9], -MAX_BODY_RATE_RAD, MAX_BODY_RATE_RAD),
    ];
    lat = clamp(y[10], -85, 85);
    lng = wrap180(y[11]);
    altM = y[12];

    // —— Ground contact (unilateral constraint) ——
    // Ref: impulsive contact; allow lift-off when NED vertical velocity is upward.
    const agl = altM - env.groundElevM;
    const contactH = model.gear.cgHeightM;
    if (agl <= contactH + 0.05) {
      const vNed = quatRotate(q, vel);
      const speedH = Math.hypot(vNed[0], vNed[1]);
      // Lift-off: climbing through contact height with positive climb rate
      const liftingOff = vNed[2] < -1.0 && speedH > spec.stallSpeedMs * 0.85;

      if (liftingOff) {
        onGround = false;
        altM = Math.max(altM, env.groundElevM + contactH);
      } else {
        altM = env.groundElevM + contactH;
        onGround = true;
        const vn = vNed[0];
        const ve = vNed[1];
        // Kill downward velocity; keep small upward for bounce damping
        const vd = Math.min(0, vNed[2]) * 0.05;
        const brakeMul = brakes
          ? sys != null
            ? Math.max(0.15, sys.brakeFactor)
            : 1
          : 0;
        const mu = brakes
          ? model.gear.muBrake * (brakeMul || 1)
          : model.gear.muRoll;
        const ax = speedH > 0.05 ? -Math.sign(vn || 1) * mu * G0 : 0;
        const ay = speedH > 0.05 ? -Math.sign(ve || 1) * mu * G0 : 0;
        let vn2 = vn + ax * h;
        let ve2 = ve + ay * h;
        if (speedH < 0.2 && throttle < 0.05) {
          vn2 = 0;
          ve2 = 0;
        }
        const vBody = quatRotate([q[0], -q[1], -q[2], -q[3]], [vn2, ve2, vd]);
        vel = [vBody[0], vBody[1], vBody[2]];

        // Wheel steering ≈ yaw rate from rudder while rolling
        omega = [
          omega[0] * 0.15,
          omega[1] * 0.15,
          omega[2] * 0.6 +
            rud * 0.55 * Math.min(1, speedH / 12),
        ];

        if (speedH < 28) {
          const eulG = headingPitchRollFromQuat(q);
          q = quatFromHeadingPitchRoll(
            eulG.headingDeg,
            clamp(eulG.pitchDeg * 0.9, -1, 10),
            eulG.rollDeg * 0.8,
          );
        }
      }
    } else if (agl > contactH + 1.5) {
      onGround = false;
    }

    // Fuel burn handled by FuelSystem when systems snapshot is present
    if (!sys && throttle > 0.02 && fuelKg > 0) {
      fuelKg = Math.max(0, fuelKg - spec.fuelBurnKgS * throttle * h);
    }
  }

  const eul = headingPitchRollFromQuat(q);
  const vNed = quatRotate(q, vel);

  return {
    lat,
    lng,
    altM,
    pitchDeg: eul.pitchDeg,
    rollDeg: eul.rollDeg,
    yawDeg: wrap360(eul.headingDeg),
    airspeedMs: Math.hypot(vel[0], vel[1], vel[2]),
    verticalSpeedMs: -vNed[2],
    throttle,
    flaps,
    gearDown,
    brakes,
    onGround,
    fuelKg,
    groundSpeedMs: Math.hypot(vNed[0], vNed[1]),
    // Extended 6DOF
    quatW: q[0],
    quatX: q[1],
    quatY: q[2],
    quatZ: q[3],
    uMs: vel[0],
    vMs: vel[1],
    wMs: vel[2],
    pRadS: omega[0],
    qRadS: omega[1],
    rRadS: omega[2],
    elevatorRad: elev,
    aileronRad: ail,
    rudderRad: rud,
    alphaDeg: lastAlpha / DEG2RAD,
    betaDeg: lastBeta / DEG2RAD,
    loadFactor: lastLoad,
    stalled: lastStalled,
  };
}

export function createSpawnState(
  lat: number,
  lng: number,
  elevM: number,
  headingDeg: number,
  spec: AircraftSpec,
): FlightState {
  const model = physicsModelFromSpec(spec);
  const q = quatFromHeadingPitchRoll(headingDeg, 0, 0);
  return {
    lat,
    lng,
    altM: elevM + model.gear.cgHeightM,
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: wrap360(headingDeg),
    airspeedMs: 0,
    verticalSpeedMs: 0,
    throttle: 0,
    flaps: 0,
    gearDown: true,
    brakes: true,
    onGround: true,
    fuelKg: spec.fuelCapacityKg * 0.85,
    groundSpeedMs: 0,
    quatW: q[0],
    quatX: q[1],
    quatY: q[2],
    quatZ: q[3],
    uMs: 0,
    vMs: 0,
    wMs: 0,
    pRadS: 0,
    qRadS: 0,
    rRadS: 0,
    elevatorRad: 0,
    aileronRad: 0,
    rudderRad: 0,
    alphaDeg: 0,
    betaDeg: 0,
    loadFactor: 1,
    stalled: false,
  };
}

export { wrap360, wrap180, clamp };
