import { Engine as BabylonEngine } from '@babylonjs/core';
import { Scene, SceneConfig } from './Scene';
import { EventBus } from '../core/EventBus';
import { EngineEvent } from '../types/Events';
import { Logger } from '../core/Logger';

export interface SceneTransition {
  type: 'fade' | 'slide' | 'instant';
  duration: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export class SceneManager {
  private static instance: SceneManager | null = null;
  
  private scenes = new Map<string, Scene>();
  private activeScene: Scene | null = null;
  private loadingScene: Scene | null = null;
  private transitionInProgress = false;
  
  private eventBus = EventBus.getInstance();
  private logger = Logger.getInstance();
  private engine: BabylonEngine | null = null;

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  private constructor() {
    this.setupEventListeners();
  }

  public initialize(engine: BabylonEngine): void {
    this.engine = engine;
    this.logger.info('SceneManager initialized');
  }

  public shutdown(): void {
    if (this.transitionInProgress) {
      this.transitionInProgress = false;
    }

    if (this.activeScene) {
      this.activeScene.deactivate();
      this.activeScene.unload();
    }

    const scenePromises = Array.from(this.scenes.values()).map(scene => scene.destroy());
    
    Promise.all(scenePromises).then(() => {
      this.scenes.clear();
      this.activeScene = null;
      this.loadingScene = null;
      this.engine = null;
      
      this.logger.info('SceneManager shutdown complete');
    });
  }

  public createScene(config: SceneConfig): Scene {
    if (!this.engine) {
      throw new Error('SceneManager not initialized: engine is null');
    }

    if (this.scenes.has(config.name)) {
      throw new Error(`Scene with name '${config.name}' already exists`);
    }

    const scene = new Scene(this.engine, config);
    this.scenes.set(config.name, scene);
    
    this.eventBus.emit(EngineEvent.SCENE_CREATED, { scene });
    this.logger.info(`Scene '${config.name}' created`);
    
    return scene;
  }

  public removeScene(sceneName: string): Promise<boolean> {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      return Promise.resolve(false);
    }

    if (scene === this.activeScene) {
      throw new Error(`Cannot remove active scene '${sceneName}'. Switch to another scene first.`);
    }

    return scene.destroy().then(() => {
      this.scenes.delete(sceneName);
      this.logger.info(`Scene '${sceneName}' removed`);
      return true;
    });
  }

  public getScene(sceneName: string): Scene | null {
    return this.scenes.get(sceneName) || null;
  }

  public getAllScenes(): Scene[] {
    return Array.from(this.scenes.values());
  }

  public getActiveScene(): Scene | null {
    return this.activeScene;
  }

  public hasScene(sceneName: string): boolean {
    return this.scenes.has(sceneName);
  }

  public getSceneCount(): number {
    return this.scenes.size;
  }

  public async loadScene(sceneName: string): Promise<Scene> {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      throw new Error(`Scene '${sceneName}' not found`);
    }

    if (scene.isLoaded()) {
      return scene;
    }

    this.loadingScene = scene;
    
