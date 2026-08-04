import { Scene } from '@babylonjs/core/scene';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Sound } from '@babylonjs/core/Audio/sound';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { AssetReference } from '../types/Core';

export interface AssetLoadResult {
  success: boolean;
  asset?: any;
  error?: string;
}

export class AssetManager {
  private logger: Logger;
  private eventBus: EventBus;
  private assets: Map<string, any>;
  private loadingAssets: Map<string, Promise<AssetLoadResult>>;
  private assetContainers: Map<string, AssetContainer>;
  private loadedTextures: Map<string, Texture>;
  private loadedSounds: Map<string, Sound>;
  private baseUrl: string = '';

  constructor() {
    this.logger = Logger.getInstance();
    this.eventBus = EventBus.getInstance();
    this.assets = new Map();
    this.loadingAssets = new Map();
    this.assetContainers = new Map();
    this.loadedTextures = new Map();
    this.loadedSounds = new Map();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Asset Manager', 'Assets');
    
    this.setupLoaders();
    
    this.logger.info('Asset Manager initialized', 'Assets');
  }

  private setupLoaders(): void {
    // Enable GLTF loader
    import('@babylonjs/loaders/glTF');
    
    // Enable OBJ loader
    import('@babylonjs/loaders/OBJ');
    
    // Enable other loaders as needed
    import('@babylonjs/loaders/STL');
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.endsWith('/') ? url : url + '/';
  }

  public async loadMesh(id: string, fileName: string, scene: Scene, meshName?: string): Promise<AssetLoadResult> {
    if (this.assets.has(id)) {
      return { success: true, asset: this.assets.get(id) };
    }

    if (this.loadingAssets.has(id)) {
      return await this.loadingAssets.get(id)!;
    }

    const loadPromise = this.performMeshLoad(id, fileName, scene, meshName);
    this.loadingAssets.set(id, loadPromise);

    const result = await loadPromise;
    this.loadingAssets.delete(id);

    this.emitAssetLoadEvent(id, result.success, result.error);
    return result;
  }

  private async performMeshLoad(id: string, fileName: string, scene: Scene, meshName?: string): Promise<AssetLoadResult> {
    try {
      const url = this.baseUrl + fileName;
      const result = await SceneLoader.ImportMeshAsync(meshName || '', '', url, scene);
      
      const container = new AssetContainer(scene);
      result.meshes.forEach(mesh => container.meshes.push(mesh));
      result.materials.forEach(material => container.materials.push(material));
      result.textures.forEach(texture => container.textures.push(texture));
      
      this.assetContainers.set(id, container);
      this.assets.set(id, result.meshes);
      
      this.logger.debug(`Loaded mesh: ${id}`, 'Assets');
      return { success: true, asset: result.meshes };
    } catch (error) {
      const errorMessage = `Failed to load mesh ${id}: ${error}`;
      this.logger.error(errorMessage, 'Assets', error);
      return { success: false, error: errorMessage };
    }
  }

  public async loadTexture(id: string, url: string, scene: Scene): Promise<AssetLoadResult> {
    if (this.loadedTextures.has(id)) {
      return { success: true, asset: this.loadedTextures.get(id) };
    }

    if (this.loadingAssets.has(id)) {
      return await this.loadingAssets.get(id)!;
    }

    const loadPromise = this.performTextureLoad(id, url, scene);
    this.loadingAssets.set(id, loadPromise);

    const result = await loadPromise;
    this.loadingAssets.delete(id);

    this.emitAssetLoadEvent(id, result.success, result.error);
    return result;
  }

  private async performTextureLoad(id: string, url: string, scene: Scene): Promise<AssetLoadResult> {
    return new Promise((resolve) => {
      const fullUrl = this.baseUrl + url;
      const texture = new Texture(fullUrl, scene, true, true, undefined, 
        () => {
          // Success callback
          this.loadedTextures.set(id, texture);
          this.assets.set(id, texture);
          this.logger.debug(`Loaded texture: ${id}`, 'Assets');
          resolve({ success: true, asset: texture });
        },
        (message, exception) => {
          // Error callback
          const errorMessage = `Failed to load texture ${id}: ${message}`;
          this.logger.error(errorMessage, 'Assets', exception);
          resolve({ success: false, error: errorMessage });
        }
      );
    });
  }

  public async loadSound(id: string, url: string, scene: Scene, options?: any): Promise<AssetLoadResult> {
    if (this.loadedSounds.has(id)) {
      return { success: true, asset: this.loadedSounds.get(id) };
    }

    if (this.loadingAssets.has(id)) {
      return await this.loadingAssets.get(id)!;
    }

    const loadPromise = this.performSoundLoad(id, url, scene, options);
    this.loadingAssets.set(id, loadPromise);

    const result = await loadPromise;
    this.loadingAssets.delete(id);

    this.emitAssetLoadEvent(id, result.success, result.error);
    return result;
  }

