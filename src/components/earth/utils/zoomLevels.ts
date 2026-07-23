import type { ZoomLevelId } from "../types";

/** Mean Earth radius in meters. */
export const EARTH_RADIUS_M = 6_371_000;

/** Scene unit ↔ meters (scene Earth radius = 1). */
export const METERS_PER_UNIT = EARTH_RADIUS_M;

export interface ZoomLevelDef {
  id: ZoomLevelId;
  name: string;
  /** Inclusive max altitude (meters AGL). */
  maxAltitudeM: number;
  /** Inclusive min altitude (meters AGL). */
  minAltitudeM: number;
  description: string;
  tileZoom: number;
  showStars: boolean;
  showAtmosphere: boolean;
  showClouds: boolean;
  showBorders: boolean;
  showGlobeTexture: boolean;
  showTiles: boolean;
  showLabels: boolean;
  labelKinds: Array<"continent" | "country" | "province" | "city" | "street" | "building">;
  showBuildings: boolean;
  showTerrain: boolean;
  showRoads: boolean;
  enablePan: boolean;
  cloudOpacity: number;
  atmosphereOpacity: number;
  borderOpacity: number;
  tileOpacity: number;
  globeOpacity: number;
}

/**
 * Zoom ladder — altitudes in meters above surface.
 * Camera distance (scene) ≈ 1 + altitudeM / EARTH_RADIUS_M when orbiting surface.
 */
export const ZOOM_LEVELS: ZoomLevelDef[] = [
  {
    id: 0,
    name: "Deep Space",
    maxAltitudeM: 80_000_000,
    minAltitudeM: 20_000_000,
    description: "Entire Earth · stars · Milky Way",
    tileZoom: 0,
    showStars: true,
    showAtmosphere: true,
    showClouds: true,
    showBorders: false,
    showGlobeTexture: true,
    showTiles: false,
    showLabels: false,
    labelKinds: [],
    showBuildings: false,
    showTerrain: false,
    showRoads: false,
    enablePan: false,
    cloudOpacity: 0.55,
    atmosphereOpacity: 1,
    borderOpacity: 0,
    tileOpacity: 0,
    globeOpacity: 1,
  },
  {
    id: 1,
    name: "Planet",
    maxAltitudeM: 20_000_000,
    minAltitudeM: 4_000_000,
    description: "Globe fills frame · clouds · atmosphere",
    tileZoom: 2,
    showStars: true,
    showAtmosphere: true,
    showClouds: true,
    showBorders: true,
    showGlobeTexture: true,
    showTiles: false,
    showLabels: true,
    labelKinds: ["continent"],
    showBuildings: false,
    showTerrain: false,
    showRoads: false,
    enablePan: false,
    cloudOpacity: 0.5,
    atmosphereOpacity: 1,
    borderOpacity: 0.45,
    tileOpacity: 0,
    globeOpacity: 1,
  },
  {
    id: 2,
    name: "Continent",
    maxAltitudeM: 4_000_000,
    minAltitudeM: 800_000,
    description: "Continents · mountains · country names",
    tileZoom: 4,
    showStars: true,
    showAtmosphere: true,
    showClouds: true,
    showBorders: true,
    showGlobeTexture: true,
    showTiles: false,
    showLabels: true,
    labelKinds: ["continent", "country"],
    showBuildings: false,
    showTerrain: false,
    showRoads: false,
    enablePan: false,
    cloudOpacity: 0.35,
    atmosphereOpacity: 0.85,
    borderOpacity: 0.65,
    tileOpacity: 0,
    globeOpacity: 1,
  },
  {
    id: 3,
    name: "Country",
    maxAltitudeM: 800_000,
    minAltitudeM: 80_000,
    description: "Cities · rivers · terrain detail",
    tileZoom: 9,
    showStars: false,
    showAtmosphere: true,
    showClouds: false,
    showBorders: true,
    showGlobeTexture: true,
    showTiles: true,
    showLabels: true,
    labelKinds: ["country", "city"],
    showBuildings: false,
    showTerrain: true,
    showRoads: true,
    enablePan: true,
    cloudOpacity: 0,
    atmosphereOpacity: 0.45,
    borderOpacity: 0.75,
    tileOpacity: 0.85,
    globeOpacity: 0.7,
  },
  {
    id: 4,
    name: "Province",
    maxAltitudeM: 80_000,
    minAltitudeM: 15_000,
    description: "Highways · forests · provinces",
    tileZoom: 10,
    showStars: false,
    showAtmosphere: false,
    showClouds: false,
    showBorders: true,
    showGlobeTexture: false,
    showTiles: true,
    showLabels: true,
    labelKinds: ["province", "city"],
    showBuildings: false,
    showTerrain: true,
    showRoads: true,
    enablePan: true,
    cloudOpacity: 0,
    atmosphereOpacity: 0.15,
    borderOpacity: 0.4,
    tileOpacity: 1,
    globeOpacity: 0.25,
  },
  {
    id: 5,
    name: "City",
    maxAltitudeM: 15_000,
    minAltitudeM: 1_500,
    description: "Streets · parks · buildings",
    tileZoom: 14,
    showStars: false,
    showAtmosphere: false,
    showClouds: false,
    showBorders: false,
    showGlobeTexture: false,
    showTiles: true,
    showLabels: true,
    labelKinds: ["city", "street"],
    showBuildings: true,
    showTerrain: true,
    showRoads: true,
    enablePan: true,
    cloudOpacity: 0,
    atmosphereOpacity: 0,
    borderOpacity: 0,
    tileOpacity: 1,
    globeOpacity: 0,
  },
  {
    id: 6,
    name: "Neighborhood",
    maxAltitudeM: 1_500,
    minAltitudeM: 250,
    description: "Houses · paths · detail roads",
    tileZoom: 16,
    showStars: false,
    showAtmosphere: false,
    showClouds: false,
    showBorders: false,
    showGlobeTexture: false,
    showTiles: true,
    showLabels: true,
    labelKinds: ["street", "building"],
    showBuildings: true,
    showTerrain: true,
    showRoads: true,
    enablePan: true,
    cloudOpacity: 0,
    atmosphereOpacity: 0,
    borderOpacity: 0,
    tileOpacity: 1,
    globeOpacity: 0,
  },
  {
    id: 7,
    name: "Street",
    maxAltitudeM: 250,
    minAltitudeM: 160,
    description: "Maximum detail · parcels · elevation",
    tileZoom: 17,
    showStars: false,
    showAtmosphere: false,
    showClouds: false,
    showBorders: false,
    showGlobeTexture: false,
    showTiles: true,
    showLabels: true,
    labelKinds: ["street", "building"],
    showBuildings: true,
    showTerrain: true,
    showRoads: true,
    enablePan: true,
    cloudOpacity: 0,
    atmosphereOpacity: 0,
    borderOpacity: 0,
    tileOpacity: 1,
    globeOpacity: 0,
  },
];

