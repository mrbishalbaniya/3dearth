/**
 * PerformanceManager — FPS, adaptive quality, idle frame skip signals.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager, PerformanceSample } from "../core/types";

export class PerformanceManager implements EngineManager {
  readonly id = "performance";
  private engine!: EarthEngine;
  private frames = 0;
  private last = performance.now();
  private fps = 60;
  private frameMs = 16.6;
  private idleFrames = 0;
  private lastCamHash = "";
  skipRender = false;

  /** Latest sample for debug overlay. */
  sample: PerformanceSample = {
    fps: 60,
    frameMs: 16,
    tilesLoading: 0,
    tilesCached: 0,
    drawCalls: 0,
    geometries: 0,
    textures: 0,
    workersBusy: 0,
    lod: 0,
    cameraAltitudeM: 0,
  };

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  /** Call once per animation frame from RenderManager. */
  tick(meta: Partial<PerformanceSample> & { cameraHash?: string }) {
    this.frames += 1;
    const now = performance.now();
    if (now - this.last >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.last));
      this.frameMs = 1000 / Math.max(1, this.fps);
      this.frames = 0;
      this.last = now;

      this.sample = {
        ...this.sample,
        ...meta,
        fps: this.fps,
        frameMs: this.frameMs,
      };
      this.engine.events.emit("perf:sample", this.sample);
    } else if (meta) {
      Object.assign(this.sample, meta);
    }

    // Idle detection — skip heavy work when camera static
    const hash = meta.cameraHash ?? "";
    if (hash && hash === this.lastCamHash) {
      this.idleFrames += 1;
    } else {
      this.idleFrames = 0;
      this.lastCamHash = hash;
    }
    this.skipRender = this.idleFrames > 120; // ~2s idle
  }

  get shouldReduceQuality() {
    return this.fps < 38;
  }

  dispose(): void {
    /* noop */
  }
}
