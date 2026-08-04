import type { AirportLayout } from "../../../earth/airport/types";
import type { FlightCategory } from "../types";

export class ParkingManager {
  private readonly parking = new Map<string, { aircraftId: string | null; category: FlightCategory | null }>();

  constructor(layout: AirportLayout) {
    for (const stand of layout.stands) {
      this.parking.set(stand.id, { aircraftId: null, category: null });
    }
  }

  assign(standId: string, aircraftId: string, category: FlightCategory): boolean {
    const stand = this.parking.get(standId);
    if (!stand || stand.aircraftId) return false;
    stand.aircraftId = aircraftId;
    stand.category = category;
    return true;
  }

  release(standId: string, aircraftId?: string): void {
    const stand = this.parking.get(standId);
    if (!stand) return;
    if (aircraftId && stand.aircraftId !== aircraftId) return;
    stand.aircraftId = null;
    stand.category = null;
  }

  occupancyCount(): number {
    let count = 0;
    for (const stand of this.parking.values()) {
      if (stand.aircraftId) count += 1;
    }
    return count;
  }
}
