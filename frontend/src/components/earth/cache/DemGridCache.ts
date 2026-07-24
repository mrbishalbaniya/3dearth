/**
 * Shared DEM height-grid cache — ElevationService, TerrainLayer, Bathymetry.
 * Avoids double network + double canvas decode for the same z/x/y.
 */

import { StreamPerf } from "../performance/StreamPerf";
import { terrariumToMeters } from "../utils/terrarium";

interface DemGrid {
  data: Float32Array;
  size: number;
  lastUsed: number;
  refs: number;
}

const cache = new Map<string, DemGrid>();
const inflight = new Map<string, Promise<Float32Array>>();
const MAX = 48;

function evict() {
  while (cache.size > MAX) {
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
    cache.delete(oldestKey);
  }
}

export function demCacheKey(
  kind: "land" | "ocean" | "merged",
  z: number,
  x: number,
  y: number,
  size: number,
): string {
  return `${kind}:${z}/${x}/${y}/${size}`;
}

export function peekDemGrid(key: string): Float32Array | null {
  const hit = cache.get(key);
  if (!hit) return null;
  hit.lastUsed = performance.now();
  return hit.data;
}

export function acquireDemGrid(key: string): Float32Array | null {
  const hit = cache.get(key);
  if (!hit) return null;
  hit.refs += 1;
  hit.lastUsed = performance.now();
  return hit.data;
}

export function releaseDemGrid(key: string) {
  const hit = cache.get(key);
  if (!hit) return;
  hit.refs = Math.max(0, hit.refs - 1);
}

export function storeDemGrid(key: string, data: Float32Array, size: number) {
  put(key, data, size);
}

function put(key: string, data: Float32Array, size: number) {
  cache.set(key, {
    data,
    size,
    lastUsed: performance.now(),
    refs: 0,
  });
  evict();
}

async function decodeImageGrid(
  url: string,
  size: number,
  signal?: AbortSignal,
): Promise<Float32Array> {
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");

  const res = await fetch(url, {
    signal,
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!res.ok) throw new Error(`DEM HTTP ${res.status}`);
  const blob = await res.blob();
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");

  const bmp = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2d unavailable");
    ctx.drawImage(bmp, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const out = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const o = i * 4;
      out[i] = terrariumToMeters(data[o], data[o + 1], data[o + 2]);
    }
    return out;
  } finally {
    bmp.close();
  }
}

export async function loadDemGrid(
  key: string,
  url: string,
  size: number,
  signal?: AbortSignal,
): Promise<Float32Array> {
  const hit = peekDemGrid(key);
  if (hit) {
    StreamPerf.hitCache();
    return hit;
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  StreamPerf.missCache();
  const promise = (async () => {
    const t0 = performance.now();
    const data = await decodeImageGrid(url, size, signal);
    put(key, data, size);
    StreamPerf.recordLoadMs(performance.now() - t0);
    StreamPerf.network();
    return data;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export function demCacheStats() {
  return { entries: cache.size, max: MAX };
}
