import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Lifecycle } from '../core/Lifecycle';
import { ChunkManager } from './ChunkManager';

export class TerrainManager implements Lifecycle {
  private readonly chunkManager: ChunkManager;
  private viewDistance = 4;

  constructor(chunkManager: ChunkManager, viewDistance: number) {
    this.chunkManager = chunkManager;
    this.viewDistance = viewDistance;
  }

  public async initialize(): Promise<void> {
    return this.chunkManager.initialize();
  }

  public setViewDistance(distance: number): void {
    this.viewDistance = Math.max(1, Math.floor(distance));
  }

  public update(cameraPosition: Vector3): void {
    this.chunkManager.update(cameraPosition, this.viewDistance);
  }

  public getLoadedChunkCount(): number {
    return this.chunkManager.getLoadedChunkCount();
  }

  public dispose(): void {
    this.chunkManager.dispose();
  }
}
