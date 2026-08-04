import { TerrainChunk } from './TerrainChunk';
import { HeightmapLoader } from './HeightmapLoader';
import { TerrainStreamingState, TerrainConfig, HeightmapSource } from '../types/TerrainTypes';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Logger } from '../../core/Logger';
import { EventBus } from '../../core/EventBus';

export class ChunkManager {
  private streamingState: TerrainStreamingState;
  private heightmapLoader: HeightmapLoader;
  private config: TerrainConfig;
  private heightmapSource: HeightmapSource;
  private scene: Scene;
  private logger = Logger.getInstance();
  private eventBus = EventBus.getInstance();
  private loadingQueue: Set<string> = new Set();
  private unloadingQueue: Set<string> = new Set();

  constructor(
    scene: Scene,
    config: TerrainConfig,
    heightmapSource: HeightmapSource,
    heightmapLoader: HeightmapLoader
  ) {
    this.scene = scene;
    this.config = config;
    this.heightmapSource = heightmapSource;
    this.heightmapLoader = heightmapLoader;
    
    this.streamingState = {
      centerX: 0,
      centerZ: 0,
      loadRadius: config.chunkSize * 8,
      unloadRadius: config.chunkSize * 12,
      activeChunks: new Map(),
      loadingChunks: new Set(),
      pendingUnloads: new Set()
    };
  }

  public async update(cameraPosition: Vector3): Promise<void> {
    this.updateStreamingCenter(cameraPosition);
    await this.processLoadingQueue();
    this.processUnloadingQueue();
    this.cleanupOldChunks();
  }

  private updateStreamingCenter(cameraPosition: Vector3): void {
    const newCenterX = Math.floor(cameraPosition.x / this.config.chunkSize) * this.config.chunkSize;
    const newCenterZ = Math.floor(cameraPosition.z / this.config.chunkSize) * this.config.chunkSize;

    if (newCenterX !== this.streamingState.centerX || newCenterZ !== this.streamingState.centerZ) {
      this.streamingState.centerX = newCenterX;
      this.streamingState.centerZ = newCenterZ;
      this.scheduleChunkUpdates(cameraPosition);
    }
  }

  private scheduleChunkUpdates(cameraPosition: Vector3): void {
    const chunksToLoad: string[] = [];
    const chunksToUnload: string[] = [];

    // Determine required chunks
    const loadRadius = this.streamingState.loadRadius;
    const unloadRadius = this.streamingState.unloadRadius;
    const chunkSize = this.config.chunkSize;

    const startX = this.streamingState.centerX - loadRadius;
    const endX = this.streamingState.centerX + loadRadius;
    const startZ = this.streamingState.centerZ - loadRadius;
    const endZ = this.streamingState.centerZ + loadRadius;

    // Schedule chunks for loading
    for (let x = startX; x <= endX; x += chunkSize) {
      for (let z = startZ; z <= endZ; z += chunkSize) {
        const chunkId = `chunk_${x}_${z}_0`;
        const distance = Math.sqrt(
          Math.pow(x - cameraPosition.x, 2) + 
          Math.pow(z - cameraPosition.z, 2)
        );

        if (distance <= loadRadius) {
          if (!this.streamingState.activeChunks.has(chunkId) && 
              !this.streamingState.loadingChunks.has(chunkId)) {
            chunksToLoad.push(chunkId);
          }
        }
      }
    }

    // Schedule chunks for unloading
    for (const [chunkId, chunk] of this.streamingState.activeChunks) {
      const distance = chunk.getDistance(cameraPosition);
      
      if (distance > unloadRadius) {
        chunksToUnload.push(chunkId);
      }
    }

    // Add to queues
    for (const chunkId of chunksToLoad) {
      this.scheduleChunkLoad(chunkId);
    }

    for (const chunkId of chunksToUnload) {
      this.scheduleChunkUnload(chunkId);
    }
  }

  private scheduleChunkLoad(chunkId: string): void {
    if (this.streamingState.activeChunks.size >= this.config.maxChunksInMemory) {
      this.logger.warn(`Chunk limit reached (${this.config.maxChunksInMemory}), skipping load: ${chunkId}`);
      return;
    }

    this.loadingQueue.add(chunkId);
    this.streamingState.loadingChunks.add(chunkId);
  }

  private scheduleChunkUnload(chunkId: string): void {
    this.unloadingQueue.add(chunkId);
    this.streamingState.pendingUnloads.add(chunkId);
  }

  private async processLoadingQueue(): Promise<void> {
    const maxConcurrentLoads = 4;
    const currentLoads: Promise<void>[] = [];

    for (const chunkId of Array.from(this.loadingQueue).slice(0, maxConcurrentLoads)) {
      currentLoads.push(this.loadChunk(chunkId));
      this.loadingQueue.delete(chunkId);
    }

    if (currentLoads.length > 0) {
      await Promise.allSettled(currentLoads);
    }
  }

