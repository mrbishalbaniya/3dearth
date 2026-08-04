import { Scene as BabylonScene, Engine as BabylonEngine } from '@babylonjs/core';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { EventBus } from '../core/EventBus';
import { EngineEvent } from '../types/Events';
import { Logger } from '../core/Logger';

export interface SceneConfig {
  name: string;
  clearColor?: { r: number; g: number; b: number; a: number };
  ambientColor?: { r: number; g: number; b: number };
  fogEnabled?: boolean;
  fogColor?: { r: number; g: number; b: number };
  fogDensity?: number;
  fogStart?: number;
  fogEnd?: number;
  physicsEnabled?: boolean;
  audioEnabled?: boolean;
}

export class Scene {
  public readonly id: string;
  public readonly name: string;
  public babylonScene: BabylonScene;
  public world: World;
  
  private eventBus = EventBus.getInstance();
  private logger = Logger.getInstance();
  private entities = new Map<string, Entity>();
  private active = false;
  private loaded = false;
  private config: SceneConfig;

  constructor(
    engine: BabylonEngine,
    config: SceneConfig
  ) {
    this.id = crypto.randomUUID();
    this.name = config.name;
    this.config = config;
    
    this.babylonScene = new BabylonScene(engine);
    this.world = new World();
    
    this.initialize();
  }

  private initialize(): void {
    this.setupBabylonScene();
    this.setupEventListeners();
    this.world.initialize();
    
    this.logger.info(`Scene ${this.name} initialized`);
  }

  private setupBabylonScene(): void {
    if (this.config.clearColor) {
      const color = this.config.clearColor;
      this.babylonScene.clearColor.set(color.r, color.g, color.b, color.a);
    }

    if (this.config.ambientColor) {
      const color = this.config.ambientColor;
      this.babylonScene.ambientColor.set(color.r, color.g, color.b);
    }

    if (this.config.fogEnabled) {
      this.babylonScene.fogEnabled = true;
      if (this.config.fogColor) {
        const color = this.config.fogColor;
        this.babylonScene.fogColor.set(color.r, color.g, color.b);
      }
      if (this.config.fogDensity !== undefined) {
        this.babylonScene.fogDensity = this.config.fogDensity;
      }
      if (this.config.fogStart !== undefined) {
        this.babylonScene.fogStart = this.config.fogStart;
      }
      if (this.config.fogEnd !== undefined) {
        this.babylonScene.fogEnd = this.config.fogEnd;
      }
    }

    this.babylonScene.registerBeforeRender(() => {
      if (this.active) {
        this.update();
      }
    });
  }

  private setupEventListeners(): void {
    this.eventBus.on(EngineEvent.ENTITY_ADDED, (data: any) => {
      if (data.world === this.world) {
        this.onEntityAdded(data.entity);
      }
    });

    this.eventBus.on(EngineEvent.ENTITY_REMOVED, (data: any) => {
      if (data.world === this.world) {
        this.onEntityRemoved(data.entity);
      }
    });
  }

  public load(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.world.start();
        this.loaded = true;
        
        this.eventBus.emit(EngineEvent.SCENE_LOADED, { scene: this });
        this.logger.info(`Scene ${this.name} loaded`);
        resolve();
      } catch (error) {
        this.logger.error(`Failed to load scene ${this.name}:`, error);
        reject(error);
      }
    });
  }

  public unload(): Promise<void> {
    return new Promise((resolve) => {
      this.world.stop();
      this.active = false;
      this.loaded = false;
      
      for (const entity of this.entities.values()) {
        this.removeEntityFromScene(entity);
      }
      
      this.eventBus.emit(EngineEvent.SCENE_UNLOADED, { scene: this });
      this.logger.info(`Scene ${this.name} unloaded`);
      resolve();
    });
  }

  public activate(): void {
    if (!this.loaded) {
      throw new Error(`Cannot activate scene ${this.name}: not loaded`);
    }
    
    this.active = true;
    this.eventBus.emit(EngineEvent.SCENE_ACTIVATED, { scene: this });
    this.logger.info(`Scene ${this.name} activated`);
  }

  public deactivate(): void {
    this.active = false;
    this.eventBus.emit(EngineEvent.SCENE_DEACTIVATED, { scene: this });
    this.logger.info(`Scene ${this.name} deactivated`);
  }

  public update(): void {
    if (!this.active || !this.loaded) {
      return;
    }

    const deltaTime = this.babylonScene.getEngine().getDeltaTime() / 1000;
    this.world.update(deltaTime);
  }

  public addEntity(entity: Entity): Entity {
    this.world.addEntity(entity);
    return entity;
  }

  public removeEntity(entityId: string): boolean {
    return this.world.removeEntity(entityId);
  }

  public getEntity(entityId: string): Entity | null {
    return this.world.getEntity(entityId);
  }

  public createEntity(name?: string): Entity {
    return this.world.createEntity(name);
  }

  public findEntitiesByTag(tag: string): Entity[] {
    return this.world.getEntitiesByTag(tag);
  }

  public findEntitiesByLayer(layer: number): Entity[] {
    return this.world.getEntitiesByLayer(layer);
  }

  public getAllEntities(): Entity[] {
    return this.world.getAllEntities();
  }

  public getEntityCount(): number {
    return this.world.getEntityCount();
  }

  public destroy(): Promise<void> {
    return new Promise((resolve) => {
      this.deactivate();
      
      if (this.loaded) {
        this.unload().then(() => {
          this.world.shutdown();
          this.babylonScene.dispose();
          this.eventBus.emit(EngineEvent.SCENE_DESTROYED, { scene: this });
          this.logger.info(`Scene ${this.name} destroyed`);
          resolve();
        });
      } else {
        this.world.shutdown();
        this.babylonScene.dispose();
        this.eventBus.emit(EngineEvent.SCENE_DESTROYED, { scene: this });
        this.logger.info(`Scene ${this.name} destroyed`);
        resolve();
      }
    });
  }

  public isActive(): boolean {
    return this.active;
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  public getBabylonScene(): BabylonScene {
    return this.babylonScene;
  }

  public getWorld(): World {
    return this.world;
  }

  public getConfig(): SceneConfig {
    return { ...this.config };
  }

  private onEntityAdded(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.addEntityToScene(entity);
  }

  private onEntityRemoved(entity: Entity): void {
    this.entities.delete(entity.id);
    this.removeEntityFromScene(entity);
  }

  private addEntityToScene(entity: Entity): void {
    // Handle adding entity to Babylon.js scene
    // This will be implemented based on specific component types
  }

  private removeEntityFromScene(entity: Entity): void {
    // Handle removing entity from Babylon.js scene
    // This will be implemented based on specific component types
  }

  public serialize(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      config: this.config,
      entities: this.getAllEntities().map(entity => entity.serialize()),
      active: this.active,
      loaded: this.loaded
    };
  }

  public static deserialize(
    engine: BabylonEngine,
    data: Record<string, any>
  ): Scene {
    const scene = new Scene(engine, data.config);
    
    // Deserialize entities would be implemented here
    
    return scene;
  }
}