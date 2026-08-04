import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Observable } from '@babylonjs/core/Misc/observable';

import { TerrainConfig, HeightmapSource, LODSettings, TerrainStreamingState } from './types/TerrainTypes';
import { HeightmapLoader } from './core/HeightmapLoader';
import { TerrainChunk } from './core/TerrainChunk';
import { QuadTree } from './core/QuadTree';
import { ChunkManager } from './core/ChunkManager';
import { FrustumCuller } from './core/FrustumCuller';
import { TerrainStitcher } from './core/TerrainStitcher';
import { InstancedRenderer } from './core/InstancedRenderer';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';

export class TerrainStreamingEngine {
  private scene: Scene;
  private camera: Camera;
  private config: TerrainConfig;
  private heightmapSource: HeightmapSource;
  
  private heightmapLoader: HeightmapLoader;
  private chunkManager: ChunkManager;
  private quadTree: QuadTree;
  private frustumCuller: FrustumCuller;
  private terrainStitcher: TerrainStitcher;
  private instancedRenderer: InstancedRenderer;
  
  private logger = Logger.getInstance();
  private eventBus = EventBus.getInstance();
  
  private isInitialized = false;
  private isEnabled = true;
  private updateInterval = 16; // ~60fps
  private lastUpdateTime = 0;
  
  public onChunkLoaded = new Observable<TerrainChunk>();
  public onChunkUnloaded = new Observable<TerrainChunk>();
  public onLODChanged = new Observable<{ oldLevel: number; newLevel: number; chunks: TerrainChunk[] }>();

  constructor(scene: Scene, camera: Camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Default configuration
    this.config = {
      chunkSize: 1024,
      heightScale: 100,
      maxLOD: 6,
      lodDistance: [500, 1000, 2000, 4000, 8000, 16000],
      heightmapResolution: 65,
      textureResolution: 512,
      maxChunksInMemory: 100,
      frustumCullingEnabled: true,
      stitchingEnabled: true,
      instancedRenderingEnabled: true
    };
    
    // Default heightmap source
    this.heightmapSource = {
      type: 'procedural',
      source: this.defaultHeightmapGenerator.bind(this),
      format: 'raw',
      tileSize: this.config.chunkSize,
      overlap: 0
    };
    
    this.initializeComponents();
    this.setupEventHandlers();
  }

  private initializeComponents(): void {
    // Initialize core components
    this.heightmapLoader = new HeightmapLoader();
    this.frustumCuller = new FrustumCuller();
    this.terrainStitcher = new TerrainStitcher();
    this.instancedRenderer = new InstancedRenderer(this.scene);
    
    // Initialize managers
    this.chunkManager = new ChunkManager(
      this.scene,
      this.config,
      this.heightmapSource,
      this.heightmapLoader
    );
    
    // Initialize QuadTree with world bounds
    const worldBounds = {
      min: { x: -32768, y: 0, z: -32768 },
      max: { x: 32768, y: 8848, z: 32768 }
    };
    
    const lodSettings: LODSettings[] = this.config.lodDistance.map((distance, index) => ({
      level: index,
      distance,
      resolution: Math.max(17, 65 - index * 8),
      vertexCount: Math.max(17, 65 - index * 8)
    }));
    
    this.quadTree = new QuadTree(worldBounds, this.config.maxLOD, lodSettings);
  }

  private setupEventHandlers(): void {
    // Listen for chunk events
    this.eventBus.on('chunkLoaded', (data: any) => {
      this.onChunkLoaded.notifyObservers(data.chunk);
    });
    
    this.eventBus.on('chunkUnloaded', (data: any) => {
      this.onChunkUnloaded.notifyObservers(data.chunk);
    });
    
    // Scene render loop integration
    this.scene.registerBeforeRender(() => {
      if (this.isEnabled) {
        this.update();
      }
    });
  }

  private defaultHeightmapGenerator(x: number, z: number): number {
    // Generate procedural terrain using multiple octaves of noise
    const scale = 0.001;
    const amplitude = 100;
    
    let height = 0;
    let freq = scale;
    let amp = amplitude;
    
    for (let i = 0; i < 4; i++) {
      height += this.noise(x * freq, z * freq) * amp;
      freq *= 2;
      amp *= 0.5;
    }
    
    return height;
  }

  private noise(x: number, z: number): number {
    // Simple noise function - replace with proper noise library in production
    return Math.sin(x) * Math.cos(z) * 0.5 + 
           Math.sin(x * 2.1) * Math.cos(z * 2.3) * 0.25 +
           Math.sin(x * 4.3) * Math.cos(z * 4.7) * 0.125;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('Initializing terrain streaming engine...');

    try {
      // Initialize camera position if not set
      if (!this.camera.position) {
        this.camera.position = new Vector3(0, 1000, 0);
      }

      // Preload initial chunks around camera
      const cameraPos = this.camera.position;
      await this.chunkManager.preloadArea(cameraPos.x, cameraPos.z, this.config.chunkSize * 2);

      this.isInitialized = true;
      this.logger.info('Terrain streaming engine initialized');
      
      this.eventBus.emit('terrainEngineInitialized', { engine: this });
      
    } catch (error) {
      this.logger.error('Failed to initialize terrain streaming engine:', error);
      throw error;
    }
  }

