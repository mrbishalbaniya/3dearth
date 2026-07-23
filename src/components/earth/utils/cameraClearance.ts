import { EARTH_RADIUS_M } from "./zoomLevels";

/** Minimum eye height above local ground (meters AGL). Street zoom ≤250 m. */
export const MIN_CAMERA_AGL_M = 160;

/** Tiny pad when very low — keep Street (≤250 m AGL) reachable. */
export const BUILDING_CLEARANCE_M = 20;

/**
 * Minimum camera distance from Earth center (scene units).
 * Uses DEM height with capped exaggeration so visual terrain doesn’t
 * permanently lock the camera above Street altitude.
 */
export function minCameraRadius(
  elevM: number | null | undefined,
  terrainExaggeration: number,
  opts?: { lowAltitude?: boolean },
): number {
  const elev = Math.max(0, elevM ?? 0);
  // Cap clearance exaggeration — full UI exaggeration was blocking Street zoom
  const ex = Math.min(1.15, Math.max(0.5, terrainExaggeration));
  const groundR = 1 + (elev * ex) / EARTH_RADIUS_M;
  const agl =
    MIN_CAMERA_AGL_M + (opts?.lowAltitude ? BUILDING_CLEARANCE_M : 0);
  return groundR + agl / EARTH_RADIUS_M;
}

/**
 * OrbitControls minDistance (from focus target).
 * IMPORTANT: when the target is mid-lerp (length 0.5–0.99), never use
 * `minRadius - targetLength` — that spikes to hundreds of km and freezes zoom.
 */
export function minOrbitDistance(
  targetLength: number,
  minRadius: number,
): number {
  const streetOrbit = MIN_CAMERA_AGL_M / EARTH_RADIUS_M;

  // Focus still at planet center — keep camera outside the globe shell
  if (targetLength < 0.5) {
    return Math.max(minRadius, 1 + streetOrbit);
  }

  // Focus is (or should be) on the unit sphere — orbit = AGL above surface
  const surfaceOrbit = Math.max(streetOrbit, minRadius - 1);
  return surfaceOrbit;
}

/** Height above local ground (meters), for zoom-level / HUD. */
export function altitudeAglM(
  cameraRadius: number,
  elevM: number | null | undefined,
  terrainExaggeration: number,
): number {
  const elev = Math.max(0, elevM ?? 0);
  const ex = Math.min(1.15, Math.max(0.5, terrainExaggeration));
  const groundR = 1 + (elev * ex) / EARTH_RADIUS_M;
  return Math.max(0, (cameraRadius - groundR) * EARTH_RADIUS_M);
}
