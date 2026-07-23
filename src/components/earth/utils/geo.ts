import { MathUtils, Vector3 } from "three";
import { EARTH_RADIUS } from "./constants";

const DEG2RAD = MathUtils.DEG2RAD;
const RAD2DEG = MathUtils.RAD2DEG;

/**
 * Convert geographic coordinates to a point on (or above) the unit sphere.
 * Uses Three.js Y-up: lat = elevation from equator, lng = rotation around Y.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius = EARTH_RADIUS,
  target = new Vector3(),
): Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return target.set(x, y, z);
}

/** Inverse of latLngToVector3 for a direction from origin. */
export function vector3ToLatLng(position: Vector3): { lat: number; lng: number } {
  const radius = position.length() || 1;
  const lat = 90 - Math.acos(MathUtils.clamp(position.y / radius, -1, 1)) * RAD2DEG;
  const lng =
    ((Math.atan2(position.z, -position.x) * RAD2DEG + 180 + 540) % 360) - 180;
  return { lat, lng };
}

/**
 * Approximate solar direction for a given UTC Date.
 * Returns a unit vector pointing from Earth toward the Sun (scene space).
 */
export function getSunDirection(date = new Date(), target = new Vector3()): Vector3 {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear =
    (date.getTime() - start) / (1000 * 60 * 60 * 24);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;

  // Declination approximation (degrees)
  const declination =
    -23.44 * Math.cos(MathUtils.degToRad((360 / 365) * (dayOfYear + 10)));

  // Subsolar longitude: noon at lng 0 when hour = 12
  const subsolarLng = (12 - hour) * 15;
  const subsolarLat = declination;

  return latLngToVector3(subsolarLat, subsolarLng, 1, target).normalize();
}

/** Haversine distance in kilometers. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) *
      Math.cos(lat2 * DEG2RAD) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Format lat/lng for HUD. */
export function formatCoordinate(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "—";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}  ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

/** Approximate ground scale label for current camera distance. */
export function scaleLabelForDistance(distance: number): string {
  // Rough mapping: distance 1.2 ≈ city, 3 ≈ continent, 6 ≈ planet
  if (distance < 1.4) return "50 km";
  if (distance < 1.7) return "200 km";
  if (distance < 2.2) return "500 km";
  if (distance < 3.0) return "1,500 km";
  if (distance < 4.5) return "5,000 km";
  return "12,000 km";
}

/** Smoothstep for shader / animation parity. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Ease-in-out cubic. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
