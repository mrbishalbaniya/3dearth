import type { AirportOpsState, TrafficAircraft } from "../types";
import { issueClearance } from "../atc/AtcService";
import { ATCRadio } from "./ATCRadio";
import { RunwayManager } from "./RunwayManager";

export class DepartureController {
  constructor(
    private readonly runwayManager: RunwayManager,
    private readonly radio: ATCRadio,
  ) {}

  step(ac: TrafficAircraft, ops: AirportOpsState | undefined, dt: number): TrafficAircraft {
    if (!ops) return ac;
    const next = { ...ac, phaseAgeSec: ac.phaseAgeSec + dt };

    if (ac.phase === "takeoff") {
      if (next.phaseAgeSec > 9) {
        next.phase = "initial_climb";
        next.phaseAgeSec = 0;
        next.clearance = "climb";
        this.radio.push(issueClearance("tower", "climb", ac.id, ac.callsign, { runwayId: next.runwayId ?? ops.activeRunwayId, altitudeM: next.cruiseAltM }));
      }
      return next;
    }

    if (ac.phase === "initial_climb") {
      if (next.phaseAgeSec > 12) {
        next.phase = "cruise";
        next.phaseAgeSec = 0;
        next.clearance = "cruise";
      }
      return next;
    }

    if (ac.phase === "cruise" && next.phaseAgeSec > 30) {
      next.phase = "descent";
      next.phaseAgeSec = 0;
      next.clearance = "descend";
      this.radio.push(issueClearance("departure", "descend", ac.id, ac.callsign, { altitudeM: next.cruiseAltM * 0.6 }));
    }

    void this.runwayManager;
    return next;
  }
}
