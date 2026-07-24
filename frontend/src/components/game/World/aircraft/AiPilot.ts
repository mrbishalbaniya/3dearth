/**
 * AI pilot decision FSM — phase transitions depend on ATC slots, weather, traffic.
 * Not a fixed timeline script.
 */

import type { AirportOpsState, TrafficAircraft, TrafficLod } from "../types";
import {
  requestArrivalSlot,
  requestDepartureSlot,
  releaseRunway,
  hasSeparationConflict,
} from "../atc/RunwayManager";
import { issueClearance, facilityForPhase } from "../atc/AtcService";
import {
  buildTrafficRoute,
  cruiseAltitudeForDistance,
  cruiseSpeedForCategory,
  sampleRoute,
} from "../navigation/TrafficRoutes";
import { getAirport } from "../../Services/AirportService";

function wrap360(d: number) {
  return ((d % 360) + 360) % 360;
}

export interface PilotTickEnv {
  ops: Map<string, AirportOpsState>;
  neighbors: TrafficAircraft[];
  windFromDeg: number;
  visibility: number; // 0..1
  dt: number;
  onClearance?: (ac: TrafficAircraft, text: string) => void;
}

export function stepAiPilot(
  ac: TrafficAircraft,
  env: PilotTickEnv,
): TrafficAircraft {
  const dt = env.dt;
  let next: TrafficAircraft = {
    ...ac,
    phaseAgeSec: ac.phaseAgeSec + dt,
  };

  const dep = getAirport(ac.depIcao);
  const dest = getAirport(ac.destIcao);
  if (!dep || !dest) return next;

  const opsDep = env.ops.get(ac.depIcao);
  const opsDest = env.ops.get(ac.destIcao);

  // Separation: if conflict in full LOD, delay climb / go around
  if (ac.lod === "full") {
    for (const other of env.neighbors) {
      if (hasSeparationConflict(ac, other, 2.5)) {
        if (ac.phase === "approach" || ac.phase === "landing") {
          next.phase = "initial_climb";
          next.clearance = "go_around";
          next.phaseAgeSec = 0;
          next.vsMs = 8;
          env.onClearance?.(
            next,
            issueClearance("tower", "go_around", ac.id, ac.callsign).text,
          );
          return next;
        }
        if (ac.phase === "cruise") {
          next.altM += 150 * dt; // mild vertical separation
        }
      }
    }
  }

  switch (ac.phase) {
    case "parked":
      if (ac.phaseAgeSec > 8 + (ac.gateIdx % 5) * 3) {
        next.phase = "boarding";
        next.phaseAgeSec = 0;
      }
      break;

    case "boarding":
      if (ac.phaseAgeSec > 12 + (ac.category === "ga" ? 0 : 20)) {
        next.phase = "pushback";
        next.phaseAgeSec = 0;
        next.clearance = "pushback";
      }
      break;

    case "pushback":
      if (ac.phaseAgeSec > 25) {
        next.phase = "engine_start";
        next.phaseAgeSec = 0;
      }
      next.hdgDeg = wrap360(next.hdgDeg + dt * 4);
      break;

    case "engine_start":
      if (ac.phaseAgeSec > 15) {
        next.phase = "taxi_out";
        next.phaseAgeSec = 0;
        next.clearance = "taxi";
      }
      break;

    case "taxi_out": {
      // Crawl toward runway heading position
      const rwHdg = dep.runways[0]?.headingDeg ?? 0;
      next.hdgDeg += ((rwHdg - next.hdgDeg + 540) % 360) - 180;
      next.hdgDeg = wrap360(next.hdgDeg);
      const step = (12 * dt) / 111_320;
      next.lat += Math.cos((rwHdg * Math.PI) / 180) * step * 0.3;
      next.lng +=
        (Math.sin((rwHdg * Math.PI) / 180) * step * 0.3) /
        Math.max(0.2, Math.cos((next.lat * Math.PI) / 180));
      if (ac.phaseAgeSec > 40) {
        next.phase = "holding_short";
        next.phaseAgeSec = 0;
        next.clearance = "hold_short";
      }
      break;
    }

    case "holding_short": {
      if (!opsDep) break;
      const slot = requestDepartureSlot(opsDep, next);
      next.runwayId = slot.runwayId;
      if (slot.ok && env.visibility > 0.25) {
        next.phase = "lineup";
        next.phaseAgeSec = 0;
        next.clearance = "lineup_wait";
        env.onClearance?.(
          next,
          issueClearance("tower", "lineup_wait", ac.id, ac.callsign, {
            runwayId: slot.runwayId,
          }).text,
        );
      }
      break;
    }

    case "lineup":
      if (ac.phaseAgeSec > 12 && env.visibility > 0.2) {
        next.phase = "takeoff";
        next.phaseAgeSec = 0;
        next.clearance = "takeoff";
        next.tasMs = 40;
        env.onClearance?.(
          next,
          issueClearance("tower", "takeoff", ac.id, ac.callsign, {
            runwayId: next.runwayId ?? undefined,
          }).text,
        );
      }
      break;

    case "takeoff": {
      const rwHdg = dep.runways[0]?.headingDeg ?? next.hdgDeg;
      next.hdgDeg = rwHdg;
      next.tasMs = Math.min(cruiseSpeedForCategory(ac.category) * 0.7, next.tasMs + 12 * dt);
      next.altM += Math.max(0, (next.tasMs - 55) * 0.35 * dt);
      const step = (next.tasMs * dt) / 111_320;
      next.lat += Math.cos((rwHdg * Math.PI) / 180) * step;
      next.lng +=
        (Math.sin((rwHdg * Math.PI) / 180) * step) /
        Math.max(0.2, Math.cos((next.lat * Math.PI) / 180));
      if (next.altM > dep.elevM + 200) {
        if (opsDep && next.runwayId)
          releaseRunway(opsDep, next.runwayId, next.id);
        next.phase = "initial_climb";
        next.phaseAgeSec = 0;
        next.clearance = "climb";
        next.routeProgress = 0.02;
      }
      break;
    }

    case "initial_climb": {
      const route = buildTrafficRoute(dep.lat, dep.lng, dest.lat, dest.lng);
      next.cruiseAltM = cruiseAltitudeForDistance(route.distanceNm, ac.category);
      next.tasMs = cruiseSpeedForCategory(ac.category) * 0.85;
      next.vsMs = 8;
      next.altM = Math.min(next.cruiseAltM, next.altM + next.vsMs * dt);
      next.routeProgress = Math.min(0.15, next.routeProgress + dt * 0.008);
      const s = sampleRoute(route, next.routeProgress);
      next.lat = s.lat;
      next.lng = s.lng;
      next.hdgDeg = s.hdgDeg;
      if (next.altM >= next.cruiseAltM * 0.85 || next.routeProgress >= 0.12) {
        next.phase = "cruise";
        next.phaseAgeSec = 0;
        next.clearance = "cruise";
        next.vsMs = 0;
      }
      break;
    }

    case "cruise": {
      const route = buildTrafficRoute(dep.lat, dep.lng, dest.lat, dest.lng);
      const speed = cruiseSpeedForCategory(ac.category);
      next.tasMs = speed;
      const nmPerSec = speed / 1852;
      const dProg = route.distanceNm > 1 ? (nmPerSec * dt) / route.distanceNm : 0.01;
      next.routeProgress = Math.min(0.82, next.routeProgress + dProg);
      const s = sampleRoute(route, next.routeProgress);
      next.lat = s.lat;
      next.lng = s.lng;
      next.hdgDeg = s.hdgDeg;
      next.altM = next.cruiseAltM;
      if (next.routeProgress >= 0.78) {
        next.phase = "descent";
        next.phaseAgeSec = 0;
        next.clearance = "descend";
      }
      break;
    }

    case "descent": {
      const route = buildTrafficRoute(dep.lat, dep.lng, dest.lat, dest.lng);
      next.vsMs = -6;
      next.altM = Math.max(dest.elevM + 800, next.altM + next.vsMs * dt);
      next.routeProgress = Math.min(0.92, next.routeProgress + dt * 0.01);
      const s = sampleRoute(route, next.routeProgress);
      next.lat = s.lat;
      next.lng = s.lng;
      next.hdgDeg = s.hdgDeg;
      if (next.routeProgress >= 0.9 || next.altM < dest.elevM + 1200) {
        next.phase = "approach";
        next.phaseAgeSec = 0;
        next.clearance = "approach";
      }
      break;
    }

    case "approach": {
      if (opsDest) {
        const slot = requestArrivalSlot(opsDest, next);
        next.runwayId = slot.runwayId;
        if (!slot.ok) {
          // Hold / delay — orbit
          next.hdgDeg = wrap360(next.hdgDeg + 12 * dt);
          break;
        }
      }
      if (env.visibility < 0.15) {
        next.phase = "initial_climb";
        next.phaseAgeSec = 0;
        next.clearance = "go_around";
        break;
      }
      next.tasMs = Math.max(55, next.tasMs - 5 * dt);
      next.altM = Math.max(dest.elevM + 15, next.altM - 4 * dt);
      const brg = sampleRoute(
        buildTrafficRoute(next.lat, next.lng, dest.lat, dest.lng),
        1,
      ).hdgDeg;
      next.hdgDeg = brg;
      const step = (next.tasMs * dt) / 111_320;
      next.lat += Math.cos((brg * Math.PI) / 180) * step;
      next.lng +=
        (Math.sin((brg * Math.PI) / 180) * step) /
        Math.max(0.2, Math.cos((next.lat * Math.PI) / 180));
      const dNm = Math.hypot(next.lat - dest.lat, next.lng - dest.lng) * 60;
      if (dNm < 1.2 && next.altM < dest.elevM + 80) {
        next.phase = "landing";
        next.phaseAgeSec = 0;
        next.clearance = "landing";
      }
      break;
    }

    case "landing":
      next.tasMs = Math.max(0, next.tasMs - 18 * dt);
      next.altM = dest.elevM + 8;
      if (next.tasMs < 15 || ac.phaseAgeSec > 25) {
        if (opsDest && next.runwayId)
          releaseRunway(opsDest, next.runwayId, next.id);
        next.phase = "taxi_in";
        next.phaseAgeSec = 0;
        next.clearance = "taxi_in";
        next.tasMs = 8;
      }
      break;

    case "taxi_in":
      if (ac.phaseAgeSec > 35) {
        next.phase = "shutdown";
        next.phaseAgeSec = 0;
        next.tasMs = 0;
        next.lat = dest.lat + (next.gateIdx % 7) * 0.0004;
        next.lng = dest.lng + (next.gateIdx % 5) * 0.0004;
        next.altM = dest.elevM + 4;
      }
      break;

    case "shutdown":
      if (ac.phaseAgeSec > 20) {
        // Turn for next leg — swap dep/dest for continuous living world
        next = {
          ...next,
          depIcao: ac.destIcao,
          destIcao: ac.depIcao,
          phase: "parked",
          phaseAgeSec: 0,
          routeProgress: 0,
          clearance: null,
          runwayId: null,
        };
      }
      break;

    case "diverting":
      next.phase = "descent";
      next.phaseAgeSec = 0;
      break;

    default:
      break;
  }

  void facilityForPhase(next.phase);
  return next;
}

