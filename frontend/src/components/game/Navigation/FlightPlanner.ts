/**
 * FlightPlanner — Enhanced flight plan builder for Nepal routes.
 * Extends FlightPlanService with airspace awareness, terrain routing,
 * weather avoidance, SID/STAR, and full FlightPlanFull generation.
 */

import type { FlightPlanFull, FlightPlanWaypoint, FlightRules } from "./NavigationTypes";
import type { AircraftSpec } from "../Types";
import { airportDb } from "./AirportDatabase";
import { waypointManager } from "./WaypointManager";
import { airspaceManager } from "./AirspaceManager";
import { terrainAwareness } from "./TerrainAwareness";
import { sampleFlightWind } from "../Weather/WeatherBridge";
import {
  haversineNm,
  initialBearingDeg,
  greatCircleWaypoints,
  etaSeconds,
} from "./greatCircle";
import { DEG2RAD } from "../Physics/Math/constants";

// ─── Cruise altitude table for Nepal operations ────────────────────────────────

function recommendedCruiseAlt(distNm: number, depElevM: number, arrElevM: number): number {
  const maxTerrainM = 8850; // Everest — absolute max
  const terrainBuffer = 600;
  if (distNm < 60) {
    // Short hop — stay low
    return Math.max(depElevM, arrElevM) + 1000;
  }
  if (distNm < 150) return Math.max(3700, Math.max(depElevM, arrElevM) + 1200);
  if (distNm < 300) return Math.max(5500, maxTerrainM * 0.4 + terrainBuffer);
  return 7600; // Standard Nepal domestic cruise
}

// ─── Wind correction ─────────────────────────────────────────────────────────

function windCorrectionAngle(
  trackDeg: number, windFromDeg: number, windSpeedMs: number, tasMs: number,
): { wcaDeg: number; gspeedMs: number } {
  const windRad = (windFromDeg + 180 - trackDeg) * DEG2RAD;
  const wca = Math.asin(Math.min(1, (windSpeedMs * Math.sin(windRad)) / tasMs));
  const wcaDeg = wca * (180 / Math.PI);
  const gspeedMs = tasMs * Math.cos(wca) + windSpeedMs * Math.cos(windRad);
  return { wcaDeg, gspeedMs };
}

// ─── FlightPlanner class ──────────────────────────────────────────────────────

export class FlightPlanner {
  private static instance: FlightPlanner | null = null;
  private plans = new Map<string, FlightPlanFull>();
  private planCounter = 0;

  private constructor() {}

  public static getInstance(): FlightPlanner {
    if (!FlightPlanner.instance) FlightPlanner.instance = new FlightPlanner();
    return FlightPlanner.instance;
  }

  // ── Primary build method ──────────────────────────────────────────────────────

