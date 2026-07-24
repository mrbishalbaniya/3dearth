/**
 * TileManager — facade over streaming schedulers + LOD selection.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager, TileKind } from "../core/types";
import {
  demScheduler,
  imageryScheduler,
  selectLodTiles,
  selectPrefetchTiles,
  vectorScheduler,
} from "../../streaming";
import { useEarthStore } from "../../store/earthStore";

export class TileManager implements EngineManager {
  readonly id = "tile";
  private engine!: EarthEngine;
  visibleKeys = new Set<string>();

  init(engine: EarthEngine): void {
    this.engine = engine;
    imageryScheduler.setConcurrency(8);
    demScheduler.setConcurrency(4);
    vectorScheduler.setConcurrency(2);
  }

  selectVisible() {
    const s = useEarthStore.getState();
    const sel = selectLodTiles({
      lat: s.focusLat,
      lng: s.focusLng,
      altitudeM: s.altitudeM,
      qualityId: s.qualityId,
      zoomLevel: s.zoomLevel,
    });
    this.visibleKeys = new Set(sel.imagery.map((t) => t.key));
    return sel;
  }

  prefetch() {
    const s = useEarthStore.getState();
    return selectPrefetchTiles(s.focusLat, s.focusLng, s.altitudeM);
  }

  beginImageryGeneration() {
    return imageryScheduler.beginGeneration();
  }

  beginDemGeneration() {
    return demScheduler.beginGeneration();
  }

  notifyLoaded(key: string, kind: TileKind) {
    this.engine.events.emit("tile:loaded", { key, kind });
    this.engine.cache.set(`tile:${kind}:${key}`, true, 64, 120_000);
  }

  get counts() {
    return {
      visible: this.visibleKeys.size,
      loading: useEarthStore.getState().tilesLoading,
      cached: this.engine.cache.stats.entries,
    };
  }

  dispose(): void {
    imageryScheduler.clear();
    demScheduler.clear();
    vectorScheduler.clear();
    this.visibleKeys.clear();
  }
}
