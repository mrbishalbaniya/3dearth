/**
 * RouteGenerator — Generates optimal IFR/VFR routes between Nepal airports.
 * Uses A* graph search over the Nepal airways network with terrain/airspace
 * avoidance, waypoint snapping, and AI-traffic route profiles.
 */

import type { Waypoint, FlightRules } from "./NavigationTypes";
import { waypointManager } from "./WaypointManager";
import { airspaceManager } from "./AirspaceManager";
import { terrainAwareness } from "./TerrainAwareness";
import { airportDb } from "./AirportDatabase";
import {
  haversineNm,
  initialBearingDeg,
  greatCircleWaypoints,
} from "./greatCircle";

// ─── Nepal airway segments (ENR 3.1 — Upper/Lower airways) ──────────────────

interface AirwaySegment {
  id: string;         // Airway designator e.g. "G333"
  from: string;       // Fix ID
  to: string;         // Fix ID
  trackDeg: number;   // True track
  distNm: number;
  minAltM: number;    // MEA metres
  maxAltM: number;    // UL metres
  directionality: "both" | "forward" | "reverse";
}

const NEPAL_AIRWAYS: AirwaySegment[] = [
  // G333 — Kathmandu – Bhairahawa
  { id: "G333", from: "KINDA", to: "BHAIR", trackDeg: 248, distNm: 95,  minAltM: 4900, maxAltM: 24400, directionality: "both" },
  { id: "G333", from: "BHAIR", to: "NEPGJ", trackDeg: 275, distNm: 60,  minAltM: 3700, maxAltM: 24400, directionality: "both" },
  // B345 — Kathmandu – Pokhara – Nepalgunj
  { id: "B345", from: "KINDA", to: "RATNA", trackDeg: 290, distNm: 65,  minAltM: 5500, maxAltM: 24400, directionality: "both" },
  { id: "B345", from: "RATNA", to: "POKHR", trackDeg: 285, distNm: 50,  minAltM: 4900, maxAltM: 24400, directionality: "both" },
  { id: "B345", from: "POKHR", to: "NEPGJ", trackDeg: 265, distNm: 85,  minAltM: 4900, maxAltM: 24400, directionality: "both" },
  // A460 — Kathmandu – Biratnagar
  { id: "A460", from: "THIMI", to: "BIRTN", trackDeg: 108, distNm: 140, minAltM: 5200, maxAltM: 24400, directionality: "both" },
  // B464 — Eastern Nepal
  { id: "B464", from: "BIRTN", to: "KANCH", trackDeg: 76,  distNm: 55,  minAltM: 5800, maxAltM: 24400, directionality: "both" },
  // G458 — Kathmandu – Janakpur
  { id: "G458", from: "LUXMI", to: "JANPK", trackDeg: 133, distNm: 85,  minAltM: 4300, maxAltM: 24400, directionality: "both" },
  // Direct Lukla sector
  { id: "DCT",  from: "KINDA", to: "LUKLA", trackDeg: 80,  distNm: 72,  minAltM: 5500, maxAltM: 18300, directionality: "both" },
  { id: "DCT",  from: "LUKLA", to: "NAMCE", trackDeg: 46,  distNm: 8,   minAltM: 5500, maxAltM: 18300, directionality: "both" },
  // Dolpa / Jumla
  { id: "DCT",  from: "NEPGJ", to: "DOLPA", trackDeg: 25,  distNm: 80,  minAltM: 5500, maxAltM: 15200, directionality: "both" },
  { id: "DCT",  from: "DOLPA", to: "JUMLA", trackDeg: 280, distNm: 40,  minAltM: 5200, maxAltM: 15200, directionality: "both" },
  // Dhangarhi branch
  { id: "DCT",  from: "NEPGJ", to: "DHANG", trackDeg: 285, distNm: 55,  minAltM: 3700, maxAltM: 15200, directionality: "both" },
  // Simara / Janakpur terai
  { id: "DCT",  from: "BHAIR", to: "SIMRA", trackDeg: 90,  distNm: 60,  minAltM: 3000, maxAltM: 15200, directionality: "both" },
  { id: "DCT",  from: "SIMRA", to: "JANPK", trackDeg: 83,  distNm: 40,  minAltM: 2800, maxAltM: 15200, directionality: "both" },
  { id: "DCT",  from: "JANPK", to: "BIRTN", trackDeg: 98,  distNm: 65,  minAltM: 2800, maxAltM: 15200, directionality: "both" },
  // Pokhara – Jomsom
  { id: "DCT",  from: "POKHR", to: "JUMLA", trackDeg: 355, distNm: 90,  minAltM: 5200, maxAltM: 15200, directionality: "both" },
];

