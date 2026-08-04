import { Entity } from '../ecs/Entity';
import { System } from '../ecs/System';
import { Component } from '../ecs/Component';
import { ComponentTypeEnum } from '../types/Core';
import { Logger } from './Logger';

export class World {
  private static instance: World;
  private entities = new Map<string, Entity>();
  private systems = new Map<string, System>();
  private systemsByPriority: System[] = [];
  private logger = Logger.getInstance();
  private running = false;
  private lastUpdateTime = 0;

  private constructor() {}

  public static getInstance(): World {
    if (!World.instance) {
      World.instance = new World();
    }
    return World.instance;
  }

  public addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    
    // Notify systems about new entity
    for (const system of this.systems.values()) {
      system.addEntity(entity);
    }
    
    this.logger.debug(`Added entity: ${entity.name}`, 'World');
  }

  public removeEntity(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Notify systems about entity removal
    for (const system of this.systems.values()) {
      system.removeEntity(entity);
    }

    entity.destroy();
    this.entities.delete(entityId);
    
    this.logger.debug(`Removed entity: ${entity.name}`, 'World');
    return true;
  }

  public getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  public getEntitiesByTag(tag: string): Entity[] {
    return Array.from(this.entities.values()).filter(entity => entity.getTag() === tag);
  }

  public getEntitiesWithComponent(componentType: ComponentTypeEnum): Entity[] {
    return Array.from(this.entities.values()).filter(entity => entity.hasComponent(componentType));
  }

  public addSystem(system: System): void {
    this.systems.set(system.id, system);
    this.updateSystemPriority();
    
    // Add existing entities to new system
    for (const entity of this.entities.values()) {
      system.addEntity(entity);
    }
    
    system.initialize();
    this.logger.info(`Added system: ${system.name}`, 'World');
  }

  public removeSystem(systemId: string): boolean {
    const system = this.systems.get(systemId);
    if (!system) {
      return false;
    }

    system.shutdown();
    this.systems.delete(systemId);
    this.updateSystemPriority();
    
    this.logger.info(`Removed system: ${system.name}`, 'World');
    return true;
  }

  public getSystem(systemId: string): System | undefined {
    return this.systems.get(systemId);
  }

  public getSystemByName(name: string): System | undefined {
    for (const system of this.systems.values()) {
      if (system.name === name) {
        return system;
      }
    }
    return undefined;
  }

  private updateSystemPriority(): void {
    this.systemsByPriority = Array.from(this.systems.values())
      .sort((a, b) => a.getPriority() - b.getPriority());
  }

  public start(): void {
    this.running = true;
    this.lastUpdateTime = performance.now();
    this.gameLoop();
    this.logger.info('World started', 'World');
  }

  public stop(): void {
    this.running = false;
    this.logger.info('World stopped', 'World');
  }

  private gameLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastUpdateTime) / 1000, 0.016); // Cap at 60fps
    this.lastUpdateTime = currentTime;

    // Update all systems in priority order
    for (const system of this.systemsByPriority) {
      if (system.isEnabled()) {
        system.update(deltaTime);
      }
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  public onComponentAdded(entity: Entity, component: Component): void {
    for (const system of this.systems.values()) {
      system.handleComponentChange(entity, component, true);
    }
  }

  public onComponentRemoved(entity: Entity, component: Component): void {
    for (const system of this.systems.values()) {
      system.handleComponentChange(entity, component, false);
    }
  }

  public clear(): void {
    // Shutdown all systems
    for (const system of this.systems.values()) {
      system.shutdown();
    }

    // Destroy all entities
    for (const entity of this.entities.values()) {
      entity.destroy();
    }

    this.entities.clear();
    this.systems.clear();
    this.systemsByPriority = [];
    
    this.logger.info('World cleared', 'World');
  }

  public getEntityCount(): number {
    return this.entities.size;
  }

  public getSystemCount(): number {
    return this.systems.size;
  }

  public isRunning(): boolean {
    return this.running;
  }
}