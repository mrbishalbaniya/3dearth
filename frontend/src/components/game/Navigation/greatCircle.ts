/**
 * Spherical / WGS84-ish navigation mathematics.
 * Great-circle: shortest path on a sphere (orthodrome).
 * Ref: Aviation Formulary (Ed Williams); WGS84 for ECEF helpers.
 */

import { DEG2RAD, EARTH_RADIUS_M, RAD2DEG, WGS84_A, WGS84_E2 } from "../Physics/Math/constants";

const R_NM = EARTH_RADIUS_M / 1852;

export function haversineNm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversineNm(lat1, lng1, lat2, lng2) * 1852;
}

/** Initial true bearing (deg) from point 1 → 2. */
export function initialBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const y = Math.sin(dLng) * Math.cos(p2);
  const x =
    Math.cos(p1) * Math.sin(p2) -
    Math.sin(p1) * Math.cos(p2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * RAD2DEG) + 360) % 360;
}

export function etaSeconds(distanceNm: number, groundSpeedMs: number): number | null {
  if (groundSpeedMs < 5) return null;
  const kt = groundSpeedMs * 1.94384;
  return (distanceNm / kt) * 3600;
}

/**
 * Spherical linear interpolation along the great circle (SLERP on unit sphere).
 */
export function greatCircleWaypoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  steps = 24,
): Array<{ lat: number; lng: number }> {
  const φ1 = lat1 * DEG2RAD;
  const λ1 = lng1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const λ2 = lng2 * DEG2RAD;

  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  let d = x1 * x2 + y1 * y2 + z1 * z2;
  d = Math.min(1, Math.max(-1, d));
  const ω = Math.acos(d);
  const out: Array<{ lat: number; lng: number }> = [];

  if (ω < 1e-8) {
    for (let i = 0; i <= steps; i++) out.push({ lat: lat1, lng: lng1 });
    return out;
  }

  const sinω = Math.sin(ω);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * ω) / sinω;
    const b = Math.sin(f * ω) / sinω;
    const x = a * x1 + b * x2;
    const y = a * y1 + b * y2;
    const z = a * z1 + b * z2;
    const φ = Math.atan2(z, Math.hypot(x, y));
    const λ = Math.atan2(y, x);
    out.push({ lat: φ * RAD2DEG, lng: λ * RAD2DEG });
  }
  return out;
}

/** Cross-track error (m) — positive right of course 1→2. */
export function crossTrackErrorM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  lat: number,
  lng: number,
): number {
  const d13 = haversineM(lat1, lng1, lat, lng) / EARTH_RADIUS_M;
  const θ13 = initialBearingDeg(lat1, lng1, lat, lng) * DEG2RAD;
  const θ12 = initialBearingDeg(lat1, lng1, lat2, lng2) * DEG2RAD;
  return Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12)) * EARTH_RADIUS_M;
}

/** Geodetic → ECEF (WGS84). */
export function geodeticToEcef(
  latDeg: number,
  lngDeg: number,
  altM: number,
): [number, number, number] {
  const φ = latDeg * DEG2RAD;
  const λ = lngDeg * DEG2RAD;
  const sinφ = Math.sin(φ);
  const cosφ = Math.cos(φ);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinφ * sinφ);
  const x = (N + altM) * cosφ * Math.cos(λ);
  const y = (N + altM) * cosφ * Math.sin(λ);
  const z = (N * (1 - WGS84_E2) + altM) * sinφ;
  return [x, y, z];
}

/** Horizon distance (m) for observer height h above sphere. */
export function horizonDistanceM(eyeHeightM: number): number {
  return Math.sqrt(Math.max(0, eyeHeightM * (2 * EARTH_RADIUS_M + eyeHeightM)));
}
