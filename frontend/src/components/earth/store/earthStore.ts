"use client";

import { create } from "zustand";
import { DEFAULT_MARKERS } from "../utils/constants";
import {
  DEFAULT_GIS_LAYERS,
  type GisLayerId,
  type GisLayerState,
} from "../gis/types";
import {
  DEFAULT_WEATHER_FX,
  DEFAULT_WEATHER_INTENSITIES,
  type DayPhase,
  type Season,
  type WeatherFxId,
  type WeatherFxState,
  type WeatherIntensities,
  type WeatherObservation,
} from "../weather/types";
import type {
  BaseMapMode,
  CameraTelemetry,
  EarthLayerToggles,
  EarthMarker,
  FlyToTarget,
  PointerCoords,
  ZoomLevelId,
} from "../types";
import type {
  DryEarthState,
  GeologicalLayerState,
  SeaLevelPresetId,
} from "../dryEarth/types";
import {
  REAL_SEA_LEVEL_M,
  SEA_LEVEL_MAX_M,
  SEA_LEVEL_MIN_M,
  SEA_LEVEL_PRESETS,
} from "../dryEarth/constants";
import type { SolarTourBodyId } from "../solarSystem/view";

export interface SolarLayerToggles {
  atmosphere: boolean;
  clouds: boolean;
  rings: boolean;
  moons: boolean;
  belts: boolean;
  labels: boolean;
}

const DEFAULT_SOLAR_LAYERS: SolarLayerToggles = {
  atmosphere: true,
  clouds: true,
  rings: true,
  moons: true,
  belts: true,
  labels: true,
};

const DEFAULT_GEOLOGICAL: GeologicalLayerState = {
  continents: true,
  tectonicPlates: false,
  volcanoes: true,
  earthquakes: false,
  faultLines: false,
  oceanTrenches: true,
  mountainRanges: true,
  riverBasins: true,
};

const DEFAULT_DRY_EARTH: DryEarthState = {
  enabled: false,
  targetSeaLevelM: REAL_SEA_LEVEL_M,
  displaySeaLevelM: REAL_SEA_LEVEL_M,
  colorMode: "hypsometric",
  terrainMode: "combined",
  showLabels: false,
  showLegend: true,
  measureMode: false,
  crossSectionMode: false,
  geological: { ...DEFAULT_GEOLOGICAL },
  measureSample: null,
  profile: null,
  profileDraft: [],
  scenarioId: null,
};

interface EarthStore {
  layers: EarthLayerToggles;
  gisLayers: GisLayerState;
  dryEarth: DryEarthState;
  baseMapMode: BaseMapMode;
  weather: WeatherObservation | null;
  weatherIntensities: WeatherIntensities;
  weatherFx: WeatherFxState;
  season: Season;
  dayPhase: DayPhase;
  markers: EarthMarker[];
  selectedMarkerId: string | null;
  hoveredMarkerId: string | null;
  hoveredCountry: string | null;
  selectedCountry: string | null;
  isInteracting: boolean;
  idleRotation: boolean;
  flyToTarget: FlyToTarget | null;
  flyToNonce: number;
  cameraDistance: number;
  pointerCoords: PointerCoords;
  compassHeading: number;
  cameraPitch: number;
  altitudeM: number;
  zoomLevel: ZoomLevelId;
  zoomLevelName: string;
  focusLat: number;
  focusLng: number;
  surfaceMode: boolean;
  tilesLoading: number;
  tilesLoaded: number;
  terrainExaggeration: number;
  exposure: number;
  northLock: boolean;
  debugMode: boolean;
  isFullscreen: boolean;
  fps: number;
  qualityId: "ultra" | "high" | "medium" | "low";
  reducedMotion: boolean;
  useRealSun: boolean;
  sunTimeOffsetHours: number;
  loadingProgress: number;
  isReady: boolean;
  resetCameraRequest: number;
  zoomRequest: number;
  zoomRequestDelta: number;
  /** Virtual gamepad sticks — left = move/pan, right = look/rotate (−1…1). */
  gamepad: {
    moveX: number;
    moveY: number;
    lookX: number;
    lookY: number;
  };
  /** Live device GPS — null until first fix. */
  userLocation: {
    lat: number;
    lng: number;
    accuracyM: number;
    heading: number | null;
    updatedAt: number;
  } | null;
  terrainEnabled: boolean;

