/**
 * Physical & geodetic constants for the flight dynamics engine.
 * References: ICAO Doc 7488 / ISO 2533 (ISA), WGS84.
 */

/** Standard gravity (m/s²) — ISO 2533 */
export const G0 = 9.80665;

/** Sea-level ISA temperature (K) */
export const T0_K = 288.15;

/** Sea-level ISA pressure (Pa) */
export const P0_PA = 101_325;

/** Sea-level ISA density (kg/m³) */
export const RHO0 = 1.225;

/** ISA troposphere lapse rate (K/m) */
export const LAPSE_K_PER_M = 0.0065;

/** Specific gas constant for dry air (J/(kg·K)) */
export const R_AIR = 287.05287;

/** Tropopause altitude (m) — ISA */
export const TROPOPAUSE_M = 11_000;

/** Mean Earth radius (m) — spherical approx for ENU integration */
export const EARTH_RADIUS_M = 6_371_000;

/** WGS84 semi-major axis (m) */
export const WGS84_A = 6_378_137;

/** WGS84 first eccentricity squared */
export const WGS84_E2 = 6.69437999014e-3;

/** Meters per degree of latitude (sphere) */
export const METERS_PER_DEG_LAT = (Math.PI / 180) * EARTH_RADIUS_M;

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/** Max integration substep (s) for numerical stability */
export const MAX_DT = 1 / 30;

/** Soft clamp for extreme numerical blow-ups */
export const MAX_BODY_SPEED_MS = 450;
export const MAX_BODY_RATE_RAD = 4; // ~230 deg/s
