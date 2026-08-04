import type { AirportOpsState, TrafficAircraft } from "../types";
import { issueClearance } from "../atc/AtcService";
import { ATCRadio } from "./ATCRadio";
import { RunwayManager } from "./RunwayManager";

export class TowerController {
  constructor(
    private readonly runwayManager: RunwayManager,
    private readonly radio: ATCRadio,
  ) {}

  step(ac: TrafficAircraft, ops: AirportOpsState | undefined, dt: number): TrafficAircraft {
    if (!ops) return ac;
    const next = { ...ac, phaseAgeSec: ac.phaseAgeSec + dt };

    switch (ac.phase) {
      case "holding_short": {
        const slot = this.runwayManager.requestDepartureSlot(ops, next);
        next.runwayId = slot.runwayId;
        if (slot.ok && next.phaseAgeSec > 1) {
          next.phase = "lineup";
          next.phaseAgeSec = 0;
          next.clearance = "lineup_wait";
          this.radio.push(issueClearance("tower", "lineup_wait", ac.id, ac.callsign, { runwayId: slot.runwayId }));
        }
        break;
      }
      case "lineup":
        if (next.phaseAgeSec > 10) {
          next.phase = "takeoff";
          next.phaseAgeSec = 0;
          next.clearance = "takeoff";
          this.radio.push(issueClearance("tower", "takeoff", ac.id, ac.callsign, { runwayId: next.runwayId ?? undefined }));
        }
        break;
      case "landing":
        if (next.phaseAgeSec > 18) {
          if (next.runwayId) this.runwayManager.releaseRunway(ops, next.runwayId, next.id);
          next.phase = "taxi_in";
          next.phaseAgeSec = 0;
          next.clearance = "taxi_in";
          this.radio.push(issueClearance("tower", "taxi_in", ac.id, ac.callsign, { runwayId: next.runwayId ?? undefined }));
        }
        break;
      default:
        break;
    }

    return next;
  }
}
