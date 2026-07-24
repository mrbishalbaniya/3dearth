# Earth Streaming Performance

## Profile (before) — bottleneck list

Measured / code-audited against the live pipeline (`SatelliteLayer` → `TileLoader` → `TileScheduler` → DEM / vectors):

| # | Bottleneck | Evidence | Impact |
|---|------------|----------|--------|
| 1 | Imagery `AbortSignal` ignored | `loadTileImage` used `Image.src` with no abort; pan left dozens of completes into GPU cache | High — wasted bandwidth + GPU churn |
| 2 | Main-thread DEM decode | Canvas `getImageData` per tile; Bathymetry decoded land+ocean twice | High — frame hitches |
| 3 | Bathymetry `beginGeneration()` in `useMemo` | Every focus/altitude tick aborted DEM stampede | High — empty oceans / stutter |
| 4 | `warmFocus()` every frame | `EarthEngineBridge` → elevation fetch even when cache-hot | Medium — background load spam |
| 5 | No persistent tile cache | Reload re-fetched all imagery | Medium — cold-start latency |
| 6 | Texture LRU no refcount | Evict could dispose live textures; MAX 512 unbounded pressure | Medium — flicker / VRAM |
| 7 | `frustumCulled={false}` on imagery | All tiles always submitted | Medium — draw-call bloat |
| 8 | Scheduler concurrency 18 | HTTP stampede on zoom | Medium — queue latency |
| 9 | Terrain worker unused | `terrain.worker.ts` never called from layers | Opportunity |

## Changes applied

1. **Abortable imagery** — `fetch` + `AbortSignal`; unmount / generation aborts in-flight loads.
2. **IndexedDB tile cache** — `cache/TileIdbCache.ts` (14-day TTL, LRU eviction).
3. **Shared DEM grid cache** — `cache/DemGridCache.ts` shared by Elevation / Terrain / Bathymetry.
4. **Texture refcount LRU** — acquire/release from `ImageryTile`; dispose only at refs=0.
5. **Bathymetry generation** — quantized focus cell; `beginGeneration` only on cell change.
6. **warmFocus throttle** — ~5 Hz + skip when `peekElevation` hits.
7. **Frustum culling** enabled on satellite meshes.
8. **Scheduler** — lower concurrency (10/4/2), queue cap, abort running stale jobs.
9. **Perf overlay** — Ctrl+Shift+P or Earth debug (⌁): FPS, queues, cache, load p50/p95.

## How to verify

1. Open app → Earth debug (⌁) or **Ctrl+Shift+P**.
2. Zoom space → street: watch **Img Q/Run**, **Load p50**, **Aborted**.
3. Reload page on same view: **IDB hits** should rise, network drop.
4. Rapid pan: aborted count rises without FPS collapse.
5. Long session: Tex LRU stays near cap; no unbounded growth.

/**
 * Flight corridor streaming — MSFS/Cesium-style route band preload.
 *
 * When a flight plan exists (Hangar dep → waypoints → dest), `CorridorStreamer`
 * samples the remaining great-circle corridor + lateral buffer and prefetches
 * satellite/DEM tiles ahead of the aircraft without loading the whole Earth.
 *
 * @see FlightCorridor.ts  geometry + adaptive buffer
 * @see CorridorStreamer.ts background tick (EarthEngineBridge ~2.5 Hz)
 * @see CorridorDebugLayer.tsx  debug ribbon (earth debugMode)
 */

**Cause:** GPU tile LRU could not evict pinned textures (grew past 384), ImageBitmaps were never `.close()`’d on dispose, and ~96 live meshes + WorldCover + aggressive prefetch stacked VRAM until the renderer process died.

**Mitigations**
- Soft cache 96 / hard 128 with force-evict; `disposeGpuTexture` closes ImageBitmap
- Live imagery cap **48**; lighter meshes; prefetch ≤4; WorldCover off while satellite on
- `trimTileCache` on viewport key-set change; DEM grids capped at 48


**Root causes**
1. Day-map `globeOpacity` forced to 0 under satellite while only 1 tile had painted.
2. `ImageryTile` `useEffect` depended on `priority` → every pan aborted in-flight loads.
3. `return null` until texture ready → black holes between parents.
4. `frustumCulled` false-culled spherical patches at grazing angles.
5. LOD rings selected **200–450 tiles** while scheduler queue capped ~240 → overflow dropped almost everything except the highest-priority center tile.

**Fixes**
- Priority via ref (no abort on re-sort); placeholders + fade-in; frustumCulled off.
- Cap imagery selection at **96** tiles with tighter FOV rings + parent pyramid.
- Stabilize selection on quantized focus cell; `cancelExcept` only when key-set changes.
- Queue cap raised; imagery concurrency 12.
- Globe underlay fades only as `imageryLoaded / imageryVisible` grows.
- Perf overlay: Img **visible / loaded / pending / cached** (Ctrl+Shift+P).

