import '@babylonjs/loaders/glTF';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Sound } from '@babylonjs/core/Audio/sound';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Scene } from '@babylonjs/core/scene';

export class AssetLoader {
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public async loadGLTF(url: string): Promise<AssetContainer> {
    return SceneLoader.LoadAssetContainerAsync(url, undefined, this.scene);
  }

  public async loadGLB(url: string): Promise<AssetContainer> {
    return SceneLoader.LoadAssetContainerAsync(url, undefined, this.scene);
  }

  public async importMesh(url: string): Promise<{
    meshes: AbstractMesh[];
    transformNodes: TransformNode[];
  }> {
    const result = await SceneLoader.ImportMeshAsync('', url, undefined, this.scene);
    return {
      meshes: result.meshes,
      transformNodes: result.transformNodes,
    };
  }

  public async loadHDR(url: string): Promise<HDRCubeTexture> {
    return new Promise((resolve, reject) => {
      const texture = new HDRCubeTexture(
        url,
        this.scene,
        512,
        false,
        true,
        false,
        true,
        () => resolve(texture)
      );
      texture.onLoadObservable.addOnce(() => resolve(texture));

      let elapsedMs = 0;
      const timeoutMs = 15000;
      const observer = this.scene.onBeforeRenderObservable.add(() => {
        if (texture.isReady()) {
          this.scene.onBeforeRenderObservable.remove(observer);
          resolve(texture);
          return;
        }

        elapsedMs += this.scene.getEngine().getDeltaTime();
        if (elapsedMs >= timeoutMs) {
          this.scene.onBeforeRenderObservable.remove(observer);
          reject(new Error(`Failed to load HDR within timeout: ${url}`));
        }
      });
    });
  }

  public async loadEnvironment(url: string): Promise<CubeTexture> {
    return new Promise((resolve, reject) => {
      const texture = CubeTexture.CreateFromPrefilteredData(url, this.scene);
      if (!texture) {
        reject(new Error(`Failed to create environment texture from ${url}`));
        return;
      }

      if (texture.isReady()) {
        resolve(texture);
        return;
      }

      texture.onLoadObservable.addOnce(() => resolve(texture));

      let elapsedMs = 0;
      const timeoutMs = 15000;
      const observer = this.scene.onBeforeRenderObservable.add(() => {
        if (texture.isReady()) {
          this.scene.onBeforeRenderObservable.remove(observer);
          resolve(texture);
          return;
        }

        elapsedMs += this.scene.getEngine().getDeltaTime();
        if (elapsedMs >= timeoutMs) {
          this.scene.onBeforeRenderObservable.remove(observer);
          reject(new Error(`Failed to load environment texture within timeout: ${url}`));
        }
      });
    });
  }

  public async loadTexture(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const texture = new Texture(url, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, () => {
        resolve(texture);
      }, (message, exception) => {
        reject(exception ?? new Error(message));
      });
    });
  }

  public async loadAudio(name: string, url: string, spatial = false): Promise<Sound> {
    return new Promise((resolve, reject) => {
      const sound = new Sound(
        name,
        url,
        this.scene,
        () => resolve(sound),
        {
          spatialSound: spatial,
          autoplay: false,
        },
        (_sound, error) => {
          reject(error ?? new Error(`Failed to load sound asset: ${url}`));
        }
      );
    });
  }
}
