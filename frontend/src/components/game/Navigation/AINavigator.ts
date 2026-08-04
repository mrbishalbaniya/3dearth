/**
 * AINavigator — Autonomous navigation for AI-controlled aircraft.
 * Integrates GPS, route following, terrain avoidance, restricted
 * airspace avoidance, and weather reaction for traffic aircraft.
 */

import type { Waypoint } from "./NavigationTypes";
import { routeGenerator } from "./RouteGenerator";
import { terrainAwareness } from "./TerrainAwareness";
import { airspaceManager } from "./AirspaceManager";
import { haversineNm, initialBearingDeg } from "./greatCircle";
import { atcManager } from "./ATCManager";

// ─── AI flight profile ────────────────────────────────────────────────────────

export interface AIFlightProfile {
  callsign: string;
  departureIcao: string;
  destinationIcao: string;
  aircraftType: string;
  cruiseAltM: number;
  cruiseSpeedMs: number;
  /** Elevation of destination airport (m MSL) */
  destinationElevM?: number;
  /** 0 = at departure, 1 = at destination */
  progress: number;
}

// ─── AI navigator flight phase ────────────────────────────────────────────────

export type AIPhase = "climb" | "cruise" | "descent" | "approach" | "landed";

// ─── AI navigator state ───────────────────────────────────────────────────────

export interface AINavState {
  lat: number;
  lng: number;
  altM: number;
  targetAltM: number;
  headingDeg: number;
  targetHeadingDeg: number;
  speedMs: number;
  phase: AIPhase;
  activeWptIdx: number;
  route: Waypoint[];
  crossTrackErrorM: number;
  distToDestNm: number;
}

// ─── AINavigator class ────────────────────────────────────────────────────────

export class AINavigator {
  private readonly profile: AIFlightProfile;
  private navState: AINavState;
  private route: Waypoint[] = [];
  private initialized = false;

  // Turn rate and climb rate limits
  private readonly MAX_BANK_DEG = 25;
  private readonly MAX_VS_MS    = 10;   // ~2000 fpm
  private readonly MIN_VS_MS    = -8;   // ~-1600 fpm

  constructor(profile: AIFlightProfile) {
    this.profile = profile;
    this.navState = {
      lat: 0, lng: 0, altM: 0,
      targetAltM: profile.cruiseAltM,
      headingDeg: 0, targetHeadingDeg: 0,
      speedMs: 0,
      phase: "climb",
      activeWptIdx: 0,
      route: [],
      crossTrackErrorM: 0,
      distToDestNm: 0,
    };
  }

  // ── Initialization ────────────────────────────────────────────────────────────

