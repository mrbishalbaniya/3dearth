/**
 * NavigationComputer — FMS/RNAV navigation computer.
 * Manages active route, waypoint sequencing, CDI computation,
 * Direct-To, course tracking, and navigation source switching.
 */

import type {
  NavigationState,
  Waypoint,
  NavSource,
  NavPhase,
  CourseDeviationIndicator,
} from "./NavigationTypes";
import {
  haversineNm,
  initialBearingDeg,
  crossTrackErrorM,
  etaSeconds,
  greatCircleWaypoints,
} from "./greatCircle";
import { gpsManager } from "./GPSManager";
import { radioNav } from "./RadioNavigation";
import { waypointManager } from "./WaypointManager";
import { DEG2RAD } from "../Physics/Math/constants";

// ─── Internal route leg ───────────────────────────────────────────────────────

interface RouteLeg {
  from: Waypoint;
  to: Waypoint;
  trackDeg: number;
  distNm: number;
}

// ─── NavigationComputer ───────────────────────────────────────────────────────

export class NavigationComputer {
  private static instance: NavigationComputer | null = null;

  private route: Waypoint[] = [];
  private legs: RouteLeg[] = [];
  private activeWptIdx = 0;
  private source: NavSource = "GPS";
  private phase: NavPhase = "ENROUTE";

  // Required Navigation Performance (NM) per phase
  private readonly RNP: Record<NavPhase, number> = {
    ENROUTE: 2.0,
    TERM: 1.0,
    APPROACH: 0.3,
    DEPARTURE: 0.3,
    MISSED: 1.0,
  };

  private state: NavigationState = this.emptyState();

  private constructor() {}

  public static getInstance(): NavigationComputer {
    if (!NavigationComputer.instance) NavigationComputer.instance = new NavigationComputer();
    return NavigationComputer.instance;
  }

  // ── Route management ──────────────────────────────────────────────────────────

  public loadRoute(waypoints: Waypoint[]): void {
    this.route = [...waypoints];
    this.activeWptIdx = 0;
    this.buildLegs();
  }

  public loadRouteByIds(ids: string[]): Waypoint[] {
    const resolved = ids
      .map((id) => waypointManager.get(id))
      .filter((w): w is Waypoint => w != null);
    this.loadRoute(resolved);
    return resolved;
  }

  public clearRoute(): void {
    this.route = [];
    this.legs = [];
    this.activeWptIdx = 0;
    this.state = this.emptyState();
  }

  public directTo(waypointOrId: Waypoint | string, currentLat: number, currentLng: number): boolean {
    const wp = typeof waypointOrId === "string"
      ? waypointManager.get(waypointOrId)
      : waypointOrId;
    if (!wp) return false;

    // Splice direct-to waypoint into route at current position
    const fromWp: Waypoint = {
      id: "_PPOS_",
      name: "PPOS",
      type: "user",
      lat: currentLat,
      lng: currentLng,
      country: "NP",
    };
    // Keep waypoints from target onward, prepend PPOS → target
    const targetIdx = this.route.findIndex((w) => w.id === wp.id);
    const tail = targetIdx >= 0 ? this.route.slice(targetIdx) : [wp];
    this.route = [fromWp, ...tail];
    this.activeWptIdx = 0;
    this.buildLegs();
    return true;
  }

  public appendWaypoint(wp: Waypoint): void {
    this.route.push(wp);
    this.buildLegs();
  }

  public insertWaypointAfterActive(wp: Waypoint): void {
    this.route.splice(this.activeWptIdx + 1, 0, wp);
    this.buildLegs();
  }