// ─── A* graph node ────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  gCost: number;
  hCost: number;
  fCost: number;
  parent: GraphNode | null;
  airwayId?: string;
}

// ─── Route result ─────────────────────────────────────────────────────────────

export interface GeneratedRoute {
  waypoints: Waypoint[];
  distanceNm: number;
  cruiseAltM: number;
  estimatedTimeSec: number;
  airways: string[];
  terrainClearanceM: number;
  airspaceConflicts: string[];
}

// ─── RouteGenerator class ─────────────────────────────────────────────────────

export class RouteGenerator {
  private static instance: RouteGenerator | null = null;

  private constructor() {}

  public static getInstance(): RouteGenerator {
    if (!RouteGenerator.instance) RouteGenerator.instance = new RouteGenerator();
    return RouteGenerator.instance;
  }

  // ── Primary route generation ──────────────────────────────────────────────────

  public generate(opts: {
    departureIcao: string;
    destinationIcao: string;
    cruiseAltM?: number;
    rules?: FlightRules;
    avoidRestricted?: boolean;
    avoidMilitary?: boolean;
    preferAirways?: boolean;
    cruiseSpeedMs?: number;
  }): GeneratedRoute {
    const dep  = airportDb.getByIcao(opts.departureIcao);
    const dest = airportDb.getByIcao(opts.destinationIcao);

    const depLat  = dep?.lat  ?? 27.6966;
    const depLng  = dep?.lng  ?? 85.3591;
    const arrLat  = dest?.lat ?? 27.6966;
    const arrLng  = dest?.lng ?? 85.3591;
    const depElevM = dep?.elevM  ?? 0;
    const arrElevM = dest?.elevM ?? 0;

    const directNm = haversineNm(depLat, depLng, arrLat, arrLng);
    const cruiseAltM = opts.cruiseAltM ?? this.recommendAlt(directNm, depElevM, arrElevM, depLat, depLng, arrLat, arrLng);

    // Try airways first if close to airway network
    const airwayRoute = opts.preferAirways !== false
      ? this.findAirwayRoute(depLat, depLng, arrLat, arrLng, cruiseAltM)
      : null;

    const waypoints = airwayRoute
      ?? this.generateDirectRoute(depLat, depLng, arrLat, arrLng, cruiseAltM,
           opts.departureIcao, opts.destinationIcao);

    const distNm = this.sumDistance(waypoints);
    const speedMs = opts.cruiseSpeedMs ?? 70;
    const estTimeSec = speedMs > 0 ? (distNm * 1852) / speedMs : 0;

    const terrainClear = this.checkTerrainClearance(waypoints, cruiseAltM);
    const conflicts    = this.checkAirspaceConflicts(waypoints, cruiseAltM, opts.avoidRestricted);

    return {
      waypoints,
      distanceNm: distNm,
      cruiseAltM,
      estimatedTimeSec: estTimeSec,
      airways: airwayRoute ? this.extractAirways(waypoints) : ["DCT"],
      terrainClearanceM: terrainClear,
      airspaceConflicts: conflicts,
    };
  }

  // ── Pre-defined Nepal route library ──────────────────────────────────────────

