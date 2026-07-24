/**
 * Unit-quaternion helpers for attitude (body ↔ NED).
 * Hamilton convention: q = [w, x, y, z]. Composition: q_ab ⊗ q_bc.
 * Avoids gimbal lock — Euler angles are derived only for HUD / spawn.
 *
 * Ref: Stevens & Lewis, Aircraft Control and Simulation, Ch. 1.
 */

import { DEG2RAD, RAD2DEG } from "./constants";

export type Quat = [number, number, number, number]; // w,x,y,z
export type Vec3 = [number, number, number];

export function quatIdentity(): Quat {
  return [1, 0, 0, 0];
}

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** Hamilton product a ⊗ b */
export function quatMul(a: Quat, b: Quat): Quat {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

/** Rotate vector by quaternion: v' = q ⊗ [0,v] ⊗ q* */
export function quatRotate(q: Quat, v: Vec3): Vec3 {
  const [w, x, y, z] = q;
  const [vx, vy, vz] = v;
  // Optimized: R(q) * v
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

export function quatConjugate(q: Quat): Quat {
  return [q[0], -q[1], -q[2], -q[3]];
}

/** Body rates (p,q,r) → quaternion derivative ½ Ω ⊗ q */
export function quatDerivative(q: Quat, omega: Vec3): Quat {
  const [p, qq, r] = omega;
  const omegaQ: Quat = [0, p, qq, r];
  const dq = quatMul(q, omegaQ);
  return [0.5 * dq[0], 0.5 * dq[1], 0.5 * dq[2], 0.5 * dq[3]];
}

/**
 * ZYX aerospace Euler (yaw ψ, pitch θ, roll φ) → body-to-NED quaternion.
 * Heading: 0 = North, positive clockwise when viewed from above for yawDeg
 * but internal NED yaw is positive to East (right-hand about Down).
 * We store headingDeg as true heading (0=N, 90=E) and convert:
 *   ψ_NED = headingDeg * DEG2RAD
 */
export function quatFromHeadingPitchRoll(
  headingDeg: number,
  pitchDeg: number,
  rollDeg: number,
): Quat {
  const yaw = headingDeg * DEG2RAD;
  const pitch = pitchDeg * DEG2RAD;
  const roll = rollDeg * DEG2RAD;
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  // ZYX intrinsic
  return quatNormalize([
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
  ]);
}

/** Extract heading / pitch / roll (deg) from body-to-NED quaternion. */
export function headingPitchRollFromQuat(q: Quat): {
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
} {
  const [w, x, y, z] = quatNormalize(q);
  // Roll (x)
  const sinr = 2 * (w * x + y * z);
  const cosr = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr, cosr);
  // Pitch (y)
  const sinp = 2 * (w * y - z * x);
  const pitch =
    Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);
  // Yaw (z)
  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny, cosy);

  let headingDeg = yaw * RAD2DEG;
  headingDeg = ((headingDeg % 360) + 360) % 360;
  return {
    headingDeg,
    pitchDeg: pitch * RAD2DEG,
    rollDeg: roll * RAD2DEG,
  };
}

/** Gravity vector in body frame from attitude (NED gravity = [0,0,g]). */
export function gravityBody(q: Quat, g: number): Vec3 {
  // Rotate NED gravity into body: R^T * g_ned = quat_conj * g
  return quatRotate(quatConjugate(q), [0, 0, g]);
}
