/**
 * ATC clearance generation — text now, voice-ready message schema later.
 */

import type {
  AtcClearance,
  AtcFacility,
  ClearanceType,
  TrafficAircraft,
} from "../types";

let clearanceSeq = 0;

export function issueClearance(
  facility: AtcFacility,
  type: ClearanceType,
  targetId: string,
  callsign: string,
  opts?: { runwayId?: string; altitudeM?: number; headingDeg?: number },
): AtcClearance {
  const rw = opts?.runwayId ? ` runway ${opts.runwayId}` : "";
  const alt =
    opts?.altitudeM != null
      ? ` climb and maintain ${Math.round(opts.altitudeM * 3.28084 / 100) * 100}`
      : "";
  const phrases: Record<ClearanceType, string> = {
    pushback: `${callsign}, push and start approved`,
    taxi: `${callsign}, taxi to${rw || " holding point"}`,
    hold_short: `${callsign}, hold short${rw}`,
    lineup_wait: `${callsign}, line up and wait${rw}`,
    takeoff: `${callsign}, wind calm, cleared for takeoff${rw}`,
    climb: `${callsign},${alt || " climb as cleared"}`,
    cruise: `${callsign}, proceed on course`,
    descend: `${callsign}, descend and maintain${alt || ""}`,
    approach: `${callsign}, cleared approach${rw}`,
    landing: `${callsign}, cleared to land${rw}`,
    taxi_in: `${callsign}, taxi to gate`,
    go_around: `${callsign}, go around, fly runway heading`,
  };
  return {
    id: `clr-${++clearanceSeq}`,
    facility,
    type,
    text: phrases[type],
    runwayId: opts?.runwayId,
    altitudeM: opts?.altitudeM,
    headingDeg: opts?.headingDeg,
    issuedAtMs: Date.now(),
    targetId,
  };
}

export function facilityForPhase(
  phase: TrafficAircraft["phase"],
): AtcFacility {
  switch (phase) {
    case "parked":
    case "boarding":
    case "pushback":
    case "engine_start":
    case "taxi_out":
    case "taxi_in":
    case "shutdown":
      return "ground";
    case "holding_short":
    case "lineup":
    case "takeoff":
    case "landing":
      return "tower";
    case "initial_climb":
      return "departure";
    case "approach":
      return "approach";
    case "cruise":
    case "descent":
    case "diverting":
    default:
      return "center";
  }
}
