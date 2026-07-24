/** Dry Earth — water-level simulation, visualization modes, future-ready hooks. */

export type DryEarthColorMode =
  | "hypsometric"
  | "satellite"
  | "terrain"
  | "wireframe";

export type DryEarthTerrainMode = "relief" | "bathymetry" | "combined";

/** Sea-level presets (meters relative to present MSL). */
export type SeaLevelPresetId =
  | "flood_extreme"
  | "flood_high"
  | "real"
  | "dry"
  | "ice_age"
  | "abyss"
  | "mariana";

export interface SeaLevelPreset {
  id: SeaLevelPresetId;
  label: string;
  meters: number;
  description: string;
}

export interface GeologicalLayerState {
  continents: boolean;
  tectonicPlates: boolean;
  volcanoes: boolean;
  earthquakes: boolean;
  faultLines: boolean;
  oceanTrenches: boolean;
  mountainRanges: boolean;
  riverBasins: boolean;
}

export interface MeasureSample {
  lat: number;
  lng: number;
  elevationM: number;
  depthM: number;
  waterDepthM: number;
  slopeDeg: number;
  terrainType: string;
  distanceToSeaM: number;
  seaLevelM: number;
  country?: string | null;
  region?: string | null;
  biome?: string | null;
  landCover?: string | null;
  avgTempC?: number | null;
  population?: number | null;
  sampledAt: number;
}

export interface ProfilePoint {
  lat: number;
  lng: number;
  elevationM: number;
  distanceM: number;
}

export interface TerrainProfile {
  points: ProfilePoint[];
  highestM: number;
  lowestM: number;
  averageM: number;
  distanceM: number;
  meanSlopeDeg: number;
}

export interface DryEarthState {
  /** Master enable — drains/floods when on. */
  enabled: boolean;
  /** Target sea level (meters). User/slider sets this. */
  targetSeaLevelM: number;
  /** Display sea level — smoothly lerped toward target. */
  displaySeaLevelM: number;
  colorMode: DryEarthColorMode;
  terrainMode: DryEarthTerrainMode;
  showLabels: boolean;
  showLegend: boolean;
  measureMode: boolean;
  crossSectionMode: boolean;
  geological: GeologicalLayerState;
  measureSample: MeasureSample | null;
  profile: TerrainProfile | null;
  profileDraft: Array<{ lat: number; lng: number }>;
  /** Future: historical / climate scenarios without API changes. */
  scenarioId: string | null;
}

export type DryEarthFeatureKind =
  | "trench"
  | "ridge"
  | "rise"
  | "shelf"
  | "basin"
  | "seamount"
  | "volcano"
  | "peak"
  | "range"
  | "desert"
  | "valley"
  | "river"
  | "lake"
  | "plain";

export interface DryEarthFeature {
  id: string;
  name: string;
  kind: DryEarthFeatureKind;
  lat: number;
  lng: number;
  /** Typical elevation or depth (m). Negative = bathymetry. */
  elevM: number;
  /** Min zoom level (0–7) before label appears. */
  minZoom: number;
  /** Prefer showing when sea level is below this (m). */
  revealBelowM?: number;
  /** Prefer showing when sea level is above this (m). */
  revealAboveM?: number;
}
