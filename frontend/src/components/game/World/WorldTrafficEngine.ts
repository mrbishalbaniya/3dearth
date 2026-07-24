/**
 * Global living-world traffic engine.
 * LOD: full near player, regional mid-range, lightweight global elsewhere.
 */

import {
  getAirport,
  loadAirports,
  searchAirports,
} from "../Services/AirportService";
import type { Airport } from "../Types";
import { sampleFlightWind } from "../Weather/WeatherBridge";
import { TrafficSpatialIndex } from "./spatial/TrafficSpatialIndex";
import {
  buildAirportAirspace,
  frequencyForFacility,
} from "./airspace/AirspaceService";
import {
  createAirportOps,
  requestDepartureSlot,
} from "./atc/RunwayManager";
import { issueClearance, facilityForPhase } from "./atc/AtcService";
import {
  assignLod,
  stepAiLightweight,
  stepAiPilot,
} from "./aircraft/AiPilot";
import {
  buildTrafficRoute,
  cruiseAltitudeForDistance,
  cruiseSpeedForCategory,
} from "./navigation/TrafficRoutes";
import type {
  AirportOpsState,
  AtcClearance,
  ClearanceType,
  FlightCategory,
  PlayerAtcState,
  TrafficAircraft,
  TrafficAnalytics,
} from "./types";

const MAX_GLOBAL = 120;
const MAX_FULL = 14;
const CALLSIGN_PREFIX = [
  "UAL",
  "AAL",
  "DAL",
  "BAW",
  "AFR",
  "UAE",
  "QTR",
  "CPA",
  "ANA",
  "JAL",
];

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function pickCategory(i: number): FlightCategory {
  const r = rand(i * 3.1);
  if (r < 0.45) return "airline";
  if (r < 0.6) return "regional";
  if (r < 0.72) return "cargo";
  if (r < 0.85) return "business";
  if (r < 0.97) return "ga";
  return "emergency";
}

function makeCallsign(i: number, cat: FlightCategory): string {
  if (cat === "ga") return `N${10000 + (i % 90000)}`;
  const p = CALLSIGN_PREFIX[i % CALLSIGN_PREFIX.length];
  return `${p}${100 + (i % 900)}`;
}

export class WorldTrafficEngine {
  enabled = true;
  aircraft = new Map<string, TrafficAircraft>();
  ops = new Map<string, AirportOpsState>();
  index = new TrafficSpatialIndex();
  analytics: TrafficAnalytics = {
    flightsCompleted: 0,
    goArounds: 0,
    conflictsResolved: 0,
    avgTaxiSec: 90,
    activeFull: 0,
    activeRegional: 0,
    activeGlobal: 0,
  };
  playerAtc: PlayerAtcState = {
    facility: "ground",
    callsign: "ORBIT1",
    pendingRequest: null,
    lastClearance: null,
    messages: [],
    frequencyMhz: 121.7,
  };
  private radioLog: AtcClearance[] = [];
  private ready = false;
  private spawnSeed = 1;
  private focus = { lat: 0, lng: 0 };
  private tickAcc = 0;

  async init() {
    await loadAirports();
    this.ready = true;
  }

  setFocus(lat: number, lng: number) {
    this.focus = { lat, lng };
  }

  getRadioLog(): AtcClearance[] {
    return this.radioLog.slice(-40);
  }

  getAnalytics(): TrafficAnalytics {
    return { ...this.analytics };
  }

  getRenderable(max = 40): TrafficAircraft[] {
    const ids = this.index.query(this.focus.lat, this.focus.lng, 3);
    const seen = new Set<string>();
    const list: TrafficAircraft[] = [];
    for (const id of ids) {
      const a = this.aircraft.get(id);
      if (!a || a.lod === "global" || seen.has(id)) continue;
      seen.add(id);
      list.push(a);
      if (list.length >= max) break;
    }
    for (const a of this.aircraft.values()) {
      if (a.lod === "full" && !seen.has(a.id)) {
        list.push(a);
        seen.add(a.id);
      }
    }
    return list.slice(0, max);
  }

  ensureAirportOps(icao: string) {
    if (this.ops.has(icao)) return;
    const ap = getAirport(icao);
    if (!ap) return;
    const wind = sampleFlightWind();
    this.ops.set(icao, createAirportOps(ap, wind.fromDeg));
    void buildAirportAirspace(icao, ap.lat, ap.lng);
  }

