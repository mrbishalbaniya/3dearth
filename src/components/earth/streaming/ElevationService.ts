/**
 * Elevation sampling from Mapzen Terrarium (SRTM-based) with LRU cache.
 * Used for terrain morph, camera collision, and future draping.
 */
import {
  buildTileUrl,
  TERRARIUM_DEM_URL,
  terrariumToMeters,
  tileToLngLatBounds,
} from "../gis/TileLoader";
import { lngLatToTile } from "../utils/tiles";

interface ElevTile {
  z: number;
  x: number;
  y: number;
  size: number;
  data: Float32Array;
  lastUsed: number;
}

const cache = new Map<string, ElevTile>();
const inflight = new Map<string, Promise<ElevTile>>();
const MAX = 48;

async function loadElevTile(z: number, x: number, y: number, size = 64): Promise<ElevTile> {
  const key = `${z}/${x}/${y}/${size}`;
  const hit = cache.get(key);
  if (hit) {
    hit.lastUsed = performance.now();
    return hit;
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const url = buildTileUrl(TERRARIUM_DEM_URL, z, x, y);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2d unavailable");
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const heights = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const o = i * 4;
      heights[i] = terrariumToMeters(data[o], data[o + 1], data[o + 2]);
    }
    const tile: ElevTile = {
      z,
      x,
      y,
      size,
      data: heights,
      lastUsed: performance.now(),
    };
    cache.set(key, tile);
    if (cache.size > MAX) {
      let oldestKey: string | null = null;
      let oldest = Infinity;
      for (const [k, v] of cache) {
        if (v.lastUsed < oldest) {
          oldest = v.lastUsed;
          oldestKey = k;
        }
      }
      if (oldestKey) cache.delete(oldestKey);
    }
    return tile;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/** Bilinear sample elevation (meters) at lat/lng. */
export async function sampleElevation(
  lat: number,
  lng: number,
  z = 10,
): Promise<number> {
  const { x, y } = lngLatToTile(lng, lat, z);
  const tile = await loadElevTile(z, x, y, 64);
  const bounds = tileToLngLatBounds(z, x, y);
  const u = (lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin);
  const v = (bounds.latMax - lat) / (bounds.latMax - bounds.latMin);
  const fx = Math.min(tile.size - 1.001, Math.max(0, u * (tile.size - 1)));
  const fy = Math.min(tile.size - 1.001, Math.max(0, v * (tile.size - 1)));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(tile.size - 1, x0 + 1);
  const y1 = Math.min(tile.size - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const h00 = tile.data[y0 * tile.size + x0];
  const h10 = tile.data[y0 * tile.size + x1];
  const h01 = tile.data[y1 * tile.size + x0];
  const h11 = tile.data[y1 * tile.size + x1];
  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;
  return h0 * (1 - ty) + h1 * ty;
}

/** Synchronous cache peek — returns null if not loaded. */
export function peekElevation(lat: number, lng: number, z = 10): number | null {
  const { x, y } = lngLatToTile(lng, lat, z);
  const key = `${z}/${x}/${y}/64`;
  const tile = cache.get(key);
  if (!tile) return null;
  const bounds = tileToLngLatBounds(z, x, y);
  const u = (lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin);
  const v = (bounds.latMax - lat) / (bounds.latMax - bounds.latMin);
  const ix = Math.min(
    tile.size - 1,
    Math.max(0, Math.round(u * (tile.size - 1))),
  );
  const iy = Math.min(
    tile.size - 1,
    Math.max(0, Math.round(v * (tile.size - 1))),
  );
  return tile.data[iy * tile.size + ix];
}

export function warmElevation(lat: number, lng: number, z = 10) {
  const { x, y } = lngLatToTile(lng, lat, z);
  void loadElevTile(z, x, y, 64).catch(() => undefined);
}
