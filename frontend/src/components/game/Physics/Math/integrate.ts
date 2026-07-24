/**
 * Numerical integrators for ODEs ẋ = f(x).
 * RK4 preferred; semi-implicit Euler as fallback for stiff ground contact.
 */

export type StateVec = Float64Array;

export type DerivFn = (y: StateVec, out: StateVec) => void;

/** Classic Runge–Kutta 4th order. y is updated in place. */
export function rk4Step(y: StateVec, dt: number, f: DerivFn, scratch: StateVec[]): void {
  const [k1, k2, k3, k4, tmp] = scratch;
  const n = y.length;

  f(y, k1);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * dt * k1[i];
  f(tmp, k2);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * dt * k2[i];
  f(tmp, k3);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + dt * k3[i];
  f(tmp, k4);

  for (let i = 0; i < n; i++) {
    y[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
}

/** Semi-implicit (symplectic) Euler — stable for stiff constraints. */
export function semiImplicitEuler(
  pos: StateVec,
  vel: StateVec,
  acc: StateVec,
  dt: number,
): void {
  for (let i = 0; i < vel.length; i++) {
    vel[i] += acc[i] * dt;
    pos[i] += vel[i] * dt;
  }
}

export function allocScratch(dim: number, count = 5): StateVec[] {
  return Array.from({ length: count }, () => new Float64Array(dim));
}