  /** Deep-space planet tour focus (`overview` = system view). */
  selectedSolarBody: SolarTourBodyId;
  solarFocusNonce: number;
  solarLayers: SolarLayerToggles;

  setLayer: (key: keyof EarthLayerToggles, value: boolean) => void;
  toggleLayer: (key: keyof EarthLayerToggles) => void;
  setGisLayer: (key: GisLayerId, value: boolean) => void;
  toggleGisLayer: (key: GisLayerId) => void;
  setBaseMapMode: (mode: BaseMapMode) => void;
  setWeather: (weather: WeatherObservation | null) => void;
  setWeatherIntensities: (intensities: WeatherIntensities) => void;
  setWeatherFx: (key: WeatherFxId, value: boolean) => void;
  toggleWeatherFx: (key: WeatherFxId) => void;
  setSeason: (season: Season) => void;
  setDayPhase: (phase: DayPhase) => void;
  setMarkers: (markers: EarthMarker[]) => void;
  selectMarker: (id: string | null) => void;
  hoverMarker: (id: string | null) => void;
  setHoveredCountry: (name: string | null) => void;
  selectCountry: (name: string | null) => void;
  setInteracting: (value: boolean) => void;
  setIdleRotation: (value: boolean) => void;
  requestFlyTo: (target: FlyToTarget) => void;
  clearFlyTo: () => void;
  setCameraDistance: (distance: number) => void;
  setPointerCoords: (coords: PointerCoords) => void;
  setCompassHeading: (heading: number) => void;
  setCameraPitch: (pitch: number) => void;
  setTelemetry: (partial: Partial<CameraTelemetry>) => void;
  setTilesProgress: (loading: number, loaded: number) => void;
  setTerrainExaggeration: (value: number) => void;
  setExposure: (value: number) => void;
  setNorthLock: (value: boolean) => void;
  toggleNorthLock: () => void;
  setDebugMode: (value: boolean) => void;
  toggleDebugMode: () => void;
  setFullscreen: (value: boolean) => void;
  setFps: (fps: number) => void;
  setQualityId: (id: EarthStore["qualityId"]) => void;
  setReducedMotion: (value: boolean) => void;
  setUseRealSun: (value: boolean) => void;
  setSunTimeOffsetHours: (hours: number) => void;
  setLoadingProgress: (progress: number) => void;
  setReady: (value: boolean) => void;
  requestResetCamera: () => void;
  requestZoom: (delta: number) => void;
  setGamepad: (
    partial: Partial<EarthStore["gamepad"]>,
  ) => void;
  setUserLocation: (
    loc: EarthStore["userLocation"],
  ) => void;
  setLocationTracking: (on: boolean) => void;
  setDryEarth: (partial: Partial<DryEarthState>) => void;
  setSeaLevelTarget: (meters: number) => void;
  applySeaLevelPreset: (id: SeaLevelPresetId) => void;
  toggleGeological: (key: keyof GeologicalLayerState) => void;
  tourSolarBody: (id: SolarTourBodyId) => void;
  setSolarLayer: (key: keyof SolarLayerToggles, value: boolean) => void;
  toggleSolarLayer: (key: keyof SolarLayerToggles) => void;
  setTerrainEnabled: (enabled: boolean) => void;
}

const defaultLayers: EarthLayerToggles = {
  atmosphere: true,
  clouds: true,
  borders: false,
  stars: true,
  // Daytime satellite look (not night-lights / terminator)
  dayNight: false,
  markers: true,
  tiles: true,
  labels: true,
  buildings: true,
  terrain: true,
};

