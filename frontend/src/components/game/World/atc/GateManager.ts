import type { AirportLayout } from "../../../earth/airport/types";
import type { FlightCategory } from "../types";
import type { GateAssignment } from "./types";

export class GateManager {
  private readonly gates: GateAssignment[];

  constructor(layout: AirportLayout) {
    this.gates = layout.stands.map((stand) => ({
      airportIcao: layout.icao,
      gateId: stand.id,
      aircraftId: null,
      category: null,
    }));
  }

  assign(category: FlightCategory, aircraftId: string): GateAssignment | null {
    const preferred = this.gates.find((gate) => gate.aircraftId === null);
    if (!preferred) return null;
    preferred.aircraftId = aircraftId;
    preferred.category = category;
    return preferred;
  }

  release(gateId: string, aircraftId?: string): void {
    const gate = this.gates.find((entry) => entry.gateId === gateId);
    if (!gate) return;
    if (aircraftId && gate.aircraftId !== aircraftId) return;
    gate.aircraftId = null;
    gate.category = null;
  }

  getAssignments(): GateAssignment[] {
    return this.gates.map((gate) => ({ ...gate }));
  }
}
