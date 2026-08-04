import { EARTH_RADIUS_M } from "./zoomLevels";

/** Minimum eye height above local ground (meters AGL). */
export const MIN_CAMERA_AGL_M = 10;

/** Minimum altitude for game mode to prevent memory crashes (meters AGL). */
export const MIN_GAME_MODE_ALTITUDE_M = 30_000;

/** Extra pad near buildings — kept low so 10 m zoom stays reachable. */
export const BUILDING_CLEARANCE_M = 0;

/**
 * Dry Earth mesh exaggeration at altitude — must match BathymetryLayer /
 * DryEarthSurface or the camera tunnels into opaque DEM (blank city zoom).
 */
export function dryEarthVisualExaggeration(
  altitudeM: number,
  terrainExaggeration: number,
): number {
  if (altitudeM > 5_000_000) return Math.max(terrainExaggeration, 36);
  if (altitudeM > 2_000_000) return Math.max(terrainExaggeration, 28);
  if (altitudeM > 800_000) return Math.max(terrainExaggeration, 20);
  if (altitudeM > 200_000) return Math.max(terrainExaggeration, 12);
  if (altitudeM > 80_000) return Math.max(terrainExaggeration, 6);
  if (altitudeM > 20_000) return Math.max(terrainExaggeration, 3);
  return Math.max(terrainExaggeration, 1.6);
}

/**
 * Minimum camera distance from Earth center (scene units).
 * Uses DEM height with capped exaggeration so visual terrain doesn’t
 * permanently lock the camera above Street altitude.
 */
export function minCameraRadius(
  elevM: number | null | undefined,
  terrainExaggeration: number,
  opts?: { lowAltitude?: boolean; dryEarth?: boolean; altitudeM?: number },
): number {
  const elev = Math.max(0, elevM ?? 0);
  // Cap clearance exaggeration — full UI exaggeration was blocking Street zoom
  // Dry Earth: match visible mesh height so we never sit inside DEM tiles
  const ex = opts?.dryEarth
    ? dryEarthVisualExaggeration(
        opts.altitudeM ?? 100_000,
        terrainExaggeration,
      )
    : Math.min(1.15, Math.max(0.5, terrainExaggeration));
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
  opts?: { dryEarth?: boolean; altitudeM?: number },
): number {
  const elev = Math.max(0, elevM ?? 0);
  const ex = opts?.dryEarth
    ? dryEarthVisualExaggeration(
        opts.altitudeM ?? 100_000,
        terrainExaggeration,
      )
    : Math.min(1.15, Math.max(0.5, terrainExaggeration));
  const groundR = 1 + (elev * ex) / EARTH_RADIUS_M;
  return Math.max(0, (cameraRadius - groundR) * EARTH_RADIUS_M);
}