  seedAroundFocus(lat: number, lng: number, localCount = 10) {
    if (!this.ready) return;
    this.setFocus(lat, lng);
    const nearby = searchAirports("", 80)
      .map((a) => ({ a, d: Math.hypot(a.lat - lat, a.lng - lng) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 24)
      .map((x) => x.a);

    if (nearby.length < 2) return;

    for (let i = 0; i < localCount && this.aircraft.size < MAX_GLOBAL; i++) {
      const dep = nearby[i % nearby.length];
      const dest = nearby[(i * 3 + 1) % nearby.length];
      if (dep.icao === dest.icao) continue;
      this.spawnFlight(
        dep,
        dest,
        pickCategory(this.spawnSeed++),
        i < 4 ? 0.05 : rand(i) * 0.9,
      );
    }

    const all = searchAirports("", 100);
    for (let i = 0; i < 40 && this.aircraft.size < MAX_GLOBAL; i++) {
      const dep = all[Math.floor(rand(i * 7) * all.length)];
      const dest = all[Math.floor(rand(i * 13 + 2) * all.length)];
      if (!dep || !dest || dep.icao === dest.icao) continue;
      this.spawnFlight(dep, dest, pickCategory(i + 50), 0.2 + rand(i) * 0.7);
    }
  }

  spawnFlight(
    dep: Airport,
    dest: Airport,
    category: FlightCategory,
    progress: number,
  ) {
    this.ensureAirportOps(dep.icao);
    this.ensureAirportOps(dest.icao);
    const id = `ai-${this.spawnSeed++}`;
    const route = buildTrafficRoute(dep.lat, dep.lng, dest.lat, dest.lng);
    const cruise = cruiseAltitudeForDistance(route.distanceNm, category);
    const airborne = progress > 0.05 && progress < 0.95;
    const ac: TrafficAircraft = {
      id,
      callsign: makeCallsign(this.spawnSeed, category),
      category,
      lod: "global",
      phase: airborne
        ? progress > 0.8
          ? "descent"
          : progress < 0.15
            ? "initial_climb"
            : "cruise"
        : "parked",
      lat: airborne
        ? dep.lat + (dest.lat - dep.lat) * progress
        : dep.lat + (this.spawnSeed % 5) * 0.0003,
      lng: airborne
        ? dep.lng + (dest.lng - dep.lng) * progress
        : dep.lng + (this.spawnSeed % 4) * 0.0003,
      altM: airborne ? cruise : dep.elevM + 4,
      hdgDeg: route.bearingDeg,
      tasMs: airborne ? cruiseSpeedForCategory(category) : 0,
      vsMs: 0,
      depIcao: dep.icao,
      destIcao: dest.icao,
      alternateIcao: null,
      runwayId: null,
      routeProgress: progress,
      cruiseAltM: cruise,
      clearance: null,
      phaseAgeSec: rand(this.spawnSeed) * 30,
      emergency: category === "emergency",
      gateIdx: this.spawnSeed % 12,
    };
    ac.lod = assignLod(ac, this.focus.lat, this.focus.lng);
    this.aircraft.set(id, ac);
    this.index.upsert(id, ac.lat, ac.lng);
  }

  step(dt: number) {
    if (!this.enabled || !this.ready) return;
    this.tickAcc += dt;
    const wind = sampleFlightWind();
    const visibility = Math.max(0.2, 1 - wind.turbulence * 0.5);

    let full = 0;
    let regional = 0;
    let global = 0;
    let completed = 0;

    for (const [id, prev] of this.aircraft) {
      let ac = { ...prev, lod: assignLod(prev, this.focus.lat, this.focus.lng) };
      if (ac.lod === "full" && full >= MAX_FULL) ac.lod = "regional";

      if (ac.lod === "full") {
        full++;
        const neighborIds = this.index.query(ac.lat, ac.lng, 0.5);
        const neighbors = neighborIds
          .map((nid) => this.aircraft.get(nid))
          .filter((x): x is TrafficAircraft => !!x && x.id !== id);
        const before = ac.phase;
        const snap = ac;
        ac = stepAiPilot(ac, {
          ops: this.ops,
          neighbors,
          windFromDeg: wind.fromDeg,
          visibility,
          dt,
          onClearance: (_a, text) => {
            this.pushRadio({
              id: `ai-${Date.now()}-${id}`,
              facility: facilityForPhase(snap.phase),
              type: snap.clearance ?? "cruise",
              text,
              issuedAtMs: Date.now(),
              targetId: id,
            });
          },
        });
        if (before === "taxi_in" && ac.phase === "shutdown") completed++;
        if (ac.clearance === "go_around") this.analytics.goArounds++;
      } else if (ac.lod === "regional") {
        regional++;
        ac = stepAiLightweight(ac, dt);
      } else {
        global++;
        if (this.tickAcc > 0.4) ac = stepAiLightweight(ac, dt * 1.2);
      }

      this.aircraft.set(id, ac);
      this.index.upsert(id, ac.lat, ac.lng);
    }

    if (this.tickAcc > 0.4) this.tickAcc = 0;

    this.analytics.activeFull = full;
    this.analytics.activeRegional = regional;
    this.analytics.activeGlobal = global;
    this.analytics.flightsCompleted += completed;

    if (this.aircraft.size < MAX_GLOBAL * 0.55) {
      this.seedAroundFocus(this.focus.lat, this.focus.lng, 3);
    }
  }

  private pushRadio(msg: AtcClearance) {
    this.radioLog.push(msg);
    if (this.radioLog.length > 80) this.radioLog.shift();
  }

  playerRequest(
    type: ClearanceType,
    opts: {
      onGround: boolean;
      altM: number;
      airportIcao: string;
      callsign?: string;
    },
  ): AtcClearance {
    const callsign = opts.callsign ?? this.playerAtc.callsign;
    this.ensureAirportOps(opts.airportIcao);
    const ops = this.ops.get(opts.airportIcao);

    const phaseHint =
      type === "takeoff"
        ? ("takeoff" as const)
        : type === "landing"
          ? ("landing" as const)
          : type === "taxi" || type === "taxi_in"
            ? ("taxi_out" as const)
            : type === "pushback"
              ? ("pushback" as const)
              : ("cruise" as const);
    const facility = facilityForPhase(phaseHint);

    let runwayId = ops?.activeRunwayId;
    if ((type === "takeoff" || type === "lineup_wait") && ops) {
      const fake: TrafficAircraft = {
        id: "player",
        callsign,
        category: "ga",
        lod: "full",
        phase: "holding_short",
        lat: 0,
        lng: 0,
        altM: opts.altM,
        hdgDeg: 0,
        tasMs: 0,
        vsMs: 0,
        depIcao: opts.airportIcao,
        destIcao: opts.airportIcao,
        alternateIcao: null,
        runwayId: null,
        routeProgress: 0,
        cruiseAltM: 3000,
        clearance: null,
        phaseAgeSec: 0,
        emergency: false,
        gateIdx: 0,
      };
      const slot = requestDepartureSlot(ops, fake);
      runwayId = slot.runwayId;
      if (!slot.ok) {
        const clr = issueClearance("tower", "hold_short", "player", callsign, {
          runwayId,
        });
        clr.text = `${callsign}, hold short runway ${runwayId}, expect ${slot.waitSec}s`;
        this.applyPlayerClearance(clr, facility);
        return clr;
      }
    }

    const clr = issueClearance(facility, type, "player", callsign, {
      runwayId,
      altitudeM: type === "climb" ? opts.altM + 1000 : undefined,
    });
    this.applyPlayerClearance(clr, facility);
    return clr;
  }

  private applyPlayerClearance(
    clr: AtcClearance,
    facility: PlayerAtcState["facility"],
  ) {
    this.playerAtc.facility = facility;
    this.playerAtc.frequencyMhz = frequencyForFacility(facility);
    this.playerAtc.lastClearance = clr;
    this.playerAtc.pendingRequest = null;
    this.playerAtc.messages = [...this.playerAtc.messages.slice(-20), clr];
    this.pushRadio(clr);
  }

  clear() {
    this.aircraft.clear();
    this.index.clear();
    this.ops.clear();
    this.radioLog = [];
  }
}

export const worldTraffic = new WorldTrafficEngine();
