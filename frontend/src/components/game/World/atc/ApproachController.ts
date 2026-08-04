import type { AirportOpsState, TrafficAircraft } from "../types";
import { issueClearance } from "../atc/AtcService";
import { ATCRadio } from "./ATCRadio";
import { RunwayManager } from "./RunwayManager";

export class ApproachController {
  constructor(
    private readonly runwayManager: RunwayManager,
    private readonly radio: ATCRadio,
  ) {}

  step(ac: TrafficAircraft, ops: AirportOpsState | undefined, dt: number, visibility = 1): TrafficAircraft {
    if (!ops) return ac;
    const next = { ...ac, phaseAgeSec: ac.phaseAgeSec + dt };

    if (ac.phase === "descent") {
      if (next.phaseAgeSec > 12) {
        next.phase = "approach";
        next.phaseAgeSec = 0;
        next.clearance = "approach";
        this.radio.push(issueClearance("approach", "approach", ac.id, ac.callsign, { runwayId: ops.activeRunwayId }));
      }
      return next;
    }

    if (ac.phase === "approach") {
      const slot = this.runwayManager.requestArrivalSlot(ops, next);
      next.runwayId = slot.runwayId;
      if (!slot.ok || visibility < 0.15) {
        next.phase = "initial_climb";
        next.phaseAgeSec = 0;
        next.clearance = "go_around";
        this.radio.push(issueClearance("approach", "go_around", ac.id, ac.callsign, { runwayId: slot.runwayId }));
        return next;
      }
      if (next.phaseAgeSec > 15) {
        next.phase = "landing";
        next.phaseAgeSec = 0;
        next.clearance = "landing";
        this.radio.push(issueClearance("tower", "landing", ac.id, ac.callsign, { runwayId: slot.runwayId }));
      }
    }

    return next;
  }
}
