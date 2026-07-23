/** Shared GIS layer metadata and OSM feature types. */

import type { GisLayerId, GisLayerState } from "../types";

export type { GisLayerId, GisLayerState };

export interface GisLayerMeta {
  id: GisLayerId;
  label: string;
  description: string;
  minZoom: number;
  group: "base" | "physical" | "infra" | "admin" | "poi";
  source: string;
}

export const GIS_LAYER_META: GisLayerMeta[] = [
  { id: "satellite", label: "Satellite", description: "ESRI World Imagery (free)", minZoom: 2, group: "base", source: "ESRI" },
  { id: "terrain", label: "Terrain", description: "SRTM via Mapzen Terrarium DEM", minZoom: 3, group: "physical", source: "SRTM" },
  { id: "elevation", label: "Elevation tint", description: "DEM elevation coloring", minZoom: 3, group: "physical", source: "SRTM" },
  { id: "landCover", label: "Land Cover", description: "ESA WorldCover 2021 + OSM", minZoom: 2, group: "physical", source: "ESA" },
  { id: "forest", label: "Forest", description: "OSM woodland canopy", minZoom: 5, group: "physical", source: "OSM" },
  { id: "water", label: "Water", description: "Oceans · lakes · reflections", minZoom: 1, group: "physical", source: "NE+OSM" },
  { id: "rivers", label: "Rivers", description: "Natural Earth + OSM waterways", minZoom: 1, group: "physical", source: "NE+OSM" },
  { id: "roads", label: "Roads", description: "OSM highways · rail · runways", minZoom: 5, group: "infra", source: "OSM" },
  { id: "buildings", label: "Buildings", description: "OSM footprints + heights", minZoom: 5, group: "infra", source: "OSM" },
  { id: "borders", label: "Borders", description: "Natural Earth admin lines", minZoom: 1, group: "admin", source: "Natural Earth" },
  { id: "parks", label: "Parks", description: "Protected areas", minZoom: 2, group: "admin", source: "Natural Earth" },
  { id: "labels", label: "Labels", description: "Progressive place names", minZoom: 1, group: "admin", source: "NE+OSM" },
  { id: "pois", label: "POIs", description: "OSM amenities (clustered)", minZoom: 6, group: "poi", source: "OSM" },
  { id: "natural", label: "Natural", description: "Peaks · volcanoes · features", minZoom: 3, group: "poi", source: "OSM+NE" },
  { id: "weather", label: "Weather", description: "Open-Meteo conditions", minZoom: 0, group: "base", source: "Open-Meteo" },
  { id: "nightLights", label: "Night Lights", description: "City lights on night side", minZoom: 0, group: "base", source: "NASA" },
];

export const DEFAULT_GIS_LAYERS: GisLayerState = {
  satellite: true,
  terrain: true,
  elevation: false,
  roads: true,
  buildings: true,
  borders: true,
  water: true,
  rivers: true,
  forest: true,
  landCover: false,
  labels: true,
  pois: true,
  natural: true,
  weather: false,
  nightLights: true,
  parks: true,
};

export type LandCoverClass =
  | "forest"
  | "jungle"
  | "grassland"
  | "desert"
  | "snow"
  | "ice"
  | "wetlands"
  | "farmland"
  | "shrubland"
  | "bare_rock"
  | "sand"
  | "urban"
  | "water";

/** ESA WorldCover class colors (approx). */
export const LAND_COVER_COLORS: Record<LandCoverClass, string> = {
  forest: "#006400",
  jungle: "#0d4f2b",
  grassland: "#ffbb22",
  desert: "#c9a66b",
  snow: "#f0f0f0",
  ice: "#cfe8f7",
  wetlands: "#0096a0",
  farmland: "#ffff4c",
  shrubland: "#fae6a0",
  bare_rock: "#b4b4b4",
  sand: "#e0c98a",
  urban: "#fa0000",
  water: "#0064c8",
};

export interface OsmWayFeature {
  id: string;
  kind: string;
  name?: string;
  coords: Array<[number, number]>;
  tags: Record<string, string>;
}

export interface OsmNodeFeature {
  id: string;
  kind: string;
  name?: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

export interface OsmPolygonFeature {
  id: string;
  kind: LandCoverClass | string;
  name?: string;
  rings: Array<Array<[number, number]>>;
  tags: Record<string, string>;
}

export interface WeatherSnapshot {
  condition?: import("../weather/types").WeatherCondition;
  label: string;
  weatherCode: number;
  temperatureC: number;
  feelsLikeC?: number | null;
  humidity?: number | null;
  pressureHpa?: number | null;
  cloudCover: number;
  windSpeedKmh: number;
  windDirectionDeg?: number;
  precipitationMm: number;
  precipitationProbability?: number | null;
  visibilityKm?: number | null;
  sunriseIso?: string | null;
  sunsetIso?: string | null;
  isDay?: boolean | null;
  lat?: number;
  lng?: number;
  fetchedAt: number;
  provider?: string;
}
