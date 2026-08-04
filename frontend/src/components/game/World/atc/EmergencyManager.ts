import type { TrafficAircraft } from "../types";

export class EmergencyManager {
  shouldGoAround(aircraft: TrafficAircraft, visibilityFactor: number, runwayOccupied: boolean): boolean {
    return aircraft.phase === "approach" && (visibilityFactor < 0.2 || runwayOccupied);
  }

  shouldDivert(aircraft: TrafficAircraft): boolean {
    return aircraft.emergency && aircraft.phase !== "landing" && aircraft.phase !== "approach";
  }

  needsPriority(aircraft: TrafficAircraft): boolean {
    return aircraft.emergency || aircraft.category === "emergency";
  }
}
