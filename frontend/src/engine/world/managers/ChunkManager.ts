import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Lifecycle } from '../core/Lifecycle';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';
import { TerrainChunk } from './chunk/TerrainChunk';

export class ChunkManager implements Lifecycle {
  private readonly scene: Scene;
  private readonly events: EventSystem<WorldEventMap>;
  private readonly chunkSize: number;
  private readonly chunkResolution: number;
  private readonly maxHeight: number;
  private readonly loadedChunks = new Map<string, TerrainChunk>();

  constructor(
    scene: Scene,
    events: EventSystem<WorldEventMap>,
    chunkSize: number,
    chunkResolution: number,
    maxHeight: number
  ) {
    this.scene = scene;
    this.events = events;
    this.chunkSize = chunkSize;
    this.chunkResolution = chunkResolution;
    this.maxHeight = maxHeight;
  }

  public async initialize(): Promise<void> {
    return Promise.resolve();
  }

  public update(cameraPosition: Vector3, viewDistance: number): void {
    const centerX = Math.floor(cameraPosition.x / this.chunkSize);
    const centerZ = Math.floor(cameraPosition.z / this.chunkSize);

    const desired = new Set<string>();
    for (let z = -viewDistance; z <= viewDistance; z += 1) {
      for (let x = -viewDistance; x <= viewDistance; x += 1) {
        const chunkX = centerX + x;
        const chunkZ = centerZ + z;
        const key = `${chunkX}:${chunkZ}`;
        desired.add(key);
        if (!this.loadedChunks.has(key)) {
          this.loadChunk(chunkX, chunkZ, key);
        }
      }
    }

    const keysToUnload: string[] = [];
    for (const key of this.loadedChunks.keys()) {
      if (!desired.has(key)) {
        keysToUnload.push(key);
      }
    }

    for (const key of keysToUnload) {
      this.unloadChunk(key);
    }
  }

  private loadChunk(chunkX: number, chunkZ: number, key: string): void {
    const chunk = new TerrainChunk(
      this.scene,
      chunkX,
      chunkZ,
      this.chunkSize,
      this.chunkResolution,
      this.maxHeight
    );
    this.loadedChunks.set(key, chunk);
    this.events.emit('chunk:loaded', { key });
  }

  private unloadChunk(key: string): void {
    const chunk = this.loadedChunks.get(key);
    if (!chunk) {
      return;
    }
    chunk.dispose();
    this.loadedChunks.delete(key);
    this.events.emit('chunk:unloaded', { key });
  }

  public getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  public dispose(): void {
    for (const chunk of this.loadedChunks.values()) {
      chunk.dispose();
    }
    this.loadedChunks.clear();
  }
}
