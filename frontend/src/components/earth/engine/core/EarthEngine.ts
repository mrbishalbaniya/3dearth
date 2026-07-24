/**
 * EarthEngine — central orchestrator for all production managers.
 *
 * @example
 * const engine = EarthEngine.create();
 * engine.init();
 * engine.camera.flyTo(40.7, -74, 8000);
 * engine.dispose();
 */
import { EventBus } from "./EventBus";
import { Logger } from "./Logger";
import type { EngineManager } from "./types";
import { CacheManager } from "../managers/CacheManager";
import { PerformanceManager } from "../managers/PerformanceManager";
import { CameraManager } from "../managers/CameraManager";
import { TileManager } from "../managers/TileManager";
import { TerrainManager } from "../managers/TerrainManager";
import { EngineLayerManager } from "../managers/LayerManager";
import {
  AnimationManager,
  LightingManager,
  MaterialManager,
  TextureManager,
} from "../managers/LightingAnimationMaterial";
import {
  EventManager,
  LabelManager,
  POIManager,
  RenderManager,
  SceneManager,
  WeatherManager,
} from "../managers/SceneServices";
import { WorkerManager } from "../managers/WorkerManager";
import { PluginManager } from "../plugins/PluginManager";
import { SearchManager } from "../search/SearchManager";

export const ENGINE_VERSION = "1.0.0";

export class EarthEngine {
  readonly version = ENGINE_VERSION;
  readonly events = new EventBus();
  readonly logger = new Logger(
    process.env.NODE_ENV === "development" ? "debug" : "warn",
  );

  readonly cache = new CacheManager();
  readonly performance = new PerformanceManager();
  readonly camera = new CameraManager();
  readonly tiles = new TileManager();
  readonly terrain = new TerrainManager();
  readonly layers = new EngineLayerManager();
  readonly materials = new MaterialManager();
  readonly textures = new TextureManager();
  readonly lighting = new LightingManager();
  readonly animation = new AnimationManager();
  readonly weather = new WeatherManager();
  readonly labels = new LabelManager();
  readonly pois = new POIManager();
  readonly picking = new EventManager();
  readonly scene = new SceneManager();
  readonly render = new RenderManager();
  readonly workers = new WorkerManager();
  readonly plugins = new PluginManager();
  readonly search = new SearchManager();

  private managers: EngineManager[] = [];
  private initialized = false;
  private disposed = false;

  private constructor() {
    this.managers = [
      this.cache,
      this.performance,
      this.camera,
      this.tiles,
      this.terrain,
      this.layers,
      this.materials,
      this.textures,
      this.lighting,
      this.animation,
      this.weather,
      this.labels,
      this.pois,
      this.picking,
      this.scene,
      this.render,
      this.workers,
      this.plugins,
      this.search,
    ];
  }

  static create(): EarthEngine {
    return new EarthEngine();
  }

  /** Global singleton for the app shell. */
  private static instance: EarthEngine | null = null;

  static get shared(): EarthEngine {
    if (!EarthEngine.instance) {
      EarthEngine.instance = EarthEngine.create();
    }
    return EarthEngine.instance;
  }

  static resetShared() {
    EarthEngine.instance?.dispose();
    EarthEngine.instance = null;
  }

  init(): this {
    if (this.initialized) return this;
    for (const m of this.managers) {
      m.init(this);
    }
    this.initialized = true;
    this.events.emit("engine:ready", { version: this.version });
    this.logger.info("engine", `ready v${this.version}`);
    return this;
  }

  /** Per-frame update — call from R3F useFrame. */
  update(dt: number) {
    if (!this.initialized || this.disposed) return;
    this.animation.update(dt);
    this.scene.syncFromStore();
    for (const m of this.managers) {
      m.update?.(dt);
    }
  }

  get isReady() {
    return this.initialized && !this.disposed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.events.emit("engine:dispose", undefined);
    for (const m of [...this.managers].reverse()) {
      try {
        m.dispose();
      } catch (err) {
        this.logger.error("engine", `dispose ${m.id}`, err);
      }
    }
    this.events.clear();
    this.disposed = true;
    this.initialized = false;
    this.logger.info("engine", "disposed");
  }
}
