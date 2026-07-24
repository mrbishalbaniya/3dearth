/**
 * Overpass API client — real OSM vector data for roads, water, buildings, POIs.
 *
 * Public Overpass mirrors rate-limit aggressively. This module:
 * - Serializes requests (1 at a time)
 * - Enforces a minimum gap between calls
 * - Rotates endpoints + cools down on 429/504
 * - Coalesces identical in-flight queries
 * - Caches successes and short-lived failures (negative cache)
 */

import type {
  LandCoverClass,
  OsmNodeFeature,
  OsmPolygonFeature,
  OsmWayFeature,
} from "./types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** Min ms between starting Overpass POSTs (public mirror etiquette). */
const MIN_GAP_MS = 2_000;
const MAX_CACHE = 96;
const NEGATIVE_TTL_MS = 25_000;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 90_000;

const cache = new Map<string, unknown>();
const negativeUntil = new Map<string, number>();
const inflight = new Map<string, Promise<unknown>>();
const endpointCooldownUntil = new Map<string, number>();

let endpointCursor = 0;
let globalBackoffUntil = 0;
let consecutiveFailures = 0;
let nextAvailableAt = 0;
let active = 0;
const waiters: Array<() => void> = [];

function wakeNext(): void {
  const next = waiters.shift();
  if (next) next();
}

async function acquireSlot(signal?: AbortSignal): Promise<void> {
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const now = performance.now();
    const gate = Math.max(nextAvailableAt, globalBackoffUntil);
    if (active === 0 && now >= gate) {
      active = 1;
      nextAvailableAt = now + MIN_GAP_MS;
      return;
    }
    const waitMs = Math.max(40, gate - now + 10);
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        const idx = waiters.indexOf(tick);
        if (idx >= 0) waiters.splice(idx, 1);
        fn();
      };
      const tick = () => finish(() => resolve());
      const timer = setTimeout(() => finish(() => resolve()), waitMs);
      const onAbort = () => {
        clearTimeout(timer);
        finish(() => reject(new DOMException("Aborted", "AbortError")));
      };
      waiters.push(tick);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

function releaseSlot(): void {
  active = 0;
  wakeNext();
}

function pickEndpoint(): string | null {
  const now = Date.now();
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const ep =
      OVERPASS_ENDPOINTS[(endpointCursor + i) % OVERPASS_ENDPOINTS.length];
    const cool = endpointCooldownUntil.get(ep) ?? 0;
    if (cool <= now) {
      endpointCursor = (endpointCursor + i + 1) % OVERPASS_ENDPOINTS.length;
      return ep;
    }
  }
  return null;
}

function coolEndpoint(ep: string, status: number): void {
  const extra =
    status === 429 || status === 504 || status === 503
      ? BACKOFF_BASE_MS * Math.min(8, 1 + consecutiveFailures)
      : BACKOFF_BASE_MS;
  endpointCooldownUntil.set(ep, Date.now() + Math.min(BACKOFF_MAX_MS, extra));
}

function bumpGlobalBackoff(): void {
  consecutiveFailures++;
  const ms = Math.min(
    BACKOFF_MAX_MS,
    BACKOFF_BASE_MS * Math.pow(1.6, Math.min(consecutiveFailures, 6)),
  );
  globalBackoffUntil = performance.now() + ms;
  nextAvailableAt = Math.max(nextAvailableAt, globalBackoffUntil);
}

function clearFailureStreak(): void {
  consecutiveFailures = 0;
  globalBackoffUntil = 0;
}

function cacheSet(key: string, data: unknown): void {
  cache.set(key, data);
  negativeUntil.delete(key);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function bboxAround(
  lat: number,
  lng: number,
  deltaDeg: number,
): BBox {
  return {
    south: lat - deltaDeg,
    west: lng - deltaDeg,
    north: lat + deltaDeg,
    east: lng + deltaDeg,
  };
}

/** Coarser quantization = fewer unique Overpass keys while panning. */
export function quantizeFocus(lat: number, lng: number, step = 0.04) {
  return {
    lat: Math.round(lat / step) * step,
    lng: Math.round(lng / step) * step,
  };
}

async function overpassQuery<T>(
  query: string,
  cacheKey: string,
  signal?: AbortSignal,
): Promise<T> {
  const hit = cache.get(cacheKey);
  if (hit) return hit as T;

  const neg = negativeUntil.get(cacheKey);
  if (neg && neg > Date.now()) {
    throw new Error("Overpass negative cache");
  }

  const pending = inflight.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    await acquireSlot(signal);
    let lastError: unknown;
    try {
      // Try up to all endpoints once per acquired slot
      for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length; attempt++) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        const endpoint = pickEndpoint();
        if (!endpoint) {
          bumpGlobalBackoff();
          throw new Error("Overpass all endpoints cooling down");
        }

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            body: `data=${encodeURIComponent(query)}`,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            signal,
          });

          if (res.status === 429 || res.status === 503 || res.status === 504) {
            coolEndpoint(endpoint, res.status);
            bumpGlobalBackoff();
            lastError = new Error(`Overpass ${res.status}`);
            continue;
          }
          if (!res.ok) {
            coolEndpoint(endpoint, res.status);
            lastError = new Error(`Overpass ${res.status}`);
            continue;
          }

          const data = (await res.json()) as T;
          cacheSet(cacheKey, data);
          clearFailureStreak();
          return data;
        } catch (err) {
          if (signal?.aborted) throw err;
          lastError = err;
          coolEndpoint(endpoint, 0);
        }
      }

      negativeUntil.set(cacheKey, Date.now() + NEGATIVE_TTL_MS);
      throw lastError ?? new Error("Overpass failed");
    } finally {
      releaseSlot();
    }
  })();

  inflight.set(cacheKey, run);
  try {
    return (await run) as T;
  } finally {
    inflight.delete(cacheKey);
  }
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