  private async loadChunk(chunkId: string): Promise<void> {
    try {
      const [, x, z, level] = chunkId.split('_').map(Number);
      
      const chunk = new TerrainChunk(
        x, z, level, 
        this.config.chunkSize,
        this.config.heightScale,
        this.config.heightmapResolution
      );

      const heightmapData = await this.heightmapLoader.loadHeightmap(
        this.heightmapSource,
        x, z,
        this.config.chunkSize
      );

      await chunk.load(heightmapData, this.scene);

      this.streamingState.activeChunks.set(chunkId, chunk);
      this.streamingState.loadingChunks.delete(chunkId);

      this.eventBus.emit('chunkLoaded', { chunkId, chunk });
      
      this.logger.debug(`Loaded chunk: ${chunkId}`);
      
    } catch (error) {
      this.logger.error(`Failed to load chunk ${chunkId}:`, error);
      this.streamingState.loadingChunks.delete(chunkId);
    }
  }

  private processUnloadingQueue(): void {
    for (const chunkId of this.unloadingQueue) {
      this.unloadChunk(chunkId);
      this.unloadingQueue.delete(chunkId);
    }
  }

  private unloadChunk(chunkId: string): void {
    const chunk = this.streamingState.activeChunks.get(chunkId);
    
    if (chunk) {
      chunk.unload();
      this.streamingState.activeChunks.delete(chunkId);
      this.streamingState.pendingUnloads.delete(chunkId);
      
      this.eventBus.emit('chunkUnloaded', { chunkId, chunk });
      
      this.logger.debug(`Unloaded chunk: ${chunkId}`);
    }
  }

  private cleanupOldChunks(): void {
    const maxAge = 300000; // 5 minutes
    const now = Date.now();
    const chunksToUnload: string[] = [];

    for (const [chunkId, chunk] of this.streamingState.activeChunks) {
      if (now - chunk.lastAccessTime > maxAge) {
        chunksToUnload.push(chunkId);
      }
    }

    for (const chunkId of chunksToUnload) {
      this.scheduleChunkUnload(chunkId);
    }
  }

  public getLoadedChunks(): TerrainChunk[] {
    return Array.from(this.streamingState.activeChunks.values()).filter(chunk => chunk.loaded);
  }

  public getChunk(x: number, z: number, level: number = 0): TerrainChunk | null {
    const chunkId = `chunk_${x}_${z}_${level}`;
    return this.streamingState.activeChunks.get(chunkId) || null;
  }

  public getChunkAt(worldX: number, worldZ: number): TerrainChunk | null {
    const chunkX = Math.floor(worldX / this.config.chunkSize) * this.config.chunkSize;
    const chunkZ = Math.floor(worldZ / this.config.chunkSize) * this.config.chunkSize;
    
    return this.getChunk(chunkX, chunkZ);
  }

  public preloadArea(centerX: number, centerZ: number, radius: number): Promise<void[]> {
    const promises: Promise<void>[] = [];
    const chunkSize = this.config.chunkSize;
    
    const startX = Math.floor((centerX - radius) / chunkSize) * chunkSize;
    const endX = Math.floor((centerX + radius) / chunkSize) * chunkSize;
    const startZ = Math.floor((centerZ - radius) / chunkSize) * chunkSize;
    const endZ = Math.floor((centerZ + radius) / chunkSize) * chunkSize;

    for (let x = startX; x <= endX; x += chunkSize) {
      for (let z = startZ; z <= endZ; z += chunkSize) {
        const chunkId = `chunk_${x}_${z}_0`;
        
        if (!this.streamingState.activeChunks.has(chunkId) && 
            !this.streamingState.loadingChunks.has(chunkId)) {
          promises.push(this.loadChunk(chunkId));
        }
      }
    }

    return Promise.all(promises);
  }

  public unloadAll(): void {
    for (const [chunkId] of this.streamingState.activeChunks) {
      this.unloadChunk(chunkId);
    }
    
    this.loadingQueue.clear();
    this.unloadingQueue.clear();
    this.streamingState.loadingChunks.clear();
    this.streamingState.pendingUnloads.clear();
  }

  public getMemoryUsage(): {
    activeChunks: number;
    loadingChunks: number;
    totalMemory: number;
    averageChunkSize: number;
  } {
    let totalMemory = 0;
    
    for (const chunk of this.streamingState.activeChunks.values()) {
      totalMemory += chunk.getMemoryUsage();
    }

    return {
      activeChunks: this.streamingState.activeChunks.size,
      loadingChunks: this.streamingState.loadingChunks.size,
      totalMemory,
      averageChunkSize: this.streamingState.activeChunks.size > 0 ? totalMemory / this.streamingState.activeChunks.size : 0
    };
  }

  public getStatistics(): {
    activeChunks: number;
    loadingChunks: number;
    pendingUnloads: number;
    memoryUsage: number;
    centerPosition: { x: number; z: number };
    loadRadius: number;
  } {
    const memoryStats = this.getMemoryUsage();
    
    return {
      activeChunks: memoryStats.activeChunks,
      loadingChunks: memoryStats.loadingChunks,
      pendingUnloads: this.streamingState.pendingUnloads.size,
      memoryUsage: memoryStats.totalMemory,
      centerPosition: {
        x: this.streamingState.centerX,
        z: this.streamingState.centerZ
      },
      loadRadius: this.streamingState.loadRadius
    };
  }

  public setLoadRadius(radius: number): void {
    this.streamingState.loadRadius = radius;
    this.streamingState.unloadRadius = radius * 1.5;
  }

  public dispose(): void {
    this.unloadAll();
    this.heightmapLoader.clearCache();
  }
}