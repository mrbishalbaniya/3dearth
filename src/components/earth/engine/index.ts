/**
 * Earth Engine public API
 *
 * @see ./ARCHITECTURE.md
 */
export { EarthEngine, ENGINE_VERSION } from "./core/EarthEngine";
export { EventBus } from "./core/EventBus";
export { Logger } from "./core/Logger";
export { ResourcePool, WeakCache } from "./core/ResourcePool";
export type * from "./core/types";

export { EarthEngineBridge } from "./EarthEngineBridge";
export { EarthEngineProvider, useEarthEngine } from "./hooks/useEarthEngine";
export { DebugOverlay } from "./debug/DebugOverlay";
export { SearchPanel } from "./search/SearchPanel";
export { GeoAnalytics } from "./analytics/GeoAnalytics";
export { QuadTree, SpatialHash, RTreeIndex, BVH2D } from "./spatial/indexes";
export { PluginManager } from "./plugins/PluginManager";
export { localCatalogProvider } from "./search/SearchManager";
export { runEngineDiagnostics } from "./diagnostics";

// Re-export rendering modules for stable import paths
export { LayerManager } from "../gis/LayerManager";
export { SatelliteLayer } from "../gis/layers/SatelliteLayer";
export { TerrainLayer } from "../gis/layers/TerrainLayer";
export { BuildingLayer } from "../gis/layers/BuildingLayer";
export { RoadLayer } from "../gis/layers/RoadLayer";
export { WaterLayer } from "../gis/layers/WaterLayer";
export { VegetationLayer } from "../gis/layers/VegetationLayer";
export { ForestLayer } from "../gis/layers/ForestLayer";
export { LabelLayer } from "../gis/layers/LabelLayer";
export { PoiLayer } from "../gis/layers/PoiLayer";
export { CameraController } from "../CameraController";
export { WeatherSystem, WeatherPanel } from "../weather";
export {
  selectLodTiles,
  imageryScheduler,
  demScheduler,
  sampleElevation,
  peekElevation,
} from "../streaming";
