import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import type { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Sound } from '@babylonjs/core/Audio/sound';
import type { Scene } from '@babylonjs/core/scene';
import { AssetLoader } from '../assets/AssetLoader';
import type { Lifecycle } from '../core/Lifecycle';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';

export class AssetManager implements Lifecycle {
  private readonly loader: AssetLoader;
  private readonly events: EventSystem<WorldEventMap>;
  private readonly gltfCache = new Map<string, AssetContainer>();
  private readonly hdrCache = new Map<string, HDRCubeTexture>();
  private readonly envCache = new Map<string, CubeTexture>();
  private readonly textureCache = new Map<string, Texture>();
  private readonly audioCache = new Map<string, Sound>();

  constructor(scene: Scene, events: EventSystem<WorldEventMap>) {
    this.loader = new AssetLoader(scene);
    this.events = events;
  }

  public async initialize(): Promise<void> {
    return Promise.resolve();
  }

  public async loadGLTF(url: string): Promise<AssetContainer> {
    if (this.gltfCache.has(url)) {
      return this.gltfCache.get(url)!;
    }
    const asset = await this.loader.loadGLTF(url);
    this.gltfCache.set(url, asset);
    this.events.emit('asset:loaded', { id: url, type: 'gltf' });
    return asset;
  }

  public async loadGLB(url: string): Promise<AssetContainer> {
    if (this.gltfCache.has(url)) {
      return this.gltfCache.get(url)!;
    }
    const asset = await this.loader.loadGLB(url);
    this.gltfCache.set(url, asset);
    this.events.emit('asset:loaded', { id: url, type: 'glb' });
    return asset;
  }

  public async loadHDR(url: string): Promise<HDRCubeTexture> {
    if (this.hdrCache.has(url)) {
      return this.hdrCache.get(url)!;
    }
    const hdr = await this.loader.loadHDR(url);
    this.hdrCache.set(url, hdr);
    this.events.emit('asset:loaded', { id: url, type: 'hdr' });
    return hdr;
  }

  public async loadEnvironment(url: string): Promise<CubeTexture> {
    if (this.envCache.has(url)) {
      return this.envCache.get(url)!;
    }
    const env = await this.loader.loadEnvironment(url);
    this.envCache.set(url, env);
    this.events.emit('asset:loaded', { id: url, type: 'env' });
    return env;
  }

  public async loadTexture(url: string): Promise<Texture> {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }
    const texture = await this.loader.loadTexture(url);
    this.textureCache.set(url, texture);
    this.events.emit('asset:loaded', { id: url, type: 'texture' });
    return texture;
  }

  public async loadAudio(name: string, url: string, spatial = false): Promise<Sound> {
    const key = `${name}:${url}:${spatial ? 'spatial' : 'flat'}`;
    if (this.audioCache.has(key)) {
      return this.audioCache.get(key)!;
    }
    const sound = await this.loader.loadAudio(name, url, spatial);
    this.audioCache.set(key, sound);
    this.events.emit('asset:loaded', { id: key, type: 'audio' });
    return sound;
  }

  public dispose(): void {
    for (const asset of this.gltfCache.values()) {
      asset.dispose();
    }
    for (const hdr of this.hdrCache.values()) {
      hdr.dispose();
    }
    for (const env of this.envCache.values()) {
      env.dispose();
    }
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    for (const sound of this.audioCache.values()) {
      sound.dispose();
    }

    this.gltfCache.clear();
    this.hdrCache.clear();
    this.envCache.clear();
    this.textureCache.clear();
    this.audioCache.clear();
  }
}
