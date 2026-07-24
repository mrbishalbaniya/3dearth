/**
 * Weather / Label / POI / Event / Scene / Render managers.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager, PickResult } from "../core/types";
import { useEarthStore } from "../../store/earthStore";
import { getWeatherProvider } from "../../weather/providers/openMeteo";

export class WeatherManager implements EngineManager {
  readonly id = "weather";
  private engine!: EarthEngine;

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  async refresh(lat: number, lng: number) {
    const obs = await getWeatherProvider().fetchObservation(lat, lng);
    useEarthStore.getState().setWeather(obs);
    return obs;
  }

  get observation() {
    return useEarthStore.getState().weather;
  }

  get intensities() {
    return useEarthStore.getState().weatherIntensities;
  }

  dispose(): void {
    /* noop */
  }
}

export class LabelManager implements EngineManager {
  readonly id = "label";
  private engine!: EarthEngine;
  /** Priority ranks for collision (higher wins). */
  priorities = new Map<string, number>();

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  setPriority(id: string, priority: number) {
    this.priorities.set(id, priority);
  }

  /** Screen-space collision stub — returns ids that should stay visible. */
  resolveCollisions(
    candidates: Array<{ id: string; x: number; y: number; w: number; h: number; priority: number }>,
  ): Set<string> {
    const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
    const kept = new Set<string>();
    const boxes: typeof candidates = [];
    for (const c of sorted) {
      const hit = boxes.some(
        (b) =>
          !(
            c.x + c.w < b.x ||
            b.x + b.w < c.x ||
            c.y + c.h < b.y ||
            b.y + b.h < c.y
          ),
      );
      if (!hit) {
        kept.add(c.id);
        boxes.push(c);
      }
    }
    return kept;
  }

  dispose(): void {
    this.priorities.clear();
  }
}

export class POIManager implements EngineManager {
  readonly id = "poi";
  private engine!: EarthEngine;
  private index = new Map<string, PickResult>();

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  register(poi: PickResult) {
    this.index.set(poi.id, poi);
  }

  unregister(id: string) {
    this.index.delete(id);
  }

  nearest(lat: number, lng: number, maxDeg = 0.05): PickResult | null {
    let best: PickResult | null = null;
    let bestD = Infinity;
    for (const p of this.index.values()) {
      const d = Math.hypot(p.lat - lat, p.lng - lng);
      if (d < bestD && d <= maxDeg) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  get size() {
    return this.index.size;
  }

  dispose(): void {
    this.index.clear();
  }
}

export class EventManager implements EngineManager {
  readonly id = "event";
  private engine!: EarthEngine;
  private hover: PickResult | null = null;
  private selected: PickResult | null = null;

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  setHover(pick: PickResult | null) {
    this.hover = pick;
    this.engine.events.emit("pick:hover", pick);
  }

  select(pick: PickResult | null) {
    this.selected = pick;
    this.engine.events.emit("pick:select", pick);
  }

  get state() {
    return { hover: this.hover, selected: this.selected };
  }

  dispose(): void {
    this.hover = null;
    this.selected = null;
  }
}

export class SceneManager implements EngineManager {
  readonly id = "scene";
  private engine!: EarthEngine;
  qualityId: "ultra" | "high" | "medium" | "low" = "high";

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  syncFromStore() {
    this.qualityId = useEarthStore.getState().qualityId;
  }

  dispose(): void {
    /* noop */
  }
}

export class RenderManager implements EngineManager {
  readonly id = "render";
  private engine!: EarthEngine;
  private lastInfo = { drawCalls: 0, geometries: 0, textures: 0 };

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  /** Capture Three.js renderer info each frame. */
  capture(info: { render: { calls: number }; memory: { geometries: number; textures: number } }) {
    this.lastInfo = {
      drawCalls: info.render.calls,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  }

  get info() {
    return this.lastInfo;
  }

  get shouldSkipHeavyPass() {
    return this.engine.performance.skipRender;
  }

  dispose(): void {
    /* noop */
  }
}
