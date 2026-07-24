/**
 * Unified tile / image loader — LRU + refcount + AbortSignal + IndexedDB.
 */
import {
  LinearFilter,
  SRGBColorSpace,
  Texture,
  type MagnificationTextureFilter,
  type MinificationTextureFilter,
} from "three";
import { buildTileUrl } from "../utils/tiles";
import { terrariumToMeters } from "../utils/terrarium";
import {
  fetchTileBuffer,
  getIdbEntryCount,
  idbGetTile,
  idbPutTile,
} from "../cache/TileIdbCache";
import {
  demCacheKey,
  loadDemGrid,
  peekDemGrid,
  storeDemGrid,
} from "../cache/DemGridCache";
import { StreamPerf } from "../performance/StreamPerf";

export { terrariumToMeters };

export interface TileLoadOptions {
  colorSpace?: typeof SRGBColorSpace | null;
  minFilter?: MinificationTextureFilter;
  magFilter?: MagnificationTextureFilter;
  generateMipmaps?: boolean;
  anisotropy?: number;
  asData?: boolean;
  signal?: AbortSignal;
}

type CacheEntry = {
  texture: Texture;
  lastUsed: number;
  refs: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Texture>>();
/** Soft LRU target — stay well under Chrome renderer RAM. */
const MAX_CACHE = 64;
/** Hard ceiling — force-evict even pinned entries past this. */
const HARD_CACHE = 80;

function disposeGpuTexture(texture: Texture) {
  const img = texture.image as { close?: () => void } | null;
  texture.dispose();
  if (img && typeof img.close === "function") {
    try {
      img.close();
    } catch {
      /* already closed */
    }
  }
}

function evictIfNeeded() {
  while (cache.size > MAX_CACHE) {
    let oldestKey: string | null = null;
    let oldest = Infinity;
    for (const [k, v] of cache) {
      if (v.refs > 0) continue;
      if (v.lastUsed < oldest) {
        oldest = v.lastUsed;
        oldestKey = k;
      }
    }
    if (!oldestKey) break;
    const entry = cache.get(oldestKey);
    if (entry) disposeGpuTexture(entry.texture);
    cache.delete(oldestKey);
  }

  // Emergency: pinned textures can otherwise grow without bound → tab OOM
  while (cache.size > HARD_CACHE) {
    let oldestKey: string | null = null;
    let oldest = Infinity;
    for (const [k, v] of cache) {
      if (v.lastUsed < oldest) {
        oldest = v.lastUsed;
        oldestKey = k;
      }
    }
    if (!oldestKey) break;
    const entry = cache.get(oldestKey);
    if (entry) disposeGpuTexture(entry.texture);
    cache.delete(oldestKey);
  }

  StreamPerf.patch({
    tilesCachedGpu: cache.size,
    tilesCachedIdb: getIdbEntryCount(),
  });
}

function touch(key: string, texture: Texture) {
  const existing = cache.get(key);
  if (existing) {
    existing.texture = texture;
    existing.lastUsed = performance.now();
  } else {
    cache.set(key, { texture, lastUsed: performance.now(), refs: 0 });
  }
  evictIfNeeded();
}

export function getCachedTexture(key: string): Texture | null {
  const entry = cache.get(key);
  if (!entry) return null;
  entry.lastUsed = performance.now();
  StreamPerf.hitCache();
  return entry.texture;
}

/** Presence check without bumping cache-hit counters (debug overlay). */
export function hasCachedTexture(key: string): boolean {
  return cache.has(key);
}

export function acquireTexture(key: string): Texture | null {
  const entry = cache.get(key);
  if (!entry) return null;
  entry.refs += 1;
  entry.lastUsed = performance.now();
  return entry.texture;
}

export function releaseTexture(key: string) {
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  entry.lastUsed = performance.now();
}

async function bufferToTexture(
  buffer: ArrayBuffer,
  mime: string,
  options: TileLoadOptions,
): Promise<Texture> {
  const blob = new Blob([buffer], { type: mime });
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob, {
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
  } catch {
    bmp = await createImageBitmap(blob);
  }
  const tex = new Texture(bmp);
  if (!options.asData) {
    tex.colorSpace = options.colorSpace ?? SRGBColorSpace;
  }
  tex.minFilter = options.minFilter ?? LinearFilter;
  tex.magFilter = options.magFilter ?? LinearFilter;
  tex.generateMipmaps = false;
  // Anisotropy multiplies GPU memory; keep at 1 for streaming tiles
  tex.anisotropy = options.anisotropy ?? 1;
  tex.needsUpdate = true;
  return tex;
}

export function loadTileImage(
  url: string,
  key: string,
  options: TileLoadOptions = {},
): Promise<Texture> {
  const signal = options.signal;
  if (signal?.aborted) {
    StreamPerf.abort();
    return Promise.reject(new DOMException("aborted", "AbortError"));
  }

  const hit = getCachedTexture(key);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(key);
  if (pending) {
    return pending.then((tex) => {
      if (signal?.aborted) {
        StreamPerf.abort();
        throw new DOMException("aborted", "AbortError");
      }
      return tex;
    });
  }

  StreamPerf.missCache();
  const t0 = performance.now();

  const promise = (async () => {
    try {
      const idb = await idbGetTile(key);
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      if (idb) {
        StreamPerf.hitIdb();
        const tex = await bufferToTexture(idb.buffer, idb.mime, options);
        if (signal?.aborted) {
          disposeGpuTexture(tex);
          throw new DOMException("aborted", "AbortError");
        }
        touch(key, tex);
        StreamPerf.recordLoadMs(performance.now() - t0);
        return tex;
      }

      StreamPerf.network();
      const { buffer, mime } = await fetchTileBuffer(url, signal);
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      void idbPutTile(key, buffer.slice(0), mime);
      const tex = await bufferToTexture(buffer, mime, options);
      if (signal?.aborted) {
        disposeGpuTexture(tex);
        throw new DOMException("aborted", "AbortError");
      }
      touch(key, tex);
      StreamPerf.recordLoadMs(performance.now() - t0);
      return tex;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise.catch((err) => {
    if (err instanceof DOMException && err.name === "AbortError") {
      StreamPerf.abort();
    }
    throw err;
  });
}

export async function sampleTerrariumGrid(
  url: string,
  gridSize: number,
  signal?: AbortSignal,
): Promise<Float32Array> {
  const key = `url:${url}:${gridSize}`;
  const hit = peekDemGrid(key);
  if (hit) return hit;
  return loadDemGrid(key, url, gridSize, signal);
}

export function disposeTileCache(): void {
  for (const entry of cache.values()) {
    disposeGpuTexture(entry.texture);
  }
  cache.clear();
  inflight.clear();
  StreamPerf.patch({ tilesCachedGpu: 0 });
}

/** Drop unreferenced textures immediately (call on big LOD jumps). */
export function trimTileCache(target = MAX_CACHE): void {
  const goal = Math.max(16, Math.min(HARD_CACHE, target));
  while (cache.size > goal) {
    let oldestKey: string | null = null;
    let oldest = Infinity;
    for (const [k, v] of cache) {
      if (v.refs > 0) continue;
      if (v.lastUsed < oldest) {
        oldest = v.lastUsed;
        oldestKey = k;
      }
    }
    if (!oldestKey) break;
    const entry = cache.get(oldestKey);
    if (entry) disposeGpuTexture(entry.texture);
    cache.delete(oldestKey);
  }
  StreamPerf.patch({ tilesCachedGpu: cache.size });
}

export function getTileCacheStats() {
  let refs = 0;
  for (const e of cache.values()) refs += e.refs;
  return { entries: cache.size, refs, max: MAX_CACHE };
}

export {
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
  buildTileUrl,
  tilesAround,
  tileToLngLatBounds,
  tileKey,
  type TileKey,
  type TileCoord,
} from "../utils/tiles";

export const TERRARIUM_DEM_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export const BATHYMETRY_DEM_URL =
  "https://tiles.openwaters.io/seascape/{z}/{x}/{y}.webp";

export const TOPO_TILE_URL =
  "https://tile.opentopomap.org/{z}/{x}/{y}.png";

export async function sampleMergedDemGrid(
  z: number,
  x: number,
  y: number,
  gridSize: number,
  signal?: AbortSignal,
): Promise<Float32Array> {
  const mergedKey = demCacheKey("merged", z, x, y, gridSize);
  const cached = peekDemGrid(mergedKey);
  if (cached) return cached;

  const landUrl = buildTileUrl(TERRARIUM_DEM_URL, z, x, y);
  const oceanUrl = buildTileUrl(BATHYMETRY_DEM_URL, z, x, y);
  const landKey = demCacheKey("land", z, x, y, gridSize);
  const oceanKey = demCacheKey("ocean", z, x, y, gridSize);

  const [land, ocean] = await Promise.all([
    loadDemGrid(landKey, landUrl, gridSize, signal).catch(() => null),
    loadDemGrid(oceanKey, oceanUrl, gridSize, signal).catch(() => null),
  ]);

  if (!land && !ocean) {
    throw new Error(`DEM unavailable ${z}/${x}/${y}`);
  }
  if (!land) return ocean!;
  if (!ocean) return land;

  const out = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < out.length; i++) {
    const L = land[i];
    const O = ocean[i];
    if (L > 2) out[i] = L;
    else if (O < -1) out[i] = O;
    else if (L < -1) out[i] = L;
    else out[i] = Math.min(L, O);
  }
  storeDemGrid(mergedKey, out, gridSize);
  return out;
}

/** Web Mercator tile → EPSG:3857 bbox meters. */
export function tileToMercatorBBox(z: number, x: number, y: number) {
  const size = Math.PI * 6378137;
  const res = (2 * size) / 2 ** z;
  return {
    minX: -size + x * res,
    maxX: -size + (x + 1) * res,
    minY: size - (y + 1) * res,
    maxY: size - y * res,
  };
}

/**
 * ESA WorldCover 2021 via free Terrascope WMS (no API key).
 * https://esa-worldcover.org — CC BY 4.0
 */
export function worldCoverTileUrl(z: number, x: number, y: number): string {
  const { minX, minY, maxX, maxY } = tileToMercatorBBox(z, x, y);
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "WORLDCOVER_2021_MAP",
    SRS: "EPSG:3857",
    BBOX: `${minX},${minY},${maxX},${maxY}`,
    WIDTH: "256",
    HEIGHT: "256",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    STYLES: "",
  });
  return `https://services.terrascope.be/wms/v2?${params.toString()}`;
}
