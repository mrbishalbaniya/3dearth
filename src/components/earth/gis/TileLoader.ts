/**
 * Unified tile / image loader with LRU cache and in-flight dedupe.
 * Used by satellite, DEM, and land-cover raster layers.
 */
import {
  LinearFilter,
  SRGBColorSpace,
  Texture,
  type MagnificationTextureFilter,
  type MinificationTextureFilter,
} from "three";

export interface TileLoadOptions {
  colorSpace?: typeof SRGBColorSpace | null;
  minFilter?: MinificationTextureFilter;
  magFilter?: MagnificationTextureFilter;
  generateMipmaps?: boolean;
  anisotropy?: number;
  /** Decode as data texture (ignore sRGB) — for DEM / classification. */
  asData?: boolean;
}

type CacheEntry = { texture: Texture; lastUsed: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Texture>>();
const MAX_CACHE = 320;

function touch(key: string, texture: Texture) {
  cache.set(key, { texture, lastUsed: performance.now() });
  if (cache.size <= MAX_CACHE) return;
  let oldestKey: string | null = null;
  let oldest = Infinity;
  for (const [k, v] of cache) {
    if (v.lastUsed < oldest) {
      oldest = v.lastUsed;
      oldestKey = k;
    }
  }
  if (oldestKey) {
    cache.get(oldestKey)?.texture.dispose();
    cache.delete(oldestKey);
  }
}

export function getCachedTexture(key: string): Texture | null {
  const entry = cache.get(key);
  if (!entry) return null;
  entry.lastUsed = performance.now();
  return entry.texture;
}

export function loadTileImage(
  url: string,
  key: string,
  options: TileLoadOptions = {},
): Promise<Texture> {
  const hit = getCachedTexture(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<Texture>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = new Texture(img);
      if (!options.asData) {
        tex.colorSpace = options.colorSpace ?? SRGBColorSpace;
      }
      tex.minFilter = options.minFilter ?? LinearFilter;
      tex.magFilter = options.magFilter ?? LinearFilter;
      tex.generateMipmaps = options.generateMipmaps ?? false;
      tex.anisotropy = options.anisotropy ?? 4;
      tex.needsUpdate = true;
      inflight.delete(key);
      touch(key, tex);
      resolve(tex);
    };
    img.onerror = () => {
      inflight.delete(key);
      reject(new Error(`Failed to load tile ${key}`));
    };
    img.src = url;
  });

  inflight.set(key, promise);
  return promise;
}

/** Decode Mapzen Terrarium RGB → meters. */
export function terrariumToMeters(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/**
 * Sample elevation grid from a Terrarium texture (must be uploaded / readable).
 * Uses a canvas draw for CPU sampling.
 */
export async function sampleTerrariumGrid(
  url: string,
  gridSize: number,
): Promise<Float32Array> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(img, 0, 0, gridSize, gridSize);
  const { data } = ctx.getImageData(0, 0, gridSize, gridSize);
  const out = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < gridSize * gridSize; i++) {
    const o = i * 4;
    out[i] = terrariumToMeters(data[o], data[o + 1], data[o + 2]);
  }
  return out;
}

export function disposeTileCache(): void {
  for (const entry of cache.values()) entry.texture.dispose();
  cache.clear();
  inflight.clear();
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

/** Mapzen / AWS Terrarium DEM — SRTM-based, free, no API key. */
export const TERRARIUM_DEM_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** OpenTopoMap (CC-BY-SA) — free topographic raster. */
export const TOPO_TILE_URL =
  "https://tile.opentopomap.org/{z}/{x}/{y}.png";

/** Web Mercator tile → EPSG:3857 bbox meters. */
export function tileToMercatorBBox(z: number, x: number, y: number) {
  const size = Math.PI * 6378137;
  const res = (2 * size) / 2 ** z;
  const minX = -size + x * res;
  const maxX = -size + (x + 1) * res;
  const maxY = size - y * res;
  const minY = size - (y + 1) * res;
  return { minX, minY, maxX, maxY };
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