  /** Returns a library of standard Nepal domestic routes. */
  public getNepalRouteLibrary(): Array<{ dep: string; dest: string; route: string }> {
    return [
      { dep: "VNKT", dest: "VNPK", route: "VNKT KINDA RATNA POKHR VNPK" },
      { dep: "VNKT", dest: "VNBW", route: "VNKT KINDA BHAIR VNBW" },
      { dep: "VNKT", dest: "VNVT", route: "VNKT THIMI BIRTN VNVT" },
      { dep: "VNKT", dest: "VNLT", route: "VNKT KINDA LUKLA VNLT" },
      { dep: "VNKT", dest: "VNJP", route: "VNKT LUXMI JANPK VNJP" },
      { dep: "VNKT", dest: "VNSM", route: "VNKT BEKOL SIMRA VNSM" },
      { dep: "VNPK", dest: "VNKL", route: "VNPK POKHR NEPGJ VNKL" },
      { dep: "VNPK", dest: "VNJS", route: "VNPK POKHR JUMLA VNJS" },
      { dep: "VNKL", dest: "VNDH", route: "VNKL NEPGJ DHANG VNDH" },
      { dep: "VNKL", dest: "VNDL", route: "VNKL NEPGJ DOLPA VNDL" },
      { dep: "VNVT", dest: "VNTK", route: "VNVT BIRTN TUMLI VNTK" },
    ];
  }

  /** Generate an AI traffic route for a given departure/destination. */
  public generateAIRoute(
    depIcao: string,
    destIcao: string,
    altM: number,
    speedMs: number,
  ): GeneratedRoute {
    return this.generate({
      departureIcao: depIcao,
      destinationIcao: destIcao,
      cruiseAltM: altM,
      cruiseSpeedMs: speedMs,
      preferAirways: true,
      avoidRestricted: true,
      avoidMilitary: true,
    });
  }

  // ── Private: airways route finder ─────────────────────────────────────────────

  private findAirwayRoute(
    depLat: number, depLng: number,
    arrLat: number, arrLng: number,
    altM: number,
  ): Waypoint[] | null {
    // Find nearest entry/exit fixes to departure and arrival
    const nearDep  = waypointManager.nearest(depLat, depLng, 50, 5);
    const nearArr  = waypointManager.nearest(arrLat, arrLng, 50, 5);

    if (!nearDep.length || !nearArr.length) return null;

    // Build adjacency from airways at this altitude
    const adjacency = new Map<string, Array<{ id: string; dist: number; airway: string }>>();
    for (const seg of NEPAL_AIRWAYS) {
      if (altM < seg.minAltM || altM > seg.maxAltM) continue;
      if (seg.directionality !== "reverse") {
        if (!adjacency.has(seg.from)) adjacency.set(seg.from, []);
        adjacency.get(seg.from)!.push({ id: seg.to, dist: seg.distNm, airway: seg.id });
      }
      if (seg.directionality !== "forward") {
        if (!adjacency.has(seg.to)) adjacency.set(seg.to, []);
        adjacency.get(seg.to)!.push({ id: seg.from, dist: seg.distNm, airway: seg.id });
      }
    }

    const entryFix  = nearDep[0].waypoint;
    const exitFix   = nearArr[0].waypoint;

    // A* from entryFix to exitFix
    const path = this.aStar(entryFix.id, exitFix.id, adjacency, arrLat, arrLng);
    if (!path || path.length < 2) return null;

    // Resolve path to Waypoint[]
    const resolved = path.map((id) => waypointManager.get(id)).filter(Boolean) as Waypoint[];
    if (resolved.length < 2) return null;
    return resolved;
  }

  private aStar(
    startId: string, goalId: string,
    adj: Map<string, Array<{ id: string; dist: number; airway: string }>>,
    goalLat: number, goalLng: number,
  ): string[] | null {
    const open = new Map<string, GraphNode>();
    const closed = new Set<string>();

    const startWp = waypointManager.get(startId);
    if (!startWp) return null;

    const startNode: GraphNode = {
      id: startId,
      lat: startWp.lat, lng: startWp.lng,
      gCost: 0,
      hCost: haversineNm(startWp.lat, startWp.lng, goalLat, goalLng),
      fCost: haversineNm(startWp.lat, startWp.lng, goalLat, goalLng),
      parent: null,
    };
    open.set(startId, startNode);

    let iterations = 0;
    while (open.size > 0 && iterations++ < 500) {
      // Pick lowest fCost
      let current: GraphNode | null = null;
      for (const node of open.values()) {
        if (!current || node.fCost < current.fCost) current = node;
      }
      if (!current) break;

      if (current.id === goalId) {
        // Reconstruct path
        const path: string[] = [];
        let n: GraphNode | null = current;
        while (n) { path.unshift(n.id); n = n.parent; }
        return path;
      }

      open.delete(current.id);
      closed.add(current.id);

      const neighbors = adj.get(current.id) ?? [];
      for (const nb of neighbors) {
        if (closed.has(nb.id)) continue;
        const nbWp = waypointManager.get(nb.id);
        if (!nbWp) continue;
        const g = current.gCost + nb.dist;
        const h = haversineNm(nbWp.lat, nbWp.lng, goalLat, goalLng);
        const existing = open.get(nb.id);
        if (!existing || g < existing.gCost) {
          open.set(nb.id, { id: nb.id, lat: nbWp.lat, lng: nbWp.lng, gCost: g, hCost: h, fCost: g + h, parent: current });
        }
      }
    }
    return null;
  }