  public removeWaypoint(index: number): void {
    if (index < 0 || index >= this.route.length) return;
    if (index <= this.activeWptIdx && this.activeWptIdx > 0) this.activeWptIdx--;
    this.route.splice(index, 1);
    this.buildLegs();
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  public update(
    lat: number,
    lng: number,
    altM: number,
    groundSpeedMs: number,
    dt: number,
  ): NavigationState {
    if (this.route.length === 0) return (this.state = this.emptyState());

    gpsManager.update(lat, lng, altM, 0, groundSpeedMs, dt);
    radioNav.update(lat, lng, altM);

    const activeWpt = this.route[this.activeWptIdx];
    if (!activeWpt) return (this.state = this.emptyState());

    const distToWptNm = haversineNm(lat, lng, activeWpt.lat, activeWpt.lng);
    const bearingToWptDeg = initialBearingDeg(lat, lng, activeWpt.lat, activeWpt.lng);

    // Auto-sequence — switch to next waypoint when within 0.3 nm or past it
    if (distToWptNm < 0.3 && this.activeWptIdx < this.route.length - 1) {
      this.activeWptIdx++;
    }

    const activeLeg = this.legs[this.activeWptIdx > 0 ? this.activeWptIdx - 1 : 0];

    let xtrackM = 0;
    if (activeLeg) {
      xtrackM = crossTrackErrorM(
        activeLeg.from.lat, activeLeg.from.lng,
        activeLeg.to.lat, activeLeg.to.lng,
        lat, lng,
      );
    }

    // Distance remaining to destination
    let remainingNm = distToWptNm;
    for (let i = this.activeWptIdx + 1; i < this.route.length; i++) {
      remainingNm += haversineNm(
        this.route[i - 1].lat, this.route[i - 1].lng,
        this.route[i].lat, this.route[i].lng,
      );
    }

    const etaNextSec = etaSeconds(distToWptNm, groundSpeedMs);
    const etaDestSec = etaSeconds(remainingNm, groundSpeedMs);

    // CDI
    const cdi = this.computeCDI(lat, lng, altM, activeLeg, xtrackM, bearingToWptDeg, distToWptNm);

    // Navigation performance
    const rnp = this.RNP[this.phase];
    const anp = Math.abs(xtrackM) / 1852; // convert m → nm
    const intact = anp <= rnp;

    const nextWpt = this.route[this.activeWptIdx + 1] ?? null;

    this.state = {
      source: this.source,
      phase: this.phase,
      activeWaypointIndex: this.activeWptIdx,
      activeWaypoint: activeWpt,
      nextWaypoint: nextWpt,
      distanceToWptNm: distToWptNm,
      bearingToWptDeg,
      crossTrackErrorM: xtrackM,
      requiredNavPerformanceNm: rnp,
      actualNavPerformanceNm: anp,
      navigationIntegrity: intact,
      cdi,
      etaNextWptSec: etaNextSec,
      etaDestSec,
      remainingDistanceNm: remainingNm,
    };

    return this.state;
  }

  // ── CDI computation ───────────────────────────────────────────────────────────

  private computeCDI(
    lat: number, lng: number, altM: number,
    leg: RouteLeg | undefined,
    xtrackM: number,
    bearingToWptDeg: number,
    distToWptNm: number,
  ): CourseDeviationIndicator {
    const source = this.source;

    // GPS/RNAV: scale CDI dots by phase (2nm enroute, 1nm term, 0.3nm approach)
    const cdiScaleNm = this.phase === "APPROACH" ? 0.3 : this.phase === "TERM" ? 1.0 : 2.0;
    const cdiDots = Math.max(-2.5, Math.min(2.5, (xtrackM / 1852) / cdiScaleNm * 2.5));

    const courseDeg = leg ? leg.trackDeg : bearingToWptDeg;
    const taeError = this.wrap180(bearingToWptDeg - courseDeg);

    // Glideslope (ILS only)
    let gsDots: number | null = null;
    if (source === "ILS" && radioNav.ils.tuned) {
      gsDots = radioNav.ils.gsDeflection * 2.5;
    }

    const toFrom = Math.abs(this.wrap180(bearingToWptDeg - courseDeg)) <= 90 ? "TO" : "FROM";

    return {
      source,
      courseDeg,
      cdiDots,
      gsDots,
      distanceNm: distToWptNm,
      bearingDeg: bearingToWptDeg,
      taeError,
      flagged: !gpsManager.isValid() && source === "GPS",
      activeIdent: this.route[this.activeWptIdx]?.id ?? null,
      toFrom,
    };
    void altM; void lat; void lng;
  }

  // ── Navigation source ─────────────────────────────────────────────────────────

  public setSource(source: NavSource): void { this.source = source; }
  public getSource(): NavSource { return this.source; }
  public setPhase(phase: NavPhase): void { this.phase = phase; }
  public getPhase(): NavPhase { return this.phase; }

  // ── State accessors ───────────────────────────────────────────────────────────

  public getState(): NavigationState { return this.state; }
  public getRoute(): Waypoint[] { return [...this.route]; }
  public getActiveWaypoint(): Waypoint | null { return this.route[this.activeWptIdx] ?? null; }
  public getActiveWptIndex(): number { return this.activeWptIdx; }
  public hasRoute(): boolean { return this.route.length > 0; }

  /** Export route as NavRoute for gameStore.setRoute(). */
  public toNavRoute(destIcao: string | null = null, departureIcao: string | null = null) {
    const waypoints = this.route.map((w) => ({ lat: w.lat, lng: w.lng, name: w.id }));
    const dest = this.route[this.route.length - 1];
    const origin = this.route[0];
    const distNm = this.legs.reduce((sum, l) => sum + l.distNm, 0);
    const bearing = (origin && dest)
      ? initialBearingDeg(origin.lat, origin.lng, dest.lat, dest.lng)
      : 0;
    return {
      destIcao,
      departureIcao,
      waypoints,
      distanceNm: distNm,
      etaSec: null,
      bearingDeg: bearing,
    };
  }

  /** Generate intermediate great-circle waypoints between two route fixes. */
  public generateIntermediates(fromIdx: number, toIdx: number, steps = 12): Waypoint[] {
    const from = this.route[fromIdx];
    const to   = this.route[toIdx];
    if (!from || !to) return [];
    return greatCircleWaypoints(from.lat, from.lng, to.lat, to.lng, steps).map((pt, i) => ({
      id: `_INT_${fromIdx}_${i}`,
      name: `INT${i}`,
      type: "fix" as const,
      lat: pt.lat,
      lng: pt.lng,
      country: "NP",
    }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private buildLegs(): void {
    this.legs = [];
    for (let i = 0; i < this.route.length - 1; i++) {
      const from = this.route[i];
      const to   = this.route[i + 1];
      this.legs.push({
        from, to,
        trackDeg: initialBearingDeg(from.lat, from.lng, to.lat, to.lng),
        distNm: haversineNm(from.lat, from.lng, to.lat, to.lng),
      });
    }
  }

  private wrap180(deg: number): number {
    let d = ((deg + 180) % 360) - 180;
    if (d < -180) d += 360;
    return d;
  }

  private emptyState(): NavigationState {
    return {
      source: this.source,
      phase: this.phase,
      activeWaypointIndex: 0,
      activeWaypoint: null,
      nextWaypoint: null,
      distanceToWptNm: 0,
      bearingToWptDeg: 0,
      crossTrackErrorM: 0,
      requiredNavPerformanceNm: 2,
      actualNavPerformanceNm: 0,
      navigationIntegrity: true,
      cdi: {
        source: this.source,
        courseDeg: 0,
        cdiDots: 0,
        gsDots: null,
        distanceNm: 0,
        bearingDeg: 0,
        taeError: 0,
        flagged: true,
        activeIdent: null,
        toFrom: "OFF",
      },
      etaNextWptSec: null,
      etaDestSec: null,
      remainingDistanceNm: 0,
    };
  }
}

export const navigationComputer = NavigationComputer.getInstance();