    try {
      await scene.load();
      this.loadingScene = null;
      return scene;
    } catch (error) {
      this.loadingScene = null;
      throw error;
    }
  }

  public async activateScene(sceneName: string, transition?: SceneTransition): Promise<Scene> {
    if (this.transitionInProgress) {
      throw new Error('Scene transition already in progress');
    }

    const scene = this.scenes.get(sceneName);
    if (!scene) {
      throw new Error(`Scene '${sceneName}' not found`);
    }

    if (scene === this.activeScene) {
      return scene;
    }

    this.transitionInProgress = true;

    try {
      if (!scene.isLoaded()) {
        await this.loadScene(sceneName);
      }

      if (transition && this.activeScene) {
        await this.performTransition(this.activeScene, scene, transition);
      } else {
        if (this.activeScene) {
          this.activeScene.deactivate();
        }
        scene.activate();
      }

      const previousScene = this.activeScene;
      this.activeScene = scene;
      
      this.eventBus.emit(EngineEvent.SCENE_CHANGED, {
        previousScene,
        currentScene: scene
      });

      this.logger.info(`Scene switched to '${sceneName}'`);
      return scene;
    } finally {
      this.transitionInProgress = false;
    }
  }

  public async switchToScene(sceneName: string, transition?: SceneTransition): Promise<Scene> {
    return this.activateScene(sceneName, transition);
  }

  public preloadScene(sceneName: string): Promise<Scene> {
    return this.loadScene(sceneName);
  }

  public preloadScenes(sceneNames: string[]): Promise<Scene[]> {
    const promises = sceneNames.map(name => this.loadScene(name));
    return Promise.all(promises);
  }

  public unloadScene(sceneName: string): Promise<boolean> {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      return Promise.resolve(false);
    }

    if (scene === this.activeScene) {
      throw new Error(`Cannot unload active scene '${sceneName}'. Switch to another scene first.`);
    }

    if (!scene.isLoaded()) {
      return Promise.resolve(true);
    }

    return scene.unload().then(() => {
      this.logger.info(`Scene '${sceneName}' unloaded`);
      return true;
    });
  }

  public unloadAllScenes(except?: string[]): Promise<void> {
    const exceptSet = new Set(except || []);
    const promises: Promise<any>[] = [];

    for (const [name, scene] of this.scenes) {
      if (!exceptSet.has(name) && scene !== this.activeScene && scene.isLoaded()) {
        promises.push(this.unloadScene(name));
      }
    }

    return Promise.all(promises).then(() => {
      this.logger.info('Unused scenes unloaded');
    });
  }

  public isTransitioning(): boolean {
    return this.transitionInProgress;
  }

  private async performTransition(
    fromScene: Scene,
    toScene: Scene,
    transition: SceneTransition
  ): Promise<void> {
    this.eventBus.emit(EngineEvent.SCENE_TRANSITION_STARTED, {
      fromScene,
      toScene,
      transition
    });

    switch (transition.type) {
      case 'instant':
        fromScene.deactivate();
        toScene.activate();
        break;
      
      case 'fade':
        await this.performFadeTransition(fromScene, toScene, transition);
        break;
        
      case 'slide':
        await this.performSlideTransition(fromScene, toScene, transition);
        break;
        
      default:
        fromScene.deactivate();
        toScene.activate();
    }

    this.eventBus.emit(EngineEvent.SCENE_TRANSITION_COMPLETED, {
      fromScene,
      toScene,
      transition
    });
  }

  private async performFadeTransition(
    fromScene: Scene,
    toScene: Scene,
    transition: SceneTransition
  ): Promise<void> {
    return new Promise((resolve) => {
      const halfDuration = transition.duration / 2;
      
      setTimeout(() => {
        fromScene.deactivate();
        toScene.activate();
        
        setTimeout(() => {
          resolve();
        }, halfDuration);
      }, halfDuration);
    });
  }

  private async performSlideTransition(
    fromScene: Scene,
    toScene: Scene,
    transition: SceneTransition
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        fromScene.deactivate();
        toScene.activate();
        resolve();
      }, transition.duration);
    });
  }

  private setupEventListeners(): void {
    this.eventBus.on(EngineEvent.SCENE_LOADED, (data: any) => {
      this.logger.debug(`Scene '${data.scene.name}' loaded`);
    });

    this.eventBus.on(EngineEvent.SCENE_UNLOADED, (data: any) => {
      this.logger.debug(`Scene '${data.scene.name}' unloaded`);
    });

    this.eventBus.on(EngineEvent.SCENE_ACTIVATED, (data: any) => {
      this.logger.debug(`Scene '${data.scene.name}' activated`);
    });

    this.eventBus.on(EngineEvent.SCENE_DEACTIVATED, (data: any) => {
      this.logger.debug(`Scene '${data.scene.name}' deactivated`);
    });
  }

  public getMemoryUsage(): {
    totalScenes: number;
    loadedScenes: number;
    activeScene: string | null;
    memoryEstimate: number;
  } {
    let loadedCount = 0;
    let memoryEstimate = 0;

    for (const scene of this.scenes.values()) {
      if (scene.isLoaded()) {
        loadedCount++;
        memoryEstimate += scene.getEntityCount() * 1024; // Rough estimate
      }
    }

    return {
      totalScenes: this.scenes.size,
      loadedScenes: loadedCount,
      activeScene: this.activeScene?.name || null,
      memoryEstimate
    };
  }
}