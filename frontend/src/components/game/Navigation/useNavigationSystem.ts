"use client";

/**
 * useNavigationSystem — React hook that runs the NavigationManager per-frame
 * inside the R3F game loop (useFrame-compatible, called from AircraftEntity).
 * Writes NavRoute back to gameStore and exposes nav state to UI.
 */

import { useRef, useCallback, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { useAutopilotStore } from "../../cockpit/stores/autopilotStore";
import { navigationManager } from "./NavigationManager";
import { navigationComputer } from "./NavigationComputer";
import { autopilotManager } from "./AutopilotManager";
import { airportDb } from "./AirportDatabase";
import { routeGenerator } from "./RouteGenerator";
import { flightPlanner } from "./FlightPlanner";
import type { FlightState, AircraftSpec, NavRoute } from "../Types";
import type { NavigationOutput } from "./NavigationManager";

// ─── Return type ──────────────────────────────────────────────────────────────

export interface NavigationSystemHandle {
  /** Call inside useFrame to run the nav system each physics tick. */
  tick: (flightState: FlightState, dt: number) => NavigationOutput | null;
  /** Load a direct-to route (two ICAO codes). */
  flyDirect: (destIcao: string) => void;
  /** Build + load a full flight plan. */
  loadPlan: (depIcao: string, destIcao: string, spec: AircraftSpec, cruiseAltM?: number) => void;
  /** Generate and load a route using the RouteGenerator. */
  loadRoute: (depIcao: string, destIcao: string, cruiseAltM?: number) => void;
  /** Engage autopilot in LNAV/VNAV mode. */
  engageLNAV_VNAV: () => void;
  /** Arm ILS approach. */
  armILS: (locFreqMhz: number) => void;
  /** Clear active route. */
  clearRoute: () => void;
  /** Direct-to a named fix or airport. */
  directTo: (waypointId: string) => void;
  /** Engage autopilot master. */
  engageAP: () => void;
  /** Disengage autopilot master. */
  disengageAP: () => void;
  /** Get current navigation output (last tick). */
  getOutput: () => NavigationOutput | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNavigationSystem(): NavigationSystemHandle {
  const lastOutput = useRef<NavigationOutput | null>(null);
  const initialized = useRef(false);

  // Ensure nav manager is initialized with player callsign once
  useEffect(() => {
    if (initialized.current) return;
    const callsign = "9N-NAV";
    navigationManager.initialize(callsign);
    initialized.current = true;

    // Mirror nav manager autopilot commands into the existing autopilotStore
    // so the cockpit AP panel stays in sync
    const ap = autopilotManager.getState();
    useAutopilotStore.getState().setMaster(ap.masterEngage);
  }, []);

  // Per-frame tick — call this inside useFrame from AircraftEntity
  const tick = useCallback((flightState: FlightState, dt: number): NavigationOutput | null => {
    if (!flightState) return null;

    const output = navigationManager.update(flightState, dt);
    lastOutput.current = output;

    // Sync autopilot commands back to the existing autopilotStore
    // The autopilotStore.step() runs first in AircraftEntity — we then
    // override its lateral target heading when LNAV is active
    const apState = output.autopilot;
    const apStore = useAutopilotStore.getState();

    if (apState.masterEngage && apState.lateral !== "OFF") {
      apStore.setMaster(true);
      // Mirror lateral mode into legacy store
      if (apState.lateral === "HDG" || apState.lateral === "LNAV") {
        apStore.setLateral("lnav");
        apStore.setTargetHdg(apState.targetHdgDeg);
      } else if (apState.lateral === "LOC") {
        apStore.setLateral("loc");
      }
      if (apState.vertical === "ALT") {
        apStore.setVertical("alt");
        apStore.setTargetAlt(apState.targetAltM);
      } else if (apState.vertical === "VS") {
        apStore.setVertical("vs");
        apStore.setTargetVs(apState.targetVsMs);
      } else if (apState.vertical === "VNAV" || apState.vertical === "FLC") {
        apStore.setVertical("vnav");
        apStore.setTargetAlt(apState.targetAltM);
      } else if (apState.vertical === "GS") {
        apStore.setVertical("gs");
      }
    }

    // Write NavRoute to gameStore for HUD and corridor streaming
    const gameStore = useGameStore.getState();
    if (output.navRoute.destIcao || gameStore.route.destIcao) {
      // Only update if route content actually changed to avoid churn
      const current = gameStore.route;
      const next = output.navRoute;
      if (
        next.destIcao !== current.destIcao ||
        Math.abs(next.distanceNm - current.distanceNm) > 0.05 ||
        next.etaSec !== current.etaSec
      ) {
        gameStore.setRoute(next as NavRoute);
      }
    }

    return output;
  }, []);

  const flyDirect = useCallback((destIcao: string) => {
    const dest = airportDb.getByIcao(destIcao);
    if (!dest) return;
    const st = useGameStore.getState().flightState;
    if (!st) return;
    navigationManager.buildAndLoadRoute(
      useGameStore.getState().spawnAirportIcao,
      destIcao,
    );
    useGameStore.getState().setRoute({
      destIcao,
      departureIcao: useGameStore.getState().spawnAirportIcao,
      waypoints: [{ lat: st.lat, lng: st.lng }, { lat: dest.lat, lng: dest.lng }],
      distanceNm: 0,
      etaSec: null,
      bearingDeg: 0,
    });
  }, []);

  const loadPlan = useCallback((
    depIcao: string, destIcao: string, spec: AircraftSpec, cruiseAltM?: number,
  ) => {
    navigationManager.buildAndLoadPlan({ departureIcao: depIcao, destinationIcao: destIcao, spec, cruiseAltM });
  }, []);

  const loadRoute = useCallback((depIcao: string, destIcao: string, cruiseAltM?: number) => {
    navigationManager.buildAndLoadRoute(depIcao, destIcao, cruiseAltM);
  }, []);

  const engageLNAV_VNAV = useCallback(() => {
    navigationManager.setLNAV_VNAV();
  }, []);

  const armILS = useCallback((locFreqMhz: number) => {
    navigationManager.armILSApproach(locFreqMhz);
  }, []);

  const clearRoute = useCallback(() => {
    navigationManager.clearRoute();
    useGameStore.getState().setRoute({
      destIcao: null, waypoints: [], distanceNm: 0, etaSec: null, bearingDeg: 0,
    });
  }, []);

  const directTo = useCallback((waypointId: string) => {
    const st = useGameStore.getState().flightState;
    if (!st) return;
    navigationManager.directTo(waypointId, st.lat, st.lng);
  }, []);

  const engageAP  = useCallback(() => navigationManager.engageAutopilot(), []);
  const disengageAP = useCallback(() => navigationManager.disengageAutopilot(), []);
  const getOutput = useCallback(() => lastOutput.current, []);

  return { tick, flyDirect, loadPlan, loadRoute, engageLNAV_VNAV, armILS, clearRoute, directTo, engageAP, disengageAP, getOutput };
}