type OverpassResponse = { elements: OverpassElement[] };

function wayCoords(el: OverpassElement): Array<[number, number]> {
  if (!el.geometry) return [];
  return el.geometry.map((g) => [g.lon, g.lat] as [number, number]);
}

function bboxKey(prefix: string, bbox: BBox): string {
  // 2-decimal (~1.1 km) keys — merges nearby pans into one cache entry
  return `${prefix}:${bbox.south.toFixed(2)},${bbox.west.toFixed(2)},${bbox.north.toFixed(2)},${bbox.east.toFixed(2)}`;
}

export async function fetchRoads(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<OsmWayFeature[]> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:20];
    (
      way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|service"](${south},${west},${north},${east});
      way["railway"~"rail|subway|light_rail"](${south},${west},${north},${east});
      way["aeroway"~"runway|taxiway"](${south},${west},${north},${east});
    );
    out geom tags;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("roads", bbox),
    signal,
  );
  return data.elements
    .filter((e) => e.type === "way" && e.geometry && e.geometry.length > 1)
    .map((e) => {
      const tags = e.tags || {};
      const kind = tags.highway || tags.railway || tags.aeroway || "road";
      return {
        id: `way-${e.id}`,
        kind,
        name: tags.name,
        coords: wayCoords(e),
        tags,
      };
    });
}

export async function fetchWaterways(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<{ ways: OsmWayFeature[]; polygons: OsmPolygonFeature[] }> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:20];
    (
      way["waterway"~"river|stream|canal"](${south},${west},${north},${east});
      way["natural"="water"](${south},${west},${north},${east});
      way["water"~"lake|reservoir|pond|basin"](${south},${west},${north},${east});
      relation["natural"="water"](${south},${west},${north},${east});
    );
    out geom tags;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("water", bbox),
    signal,
  );

  const ways: OsmWayFeature[] = [];
  const polygons: OsmPolygonFeature[] = [];

  for (const e of data.elements) {
    if (!e.geometry || e.geometry.length < 2) continue;
    const tags = e.tags || {};
    const coords = wayCoords(e);
    const isPoly =
      tags.natural === "water" ||
      !!tags.water ||
      (coords.length > 3 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1]);

    if (isPoly) {
      polygons.push({
        id: `water-poly-${e.id}`,
        kind: "water",
        name: tags.name,
        rings: [coords],
        tags,
      });
    } else {
      ways.push({
        id: `water-way-${e.id}`,
        kind: tags.waterway || "waterway",
        name: tags.name,
        coords,
        tags,
      });
    }
  }

  return { ways, polygons };
}

export async function fetchLandCover(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<OsmPolygonFeature[]> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:22];
    (
      way["landuse"~"forest|farmland|meadow|orchard|vineyard|grass|residential|industrial|commercial|quarry|bare_rock|sand"](${south},${west},${north},${east});
      way["natural"~"wood|scrub|grassland|heath|wetland|sand|bare_rock|glacier|beach"](${south},${west},${north},${east});
    );
    out geom tags;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("landcover", bbox),
    signal,
  );

  return data.elements
    .filter((e) => e.geometry && e.geometry.length >= 4)
    .map((e) => {
      const tags = e.tags || {};
      return {
        id: `lc-${e.id}`,
        kind: classifyLandCover(tags),
        name: tags.name,
        rings: [wayCoords(e)],
        tags,
      };
    });
}

