/**
 * Flight planning — departure / destination / alternate, fuel & time estimates.
 * Future-ready for SID/STAR procedure attachments.
 */

import { getAirport } from "../Services/AirportService";
import {
  etaSeconds,
  greatCircleWaypoints,
  haversineNm,
  initialBearingDeg,
} from "../Navigation/greatCircle";
import type { AircraftSpec, NavRoute } from "../Types";

export interface FlightPlan {
  departureIcao: string;
  destinationIcao: string | null;
  alternateIcao: string | null;
  cruiseAltM: number;
  route: NavRoute;
  /** Estimated fuel burn kg */
  fuelRequiredKg: number;
  fuelReserveKg: number;
  eteSec: number | null;
}

export function buildFlightPlan(opts: {
  departureIcao: string;
  destinationIcao: string | null;
  alternateIcao?: string | null;
  cruiseAltM?: number;
  spec: AircraftSpec;
  cruiseSpeedMs?: number;
}): FlightPlan {
  const dep = getAirport(opts.departureIcao);
  const dest = opts.destinationIcao
    ? getAirport(opts.destinationIcao)
    : null;
  const cruiseMs = opts.cruiseSpeedMs ?? opts.spec.cruiseSpeedMs;
  const cruiseAltM = opts.cruiseAltM ?? 3_000;

  if (!dep || !dest) {
    return {
      departureIcao: opts.departureIcao,
      destinationIcao: opts.destinationIcao,
      alternateIcao: opts.alternateIcao ?? null,
      cruiseAltM,
      route: {
        destIcao: opts.destinationIcao,
        waypoints: [],
        distanceNm: 0,
        etaSec: null,
        bearingDeg: 0,
        departureIcao: opts.departureIcao,
        alternateIcao: opts.alternateIcao ?? null,
      },
      fuelRequiredKg: opts.spec.fuelCapacityKg * 0.15,
      fuelReserveKg: opts.spec.fuelCapacityKg * 0.1,
      eteSec: null,
    };
  }

  const distanceNm = haversineNm(dep.lat, dep.lng, dest.lat, dest.lng);
  const bearingDeg = initialBearingDeg(dep.lat, dep.lng, dest.lat, dest.lng);
  const waypoints = greatCircleWaypoints(dep.lat, dep.lng, dest.lat, dest.lng, 32);
  const eteSec = etaSeconds(distanceNm, cruiseMs);
  // Rough: climb/cruise/descent fuel ≈ burn * time * 0.7 cruise factor + reserves
  const hours = eteSec != null ? eteSec / 3600 : distanceNm / 120;
  const fuelRequiredKg =
    opts.spec.fuelBurnKgS * 3600 * hours * 0.85 + opts.spec.fuelCapacityKg * 0.05;
  const fuelReserveKg = Math.max(
    opts.spec.fuelCapacityKg * 0.1,
    opts.spec.fuelBurnKgS * 3600 * 0.75,
  );

  return {
    departureIcao: opts.departureIcao,
    destinationIcao: opts.destinationIcao,
    alternateIcao: opts.alternateIcao ?? null,
    cruiseAltM,
    route: {
      destIcao: opts.destinationIcao,
      departureIcao: opts.departureIcao,
      alternateIcao: opts.alternateIcao ?? null,
      waypoints,
      distanceNm,
      etaSec: eteSec,
      bearingDeg,
    },
    fuelRequiredKg,
    fuelReserveKg,
    eteSec,
  };
}
