/**
 * Geo analytics — distance, area, bearing, buffers, elevation profile hooks.
 */
import { haversineM } from "../managers/WorkerManager";

const R = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const GeoAnalytics = {
  distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    return haversineM(lat1, lng1, lat2, lng2);
  },

  bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number) {
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lng2 - lng1);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  },

  /** Spherical excess polygon area (m²). Ring = [lng,lat][]. */
  areaMeters2(ring: Array<[number, number]>) {
    if (ring.length < 3) return 0;
    let total = 0;
    for (let i = 0; i < ring.length; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[(i + 1) % ring.length];
      total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
    }
    return Math.abs((total * R * R) / 2);
  },

  routeLengthMeters(path: Array<[number, number]>) {
    let sum = 0;
    for (let i = 1; i < path.length; i++) {
      const [lng0, lat0] = path[i - 1];
      const [lng1, lat1] = path[i];
      sum += haversineM(lat0, lng0, lat1, lng1);
    }
    return sum;
  },

  /** Geodesic buffer points around a center (approx circle). */
  bufferCircle(
    lat: number,
    lng: number,
    radiusM: number,
    steps = 32,
  ): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    const angDist = radiusM / R;
    const φ1 = toRad(lat);
    const λ1 = toRad(lng);
    for (let i = 0; i <= steps; i++) {
      const brng = (2 * Math.PI * i) / steps;
      const φ2 = Math.asin(
        Math.sin(φ1) * Math.cos(angDist) +
          Math.cos(φ1) * Math.sin(angDist) * Math.cos(brng),
      );
      const λ2 =
        λ1 +
        Math.atan2(
          Math.sin(brng) * Math.sin(angDist) * Math.cos(φ1),
          Math.cos(angDist) - Math.sin(φ1) * Math.sin(φ2),
        );
      out.push([toDeg(λ2), toDeg(φ2)]);
    }
    return out;
  },

  /**
   * Elevation profile along a path — async sampler injected by TerrainManager.
   */
  async elevationProfile(
    path: Array<[number, number]>,
    sample: (lat: number, lng: number) => Promise<number>,
  ): Promise<Array<{ lat: number; lng: number; elevM: number; distM: number }>> {
    const out: Array<{ lat: number; lng: number; elevM: number; distM: number }> = [];
    let dist = 0;
    for (let i = 0; i < path.length; i++) {
      const [lng, lat] = path[i];
      if (i > 0) {
        const [plng, plat] = path[i - 1];
        dist += haversineM(plat, plng, lat, lng);
      }
      const elevM = await sample(lat, lng);
      out.push({ lat, lng, elevM, distM: dist });
    }
    return out;
  },
};
