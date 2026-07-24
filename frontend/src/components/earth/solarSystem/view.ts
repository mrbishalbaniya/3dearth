/**
 * Shared gate for solar-system overview / planet tour UI.
 * Matches SolarSystem.tsx visibility.
 */
import type { PlanetId } from "./ephemeris";

export type SolarTourBodyId = PlanetId | "sun" | "overview";

export function isSolarSystemView(state: {
  layers: { stars: boolean };
  zoomLevel: number;
  altitudeM: number;
}): boolean {
  return (
    state.layers.stars &&
    state.zoomLevel <= 2 &&
    state.altitudeM > 1_200_000
  );
}

/** Live world positions written by SolarSystem (read in CameraController). */
export const solarBodyWorldPos: Record<string, { x: number; y: number; z: number }> =
  Object.create(null);

export function setSolarBodyWorldPos(
  id: string,
  x: number,
  y: number,
  z: number,
): void {
  const cur = solarBodyWorldPos[id];
  if (cur) {
    cur.x = x;
    cur.y = y;
    cur.z = z;
  } else {
    solarBodyWorldPos[id] = { x, y, z };
  }
}