  public initialize(startLat: number, startLng: number, startAltM: number): void {
    const result = routeGenerator.generateAIRoute(
      this.profile.departureIcao,
      this.profile.destinationIcao,
      this.profile.cruiseAltM,
      this.profile.cruiseSpeedMs,
    );

    this.route = result.waypoints;
    this.navState.lat = startLat;
    this.navState.lng = startLng;
    this.navState.altM = startAltM;
    this.navState.route = this.route;
    this.navState.phase = "climb";
    this.navState.speedMs = this.profile.cruiseSpeedMs * 0.6;

    atcManager.updateTraffic({
      callsign: this.profile.callsign,
      lat: startLat, lng: startLng, altM: startAltM,
      hdgDeg: 0, speedKt: this.navState.speedMs * 1.94384,
      squawk: "2000",
      flightPhase: "departure",
      controllingFacility: null,
    });

    this.initialized = true;
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  public update(dt: number): AINavState {
    if (!this.initialized || this.route.length === 0) return this.navState;

    const { lat, lng, altM } = this.navState;

    // 1. Terrain avoidance — boost target altitude if needed
    const msa = terrainAwareness.computeMSA(lat, lng);
    const safeAlt = Math.max(this.profile.cruiseAltM, msa + 300);

    // 2. Active waypoint tracking
    const activeWpt = this.route[this.navState.activeWptIdx];
    if (!activeWpt) {
      this.navState.phase = "landed";
      return this.navState;
    }

    const distToWptNm = haversineNm(lat, lng, activeWpt.lat, activeWpt.lng);
    const bearingToWpt = initialBearingDeg(lat, lng, activeWpt.lat, activeWpt.lng);

    // 3. Waypoint sequencing
    if (distToWptNm < 0.5 && this.navState.activeWptIdx < this.route.length - 1) {
      this.navState.activeWptIdx++;
    }

    // 4. Cross-track correction
    const xtrack = this.computeXtrack(lat, lng, activeWpt);
    this.navState.crossTrackErrorM = xtrack;

    // 5. Heading command (proportional to XTE + bearing)
    const xtrackCorrection = Math.max(-30, Math.min(30, xtrack / 200));
    const targetHdg = (bearingToWpt + xtrackCorrection + 360) % 360;
    this.navState.targetHeadingDeg = targetHdg;

    // 6. Turn toward target heading
    const hdgErr = this.wrap180(targetHdg - this.navState.headingDeg);
    const turnRate = Math.min(this.MAX_BANK_DEG, Math.abs(hdgErr)) * Math.sign(hdgErr);
    this.navState.headingDeg = (this.navState.headingDeg + turnRate * dt + 360) % 360;

    // 7. Altitude management by phase
    const distToDestNm = this.distToDestination();
    this.navState.distToDestNm = distToDestNm;

    const destElevM = this.profile.destinationElevM ?? 0;
    const descentTopDeg = this.profile.cruiseAltM - destElevM;
    const descentNm = Math.max(1, descentTopDeg / 300);
    const approachNm = 8;

    if (altM < this.profile.cruiseAltM * 0.95 && this.navState.phase === "climb") {
      this.navState.targetAltM = safeAlt;
    } else if (distToDestNm > descentNm + approachNm) {
      this.navState.phase = "cruise";
      this.navState.targetAltM = safeAlt;
    } else if (distToDestNm > approachNm) {
      this.navState.phase = "descent";
      const arr = airportDb_elev(this.profile.destinationIcao);
      this.navState.targetAltM = arr + ((distToDestNm - approachNm) / descentNm) * (this.profile.cruiseAltM - arr);
    } else {
      this.navState.phase = "approach";
      const arr = airportDb_elev(this.profile.destinationIcao);
      this.navState.targetAltM = Math.max(arr, altM - 8 * dt);
    }

    // 8. Vertical speed integration
    const altErr = this.navState.targetAltM - altM;
    const vsCmd = Math.max(this.MIN_VS_MS, Math.min(this.MAX_VS_MS, altErr * 0.3));
    this.navState.altM = altM + vsCmd * dt;

    // 9. Speed interpolation
    const targetSpeed = this.navState.phase === "approach"
      ? this.profile.cruiseSpeedMs * 0.6
      : this.navState.phase === "climb"
      ? this.profile.cruiseSpeedMs * 0.75
      : this.profile.cruiseSpeedMs;
    this.navState.speedMs += (targetSpeed - this.navState.speedMs) * Math.min(1, dt * 0.5);

    // 10. Integrate position
    const speedDegPerSec = this.navState.speedMs / 111320;
    const hdgRad = this.navState.headingDeg * Math.PI / 180;
    this.navState.lat = lat + Math.cos(hdgRad) * speedDegPerSec * dt;
    this.navState.lng = lng + Math.sin(hdgRad) * speedDegPerSec * dt
      / Math.max(0.01, Math.cos(lat * Math.PI / 180));

    // 11. Restricted airspace avoidance
    if (
      airspaceManager
        .getContaining(this.navState.lat, this.navState.lng, this.navState.altM)
        .some((a) => a.type === "PROHIBITED" || a.type === "RESTRICTED")
    ) {
      this.navState.headingDeg = (this.navState.headingDeg + 15) % 360;
    }

// Fix: AINavigator.ts - phase "landed" is outside the union type, use assignment with cast
    const isLanded = (this.navState.phase as string) === "landed";
    atcManager.updateTraffic({
      callsign: this.profile.callsign,
      lat: this.navState.lat, lng: this.navState.lng, altM: this.navState.altM,
      hdgDeg: this.navState.headingDeg,
      speedKt: this.navState.speedMs * 1.94384,
      squawk: "2000",
      flightPhase: isLanded ? "landed" : "enroute",
      controllingFacility: null,
    });

    return { ...this.navState, route: this.route };
  }

  // ── Public accessors ──────────────────────────────────────────────────────────

  public getState(): AINavState { return { ...this.navState, route: this.route }; }
  public getCallsign(): string  { return this.profile.callsign; }
  public isComplete(): boolean  {
    return (this.navState.phase as string) === "landed" || this.navState.distToDestNm < 0.3;
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private distToDestination(): number {
    const dest = this.route[this.route.length - 1];
    if (!dest) return 0;
    return haversineNm(this.navState.lat, this.navState.lng, dest.lat, dest.lng);
  }

  private computeXtrack(lat: number, lng: number, wpt: Waypoint): number {
    const prevIdx = Math.max(0, this.navState.activeWptIdx - 1);
    const prev = this.route[prevIdx];
    if (!prev || prev === wpt) return 0;
    const d13 = haversineNm(prev.lat, prev.lng, lat, lng) / 60;
    const θ13 = initialBearingDeg(prev.lat, prev.lng, lat, lng) * Math.PI / 180;
    const θ12 = initialBearingDeg(prev.lat, prev.lng, wpt.lat, wpt.lng) * Math.PI / 180;
    return Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12)) * 6_371_000;
  }

  private wrap180(deg: number): number {
    let d = ((deg + 180) % 360) - 180;
    if (d < -180) d += 360;
    return d;
  }
}

// ─── Local helper (avoids circular dep with AirportDatabase singleton) ────────

function airportDb_elev(icao: string): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { airportDb } = require("./AirportDatabase") as typeof import("./AirportDatabase");
    return airportDb.getByIcao(icao)?.elevM ?? 0;
  } catch { return 0; }
}

// ─── AITrafficManager — pools multiple AINavigator instances ──────────────────

export class AITrafficManager {
  private static instance: AITrafficManager | null = null;
  private navigators = new Map<string, AINavigator>();

  private constructor() {}

  public static getInstance(): AITrafficManager {
    if (!AITrafficManager.instance) AITrafficManager.instance = new AITrafficManager();
    return AITrafficManager.instance;
  }

  public spawnFlight(
    profile: AIFlightProfile & { startLat: number; startLng: number; startAltM: number },
  ): AINavigator {
    const nav = new AINavigator(profile);
    nav.initialize(profile.startLat, profile.startLng, profile.startAltM);
    this.navigators.set(profile.callsign, nav);
    return nav;
  }

  public update(dt: number): void {
    for (const [cs, nav] of this.navigators) {
      nav.update(dt);
      if (nav.isComplete()) {
        atcManager.removeTraffic(cs);
        this.navigators.delete(cs);
      }
    }
  }

  public getAll(): AINavigator[]                            { return [...this.navigators.values()]; }
  public getByCallsign(cs: string): AINavigator | undefined { return this.navigators.get(cs); }
  public count(): number                                    { return this.navigators.size; }

  public clear(): void {
    for (const cs of this.navigators.keys()) atcManager.removeTraffic(cs);
    this.navigators.clear();
  }
}

export const aiTrafficManager = AITrafficManager.getInstance();
