import type { TrafficAircraft, TrafficAnalytics } from "../types";
import { TrafficSpatialIndex } from "../spatial/TrafficSpatialIndex";

export class TrafficManager {
  readonly aircraft = new Map<string, TrafficAircraft>();
  readonly index = new TrafficSpatialIndex();

  analytics: TrafficAnalytics = {
    flightsCompleted: 0,
    goArounds: 0,
    conflictsResolved: 0,
    avgTaxiSec: 90,
    activeFull: 0,
    activeRegional: 0,
    activeGlobal: 0,
  };

  add(aircraft: TrafficAircraft): void {
    this.aircraft.set(aircraft.id, aircraft);
    this.index.upsert(aircraft.id, aircraft.lat, aircraft.lng);
  }

  update(aircraft: TrafficAircraft): void {
    this.aircraft.set(aircraft.id, aircraft);
    this.index.upsert(aircraft.id, aircraft.lat, aircraft.lng);
  }

  remove(id: string): void {
    this.aircraft.delete(id);
    this.index.remove(id);
  }

  clear(): void {
    this.aircraft.clear();
    this.index.clear();
  }

  list(): TrafficAircraft[] {
    return Array.from(this.aircraft.values());
  }
}
