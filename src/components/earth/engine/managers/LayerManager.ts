/**
 * LayerManager (engine) — toggle GIS/scene layers via store + events.
 * Distinct from React GIS LayerManager component.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager } from "../core/types";
import { useEarthStore } from "../../store/earthStore";
import type { GisLayerId } from "../../types";

export class EngineLayerManager implements EngineManager {
  readonly id = "layers";
  private engine!: EarthEngine;

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  setGis(id: GisLayerId, enabled: boolean) {
    useEarthStore.getState().setGisLayer(id, enabled);
    this.engine.events.emit("layer:toggle", { id, enabled });
  }

  toggleGis(id: GisLayerId) {
    const cur = useEarthStore.getState().gisLayers[id];
    this.setGis(id, !cur);
  }

  get snapshot() {
    const s = useEarthStore.getState();
    return { gis: { ...s.gisLayers }, scene: { ...s.layers } };
  }

  dispose(): void {
    /* noop */
  }
}
