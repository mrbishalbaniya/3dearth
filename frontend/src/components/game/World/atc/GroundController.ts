import type { AirportOpsState, TrafficAircraft } from "../types";
import { issueClearance } from "../atc/AtcService";
import { ATCRadio } from "./ATCRadio";
import { RunwayManager } from "./RunwayManager";

export class GroundController {
  constructor(
    private readonly runwayManager: RunwayManager,
    private readonly radio: ATCRadio,
  ) {}

  step(ac: TrafficAircraft, ops: AirportOpsState | undefined, dt: number): TrafficAircraft {
    const next = { ...ac, phaseAgeSec: ac.phaseAgeSec + dt };
    if (!ops) return next;

    switch (ac.phase) {
      case "parked":
        if (next.phaseAgeSec > 6) {
          next.phase = "boarding";
          next.phaseAgeSec = 0;
        }
        break;
      case "boarding":
        if (next.phaseAgeSec > 18) {
          next.phase = "pushback";
          next.phaseAgeSec = 0;
          next.clearance = "pushback";
          this.radio.push(issueClearance("ground", "pushback", ac.id, ac.callsign));
        }
        break;
      case "pushback":
        if (next.phaseAgeSec > 16) {
          next.phase = "engine_start";
          next.phaseAgeSec = 0;
        }
        break;
      case "engine_start":
        if (next.phaseAgeSec > 12) {
          next.phase = "taxi_out";
          next.phaseAgeSec = 0;
          next.clearance = "taxi";
          this.radio.push(issueClearance("ground", "taxi", ac.id, ac.callsign, { runwayId: ops.activeRunwayId }));
        }
        break;
      case "taxi_out":
        if (next.phaseAgeSec > 30) {
          next.phase = "holding_short";
          next.phaseAgeSec = 0;
          next.clearance = "hold_short";
          this.radio.push(issueClearance("ground", "hold_short", ac.id, ac.callsign, { runwayId: ops.activeRunwayId }));
        }
        break;
      case "taxi_in":
        if (next.phaseAgeSec > 20) {
          next.phase = "shutdown";
          next.phaseAgeSec = 0;
          next.tasMs = 0;
        }
        break;
      default:
        void this.runwayManager;
        break;
    }
    return next;
  }
}
