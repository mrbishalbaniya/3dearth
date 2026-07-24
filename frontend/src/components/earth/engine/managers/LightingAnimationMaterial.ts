/**
 * MaterialManager / TextureManager / LightingManager / AnimationManager
 * — lightweight registries shared across the scene.
 */
import {
  Material,
  Texture,
  type DirectionalLight,
} from "three";
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager } from "../core/types";
import { ResourcePool } from "../core/ResourcePool";

export class MaterialManager implements EngineManager {
  readonly id = "material";
  private engine!: EarthEngine;
  private shared = new Map<string, Material>();
  private pool = new ResourcePool<Material>(128);

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  getShared(key: string, create: () => Material): Material {
    let m = this.shared.get(key);
    if (!m) {
      m = create();
      this.shared.set(key, m);
    }
    return m;
  }

  acquire(key: string, create: () => Material): Material {
    return this.pool.acquire(key, create, (m) => m.dispose());
  }

  release(key: string) {
    this.pool.release(key);
  }

  get count() {
    return this.shared.size + this.pool.size;
  }

  dispose(): void {
    for (const m of this.shared.values()) m.dispose();
    this.shared.clear();
    this.pool.dispose();
  }
}

export class TextureManager implements EngineManager {
  readonly id = "texture";
  private engine!: EarthEngine;
  private pool = new ResourcePool<Texture>(320);

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  acquire(key: string, create: () => Texture): Texture {
    return this.pool.acquire(key, create, (t) => t.dispose());
  }

  release(key: string) {
    this.pool.release(key);
  }

  get count() {
    return this.pool.size;
  }

  dispose(): void {
    this.pool.dispose();
    this.engine.logger.debug(this.id, "textures disposed");
  }
}

export class LightingManager implements EngineManager {
  readonly id = "lighting";
  private engine!: EarthEngine;
  sun: DirectionalLight | null = null;

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  attachSun(light: DirectionalLight) {
    this.sun = light;
  }

  dispose(): void {
    this.sun = null;
  }
}

export class AnimationManager implements EngineManager {
  readonly id = "animation";
  private engine!: EarthEngine;
  private time = 0;
  private paused = false;

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  update(dt: number) {
    if (!this.paused) this.time += dt;
  }

  get elapsed() {
    return this.time;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  dispose(): void {
    this.time = 0;
  }
}