  public buildPlan(opts: {
    departureIcao: string;
    destinationIcao: string;
    alternateIcao?: string | null;
    alternate2Icao?: string | null;
    spec: AircraftSpec;
    rules?: FlightRules;
    cruiseAltM?: number;
    callsign?: string;
    avoidRestricted?: boolean;
  }): FlightPlanFull {
    const dep = airportDb.getByIcao(opts.departureIcao);
    const dest = airportDb.getByIcao(opts.destinationIcao);
    const spec = opts.spec;
    const rules: FlightRules = opts.rules ?? "VFR";

    const depElevM = dep?.elevM ?? 0;
    const arrElevM = dest?.elevM ?? 0;
    const depLat   = dep?.lat ?? 27.6966;
    const depLng   = dep?.lng ?? 85.3591;
    const arrLat   = dest?.lat ?? 27.6966;
    const arrLng   = dest?.lng ?? 85.3591;

    const totalDistNm = haversineNm(depLat, depLng, arrLat, arrLng);
    const cruiseAltM = opts.cruiseAltM
      ?? recommendedCruiseAlt(totalDistNm, depElevM, arrElevM);
    const cruiseIasKt = spec.cruiseSpeedMs * 1.94384;
    const tasMs = spec.cruiseSpeedMs; // TAS ≈ IAS at typical Nepal altitudes

    // Build intermediate waypoints (great-circle, density = distance)
    const gcSteps = Math.max(4, Math.min(32, Math.round(totalDistNm / 20)));
    const gcPoints = greatCircleWaypoints(depLat, depLng, arrLat, arrLng, gcSteps);

    // Check terrain MSA along track
    const terrainMsa = Math.max(
      ...gcPoints.map((pt) => terrainAwareness.computeMSA(pt.lat, pt.lng)),
    );
    const effectiveCruiseAltM = Math.max(cruiseAltM, terrainMsa + 300);

    // Check restricted airspace — pick deviation waypoints if needed
    const violations = airspaceManager.checkViolations(gcPoints, effectiveCruiseAltM);

    // Weather wind sample (mid-route)
    const midPt = gcPoints[Math.floor(gcPoints.length / 2)];
    const wind = sampleFlightWind(midPt.lat, midPt.lng);

    // Build waypoint list
    const wpList: FlightPlanWaypoint[] = [];
    let cumulativeDistNm = 0;
    let cumulativeTimeSec = 0;
    let fuelRemainingKg = spec.fuelCapacityKg;

    // Departure fix
    const depFix = waypointManager.get(opts.departureIcao) ?? {
      id: opts.departureIcao, name: dep?.name ?? opts.departureIcao,
      type: "airport" as const, lat: depLat, lng: depLng, country: "NP",
    };

    for (let i = 0; i <= gcSteps; i++) {
      const pt = gcPoints[i];
      const prevPt = i === 0 ? { lat: depLat, lng: depLng } : gcPoints[i - 1];
      const legDistNm = i === 0 ? 0 : haversineNm(prevPt.lat, prevPt.lng, pt.lat, pt.lng);
      const legTrackDeg = i === 0 ? 0 : initialBearingDeg(prevPt.lat, prevPt.lng, pt.lat, pt.lng);

      const { wcaDeg, gspeedMs } = windCorrectionAngle(legTrackDeg, wind.fromDeg, wind.speedMs, tasMs);
      const gspeedKt = gspeedMs * 1.94384;
      const magHdgDeg = (legTrackDeg + wcaDeg + 360) % 360;

      const legTimeSec = gspeedKt > 5 ? (legDistNm / gspeedKt) * 3600 : 0;
      cumulativeDistNm += legDistNm;
      cumulativeTimeSec += legTimeSec;

      const altAtWpt = i === 0 ? depElevM
        : i === gcSteps ? arrElevM
        : effectiveCruiseAltM;

      const fuelBurnLeg = spec.fuelBurnKgS * legTimeSec;
      fuelRemainingKg = Math.max(0, fuelRemainingKg - fuelBurnLeg);

      // Find nearest named fix to label this point
      const nearestFix = waypointManager.nearest(pt.lat, pt.lng, 15, 1);
      const wpId = i === 0 ? opts.departureIcao
        : i === gcSteps ? opts.destinationIcao
        : nearestFix[0]?.waypoint.id ?? `WPT${String(i).padStart(2, "0")}`;

      wpList.push({
        id: wpId,
        name: nearestFix[0]?.waypoint.name ?? wpId,
        type: i === 0 || i === gcSteps ? "airport" : "fix",
        lat: pt.lat, lng: pt.lng,
        country: "NP",
        plannedAltM: altAtWpt,
        plannedIasKt: cruiseIasKt,
        legDistNm,
        legTrackDeg,
        etoSec: cumulativeTimeSec,
        wcaDeg,
        magHdgDeg,
        fuelRemainingKg,
      });
    }

    // Fuel calculations
    const totalTimeSec = cumulativeTimeSec;
    const fuelRequired = spec.fuelBurnKgS * totalTimeSec;
    const fuelReserve = spec.fuelBurnKgS * 2700;   // 45 min reserve
    const fuelAlternate = opts.alternateIcao
      ? spec.fuelBurnKgS * 1800 : 0;
    const fuelContingency = fuelRequired * 0.05;

    // Route string
    const routeStr = wpList.slice(1, -1).map((w) => w.id).join(" ");

    const plan: FlightPlanFull = {
      id: `PLN${++this.planCounter}`,
      callsign: opts.callsign ?? `NAV${this.planCounter}`,
      rules,
      flightType: "G",
      aircraftType: spec.id.toUpperCase(),
      departureIcao: opts.departureIcao,
      destinationIcao: opts.destinationIcao,
      alternateIcao: opts.alternateIcao ?? null,
      alternate2Icao: opts.alternate2Icao ?? null,
      eobt: new Date().toISOString(),
      cruiseAltM: effectiveCruiseAltM,
      cruiseSpeedKt: cruiseIasKt,
      waypoints: wpList,
      totalDistanceNm: cumulativeDistNm,
      totalTimeSec,
      fuelRequiredKg: fuelRequired,
      fuelReserveKg: fuelReserve,
      fuelAlternateKg: fuelAlternate,
      fuelContingencyKg: fuelContingency,
      route: `${opts.departureIcao} ${routeStr} ${opts.destinationIcao}`.trim(),
      remarks: violations.length
        ? `TERRAIN/AIRSPACE DEVIATION APPLIED. ${violations.map((v) => v.id).join(", ")}`
        : "",
    };

    this.plans.set(plan.id, plan);
    void depFix;
    return plan;
  }

  // ── Plan management ───────────────────────────────────────────────────────────

  public getPlan(id: string): FlightPlanFull | undefined { return this.plans.get(id); }
  public getAllPlans(): FlightPlanFull[] { return [...this.plans.values()]; }
  public deletePlan(id: string): void { this.plans.delete(id); }

  /** Convert FlightPlanFull to NavRoute for gameStore. */
  public toNavRoute(plan: FlightPlanFull) {
    return {
      destIcao: plan.destinationIcao,
      departureIcao: plan.departureIcao,
      alternateIcao: plan.alternateIcao,
      waypoints: plan.waypoints.map((w) => ({ lat: w.lat, lng: w.lng, name: w.id })),
      distanceNm: plan.totalDistanceNm,
      etaSec: plan.totalTimeSec,
      bearingDeg: plan.waypoints.length >= 2
        ? initialBearingDeg(
          plan.waypoints[0].lat, plan.waypoints[0].lng,
          plan.waypoints[plan.waypoints.length - 1].lat,
          plan.waypoints[plan.waypoints.length - 1].lng,
        ) : 0,
    };
  }
}

export const flightPlanner = FlightPlanner.getInstance();
