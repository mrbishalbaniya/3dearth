import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { EventBus } from '../core/EventBus';
import { Logger } from '../core/Logger';
import { LightingSystem } from './lighting/LightingSystem';
import { MaterialSystem } from './materials/MaterialSystem';
import { PostProcessPipeline } from './post-processing/PostProcessPipeline';
import { ShadowSystem } from './lighting/ShadowSystem';
import { CameraManager } from './camera/CameraManager';
import { CullingSystem } from './culling/CullingSystem';

export class RenderEngine {
  private engine: Engine;
  private scene: Scene;
  private eventBus: EventBus;
  private logger: Logger;
  private lightingSystem: LightingSystem;
  private materialSystem: MaterialSystem;
  private postProcessPipeline: PostProcessPipeline;
  private shadowSystem: ShadowSystem;
  private cameraManager: CameraManager;
  private cullingSystem: CullingSystem;
  private initialized: boolean = false;

  constructor(engine: Engine, scene: Scene) {
    this.engine = engine;
    this.scene = scene;
    this.eventBus = EventBus.getInstance();
    this.logger = Logger.getInstance();
    
    this.lightingSystem = new LightingSystem(this.scene);
    this.materialSystem = new MaterialSystem(this.scene);
    this.postProcessPipeline = new PostProcessPipeline(this.scene);
    this.shadowSystem = new ShadowSystem(this.scene);
    this.cameraManager = new CameraManager(this.scene);
    this.cullingSystem = new CullingSystem(this.scene);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info('Initializing Render Engine', 'Rendering');

      await this.lightingSystem.initialize();
      await this.materialSystem.initialize();
      await this.postProcessPipeline.initialize();
      await this.shadowSystem.initialize();
      await this.cameraManager.initialize();
      await this.cullingSystem.initialize();

      this.setupRenderLoop();
      this.initialized = true;

      this.logger.info('Render Engine initialized successfully', 'Rendering');
    } catch (error) {
      this.logger.error('Failed to initialize Render Engine', 'Rendering', error);
      throw error;
    }
  }

  private setupRenderLoop(): void {
    this.scene.registerBeforeRender(() => {
      this.preRender();
    });

    this.scene.registerAfterRender(() => {
      this.postRender();
    });
  }

  private preRender(): void {
    this.cullingSystem.performCulling();
    this.lightingSystem.updateLights();
    this.shadowSystem.updateShadows();
  }

  private postRender(): void {
    this.postProcessPipeline.process();
  }

  public update(deltaTime: number): void {
    if (!this.initialized) {
      return;
    }

    this.lightingSystem.update(deltaTime);
    this.materialSystem.update(deltaTime);
    this.cameraManager.update(deltaTime);
  }

  public resize(width: number, height: number): void {
    this.postProcessPipeline.resize(width, height);
    this.cameraManager.handleResize(width, height);
  }

  public getLightingSystem(): LightingSystem {
    return this.lightingSystem;
  }

  public getMaterialSystem(): MaterialSystem {
    return this.materialSystem;
  }

  public getPostProcessPipeline(): PostProcessPipeline {
    return this.postProcessPipeline;
  }

  public getShadowSystem(): ShadowSystem {
    return this.shadowSystem;
  }

  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  public getCullingSystem(): CullingSystem {
    return this.cullingSystem;
  }

  public setQuality(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.logger.info(`Setting render quality to: ${level}`, 'Rendering');
    
    this.shadowSystem.setQuality(level);
    this.postProcessPipeline.setQuality(level);
    this.materialSystem.setQuality(level);
  }

  public enableFeature(feature: string, enabled: boolean): void {
    switch (feature) {
      case 'shadows':
        this.shadowSystem.setEnabled(enabled);
        break;
      case 'postProcessing':
        this.postProcessPipeline.setEnabled(enabled);
        break;
      case 'culling':
        this.cullingSystem.setEnabled(enabled);
        break;
      default:
        this.logger.warning(`Unknown render feature: ${feature}`, 'Rendering');
        break;
    }
  }

  public getMemoryUsage(): number {
    const info = this.engine.getInfo();
    return info.memory.geometries + info.memory.textures;
  }

  public getDrawCalls(): number {
    return this.engine.drawCalls;
  }

  public dispose(): void {
    this.logger.info('Disposing Render Engine', 'Rendering');
    
    this.cullingSystem.dispose();
    this.cameraManager.dispose();
    this.shadowSystem.dispose();
    this.postProcessPipeline.dispose();
    this.materialSystem.dispose();
    this.lightingSystem.dispose();
    
    this.initialized = false;
  }
}