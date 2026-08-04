/**
 * WaypointManager — Nepal airspace named fixes, VOR/NDB intersections,
 * user-defined GPS waypoints, holding patterns, SID/STAR fixes.
 *
 * All coordinates WGS84 decimal degrees. Altitudes metres MSL.
 */

import {
  type Waypoint,
  type HoldingPattern,
  type WaypointType,
  type AltitudeRestriction,
  type SpeedRestriction,
} from "./NavigationTypes";
import { haversineNm, initialBearingDeg } from "./greatCircle";

// ─── Nepal named fixes (ENR 4.4 / AIP Nepal) ─────────────────────────────────

const NEPAL_FIXES_RAW: Omit<Waypoint, "id">[] = [
  // Kathmandu TMA entry/exit fixes
  { name: "KINDA", type: "fix", lat: 27.8333, lng: 85.5000, country: "NP", region: "KTM_TMA" },
  { name: "BEKOL", type: "fix", lat: 27.5000, lng: 85.0833, country: "NP", region: "KTM_TMA" },
  { name: "PEMAT", type: "fix", lat: 27.3333, lng: 85.8333, country: "NP", region: "KTM_TMA" },
  { name: "TULSI", type: "fix", lat: 27.9167, lng: 85.1667, country: "NP", region: "KTM_TMA" },
  { name: "GOKYO", type: "fix", lat: 27.9500, lng: 86.6833, country: "NP", region: "ENROUTE" },
  { name: "NAMCE", type: "fix", lat: 27.8033, lng: 86.7147, country: "NP", region: "ENROUTE" },
  { name: "THIMI", type: "fix", lat: 27.6833, lng: 85.3833, country: "NP", region: "KTM_TMA" },
  { name: "LUXMI", type: "fix", lat: 27.6167, lng: 85.5000, country: "NP", region: "KTM_TMA" },
  { name: "PASHU", type: "fix", lat: 27.7083, lng: 85.3472, country: "NP", region: "KTM_TMA" },
  { name: "SWAYA", type: "fix", lat: 27.7147, lng: 85.2900, country: "NP", region: "KTM_TMA" },
  // Pokhara area
  { name: "POKHR", type: "fix", lat: 28.2000, lng: 84.0000, country: "NP", region: "PKR_TMA" },
  { name: "SARAI", type: "fix", lat: 28.4167, lng: 84.2500, country: "NP", region: "PKR_TMA" },
  { name: "ANPNA", type: "fix", lat: 28.5956, lng: 83.8203, country: "NP", region: "ENROUTE" },
  // Everest region
  { name: "LHOTS", type: "fix", lat: 27.9617, lng: 86.9333, country: "NP", region: "ENROUTE" },
  { name: "SAGAM", type: "fix", lat: 27.9881, lng: 86.9250, country: "NP", region: "ENROUTE" },
  { name: "LUKLA", type: "fix", lat: 27.6868, lng: 86.7314, country: "NP", region: "ENROUTE" },
  // Western Nepal
  { name: "DOLPA", type: "fix", lat: 28.9857, lng: 82.8190, country: "NP", region: "ENROUTE" },
  { name: "JUMLA", type: "fix", lat: 29.2743, lng: 82.1731, country: "NP", region: "ENROUTE" },
  { name: "NEPGJ", type: "fix", lat: 28.1035, lng: 81.6672, country: "NP", region: "ENROUTE" },
  { name: "DHANG", type: "fix", lat: 28.7533, lng: 80.5819, country: "NP", region: "ENROUTE" },
  // Eastern Nepal
  { name: "TUMLI", type: "fix", lat: 27.3150, lng: 87.1933, country: "NP", region: "ENROUTE" },
  { name: "BIRTN", type: "fix", lat: 26.4814, lng: 87.2640, country: "NP", region: "ENROUTE" },
  { name: "KANCH", type: "fix", lat: 27.7025, lng: 88.1475, country: "NP", region: "ENROUTE" },
  // Terai corridor
  { name: "BHAIR", type: "fix", lat: 27.5057, lng: 83.4163, country: "NP", region: "ENROUTE" },
  { name: "SIMRA", type: "fix", lat: 27.1595, lng: 84.9801, country: "NP", region: "ENROUTE" },
  { name: "JANPK", type: "fix", lat: 26.7088, lng: 85.9223, country: "NP", region: "ENROUTE" },
  // India border crossings (international airways)
  { name: "GUXEN", type: "fix", lat: 27.2167, lng: 84.3500, country: "NP", region: "FIR_BOUNDARY" },
  { name: "MANGO", type: "fix", lat: 26.9167, lng: 83.7500, country: "NP", region: "FIR_BOUNDARY" },
  { name: "OPULO", type: "fix", lat: 27.0333, lng: 87.5833, country: "NP", region: "FIR_BOUNDARY" },
  { name: "RATNA", type: "fix", lat: 28.0000, lng: 84.9333, country: "NP", region: "ENROUTE" },
];

