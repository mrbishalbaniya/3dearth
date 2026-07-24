import type { CameraMode } from "../../game/Types";
import type { CockpitSeat } from "../types";

/**
 * Eye positions in aircraft body frame (meters).
 * Nose = −Z / +fwd in camera controller; matches CockpitInterior layout.
 */
export const SEAT_OFFSETS: Record<
  CockpitSeat,
  { fwd: number; right: number; up: number; lookFwd: number }
> = {
  // Eyes behind glare shield, looking through windshield
  captain: { fwd: 0.35, right: -0.4, up: 1.18, lookFwd: 12 },
  first_officer: { fwd: 0.35, right: 0.4, up: 1.18, lookFwd: 12 },
  jump: { fwd: -0.35, right: 0, up: 1.25, lookFwd: 10 },
  overhead: { fwd: 0.5, right: 0, up: 1.55, lookFwd: 3 },
  pedestal: { fwd: 0.15, right: 0, up: 0.95, lookFwd: 4 },
  instrument: { fwd: 0.55, right: -0.25, up: 1.05, lookFwd: 2.2 },
};

export function isCockpitCameraMode(mode: CameraMode): boolean {
  return (
    mode === "cockpit" ||
    mode === "cockpit_fo" ||
    mode === "cockpit_jump" ||
    mode === "cockpit_overhead" ||
    mode === "cockpit_pedestal" ||
    mode === "instrument"
  );
}

export function seatFromCameraMode(mode: CameraMode): CockpitSeat | null {
  switch (mode) {
    case "cockpit":
      return "captain";
    case "cockpit_fo":
      return "first_officer";
    case "cockpit_jump":
      return "jump";
    case "cockpit_overhead":
      return "overhead";
    case "cockpit_pedestal":
      return "pedestal";
    case "instrument":
      return "instrument";
    default:
      return null;
  }
}

export function cameraModeFromSeat(seat: CockpitSeat): CameraMode {
  switch (seat) {
    case "captain":
      return "cockpit";
    case "first_officer":
      return "cockpit_fo";
    case "jump":
      return "cockpit_jump";
    case "overhead":
      return "cockpit_overhead";
    case "pedestal":
      return "cockpit_pedestal";
    case "instrument":
      return "instrument";
  }
}
