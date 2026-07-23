import type { Vector3 } from "three";

export type MarkerStatus = "active" | "idle" | "alert" | "offline";

/** Google Earth–style zoom ladder. */
export type ZoomLevelId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface EarthMarker {
  id: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  status?: MarkerStatus;
  avatarUrl?: string;
  color?: string;
  altitude?: number;
}

export interface FlyToTarget {
  lat: number;
  lng: number;
  altitude?: number;
  altitudeM?: number;
  duration?: number;
}

export type GisLayerId =
  | "satellite"
  | "terrain"
  | "elevation"
  | "roads"
  | "buildings"
  | "borders"
  | "water"
  | "rivers"
  | "forest"
  | "landCover"
  | "labels"
  | "pois"
  | "natural"
  | "weather"
  | "nightLights"
  | "parks";

export interface GisLayerState {
  satellite: boolean;
  terrain: boolean;
  elevation: boolean;
  roads: boolean;
  buildings: boolean;
  borders: boolean;
  water: boolean;
  rivers: boolean;
  forest: boolean;
  landCover: boolean;
  labels: boolean;
  pois: boolean;
  natural: boolean;
  weather: boolean;
  nightLights: boolean;
  parks: boolean;
}

export type BaseMapMode = "standard" | "satellite" | "terrain";


export interface EarthLayerToggles {
  atmosphere: boolean;
  clouds: boolean;
  borders: boolean;
  stars: boolean;
  dayNight: boolean;
  markers: boolean;
  tiles: boolean;
  labels: boolean;
  buildings: boolean;
  terrain: boolean;
}


export interface CameraState {
  distance: number;
  azimuth: number;
  polar: number;
  target: [number, number, number];
}

export interface PointerCoords {
  lat: number | null;
  lng: number | null;
  screenX: number;
  screenY: number;
}

export interface CameraTelemetry {
  zoomLevel: ZoomLevelId;
  zoomLevelName: string;
  altitudeM: number;
  heading: number;
  pitch: number;
  focusLat: number;
  focusLng: number;
  surfaceMode: boolean;
  tilesLoading: number;
  tilesLoaded: number;
}

export interface EarthQualityProfile {
  id: "ultra" | "high" | "medium" | "low";
  dpr: [number, number];
  earthSegments: number;
  cloudSegments: number;
  atmosphereSegments: number;
  starCount: number;
  enableBloom: boolean;
  enableShadows: boolean;
  anisotropicFiltering: number;
  textureMaxSize: number;
  maxTileRadius: number;
  maxBuildings: number;
}

export interface GeoFeatureProperties {
  name?: string;
  NAME?: string;
  ADMIN?: string;
  ISO_A2?: string;
  ISO_A3?: string;
}

export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface GeoJsonFeature {
  type: "Feature";
  properties: GeoFeatureProperties;
  geometry: GeoJsonGeometry;
}

export interface GeoJsonCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface SunDirection {
  direction: Vector3;
  intensity: number;
  color: string;
  elevation: number;
}

export interface EarthSceneApi {
  flyTo: (target: FlyToTarget) => void;
  flyToMarker: (id: string) => void;
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setFullscreen: (value: boolean) => void;
}

export interface BuildingFeature {
  id: string;
  height: number;
  color: string;
  lat: number;
  lng: number;
  width: number;
  depth: number;
  name?: string;
}