// ─── Holding patterns at major Nepal fixes ────────────────────────────────────

const NEPAL_HOLDINGS_RAW: HoldingPattern[] = [
  { fixId: "KINDA",  inboundCoursDeg: 225, turnDirection: "right", legLengthNm: 5, minAltM: 3700, maxAltM: 6100, speedLimitKt: 230 },
  { fixId: "BEKOL",  inboundCoursDeg: 45,  turnDirection: "right", legLengthNm: 5, minAltM: 3700, maxAltM: 6100, speedLimitKt: 230 },
  { fixId: "PEMAT",  inboundCoursDeg: 315, turnDirection: "left",  legLengthNm: 5, minAltM: 4300, maxAltM: 6100, speedLimitKt: 230 },
  { fixId: "TULSI",  inboundCoursDeg: 90,  turnDirection: "right", legLengthNm: 5, minAltM: 3700, maxAltM: 6100, speedLimitKt: 230 },
  { fixId: "POKHR",  inboundCoursDeg: 120, turnDirection: "right", legLengthNm: 4, minAltM: 2400, maxAltM: 4600, speedLimitKt: 200 },
  { fixId: "NEPGJ",  inboundCoursDeg: 180, turnDirection: "right", legLengthNm: 5, minAltM: 1200, maxAltM: 3700, speedLimitKt: 220 },
  { fixId: "BIRTN",  inboundCoursDeg: 110, turnDirection: "right", legLengthNm: 5, minAltM: 1200, maxAltM: 3700, speedLimitKt: 220 },
];

// ─── Spatial grid for fast lookup ────────────────────────────────────────────

interface GridCell {
  waypoints: Waypoint[];
}

const GRID_DEG = 0.5; // 0.5-degree grid cells

export class WaypointManager {
  private static instance: WaypointManager | null = null;

  private byId = new Map<string, Waypoint>();
  private userWaypoints = new Map<string, Waypoint>();
  private holdings = new Map<string, HoldingPattern>();
  private grid = new Map<string, GridCell>();

  private constructor() {
    // Load built-in Nepal fixes
    for (const raw of NEPAL_FIXES_RAW) {
      const wp: Waypoint = { ...raw, id: raw.name };
      this.register(wp);
    }
    // Load holdings
    for (const h of NEPAL_HOLDINGS_RAW) {
      this.holdings.set(h.fixId, h);
    }
    // Seed airport reference waypoints from AirportDatabase (lazy to avoid circular)
    this.seedAirportWaypoints();
  }

  public static getInstance(): WaypointManager {
    if (!WaypointManager.instance) WaypointManager.instance = new WaypointManager();
    return WaypointManager.instance;
  }

  // ── Registration ────────────────────────────────────────────────────────────

  private register(wp: Waypoint): void {
    this.byId.set(wp.id.toUpperCase(), wp);
    const cellKey = this.cellKey(wp.lat, wp.lng);
    if (!this.grid.has(cellKey)) this.grid.set(cellKey, { waypoints: [] });
    this.grid.get(cellKey)!.waypoints.push(wp);
  }

