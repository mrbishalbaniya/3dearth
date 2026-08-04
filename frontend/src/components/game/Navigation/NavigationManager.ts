/**
 * NavigationManager — Central orchestrator for the Nepal Airspace &
 * Navigation System. Integrates all sub-systems per frame and exposes
 * a single interface to FlightMode, FlightHUD, and AI traffic.
 */

import type {
  NavigationState,
  AutopilotFullState,
  TerrainAwarenessState,
  FlightPlanFull,
  NavEvent,
  NavEventPayload,
  AirspaceBoundary,
  Waypoint,
} from "./NavigationTypes";
import type { FlightState, AircraftSpec, NavRoute } from "../Types";

import { navigationComputer } from "./NavigationComputer";
import { autopilotManager } from "./AutopilotManager";
import { gpsManager } from "./GPSManager";
import { radioNav } from "./RadioNavigation";
import { terrainAwareness } from "./TerrainAwareness";
import { airspaceManager } from "./AirspaceManager";
import { waypointManager } from "./WaypointManager";
import { flightPlanner } from "./FlightPlanner";
import { routeGenerator } from "./RouteGenerator";
import { atcManager } from "./ATCManager";
import { obstacleDb } from "./ObstacleDatabase";
import { airportDb } from "./AirportDatabase";

// ─── Per-frame navigation output ──────────────────────────────────────────────

export interface NavigationOutput {
  nav: NavigationState;
  autopilot: AutopilotFullState;
  terrain: TerrainAwarenessState;
  /** Current controlling ATC frequency */
  atcFreqMhz: number | null;
  /** Airspace sectors aircraft is currently inside */
  activeAirspace: AirspaceBoundary[];
  /** NavRoute for gameStore.setRoute() */
  navRoute: NavRoute;
  /** Autopilot control commands for physics integrator */
  apCmd: { pitch: number; roll: number; yaw: number; throttle: number };
  /** Squawk code */
  squawk: string;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

type NavListener = (payload: NavEventPayload) => void;

// ─── NavigationManager class ──────────────────────────────────────────────────

export class NavigationManager {
  private static instance: NavigationManager | null = null;

  private listeners = new Map<NavEvent, NavListener[]>();
  private activePlan: FlightPlanFull | null = null;
  private squawk = "2000";
  private prevAirspaceIds = new Set<string>();
  private prevTerrainLevel = "NONE";
  private prevWptIdx = -1;
  private initialized = false;

  private constructor() {}

  public static getInstance(): NavigationManager {
    if (!NavigationManager.instance) NavigationManager.instance = new NavigationManager();
    return NavigationManager.instance;
  }

  // ── Initialization ────────────────────────────────────────────────────────────

  public initialize(callsign = "9N-ABC"): void {
    if (this.initialized) return;
    atcManager.setPlayerCallsign(callsign);
    this.initialized = true;
  }

  // ── Per-frame master update ───────────────────────────────────────────────────

  public update(flightState: FlightState, dt: number): NavigationOutput {
    const {
      lat, lng, altM, airspeedMs, groundSpeedMs, verticalSpeedMs,
      yawDeg, pitchDeg, rollDeg, gearDown, flaps,
    } = flightState;

    // 1. GPS
    gpsManager.update(lat, lng, altM, yawDeg, groundSpeedMs, dt);

    // 2. Radio navaids
    radioNav.update(lat, lng, altM);

    // 3. Navigation computer
    const nav = navigationComputer.update(lat, lng, altM, groundSpeedMs, dt);

    // 4. Terrain awareness
    const terrain = terrainAwareness.update(
      lat, lng, altM, verticalSpeedMs, airspeedMs, gearDown, flaps, dt,
    );

    // 5. Autopilot
    const apCmd = autopilotManager.update(
      { lat, lng, altM, hdgDeg: yawDeg, vsMs: verticalSpeedMs, tasMs: airspeedMs, pitchDeg, rollDeg },
      dt,
    );
    const autopilot = autopilotManager.getState();

    // 6. Airspace monitoring
    const activeAirspace = airspaceManager.getContaining(lat, lng, altM);
    this.fireAirspaceEvents(activeAirspace);

    // 7. ATC handoff check
    const handoff = atcManager.checkHandoff(lat, lng, altM);
    if (handoff) {
      this.emit({
        event: "airspace_entered",
        timestamp: Date.now(),
        data: { facilityId: handoff.id, freq: handoff.primaryFreqMhz },
      });
    }
    const atcFreqMhz = atcManager.getActiveFrequency(lat, lng, altM);

    // 8. Terrain alert events
    if (terrain.alert.level !== this.prevTerrainLevel) {
      if (terrain.alert.level !== "NONE") {
        this.emit({ event: "terrain_alert", timestamp: Date.now(), data: { alert: terrain.alert } });
      }
      this.prevTerrainLevel = terrain.alert.level;
    }

    // 9. Waypoint sequencing events
    if (nav.activeWaypointIndex !== this.prevWptIdx && this.prevWptIdx >= 0) {
      this.emit({
        event: "waypoint_sequenced",
        timestamp: Date.now(),
        data: { wptIdx: nav.activeWaypointIndex, wpt: nav.activeWaypoint },
      });
    }
    this.prevWptIdx = nav.activeWaypointIndex;

    // 10. Destination reached
    if (
      nav.activeWaypoint == null &&
      nav.remainingDistanceNm < 0.5 &&
      navigationComputer.hasRoute()
    ) {
      this.emit({ event: "destination_reached", timestamp: Date.now() });
    }

    // 11. Build NavRoute for gameStore
    const navRoute: NavRoute = navigationComputer.hasRoute()
      ? navigationComputer.toNavRoute(
          this.activePlan?.destinationIcao ?? null,
          this.activePlan?.departureIcao ?? null,
        )
      : this.emptyNavRoute();

    void airspeedMs;
    return { nav, autopilot, terrain, atcFreqMhz, activeAirspace, navRoute, apCmd, squawk: this.squawk };
  }