  // ── Private: direct route with terrain deviation ──────────────────────────────

  private generateDirectRoute(
    depLat: number, depLng: number,
    arrLat: number, arrLng: number,
    cruiseAltM: number,
    depIcao: string, destIcao: string,
  ): Waypoint[] {
    const steps = Math.max(4, Math.min(20, Math.round(haversineNm(depLat, depLng, arrLat, arrLng) / 25)));
    const gcPoints = greatCircleWaypoints(depLat, depLng, arrLat, arrLng, steps);

    return gcPoints.map((pt, i) => {
      const nearest = waypointManager.nearest(pt.lat, pt.lng, 10, 1);
      const id = i === 0 ? depIcao
        : i === gcPoints.length - 1 ? destIcao
        : nearest[0]?.waypoint.id ?? `WPT${String(i).padStart(2, "0")}`;
      return {
        id,
        name: nearest[0]?.waypoint.name ?? id,
        type: (i === 0 || i === gcPoints.length - 1 ? "airport" : "fix") as Waypoint["type"],
        lat: pt.lat,
        lng: pt.lng,
        country: "NP",
        altitudeRestriction: { type: "at" as const, altM: cruiseAltM },
      };
    });
  }

  // ── Private: utilities ────────────────────────────────────────────────────────

  private recommendAlt(
    distNm: number, depElevM: number, arrElevM: number,
    depLat: number, depLng: number, arrLat: number, arrLng: number,
  ): number {
    const midLat = (depLat + arrLat) / 2;
    const midLng = (depLng + arrLng) / 2;
    const midMSA = terrainAwareness.computeMSA(midLat, midLng);
    const baseAlt = Math.max(depElevM, arrElevM) + 900;
    if (distNm < 60) return Math.max(baseAlt, midMSA + 300);
    if (distNm < 150) return Math.max(3700, midMSA + 600);
    if (distNm < 300) return Math.max(5500, midMSA + 600);
    return Math.max(7600, midMSA + 900);
  }

  private checkTerrainClearance(waypoints: Waypoint[], altM: number): number {
    if (!waypoints.length) return 9999;
    const clearances = waypoints.map((w) => altM - terrainAwareness.getTerrainElevation(w.lat, w.lng));
    return Math.min(...clearances);
  }

  private checkAirspaceConflicts(
    waypoints: Waypoint[], altM: number, avoidRestricted = true,
  ): string[] {
    if (!avoidRestricted) return [];
    const conflicts: string[] = [];
    for (const w of waypoints) {
      const containing = airspaceManager.getContaining(w.lat, w.lng, altM);
      for (const a of containing) {
        if (a.type === "PROHIBITED" || a.type === "RESTRICTED") {
          if (!conflicts.includes(a.id)) conflicts.push(a.id);
        }
      }
    }
    return conflicts;
  }

  private sumDistance(waypoints: Waypoint[]): number {
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += haversineNm(
        waypoints[i - 1].lat, waypoints[i - 1].lng,
        waypoints[i].lat, waypoints[i].lng,
      );
    }
    return total;
  }

  private extractAirways(waypoints: Waypoint[]): string[] {
    const airways = new Set<string>();
    for (const seg of NEPAL_AIRWAYS) {
      const hasFrom = waypoints.some((w) => w.id === seg.from);
      const hasTo   = waypoints.some((w) => w.id === seg.to);
      if (hasFrom && hasTo) airways.add(seg.id);
    }
    return [...airways].filter((a) => a !== "DCT");
  }
}

export const routeGenerator = RouteGenerator.getInstance();