/** Surface-mode threshold — switch to local ENU frame (meters). */
export const SURFACE_MODE_ALTITUDE_M = 25_000;

export function altitudeToZoomLevel(altitudeM: number): ZoomLevelDef {
  const clamped = Math.max(160, altitudeM);
  for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
    const level = ZOOM_LEVELS[i];
    if (clamped <= level.maxAltitudeM) return level;
  }
  return ZOOM_LEVELS[0];
}

export function altitudeMToSceneDistance(altitudeM: number): number {
  return 1 + altitudeM / EARTH_RADIUS_M;
}

export function sceneDistanceToAltitudeM(distanceFromOrigin: number): number {
  return Math.max(0, (distanceFromOrigin - 1) * EARTH_RADIUS_M);
}

/** Orbit distance from a surface focus point (focus ≈ on sphere). */
export function altitudeMToOrbitDistance(altitudeM: number): number {
  return Math.max(altitudeM / EARTH_RADIUS_M, 160 / EARTH_RADIUS_M);
}

export function orbitDistanceToAltitudeM(orbitDistance: number): number {
  return orbitDistance * EARTH_RADIUS_M;
}

export function formatAltitude(altitudeM: number): string {
  if (altitudeM >= 1_000_000) return `${(altitudeM / 1_000_000).toFixed(2)} Mm`;
  if (altitudeM >= 1000) return `${(altitudeM / 1000).toFixed(1)} km`;
  return `${Math.round(altitudeM)} m`;
}

/** Adaptive wheel zoom factor — slower when close, gentler overall for smooth dolly. */
export function zoomSensitivity(altitudeM: number): number {
  if (altitudeM > 5_000_000) return 0.072;
  if (altitudeM > 500_000) return 0.058;
  if (altitudeM > 50_000) return 0.048;
  if (altitudeM > 5_000) return 0.04;
  if (altitudeM > 500) return 0.034;
  return 0.03;
}

/** Mercator tile Z from altitude — biased sharp so country views aren't soft blobs. */
export function altitudeToTileZoom(altitudeM: number): number {
  const level = altitudeToZoomLevel(altitudeM);
  const t =
    1 -
    MathUtilsClamp(
      (altitudeM - level.minAltitudeM) /
        Math.max(1, level.maxAltitudeM - level.minAltitudeM),
      0,
      1,
    );
  // Stronger within-band boost + slight global bias for sharper streaming
  return MathUtilsClamp(level.tileZoom + t * 2.2 + 0.75, 0, 18);
}

function MathUtilsClamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