  // ── Flight plan operations ────────────────────────────────────────────────────

  public loadFlightPlan(plan: FlightPlanFull): void {
    this.activePlan = plan;
    const wps = plan.waypoints as Waypoint[];
    navigationComputer.loadRoute(wps);
    const clr = atcManager.issueClearance({
      type: "departure",
      destinationIcao: plan.destinationIcao,
      cruiseAltM: plan.cruiseAltM,
    });
    this.squawk = clr.squawk ?? "2000";
    this.emit({ event: "route_loaded", timestamp: Date.now(), data: { planId: plan.id } });
  }

  public buildAndLoadPlan(opts: {
    departureIcao: string;
    destinationIcao: string;
    spec: AircraftSpec;
    cruiseAltM?: number;
    callsign?: string;
  }): FlightPlanFull {
    const plan = flightPlanner.buildPlan(opts);
    this.loadFlightPlan(plan);
    return plan;
  }

  public buildAndLoadRoute(
    departureIcao: string,
    destinationIcao: string,
    cruiseAltM?: number,
  ): void {
    const result = routeGenerator.generate({ departureIcao, destinationIcao, cruiseAltM });
    navigationComputer.loadRoute(result.waypoints);
    this.emit({ event: "route_loaded", timestamp: Date.now(), data: { departureIcao, destinationIcao } });
  }

  public clearRoute(): void {
    navigationComputer.clearRoute();
    this.activePlan = null;
    this.prevWptIdx = -1;
    this.emit({ event: "route_cleared", timestamp: Date.now() });
  }

  public directTo(waypointId: string, lat: number, lng: number): boolean {
    const ok = navigationComputer.directTo(waypointId, lat, lng);
    if (ok) this.emit({ event: "direct_to_set", timestamp: Date.now(), data: { waypointId } });
    return ok;
  }

  // ── Autopilot delegation ──────────────────────────────────────────────────────

  public engageAutopilot(): void  { autopilotManager.engageMaster(); }
  public disengageAutopilot(): void { autopilotManager.disengageMaster(); }
  public setClimbMode(altM: number, hdg: number): void { autopilotManager.setClimbMode(altM, hdg); }
  public setCruise(altM: number, hdg: number, kt: number): void { autopilotManager.setCruiseMode(altM, hdg, kt); }
  public setLNAV_VNAV(): void     { autopilotManager.setLNAV_VNAV(); }
  public armILSApproach(freqMhz: number): void { autopilotManager.armILSApproach(freqMhz); }

  // ── State accessors ───────────────────────────────────────────────────────────

  public getNavState(): NavigationState           { return navigationComputer.getState(); }
  public getAutopilotState(): AutopilotFullState   { return autopilotManager.getState(); }
  public getTerrainState(): TerrainAwarenessState  { return terrainAwareness.getState(); }
  public getActivePlan(): FlightPlanFull | null    { return this.activePlan; }
  public getActiveWaypoint(): Waypoint | null      { return navigationComputer.getActiveWaypoint(); }
  public getRoute(): Waypoint[]                    { return navigationComputer.getRoute(); }
  public hasRoute(): boolean                       { return navigationComputer.hasRoute(); }
  public getAirportDb()                            { return airportDb; }
  public getWaypointManager()                      { return waypointManager; }
  public getAirspaceManager()                      { return airspaceManager; }
  public getRadioNav()                             { return radioNav; }
  public getGPS()                                  { return gpsManager; }
  public getObstacleDb()                           { return obstacleDb; }
  public getATCManager()                           { return atcManager; }

  // ── Event bus ─────────────────────────────────────────────────────────────────

  public on(event: NavEvent, listener: NavListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener);
  }

  public off(event: NavEvent, listener: NavListener): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(listener);
    if (idx >= 0) arr.splice(idx, 1);
  }

  private emit(payload: NavEventPayload): void {
    const arr = this.listeners.get(payload.event);
    if (!arr) return;
    for (const fn of arr) fn(payload);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private fireAirspaceEvents(activeAirspace: AirspaceBoundary[]): void {
    const currentIds = new Set(activeAirspace.map((a) => a.id));
    for (const id of currentIds) {
      if (!this.prevAirspaceIds.has(id)) {
        this.emit({ event: "airspace_entered", timestamp: Date.now(), data: { airspaceId: id } });
      }
    }
    for (const id of this.prevAirspaceIds) {
      if (!currentIds.has(id)) {
        this.emit({ event: "airspace_exited", timestamp: Date.now(), data: { airspaceId: id } });
      }
    }
    this.prevAirspaceIds = currentIds;
  }

  private emptyNavRoute(): NavRoute {
    return { destIcao: null, waypoints: [], distanceNm: 0, etaSec: null, bearingDeg: 0 };
  }
}

export const navigationManager = NavigationManager.getInstance();
