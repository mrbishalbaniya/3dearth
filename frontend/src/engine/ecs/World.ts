import { Entity } from './Entity';
import { System } from './System';
import { Component } from './Component';
import { EventBus } from '../core/EventBus';
import { EngineEvent } from '../types/Events';

export class World {
  private static instance: World | null = null;
  
  private entities = new Map<string, Entity>();
  private systems = new Map<string, System>();
  private systemsByPriority: System[] = [];
  private entitiesByTag = new Map<string, Set<Entity>>();
  private entitiesByLayer = new Map<number, Set<Entity>>();
  
  private eventBus = EventBus.getInstance();
  private running = false;
  private entityCount = 0;

  public static getInstance(): World {
    if (!World.instance) {
      World.instance = new World();
    }
    return World.instance;
  }

  private constructor() {
    this.setupEventListeners();
  }

  public initialize(): void {
    for (const system of this.systems.values()) {
      system.initialize();
    }
    
    this.eventBus.emit(EngineEvent.WORLD_INITIALIZED, { world: this });
  }

  public shutdown(): void {
    this.running = false;
    
    for (const system of this.systems.values()) {
      system.shutdown();
    }
    
    this.destroyAllEntities();
    this.systems.clear();
    this.systemsByPriority = [];
    
    this.eventBus.emit(EngineEvent.WORLD_SHUTDOWN, { world: this });
  }

  public start(): void {
    this.running = true;
    this.eventBus.emit(EngineEvent.WORLD_STARTED, { world: this });
  }

  public stop(): void {
    this.running = false;
    this.eventBus.emit(EngineEvent.WORLD_STOPPED, { world: this });
  }

  public update(deltaTime: number): void {
    if (!this.running) {
      return;
    }

    for (const system of this.systemsByPriority) {
      if (system.isEnabled()) {
        system.update(deltaTime);
      }
    }
  }

  public addEntity(entity: Entity): Entity {
    if (this.entities.has(entity.id)) {
      throw new Error(`Entity with id ${entity.id} already exists in world`);
    }

    this.entities.set(entity.id, entity);
    this.entityCount++;

    if (entity.tag) {
      this.addEntityToTag(entity);
    }

    this.addEntityToLayer(entity);

    for (const system of this.systems.values()) {
      system.addEntity(entity);
    }

    this.eventBus.emit(EngineEvent.ENTITY_ADDED, { entity, world: this });
    return entity;
  }

  public removeEntity(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    for (const system of this.systems.values()) {
      system.removeEntity(entity);
    }

    this.removeEntityFromTag(entity);
    this.removeEntityFromLayer(entity);

    entity.destroy();
    this.entities.delete(entityId);
    this.entityCount--;

    this.eventBus.emit(EngineEvent.ENTITY_REMOVED, { entity, world: this });
    return true;
  }

  public getEntity(entityId: string): Entity | null {
    return this.entities.get(entityId) || null;
  }

  public getEntitiesByTag(tag: string): Entity[] {
    const entities = this.entitiesByTag.get(tag);
    return entities ? Array.from(entities) : [];
  }

  public getEntitiesByLayer(layer: number): Entity[] {
    const entities = this.entitiesByLayer.get(layer);
    return entities ? Array.from(entities) : [];
  }

  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  public getEntityCount(): number {
    return this.entityCount;
  }

  public findEntitiesWithComponent(componentType: any): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.hasComponentByClass(componentType)) {
        result.push(entity);
      }
    }
    return result;
  }

  public createEntity(name?: string): Entity {
    const entity = new Entity(name);
    return this.addEntity(entity);
  }

  public destroyEntity(entityId: string): boolean {
    return this.removeEntity(entityId);
  }

  public destroyAllEntities(): void {
    const entityIds = Array.from(this.entities.keys());
    for (const id of entityIds) {
      this.removeEntity(id);
    }
  }

  public addSystem(system: System): System {
    if (this.systems.has(system.id)) {
      throw new Error(`System with id ${system.id} already exists in world`);
    }

    this.systems.set(system.id, system);
    this.sortSystemsByPriority();

    system.initialize();

    for (const entity of this.entities.values()) {
      system.addEntity(entity);
    }

    this.eventBus.emit(EngineEvent.SYSTEM_ADDED, { system, world: this });
    return system;
  }

  public removeSystem(systemId: string): boolean {
    const system = this.systems.get(systemId);
    if (!system) {
      return false;
    }

    system.shutdown();
    this.systems.delete(systemId);
    this.sortSystemsByPriority();

    this.eventBus.emit(EngineEvent.SYSTEM_REMOVED, { system, world: this });
    return true;
  }

  public getSystem<T extends System>(systemClass: new (...args: any[]) => T): T | null {
    for (const system of this.systems.values()) {
      if (system instanceof systemClass) {
        return system as T;
      }
    }
    return null;
  }

  public getAllSystems(): System[] {
    return Array.from(this.systems.values());
  }

  public isRunning(): boolean {
    return this.running;
  }

  private addEntityToTag(entity: Entity): void {
    if (!entity.tag) {
      return;
    }

    if (!this.entitiesByTag.has(entity.tag)) {
      this.entitiesByTag.set(entity.tag, new Set());
    }
    this.entitiesByTag.get(entity.tag)!.add(entity);
  }

  private removeEntityFromTag(entity: Entity): void {
    if (!entity.tag) {
      return;
    }

    const entities = this.entitiesByTag.get(entity.tag);
    if (entities) {
      entities.delete(entity);
      if (entities.size === 0) {
        this.entitiesByTag.delete(entity.tag);
      }
    }
  }

  private addEntityToLayer(entity: Entity): void {
    if (!this.entitiesByLayer.has(entity.layer)) {
      this.entitiesByLayer.set(entity.layer, new Set());
    }
    this.entitiesByLayer.get(entity.layer)!.add(entity);
  }

  private removeEntityFromLayer(entity: Entity): void {
    const entities = this.entitiesByLayer.get(entity.layer);
    if (entities) {
      entities.delete(entity);
      if (entities.size === 0) {
        this.entitiesByLayer.delete(entity.layer);
      }
    }
  }

  private sortSystemsByPriority(): void {
    this.systemsByPriority = Array.from(this.systems.values()).sort(
      (a, b) => a.getPriority() - b.getPriority()
    );
  }

  private setupEventListeners(): void {
    this.eventBus.on('component:added', (data: any) => {
      const { entity, component } = data;
      for (const system of this.systems.values()) {
        system.handleComponentChange(entity, component, true);
      }
    });

    this.eventBus.on('component:removed', (data: any) => {
      const { entity, component } = data;
      for (const system of this.systems.values()) {
        system.handleComponentChange(entity, component, false);
      }
    });

    this.eventBus.on('entity:tag:changed', (data: any) => {
      const { entity, oldTag, newTag } = data;
      
      if (oldTag) {
        const oldEntities = this.entitiesByTag.get(oldTag);
        if (oldEntities) {
          oldEntities.delete(entity);
          if (oldEntities.size === 0) {
            this.entitiesByTag.delete(oldTag);
          }
        }
      }
      
      if (newTag) {
        this.addEntityToTag(entity);
      }
    });

    this.eventBus.on('entity:layer:changed', (data: any) => {
      const { entity, oldLayer, newLayer } = data;
      
      const oldEntities = this.entitiesByLayer.get(oldLayer);
      if (oldEntities) {
        oldEntities.delete(entity);
        if (oldEntities.size === 0) {
          this.entitiesByLayer.delete(oldLayer);
        }
      }
      
      this.addEntityToLayer(entity);
    });
  }
}