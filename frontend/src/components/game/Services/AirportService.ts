import type { Airport, RunwayInfo } from "../Types";
import {
  getAirportApi,
  healthz,
  listRunwaysApi,
  nearestAirportsApi,
  searchAirportsApi,
  type ApiAirport,
  type ApiRunway,
} from "../../../lib/api/client";

let cache: Airport[] | null = null;
let byIcao = new Map<string, Airport>();
let loadPromise: Promise<Airport[]> | null = null;
let backendOnline = false;

function mapRunway(rw: ApiRunway): RunwayInfo {
  return {
    id: rw.ident,
    headingDeg: rw.headingDeg,
    lengthM: rw.lengthM,
    widthM: rw.widthM || 45,
  };
}

function mapAirport(a: ApiAirport, runways: RunwayInfo[] = []): Airport {
  return {
    icao: a.icao.trim(),
    iata: a.iata?.trim() ? a.iata.trim() : null,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: a.lat,
    lng: a.lng,
    elevM: a.elevM,
    runways,
  };
}

function indexList(list: Airport[]) {
  cache = list;
  byIcao = new Map(list.map((a) => [a.icao.toUpperCase(), a]));
}

async function loadFromLocalJson(): Promise<Airport[]> {
  const res = await fetch("/data/airports.json");
  if (!res.ok) throw new Error("airports.json missing");
  return res.json() as Promise<Airport[]>;
}

/**
 * Load the local airport catalog (with runways), then probe the Go backend.
 * Search / nearest prefer the API when it is online.
 */
export async function loadAirports(): Promise<Airport[]> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const local = await loadFromLocalJson();
    indexList(local);

    try {
      await healthz();
      backendOnline = true;
      // Merge any backend-only airports into the local cache.
      const remote = await searchAirportsApi("");
      for (const a of remote) {
        const key = a.icao.toUpperCase().trim();
        if (!byIcao.has(key)) {
          const mapped = mapAirport(a, []);
          byIcao.set(key, mapped);
          cache!.push(mapped);
        }
      }
    } catch {
      backendOnline = false;
    }

    return cache!;
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export function isAirportBackendOnline(): boolean {
  return backendOnline;
}

export function getAirport(icao: string): Airport | undefined {
  return byIcao.get(icao.toUpperCase());
}

/** Fetch a single airport from API (with runways) and merge into cache. */
export async function fetchAirport(icao: string): Promise<Airport | undefined> {
  const key = icao.toUpperCase();
  const cached = byIcao.get(key);
  if (cached && cached.runways.length > 0) return cached;

  try {
    const [a, rws] = await Promise.all([
      getAirportApi(key),
      listRunwaysApi(key),
    ]);
    if (!a) return cached;
    backendOnline = true;
    const mapped = mapAirport(a, rws.map(mapRunway));
    byIcao.set(key, mapped);
    if (cache) {
      const i = cache.findIndex((x) => x.icao.toUpperCase() === key);
      if (i >= 0) cache[i] = mapped;
      else cache.push(mapped);
    }
    return mapped;
  } catch {
    return cached;
  }
}

export function searchAirports(query: string, limit = 40): Airport[] {
  if (!cache) return [];
  const q = query.trim().toLowerCase();
  if (!q) return cache.slice(0, limit);
  const scored: Array<{ a: Airport; s: number }> = [];
  for (const a of cache) {
    let s = 0;
    if (a.icao.toLowerCase() === q) s = 100;
    else if (a.iata?.toLowerCase() === q) s = 95;
    else if (a.icao.toLowerCase().startsWith(q)) s = 80;
    else if (a.iata?.toLowerCase().startsWith(q)) s = 75;
    else if (a.name.toLowerCase().includes(q)) s = 50;
    else if (a.city.toLowerCase().includes(q)) s = 40;
    else if (a.country.toLowerCase().includes(q)) s = 20;
    if (s > 0) scored.push({ a, s });
  }
  return scored
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.a);
}

/** Live backend search (falls back to in-memory). */
export async function searchAirportsRemote(
  query: string,
  limit = 40,
): Promise<Airport[]> {
  if (!backendOnline) return searchAirports(query, limit);
  try {
    const list = await searchAirportsApi(query);
    return list.slice(0, limit).map((a) => {
      const existing = byIcao.get(a.icao.toUpperCase().trim());
      return existing ?? mapAirport(a, []);
    });
  } catch {
    backendOnline = false;
    return searchAirports(query, limit);
  }
}

export async function nearestAirports(
  lat: number,
  lng: number,
  limit = 10,
): Promise<Airport[]> {
  if (backendOnline) {
    try {
      const list = await nearestAirportsApi(lat, lng);
      return list.slice(0, limit).map((a) => {
        const existing = byIcao.get(a.icao.toUpperCase().trim());
        return existing ?? mapAirport(a, []);
      });
    } catch {
      backendOnline = false;
    }
  }
  if (!cache) return [];
  return [...cache]
    .sort((x, y) => {
      const dx = x.lat - lat;
      const dy = x.lng - lng;
      const ex = y.lat - lat;
      const ey = y.lng - lng;
      return dx * dx + dy * dy - (ex * ex + ey * ey);
    })
    .slice(0, limit);
}

export function primaryRunway(airport: Airport) {
  return airport.runways[0] ?? {
    id: "00",
    headingDeg: 0,
    lengthM: 2000,
    widthM: 45,
  };
}