  private async performSoundLoad(id: string, url: string, scene: Scene, options: any = {}): Promise<AssetLoadResult> {
    return new Promise((resolve) => {
      const fullUrl = this.baseUrl + url;
      
      const sound = new Sound(id, fullUrl, scene, 
        () => {
          // Success callback
          this.loadedSounds.set(id, sound);
          this.assets.set(id, sound);
          this.logger.debug(`Loaded sound: ${id}`, 'Assets');
          resolve({ success: true, asset: sound });
        },
        {
          ...options,
          onError: (sound: Sound, message: string) => {
            const errorMessage = `Failed to load sound ${id}: ${message}`;
            this.logger.error(errorMessage, 'Assets');
            resolve({ success: false, error: errorMessage });
          }
        }
      );
    });
  }

  public async loadMultiple(references: AssetReference[], scene: Scene): Promise<Map<string, AssetLoadResult>> {
    const results = new Map<string, AssetLoadResult>();
    const loadPromises: Promise<void>[] = [];

    for (const ref of references) {
      const promise = this.loadAsset(ref, scene).then(result => {
        results.set(ref.id, result);
      });
      loadPromises.push(promise);
    }

    await Promise.all(loadPromises);
    return results;
  }

  private async loadAsset(reference: AssetReference, scene: Scene): Promise<AssetLoadResult> {
    switch (reference.type) {
      case 'mesh':
        return await this.loadMesh(reference.id, reference.url, scene);
      case 'texture':
        return await this.loadTexture(reference.id, reference.url, scene);
      case 'sound':
        return await this.loadSound(reference.id, reference.url, scene);
      default:
        const errorMessage = `Unknown asset type: ${reference.type}`;
        this.logger.error(errorMessage, 'Assets');
        return { success: false, error: errorMessage };
    }
  }

  public getAsset<T = any>(id: string): T | undefined {
    return this.assets.get(id) as T;
  }

  public hasAsset(id: string): boolean {
    return this.assets.has(id);
  }

  public isLoading(id: string): boolean {
    return this.loadingAssets.has(id);
  }

  public getMesh(id: string): AbstractMesh[] | undefined {
    const asset = this.assets.get(id);
    return Array.isArray(asset) && asset[0] instanceof AbstractMesh ? asset : undefined;
  }

  public getTexture(id: string): Texture | undefined {
    return this.loadedTextures.get(id);
  }

  public getSound(id: string): Sound | undefined {
    return this.loadedSounds.get(id);
  }

  public getAssetContainer(id: string): AssetContainer | undefined {
    return this.assetContainers.get(id);
  }

  public instantiateMesh(id: string): AbstractMesh[] | null {
    const container = this.assetContainers.get(id);
    if (!container) {
      this.logger.warning(`Asset container not found: ${id}`, 'Assets');
      return null;
    }

    const instantiated = container.instantiateModelsToScene();
    this.logger.debug(`Instantiated mesh: ${id}`, 'Assets');
    
    return instantiated.rootNodes as AbstractMesh[];
  }

  public removeAsset(id: string): void {
    const asset = this.assets.get(id);
    if (asset) {
      // Dispose asset based on type
      if (Array.isArray(asset)) {
        asset.forEach(item => {
          if (item && typeof item.dispose === 'function') {
            item.dispose();
          }
        });
      } else if (asset && typeof asset.dispose === 'function') {
        asset.dispose();
      }

      this.assets.delete(id);
    }

    // Clean up related resources
    const container = this.assetContainers.get(id);
    if (container) {
      container.dispose();
      this.assetContainers.delete(id);
    }

    const texture = this.loadedTextures.get(id);
    if (texture) {
      texture.dispose();
      this.loadedTextures.delete(id);
    }

    const sound = this.loadedSounds.get(id);
    if (sound) {
      sound.dispose();
      this.loadedSounds.delete(id);
    }

    this.logger.debug(`Removed asset: ${id}`, 'Assets');
  }

  private emitAssetLoadEvent(assetId: string, success: boolean, error?: string): void {
    this.eventBus.emit('asset_load', {
      type: 'asset_load',
      timestamp: Date.now(),
      assetId,
      success,
      error
    });
  }

  public getLoadedAssetIds(): string[] {
    return Array.from(this.assets.keys());
  }

  public getMemoryUsage(): number {
    let totalMemory = 0;
    
    // Estimate memory usage for textures
    for (const texture of this.loadedTextures.values()) {
      const size = texture.getSize();
      totalMemory += size.width * size.height * 4; // Assume 32-bit textures
    }
    
    return totalMemory;
  }

  public preloadAssets(references: AssetReference[], scene: Scene): Promise<Map<string, AssetLoadResult>> {
    this.logger.info(`Preloading ${references.length} assets`, 'Assets');
    return this.loadMultiple(references, scene);
  }

  public dispose(): void {
    this.logger.info('Disposing Asset Manager', 'Assets');
    
    // Dispose all assets
    for (const id of this.assets.keys()) {
      this.removeAsset(id);
    }
    
    this.assets.clear();
    this.loadingAssets.clear();
    this.assetContainers.clear();
    this.loadedTextures.clear();
    this.loadedSounds.clear();
  }
}