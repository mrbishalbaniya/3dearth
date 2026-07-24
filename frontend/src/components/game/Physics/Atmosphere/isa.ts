/**
 * International Standard Atmosphere (ISO 2533 / ICAO Doc 7488).
 * Troposphere (0–11 km) + isothermal lower stratosphere (11–20 km).
 */

import {
  G0,
  LAPSE_K_PER_M,
  P0_PA,
  R_AIR,
  RHO0,
  T0_K,
  TROPOPAUSE_M,
} from "../Math/constants";

export interface AtmosphereSample {
  /** Kelvin */
  temperatureK: number;
  /** Pa */
  pressurePa: number;
  /** kg/m³ */
  densityKgM3: number;
  /** speed of sound m/s */
  speedOfSoundMs: number;
  /** relative density σ = ρ/ρ0 */
  sigma: number;
}

const GAMA = 1.4; // ratio of specific heats for dry air

/** Static atmosphere at geometric altitude (m MSL). */
export function sampleISA(altM: number): AtmosphereSample {
  const h = Math.max(-500, Math.min(altM, 20_000));

  let T: number;
  let P: number;

  if (h <= TROPOPAUSE_M) {
    // Troposphere: T = T0 − λh ; P via hydrostatic + ideal gas
    T = T0_K - LAPSE_K_PER_M * h;
    const exp = G0 / (R_AIR * LAPSE_K_PER_M);
    P = P0_PA * Math.pow(T / T0_K, exp);
  } else {
    // Lower stratosphere isothermal at 216.65 K
    T = 216.65;
    const P_trop =
      P0_PA *
      Math.pow((T0_K - LAPSE_K_PER_M * TROPOPAUSE_M) / T0_K, G0 / (R_AIR * LAPSE_K_PER_M));
    P = P_trop * Math.exp((-G0 * (h - TROPOPAUSE_M)) / (R_AIR * T));
  }

  const rho = P / (R_AIR * T);
  const a = Math.sqrt(GAMA * R_AIR * T);

  return {
    temperatureK: T,
    pressurePa: P,
    densityKgM3: rho,
    speedOfSoundMs: a,
    sigma: rho / RHO0,
  };
}

/** Dynamic pressure q̄ = ½ ρ V² */
export function dynamicPressure(rho: number, tasMs: number): number {
  return 0.5 * rho * tasMs * tasMs;
}
