# ORBIT Earth Engine Architecture

Production GIS rendering platform built on React Three Fiber / Three.js / WebGL.

**Version:** 1.0.0  
**Entry:** `EarthEngine.shared` · `EarthEngineProvider` · `EarthEngineBridge`

---

## Purpose

Provide a Cesium / Google Earth–class **engine layer** above the React scene graph so:

- Systems stay independent (SOLID)
- Streaming, weather, search, plugins, and analytics extend without rewriting the globe
- GPU resources are pooled and disposable
- Heavy work can move to Web Workers

---

## Core

| Module | Responsibility |
|--------|----------------|
| `EarthEngine` | Orchestrator — owns all managers, lifecycle `init` / `update` / `dispose` |
| `EventBus` | Typed pub/sub (`engine:ready`, `camera:flyTo`, `perf:sample`, …) |
| `Logger` | Scoped, level-filtered logging |
| `ResourcePool` | Ref-counted GPU resource cache + WeakMap helpers |

---

## Managers

| Manager | Public API highlights |
|---------|----------------------|
| `CacheManager` | LRU memory cache, TTL, offline-ready `persistStub` |
| `PerformanceManager` | FPS sampling, idle skip flag, adaptive quality signal |
| `CameraManager` | `flyTo`, `reset`, `zoom`, modes, north lock |
| `TileManager` | LOD selection, schedulers, prefetch |
| `TerrainManager` | Elevation sample / peek / clearance policy |
| `EngineLayerManager` | GIS layer toggles via store + events |
| `MaterialManager` / `TextureManager` | Shared materials, pooled textures |
| `LightingManager` / `AnimationManager` | Sun attach, elapsed time |
| `WeatherManager` | Provider refresh, intensities |
| `LabelManager` | Priority + screen-space collision resolver |
| `POIManager` | Register / nearest POI |
| `EventManager` | Hover / select picking events |
| `SceneManager` / `RenderManager` | Quality sync, draw-call capture |
| `WorkerManager` | Geo + terrain worker pool |
| `PluginManager` | Register layers / tools / shaders / data sources |
| `SearchManager` | Pluggable geocoders + fly-to |

---

## Streaming

Existing `streaming/` module (LodSelector, TileScheduler, ElevationService) is the tile backend. `TileManager` is the façade.

**Extension:** swap providers or add MVT decoding workers without touching React layers.

---

## Spatial

- `QuadTree` — insert / range / point query  
- `SpatialHash` — nearest neighbor  
- `RTreeIndex` — bulk bbox filter (upgradeable)  
- `BVH2D` — binary BVH for picking  

---

## Analytics & Search

- `GeoAnalytics` — distance, bearing, area, route length, buffer, elevation profile  
- `SearchManager` + `SearchPanel` — local catalog now; register Nominatim/Photon later via `registerProvider`

---

## Plugins

```ts
await EarthEngine.shared.plugins.register({
  id: "heatmap",
  name: "Heatmap",
  version: "0.1.0",
  activate(ctx) {
    ctx.registerTool({
      id: "heatmap-draw",
      label: "Heatmap",
      activate: () => { /* … */ },
    });
  },
});
```

---

## React integration

1. `EarthEngineProvider` wraps the Canvas  
2. `EarthEngineBridge` inside the Canvas runs `engine.update` each frame  
3. `DebugOverlay` when `debugMode` is on (`Ctrl+D` or `` ` ``)  
4. Scene layers (`gis/LayerManager`, weather, etc.) remain R3F components driven by Zustand  

---

## Performance considerations

- Prefer `TileScheduler` for network; never stampede Overpass  
- Dispose geometries/materials via pools  
- Workers fall back to main-thread stubs if spawn fails (SSR / Turbopack)  
- Adaptive quality still runs in `FpsTracker`  
- Idle camera → `performance.skipRender` for optional heavy-pass gating  

---

## Testing hooks

- Unit-test managers in isolation (`EventBus`, `GeoAnalytics`, spatial indexes)  
- Integration: `EarthEngine.create().init()` without Canvas  
- Diagnostics: enable debug overlay for FPS / draw calls / cache / workers  

---

## Future without core rewrites

Live flights · vehicles · multiplayer · drone/first-person modes · historical imagery · heatmaps · AI detection · routes · AR/VR — register as plugins or data sources on `PluginManager` / `SearchManager` / `TileManager`.
