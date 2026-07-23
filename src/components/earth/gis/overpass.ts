/**
 * Overpass API client — real OSM vector data for roads, water, buildings, POIs.
 * Includes request coalescing, bbox caching, and abort support.
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
];

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

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

export function quantizeFocus(lat: number, lng: number, step = 0.02) {
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
  const pending = inflight.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    let lastError: unknown;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal,
        });
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        const data = (await res.json()) as T;
        cache.set(cacheKey, data);
        if (cache.size > 64) {
          const first = cache.keys().next().value;
          if (first) cache.delete(first);
        }
        return data;
      } catch (err) {
        if (signal?.aborted) throw err;
        lastError = err;
      }
    }
    throw lastError;
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
  const key = `roads:${south.toFixed(3)},${west.toFixed(3)},${north.toFixed(3)},${east.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);
  return data.elements
    .filter((e) => e.type === "way" && e.geometry && e.geometry.length > 1)
    .map((e) => {
      const tags = e.tags || {};
      const kind =
        tags.highway || tags.railway || tags.aeroway || "road";
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
  const key = `water:${south.toFixed(3)},${west.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);

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
  const key = `landcover:${south.toFixed(3)},${west.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);

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
  const key = `forest:${south.toFixed(3)},${west.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);
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
  const key = `pois:${south.toFixed(3)},${west.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);
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
  const key = `natural:${south.toFixed(3)},${west.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);
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
  const key = `bld:${south.toFixed(3)},${west.toFixed(3)}`;
  const data = await overpassQuery<OverpassResponse>(query, key, signal);

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
  const natural = tags.natural || {};
  const n = typeof natural === "string" ? natural : "";

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
}