  public update(): void {
    if (!this.isInitialized || !this.isEnabled) {
      return;
    }

    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;

    try {
      const cameraPosition = this.camera.position;
      
      // Update frustum culling
      if (this.config.frustumCullingEnabled) {
        this.frustumCuller.updateFrustum(this.camera);
      }
      
      // Update QuadTree LOD
      this.quadTree.update(cameraPosition, this.frustumCuller.getFrustumPlanes());
      
      // Update chunk streaming
      this.chunkManager.update(cameraPosition);
      
      // Get visible chunks
      const visibleChunks = this.getVisibleChunks();
      
      // Apply terrain stitching
      if (this.config.stitchingEnabled && visibleChunks.length > 1) {
        this.terrainStitcher.stitchChunks(visibleChunks);
      }
      
      // Update instanced rendering
      if (this.config.instancedRenderingEnabled) {
        this.instancedRenderer.updateInstancesForChunks(visibleChunks);
      }
      
    } catch (error) {
      this.logger.error('Error during terrain update:', error);
    }
  }

  public getVisibleChunks(): TerrainChunk[] {
    if (!this.config.frustumCullingEnabled) {
      return this.chunkManager.getLoadedChunks();
    }

    const allChunks = this.chunkManager.getLoadedChunks();
    const visibleChunks: TerrainChunk[] = [];
    
    for (const chunk of allChunks) {
      if (chunk.isVisible(this.camera.position, this.frustumCuller.getFrustumPlanes())) {
        chunk.updateAccessTime();
        visibleChunks.push(chunk);
      }
    }
    
    return visibleChunks;
  }

  public setConfiguration(config: Partial<TerrainConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update load radius based on new config
    if (config.chunkSize || config.maxLOD) {
      this.chunkManager.setLoadRadius(this.config.chunkSize * Math.pow(2, this.config.maxLOD));
    }
  }

  public setHeightmapSource(source: HeightmapSource): void {
    this.heightmapSource = source;
    
    // Clear caches to force reload with new source
    this.heightmapLoader.clearCache();
    this.chunkManager.unloadAll();
  }

  public getHeightAtPosition(x: number, z: number): number {
    const chunk = this.chunkManager.getChunkAt(x, z);
    if (!chunk || !chunk.heightData) {
      return this.defaultHeightmapGenerator(x, z);
    }
    
    // Calculate local coordinates within chunk
    const localX = x - chunk.worldPosition.x;
    const localZ = z - chunk.worldPosition.z;
    
    const resolution = Math.sqrt(chunk.heightData.length);
    const u = localX / chunk.size;
    const v = localZ / chunk.size;
    
    const gridX = Math.floor(u * (resolution - 1));
    const gridZ = Math.floor(v * (resolution - 1));
    
    if (gridX < 0 || gridX >= resolution || gridZ < 0 || gridZ >= resolution) {
      return 0;
    }
    
    return chunk.heightData[gridZ * resolution + gridX];
  }

  public addVegetationType(name: string, meshTemplate: any, maxInstances: number = 1000): void {
    this.instancedRenderer.registerObjectType(name, meshTemplate, maxInstances);
  }

  public generateVegetation(typeName: string, density: number = 0.1): void {
    const visibleChunks = this.getVisibleChunks();
    this.instancedRenderer.addVegetation(visibleChunks, typeName, density);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isEngineEnabled(): boolean {
    return this.isEnabled;
  }

  public getStatistics(): {
    quadTree: any;
    chunkManager: any;
    instancedRenderer: any;
    memoryUsage: number;
    visibleChunks: number;
    totalChunks: number;
  } {
    const quadTreeStats = this.quadTree.getStatistics();
    const chunkStats = this.chunkManager.getStatistics();
    const rendererStats = this.instancedRenderer.getStatistics();
    const visibleChunks = this.getVisibleChunks();
    
    return {
      quadTree: quadTreeStats,
      chunkManager: chunkStats,
      instancedRenderer: rendererStats,
      memoryUsage: quadTreeStats.memoryUsage + chunkStats.memoryUsage,
      visibleChunks: visibleChunks.length,
      totalChunks: chunkStats.activeChunks
    };
  }

  public getConfiguration(): TerrainConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.logger.info('Disposing terrain streaming engine...');
    
    this.isEnabled = false;
    
    // Dispose components
    this.chunkManager.dispose();
    this.instancedRenderer.dispose();
    this.terrainStitcher.clearStitching();
    this.quadTree.clear();
    
    // Clear observables
    this.onChunkLoaded.clear();
    this.onChunkUnloaded.clear();
    this.onLODChanged.clear();
    
    // Remove event listeners
    this.eventBus.off('chunkLoaded');
    this.eventBus.off('chunkUnloaded');
    
    this.isInitialized = false;
    
    this.logger.info('Terrain streaming engine disposed');
  }
}