export const useEarthStore = create<EarthStore>((set) => ({
  layers: defaultLayers,
  gisLayers: { ...DEFAULT_GIS_LAYERS },
  dryEarth: { ...DEFAULT_DRY_EARTH, geological: { ...DEFAULT_GEOLOGICAL } },
  baseMapMode: "satellite" as BaseMapMode,
  weather: null,
  weatherIntensities: { ...DEFAULT_WEATHER_INTENSITIES },
  weatherFx: { ...DEFAULT_WEATHER_FX },
  season: "summer",
  dayPhase: "midday",
  markers: DEFAULT_MARKERS,
  selectedMarkerId: null,
  hoveredMarkerId: null,
  hoveredCountry: null,
  selectedCountry: null,
  isInteracting: false,
  idleRotation: true,
  flyToTarget: null,
  flyToNonce: 0,
  cameraDistance: 3.2,
  pointerCoords: { lat: null, lng: null, screenX: 0, screenY: 0 },
  compassHeading: 0,
  cameraPitch: 45,
  altitudeM: 14_000_000,
  zoomLevel: 0,
  zoomLevelName: "Deep Space",
  focusLat: 20,
  focusLng: 0,
  surfaceMode: false,
  tilesLoading: 0,
  tilesLoaded: 0,
  terrainExaggeration: 1.35,
  exposure: 1.05,
  northLock: false,
  debugMode: false,
  isFullscreen: false,
  fps: 60,
  qualityId: "medium",
  reducedMotion: false,
  useRealSun: true,
  sunTimeOffsetHours: 0,
  loadingProgress: 0,
  isReady: false,
  resetCameraRequest: 0,
  zoomRequest: 0,
  zoomRequestDelta: 0,
  gamepad: { moveX: 0, moveY: 0, lookX: 0, lookY: 0 },
  userLocation: null,
  locationTracking: false,
  terrainEnabled: false,
  selectedSolarBody: "overview",
  solarFocusNonce: 0,
  solarLayers: { ...DEFAULT_SOLAR_LAYERS },

  setLayer: (key, value) =>
    set((state) => ({ layers: { ...state.layers, [key]: value } })),
  toggleLayer: (key) =>
    set((state) => ({
      layers: { ...state.layers, [key]: !state.layers[key] },
    })),
  setGisLayer: (key, value) =>
    set((state) => ({ gisLayers: { ...state.gisLayers, [key]: value } })),
  toggleGisLayer: (key) =>
    set((state) => ({
      gisLayers: { ...state.gisLayers, [key]: !state.gisLayers[key] },
    })),
  setBaseMapMode: (mode) =>
    set((state) => {
      const gis = { ...state.gisLayers };
      if (mode === "satellite") {
        gis.satellite = true;
        gis.landCover = false;
        gis.elevation = false;
      } else if (mode === "terrain") {
        gis.satellite = false;
        gis.terrain = true;
        gis.elevation = true;
        gis.landCover = false;
      } else {
        gis.satellite = true;
        gis.landCover = true;
        gis.elevation = false;
        gis.terrain = true;
      }
      return { baseMapMode: mode, gisLayers: gis };
    }),
  setWeather: (weather) => set({ weather }),
  setWeatherIntensities: (weatherIntensities) => set({ weatherIntensities }),
  setWeatherFx: (key, value) =>
    set((state) => ({ weatherFx: { ...state.weatherFx, [key]: value } })),
  toggleWeatherFx: (key) =>
    set((state) => ({
      weatherFx: { ...state.weatherFx, [key]: !state.weatherFx[key] },
    })),
  setSeason: (season) => set({ season }),
  setDayPhase: (dayPhase) => set({ dayPhase }),
  setMarkers: (markers) => set({ markers }),
  selectMarker: (id) => set({ selectedMarkerId: id }),
  hoverMarker: (id) => set({ hoveredMarkerId: id }),
  setHoveredCountry: (name) => set({ hoveredCountry: name }),
  selectCountry: (name) => set({ selectedCountry: name }),
  setInteracting: (value) => set({ isInteracting: value }),
  setIdleRotation: (value) => set({ idleRotation: value }),
  requestFlyTo: (target) =>
    set((state) => ({
      flyToTarget: target,
      flyToNonce: state.flyToNonce + 1,
      idleRotation: false,
    })),
  clearFlyTo: () => set({ flyToTarget: null }),
  setCameraDistance: (distance) => set({ cameraDistance: distance }),
  setPointerCoords: (coords) => set({ pointerCoords: coords }),
  setCompassHeading: (heading) => set({ compassHeading: heading }),
  setCameraPitch: (pitch) => set({ cameraPitch: pitch }),
  setTelemetry: (partial) =>
    set((state) => ({
      zoomLevel: (partial.zoomLevel ?? state.zoomLevel) as ZoomLevelId,
      zoomLevelName: partial.zoomLevelName ?? state.zoomLevelName,
      altitudeM: partial.altitudeM ?? state.altitudeM,
      compassHeading: partial.heading ?? state.compassHeading,
      cameraPitch: partial.pitch ?? state.cameraPitch,
      focusLat: partial.focusLat ?? state.focusLat,
      focusLng: partial.focusLng ?? state.focusLng,
      surfaceMode: partial.surfaceMode ?? state.surfaceMode,
      tilesLoading: partial.tilesLoading ?? state.tilesLoading,
      tilesLoaded: partial.tilesLoaded ?? state.tilesLoaded,
    })),
  setTilesProgress: (loading, loaded) =>
    set({ tilesLoading: loading, tilesLoaded: loaded }),
  setTerrainExaggeration: (value) => set({ terrainExaggeration: value }),
  setExposure: (value) => set({ exposure: value }),
  setNorthLock: (value) => set({ northLock: value }),
  toggleNorthLock: () => set((s) => ({ northLock: !s.northLock })),
  setDebugMode: (value) => set({ debugMode: value }),
  toggleDebugMode: () => set((s) => ({ debugMode: !s.debugMode })),
  setFullscreen: (value) => set({ isFullscreen: value }),
  setFps: (fps) => set({ fps }),
  setQualityId: (id) => set({ qualityId: id }),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setUseRealSun: (value) => set({ useRealSun: value }),
  setSunTimeOffsetHours: (hours) => set({ sunTimeOffsetHours: hours }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  setReady: (value) => set({ isReady: value }),
  requestResetCamera: () =>
    set((state) => ({
      resetCameraRequest: state.resetCameraRequest + 1,
      idleRotation: true,
      selectedMarkerId: null,
      selectedCountry: null,
      selectedSolarBody: "overview",
      solarFocusNonce: state.solarFocusNonce + 1,
    })),
  requestZoom: (delta) =>
    set((state) => ({
      zoomRequest: state.zoomRequest + 1,
      zoomRequestDelta: delta,
    })),
  setGamepad: (partial) =>
    set((state) => ({
      gamepad: { ...state.gamepad, ...partial },
    })),
  setUserLocation: (loc) => set({ userLocation: loc }),
  setLocationTracking: (on) =>
    set({
      locationTracking: on,
      ...(on ? {} : { userLocation: null }),
    }),
  setDryEarth: (partial) =>
    set((state) => ({
      dryEarth: {
        ...state.dryEarth,
        ...partial,
        geological: partial.geological
          ? { ...state.dryEarth.geological, ...partial.geological }
          : state.dryEarth.geological,
      },
    })),
  setSeaLevelTarget: (meters) =>
    set((state) => ({
      dryEarth: {
        ...state.dryEarth,
        targetSeaLevelM: Math.min(
          SEA_LEVEL_MAX_M,
          Math.max(SEA_LEVEL_MIN_M, meters),
        ),
      },
    })),
  applySeaLevelPreset: (id) => {
    const preset = SEA_LEVEL_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    set((state) => ({
      dryEarth: {
        ...state.dryEarth,
        enabled: true,
        targetSeaLevelM: preset.meters,
        scenarioId: id,
      },
      // Prefer hypo relief when draining
      ...(preset.meters < 0
        ? { terrainExaggeration: Math.max(state.terrainExaggeration, 4) }
        : {}),
    }));
  },
  toggleGeological: (key) =>
    set((state) => ({
      dryEarth: {
        ...state.dryEarth,
        geological: {
          ...state.dryEarth.geological,
          [key]: !state.dryEarth.geological[key],
        },
      },
    })),
  tourSolarBody: (id) =>
    set((state) => ({
      selectedSolarBody: id,
      solarFocusNonce: state.solarFocusNonce + 1,
      idleRotation: false,
      layers: {
        ...state.layers,
        stars: true,
      },
    })),
  setSolarLayer: (key, value) =>
    set((state) => ({
      solarLayers: { ...state.solarLayers, [key]: value },
    })),
  toggleSolarLayer: (key) =>
    set((state) => ({
      solarLayers: {
        ...state.solarLayers,
        [key]: !state.solarLayers[key],
      },
    })),
  setTerrainEnabled: (enabled) => set({ terrainEnabled: enabled }),
}));
