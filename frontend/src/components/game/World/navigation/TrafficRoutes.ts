/**
 * Great-circle route helpers for AI traffic (waypoints + progress).
 */

import {
  greatCircleWaypoints,
  haversineNm,
  initialBearingDeg,
} from "../../Navigation/greatCircle";

export interface TrafficRoute {
  waypoints: Array<{ lat: number; lng: number }>;
  distanceNm: number;
  bearingDeg: number;
}

export function buildTrafficRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): TrafficRoute {
  return {
    waypoints: greatCircleWaypoints(lat1, lng1, lat2, lng2, 16),
    distanceNm: haversineNm(lat1, lng1, lat2, lng2),
    bearingDeg: initialBearingDeg(lat1, lng1, lat2, lng2),
  };
}

/** Interpolate along waypoints by progress 0..1 */
export function sampleRoute(
  route: TrafficRoute,
  progress: number,
): { lat: number; lng: number; hdgDeg: number } {
  const p = Math.min(1, Math.max(0, progress));
  const wps = route.waypoints;
  if (wps.length < 2) {
    return { lat: wps[0]?.lat ?? 0, lng: wps[0]?.lng ?? 0, hdgDeg: route.bearingDeg };
  }
  const f = p * (wps.length - 1);
  const i = Math.min(wps.length - 2, Math.floor(f));
  const t = f - i;
  const a = wps[i];
  const b = wps[i + 1];
  const lat = a.lat + (b.lat - a.lat) * t;
  const lng = a.lng + (b.lng - a.lng) * t;
  const hdgDeg = initialBearingDeg(a.lat, a.lng, b.lat, b.lng);
  return { lat, lng, hdgDeg };
}

export function cruiseAltitudeForDistance(nm: number, category: string): number {
  if (category === "ga") return 1500 + Math.min(nm, 200) * 5;
  if (category === "business") return 8000 + Math.min(nm, 800) * 4;
  if (category === "regional") return 6000 + Math.min(nm, 500) * 6;
  if (category === "cargo") return 9000 + Math.min(nm, 2000) * 3;
  return 10_000 + Math.min(nm, 3000) * 2.5;
}

export function cruiseSpeedForCategory(category: string): number {
  switch (category) {
    case "ga":
      return 55;
    case "business":
      return 200;
    case "regional":
      return 140;
    case "cargo":
      return 220;
    case "emergency":
    case "sar":
      return 90;
    default:
      return 230;
  }
}
