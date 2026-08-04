import type { Airport } from "../../Types";
import type { AirportTrafficPlan, AirportOperationKind } from "./types";

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export class FlightScheduler {
  private nextId = 1;

  buildPlan(
    airport: Airport,
    dest: Airport,
    kind: AirportOperationKind,
    category: AirportTrafficPlan["category"],
    scheduledAtMs: number,
  ): AirportTrafficPlan {
    return {
      id: `plan-${this.nextId++}`,
      airportIcao: airport.icao,
      aircraftId: `ai-${this.nextId}`,
      callsign: `${airport.icao}-${Math.floor(rand(this.nextId) * 900) + 100}`,
      category,
      kind,
      depIcao: airport.icao,
      destIcao: dest.icao,
      runwayId: airport.runways[0]?.id ?? null,
      gateId: airport.runways[0] ? null : undefined,
      scheduledAtMs,
    };
  }
}
