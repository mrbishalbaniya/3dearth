/**
 * Flight corridor geometry — great-circle route band for streaming.
 * Loads only the corridor + buffer (not the whole Earth).
 */
import { haversineM, initialBearingDeg } from "../../game/Navigation/greatCircle";
import { altitudeToTileZoom } from "../utils/zoomLevels";
import { lngLatToTile, tileKey, type TileKey } from "../utils/tiles";
import type { LodTile } from "./LodSelector";

export type LatLng = { lat: number; lng: number; name?: string };

export interface CorridorConfig {
  /** Nominal half-width of the corridor (km). Default 50. */
  bufferKm: number;
  /** Allowed values for UI / presets. */
  bufferPresetsKm: number[];
}

export const DEFAULT_CORRIDOR_CONFIG: CorridorConfig = {
  bufferKm: 50,
  bufferPresetsKm: [20, 50, 100, 200],
};

export interface CorridorSample {
  lat: number;
  lng: number;
  /** Meters along remaining route from aircraft (approx). */
  alongM: number;
  kind: "aircraft" | "route" | "destination" | "alternate" | "departure";
}

export interface CorridorSnapshot {
  active: boolean;
  bufferKm: number;
  samples: CorridorSample[];
  /** Polyline for debug ribbon (route centerline ahead). */
  centerline: LatLng[];
  remainingNm: number;
  aheadNm: number;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Destination bearing offset by meters at given bearing (spherical approx). */
export function offsetLatLng(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): LatLng {
  const R = 6_371_000;
  const δ = distanceM / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return {
    lat: (φ2 * 180) / Math.PI,
    lng: ((((λ2 * 180) / Math.PI) + 540) % 360) - 180,
  };
}

/**
 * Adaptive corridor half-width (km).
 * Wider when fast / high / zoomed out — so scenery stays ahead of the aircraft.
 */
export function adaptiveBufferKm(opts: {
  baseKm: number;
  groundSpeedMs: number;
  altitudeM: number;
  cameraAltitudeM?: number;
}): number {
  const lookAheadSec = 90;
  const speedKm = (opts.groundSpeedMs * lookAheadSec) / 1000;
  const altKm = Math.min(80, opts.altitudeM / 1000);
  const cam = opts.cameraAltitudeM ?? opts.altitudeM;
  const zoomKm = cam > 80_000 ? 40 : cam > 20_000 ? 20 : 0;
  return clamp(opts.baseKm + speedKm * 0.35 + altKm * 0.8 + zoomKm, 20, 200);
}

/** Index of waypoint closest to aircraft (for remaining-route slicing). */
export function nearestWaypointIndex(
  lat: number,
  lng: number,
  waypoints: LatLng[],
): number {
  if (!waypoints.length) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const d = haversineM(lat, lng, waypoints[i].lat, waypoints[i].lng);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Build corridor sample points: aircraft → remaining route → dest/alt airports.
 * Lateral buffer samples left/right of centerline for tile coverage width.
 */
export function buildCorridorSamples(opts: {
  aircraft: LatLng;
  waypoints: LatLng[];
  bufferKm: number;
  destination?: LatLng | null;
  alternate?: LatLng | null;
  departure?: LatLng | null;
  /** Max centerline samples along remaining route. */
  maxAlong?: number;
}): CorridorSample[] {
  const {
    aircraft,
    waypoints,
    bufferKm,
    destination,
    alternate,
    departure,
    maxAlong = 24,
  } = opts;
  const out: CorridorSample[] = [
    { lat: aircraft.lat, lng: aircraft.lng, alongM: 0, kind: "aircraft" },
  ];

  if (!waypoints.length && !destination) return out;

  const idx = nearestWaypointIndex(aircraft.lat, aircraft.lng, waypoints);
  // Prefer points ahead of aircraft along the route
  const ahead = waypoints.slice(Math.max(0, idx));
  const step = Math.max(1, Math.ceil(ahead.length / maxAlong));
  let alongM = 0;
  let prev = aircraft;

  for (let i = 0; i < ahead.length; i += step) {
    const wp = ahead[i];
    alongM += haversineM(prev.lat, prev.lng, wp.lat, wp.lng);
    out.push({
      lat: wp.lat,
      lng: wp.lng,
      alongM,
      kind: "route",
    });
    // Lateral buffer samples (corridor width)
    if (bufferKm > 0 && i + step < ahead.length) {
      const next = ahead[Math.min(ahead.length - 1, i + step)];
      const brg = initialBearingDeg(wp.lat, wp.lng, next.lat, next.lng);
      const halfM = bufferKm * 500; // half-width in meters (bufferKm is half-corridor)
      const left = offsetLatLng(wp.lat, wp.lng, brg - 90, halfM);
      const right = offsetLatLng(wp.lat, wp.lng, brg + 90, halfM);
      out.push({
        lat: left.lat,
        lng: left.lng,
        alongM,
        kind: "route",
      });
      out.push({
        lat: right.lat,
        lng: right.lng,
        alongM,
        kind: "route",
      });
    }
    prev = wp;
  }

  if (destination) {
    alongM += haversineM(prev.lat, prev.lng, destination.lat, destination.lng);
    out.push({
      lat: destination.lat,
      lng: destination.lng,
      alongM,
      kind: "destination",
    });
  }
  if (alternate) {
    out.push({
      lat: alternate.lat,
      lng: alternate.lng,
      alongM,
      kind: "alternate",
    });
  }
  if (departure) {
    out.push({
      lat: departure.lat,
      lng: departure.lng,
      alongM: 0,
      kind: "departure",
    });
  }

  return out;
}

/** Tile Z for corridor prefetch — slightly coarser than focus detail to save VRAM. */
export function corridorTileZoom(altitudeM: number): number {
  return Math.min(
    15,
    Math.max(5, Math.round(altitudeToTileZoom(altitudeM)) - 1),
  );
}

/**
 * Convert corridor samples → LodTiles for background prefetch.
 * Priority: aircraft > camera/route ahead > destination > alternate.
 */
export function corridorSamplesToTiles(
  samples: CorridorSample[],
  altitudeM: number,
  maxTiles = 40,
): LodTile[] {
  const z = corridorTileZoom(altitudeM);
  const ringR = altitudeM > 40_000 ? 1 : 0;
  const map = new Map<string, LodTile>();

  for (const s of samples) {
    const basePri =
      s.kind === "aircraft"
        ? 90
        : s.kind === "destination"
          ? 55
          : s.kind === "alternate"
            ? 40
            : s.kind === "departure"
              ? 35
              : Math.max(20, 70 - s.alongM / 50_000);

    const center = lngLatToTile(s.lng, s.lat, z);
    const n = 2 ** z;
    for (let dy = -ringR; dy <= ringR; dy++) {
      for (let dx = -ringR; dx <= ringR; dx++) {
        const x = (((center.x + dx) % n) + n) % n;
        const y = center.y + dy;
        if (y < 0 || y >= n) continue;
        const key = tileKey(z, x, y);
        const dist = Math.hypot(dx, dy);
        const tile: LodTile = {
          key,
          z,
          x,
          y,
          role: "prefetch",
          opacity: 0,
          priority: basePri - dist * 5,
        };
        const prev = map.get(key);
        if (!prev || tile.priority > prev.priority) map.set(key, tile);
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxTiles);
}

export function corridorCenterline(
  aircraft: LatLng,
  waypoints: LatLng[],
  destination?: LatLng | null,
): LatLng[] {
  const idx = nearestWaypointIndex(aircraft.lat, aircraft.lng, waypoints);
  const line: LatLng[] = [aircraft, ...waypoints.slice(idx)];
  if (
    destination &&
    (!line.length ||
      haversineM(
        line[line.length - 1].lat,
        line[line.length - 1].lng,
        destination.lat,
        destination.lng,
      ) > 500)
  ) {
    line.push(destination);
  }
  return line;
}

export type { TileKey };