/** Lightweight global/regional update — statistical progress, no runway FSM. */
export function stepAiLightweight(
  ac: TrafficAircraft,
  dt: number,
): TrafficAircraft {
  const dep = getAirport(ac.depIcao);
  const dest = getAirport(ac.destIcao);
  if (!dep || !dest) return ac;
  if (
    ac.phase === "parked" ||
    ac.phase === "boarding" ||
    ac.phase === "shutdown"
  ) {
    return { ...ac, phaseAgeSec: ac.phaseAgeSec + dt };
  }
  const route = buildTrafficRoute(dep.lat, dep.lng, dest.lat, dest.lng);
  const speed = cruiseSpeedForCategory(ac.category);
  const nmPerSec = speed / 1852;
  let progress = ac.routeProgress + (nmPerSec * dt) / Math.max(1, route.distanceNm);
  let phase: TrafficAircraft["phase"] = ac.phase;
  if (progress < 0.05) phase = "initial_climb";
  else if (progress < 0.8) phase = "cruise";
  else if (progress < 0.95) phase = "descent";
  else {
    return {
      ...ac,
      depIcao: ac.destIcao,
      destIcao: ac.depIcao,
      phase: "parked",
      routeProgress: 0,
      phaseAgeSec: 0,
      lat: dest.lat,
      lng: dest.lng,
      altM: dest.elevM + 4,
      tasMs: 0,
    };
  }
  const s = sampleRoute(route, Math.min(0.95, progress));
  const cruise = cruiseAltitudeForDistance(route.distanceNm, ac.category);
  const alt =
    phase === "cruise"
      ? cruise
      : phase === "descent"
        ? cruise * (1 - (progress - 0.8) / 0.2) + dest.elevM
        : dep.elevM + progress * 20 * cruise;
  return {
    ...ac,
    phase,
    routeProgress: progress,
    lat: s.lat,
    lng: s.lng,
    hdgDeg: s.hdgDeg,
    altM: Math.max(dest.elevM + 50, alt),
    tasMs: speed,
    phaseAgeSec: ac.phaseAgeSec + dt,
    lod: ac.lod,
  };
}

export function assignLod(
  ac: TrafficAircraft,
  focusLat: number,
  focusLng: number,
): TrafficLod {
  const dNm = Math.hypot(ac.lat - focusLat, ac.lng - focusLng) * 60;
  if (dNm < 80) return "full";
  if (dNm < 400) return "regional";
  return "global";
}