export async function fetchForests(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<OsmPolygonFeature[]> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:18];
    (
      way["landuse"="forest"](${south},${west},${north},${east});
      way["natural"~"wood|jungle"](${south},${west},${north},${east});
    );
    out geom tags;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("forest", bbox),
    signal,
  );
  return data.elements
    .filter((e) => e.geometry && e.geometry.length >= 4)
    .map((e) => ({
      id: `forest-${e.id}`,
      kind: "forest" as const,
      name: e.tags?.name,
      rings: [wayCoords(e)],
      tags: e.tags || {},
    }));
}

export async function fetchPois(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<OsmNodeFeature[]> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:18];
    (
      node["amenity"~"school|university|hospital|clinic|place_of_worship|fuel|bus_station|restaurant|cafe|fast_food"](${south},${west},${north},${east});
      node["tourism"~"hotel|attraction|museum|viewpoint"](${south},${west},${north},${east});
      node["shop"~"mall|supermarket"](${south},${west},${north},${east});
      node["aeroway"="aerodrome"](${south},${west},${north},${east});
      node["leisure"~"park|stadium"](${south},${west},${north},${east});
    );
    out body tags;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("pois", bbox),
    signal,
  );
  return data.elements
    .filter((e) => e.type === "node" && e.lat != null && e.lon != null)
    .map((e) => {
      const tags = e.tags || {};
      const kind =
        tags.amenity ||
        tags.tourism ||
        tags.shop ||
        tags.aeroway ||
        tags.leisure ||
        "poi";
      return {
        id: `poi-${e.id}`,
        kind,
        name: tags.name,
        lat: e.lat!,
        lng: e.lon!,
        tags,
      };
    });
}

export async function fetchNaturalFeatures(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<OsmNodeFeature[]> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:18];
    (
      node["natural"~"peak|volcano|cliff|waterfall|glacier|cape|bay|beach"](${south},${west},${north},${east});
      node["place"="island"](${south},${west},${north},${east});
    );
    out body tags;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("natural", bbox),
    signal,
  );
  return data.elements
    .filter((e) => e.lat != null && e.lon != null)
    .map((e) => ({
      id: `nat-${e.id}`,
      kind: e.tags?.natural || e.tags?.place || "feature",
      name: e.tags?.name,
      lat: e.lat!,
      lng: e.lon!,
      tags: e.tags || {},
    }));
}

export async function fetchBuildingsDetailed(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<
  Array<{
    id: string;
    lat: number;
    lng: number;
    height: number;
    levels?: number;
    name?: string;
    building: string;
    footprint?: Array<[number, number]>;
  }>
> {
  const { south, west, north, east } = bbox;
  const query = `
    [out:json][timeout:22];
    (
      way["building"](${south},${west},${north},${east});
    );
    out center tags geom;
  `;
  const data = await overpassQuery<OverpassResponse>(
    query,
    bboxKey("bld", bbox),
    signal,
  );

  return data.elements
    .filter((e) => e.center || (e.geometry && e.geometry.length))
    .map((e) => {
      const tags = e.tags || {};
      const levels = Number(tags["building:levels"] || 0);
      const heightTag = Number(tags.height || 0);
      const height = heightTag || (levels ? levels * 3.2 : 12);
      const lat = e.center?.lat ?? e.geometry![0].lat;
      const lng = e.center?.lon ?? e.geometry![0].lon;
      return {
        id: `bld-${e.id}`,
        lat,
        lng,
        height: Math.min(height, 400),
        levels: levels || undefined,
        name: tags.name,
        building: tags.building || "yes",
        footprint: e.geometry
          ? e.geometry.map((g) => [g.lon, g.lat] as [number, number])
          : undefined,
      };
    });
}

function classifyLandCover(tags: Record<string, string>): LandCoverClass {
  const landuse = tags.landuse || "";
  const n = tags.natural || "";

  if (landuse === "forest" || n === "wood") return "forest";
  if (n === "jungle") return "jungle";
  if (landuse === "farmland" || landuse === "orchard" || landuse === "vineyard")
    return "farmland";
  if (landuse === "meadow" || landuse === "grass" || n === "grassland")
    return "grassland";
  if (n === "scrub" || n === "heath") return "shrubland";
  if (n === "wetland") return "wetlands";
  if (n === "sand" || landuse === "sand") return "sand";
  if (n === "bare_rock" || landuse === "quarry") return "bare_rock";
  if (n === "glacier") return "ice";
  if (n === "beach") return "sand";
  if (
    landuse === "residential" ||
    landuse === "industrial" ||
    landuse === "commercial"
  )
    return "urban";
  if (landuse === "desert") return "desert";
  return "grassland";
}

/** Clear Overpass memory cache (e.g. on unmount). */
export function clearOverpassCache(): void {
  cache.clear();
  negativeUntil.clear();
}
