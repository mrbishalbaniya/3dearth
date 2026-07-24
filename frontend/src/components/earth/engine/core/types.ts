/**
 * Earth Engine — core contracts.
 * Managers communicate only through these interfaces + EventBus.
 */

export type EngineEventMap = {
  "engine:ready": { version: string };
  "engine:dispose": undefined;
  "camera:flyTo": { lat: number; lng: number; altitudeM?: number; duration?: number };
  "camera:mode": { mode: CameraMode };
  "tile:loaded": { key: string; kind: TileKind };
  "tile:evicted": { key: string };
  "layer:toggle": { id: string; enabled: boolean };
  "pick:hover": PickResult | null;
  "pick:select": PickResult | null;
  "perf:sample": PerformanceSample;
  "plugin:register": { id: string };
  "search:query": { q: string };
  "debug:toggle": { enabled: boolean };
};

export type CameraMode =
  | "orbit"
  | "fly"
  | "free"
  | "firstPerson"
  | "drone"
  | "satellite"
  | "track"
  | "follow";

export type TileKind =
  | "imagery"
  | "dem"
  | "vector"
  | "geojson"
  | "topojson"
  | "terrain";

export type PickKind =
  | "country"
  | "city"
  | "road"
  | "building"
  | "tree"
  | "marker"
  | "poi"
  | "terrain"
  | "water"
  | "label";

export interface PickResult {
  kind: PickKind;
  id: string;
  name?: string;
  lat: number;
  lng: number;
  altitudeM?: number;
  meta?: Record<string, unknown>;
}

export interface PerformanceSample {
  fps: number;
  frameMs: number;
  tilesLoading: number;
  tilesCached: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  workersBusy: number;
  lod: number;
  cameraAltitudeM: number;
}

export interface EngineLogger {
  debug(scope: string, message: string, data?: unknown): void;
  info(scope: string, message: string, data?: unknown): void;
  warn(scope: string, message: string, data?: unknown): void;
  error(scope: string, message: string, data?: unknown): void;
}

export interface Disposable {
  dispose(): void;
}

export interface EngineManager extends Disposable {
  readonly id: string;
  init(engine: import("./EarthEngine").EarthEngine): void;
  update?(dt: number): void;
}

export interface PluginContext {
  engine: import("./EarthEngine").EarthEngine;
  registerLayer(id: string, factory: () => unknown): void;
  registerControl(id: string, factory: () => unknown): void;
  registerShader(id: string, source: { vertex: string; fragment: string }): void;
  registerDataSource(id: string, source: DataSourceDescriptor): void;
  registerWidget(id: string, factory: () => unknown): void;
  registerTool(id: string, tool: ToolDescriptor): void;
}

export interface EarthPlugin {
  id: string;
  name: string;
  version: string;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(ctx: PluginContext): void | Promise<void>;
}

export interface DataSourceDescriptor {
  id: string;
  kind: TileKind | "api" | "static";
  url?: string;
  attribution?: string;
}

export interface ToolDescriptor {
  id: string;
  label: string;
  activate: () => void;
  deactivate?: () => void;
}

export interface SearchHit {
  id: string;
  label: string;
  kind: string;
  lat: number;
  lng: number;
  altitudeM?: number;
  score: number;
}

export interface BBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialItem<T = unknown> extends BBox2D {
  id: string;
  data: T;
}