  private seedAirportWaypoints(): void {
    // Dynamic import avoids circular dependency; called once after construction
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { airportDb } = require("./AirportDatabase") as typeof import("./AirportDatabase");
      for (const ap of airportDb.getAll()) {
        const wp: Waypoint = {
          id: ap.icao,
          name: ap.name,
          type: "airport",
          lat: ap.lat,
          lng: ap.lng,
          country: "NP",
          region: ap.province,
        };
        this.register(wp);
      }
    } catch {
      // AirportDatabase not available — skip silently
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  public get(id: string): Waypoint | undefined {
    return this.byId.get(id.toUpperCase()) ?? this.userWaypoints.get(id.toUpperCase());
  }

  public getAll(): Waypoint[] {
    return [...this.byId.values(), ...this.userWaypoints.values()];
  }

  public getByType(type: WaypointType): Waypoint[] {
    return this.getAll().filter((w) => w.type === type);
  }

  public getByRegion(region: string): Waypoint[] {
    return this.getAll().filter((w) => w.region === region);
  }

  // ── User waypoints ───────────────────────────────────────────────────────────

  public addUserWaypoint(opts: {
    id?: string;
    lat: number;
    lng: number;
    altM?: number;
    name?: string;
    altRestriction?: AltitudeRestriction;
    spdRestriction?: SpeedRestriction;
  }): Waypoint {
    const id = opts.id ?? `USR${Date.now().toString(36).toUpperCase()}`;
    const wp: Waypoint = {
      id,
      name: opts.name ?? id,
      type: "user",
      lat: opts.lat,
      lng: opts.lng,
      country: "NP",
      altitudeRestriction: opts.altRestriction,
      speedRestriction: opts.spdRestriction,
    };
    this.userWaypoints.set(id.toUpperCase(), wp);
    const cellKey = this.cellKey(wp.lat, wp.lng);
    if (!this.grid.has(cellKey)) this.grid.set(cellKey, { waypoints: [] });
    this.grid.get(cellKey)!.waypoints.push(wp);
    return wp;
  }

  public removeUserWaypoint(id: string): boolean {
    const key = id.toUpperCase();
    const wp = this.userWaypoints.get(key);
    if (!wp) return false;
    this.userWaypoints.delete(key);
    const cellKey = this.cellKey(wp.lat, wp.lng);
    const cell = this.grid.get(cellKey);
    if (cell) cell.waypoints = cell.waypoints.filter((w) => w.id !== wp.id);
    return true;
  }

  public clearUserWaypoints(): void {
    for (const wp of this.userWaypoints.values()) {
      const cellKey = this.cellKey(wp.lat, wp.lng);
      const cell = this.grid.get(cellKey);
      if (cell) cell.waypoints = cell.waypoints.filter((w) => w.type !== "user");
    }
    this.userWaypoints.clear();
  }

  // ── Spatial queries ──────────────────────────────────────────────────────────

  /** Nearest N waypoints within radiusNm, sorted by distance. */
  public nearest(
    lat: number,
    lng: number,
    radiusNm: number,
    limit = 10,
    types?: WaypointType[],
  ): Array<{ waypoint: Waypoint; distanceNm: number; bearingDeg: number }> {
    const candidates: Array<{ waypoint: Waypoint; distanceNm: number; bearingDeg: number }> = [];
    const degOffset = radiusNm / 60 + GRID_DEG;
    const latMin = lat - degOffset;
    const latMax = lat + degOffset;
    const lngMin = lng - degOffset;
    const lngMax = lng + degOffset;

    const latSteps = Math.ceil((latMax - latMin) / GRID_DEG);
    const lngSteps = Math.ceil((lngMax - lngMin) / GRID_DEG);

    const seen = new Set<string>();
    for (let i = 0; i <= latSteps; i++) {
      for (let j = 0; j <= lngSteps; j++) {
        const cellLat = Math.floor((latMin + i * GRID_DEG) / GRID_DEG) * GRID_DEG;
        const cellLng = Math.floor((lngMin + j * GRID_DEG) / GRID_DEG) * GRID_DEG;
        const key = this.cellKey(cellLat, cellLng);
        if (seen.has(key)) continue;
        seen.add(key);
        const cell = this.grid.get(key);
        if (!cell) continue;
        for (const wp of cell.waypoints) {
          if (types && !types.includes(wp.type)) continue;
          const d = haversineNm(lat, lng, wp.lat, wp.lng);
          if (d <= radiusNm) {
            candidates.push({ waypoint: wp, distanceNm: d, bearingDeg: initialBearingDeg(lat, lng, wp.lat, wp.lng) });
          }
        }
      }
    }
    return candidates.sort((a, b) => a.distanceNm - b.distanceNm).slice(0, limit);
  }

  /** Search by identifier prefix or partial name. */
  public search(query: string, limit = 15): Waypoint[] {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    const scored: Array<{ w: Waypoint; s: number }> = [];
    for (const w of this.getAll()) {
      let s = 0;
      if (w.id === q) s = 100;
      else if (w.id.startsWith(q)) s = 80;
      else if (w.name.toUpperCase().includes(q)) s = 50;
      if (s > 0) scored.push({ w, s });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.w);
  }

  // ── Holding patterns ─────────────────────────────────────────────────────────

  public getHolding(fixId: string): HoldingPattern | undefined {
    return this.holdings.get(fixId.toUpperCase());
  }

  public addHolding(h: HoldingPattern): void {
    this.holdings.set(h.fixId.toUpperCase(), h);
  }

  public getAllHoldings(): HoldingPattern[] {
    return [...this.holdings.values()];
  }

  // ── Route waypoint sequencer ─────────────────────────────────────────────────

  /**
   * Given a list of waypoint IDs (+ optional lat/lng for raw coordinates),
   * resolve each to a full Waypoint object. Unknown IDs become user waypoints.
   */
  public resolveRoute(items: Array<{ id: string; lat?: number; lng?: number; name?: string }>): Waypoint[] {
    return items.map((item) => {
      const found = this.get(item.id);
      if (found) return found;
      if (item.lat != null && item.lng != null) {
        return this.addUserWaypoint({ id: item.id, lat: item.lat, lng: item.lng, name: item.name });
      }
      // Return a placeholder — the navigation computer will flag it invalid
      return {
        id: item.id,
        name: item.name ?? item.id,
        type: "fix" as WaypointType,
        lat: 0,
        lng: 0,
        country: "NP",
      };
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private cellKey(lat: number, lng: number): string {
    const clat = Math.floor(lat / GRID_DEG) * GRID_DEG;
    const clng = Math.floor(lng / GRID_DEG) * GRID_DEG;
    return `${clat.toFixed(1)},${clng.toFixed(1)}`;
  }
}

export const waypointManager = WaypointManager.getInstance();
