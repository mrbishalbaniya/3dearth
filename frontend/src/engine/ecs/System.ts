import { Entity } from './Entity';
import { Component } from './Component';
import { ComponentTypeEnum } from '../types/Core';

export abstract class System {
  public readonly id: string;
  public readonly name: string;
  public enabled: boolean = true;
  public priority: number = 0;
  
  protected requiredComponents: ComponentTypeEnum[] = [];
  protected entities = new Set<Entity>();
  protected entityQueries = new Map<string, Set<Entity>>();

  constructor(name: string) {
    this.id = crypto.randomUUID();
    this.name = name;
  }

  public abstract update(deltaTime: number): void;

  public initialize(): void {}
  public shutdown(): void {}
  
  public onEntityAdded(entity: Entity): void {}
  public onEntityRemoved(entity: Entity): void {}
  public onComponentAdded(entity: Entity, component: Component): void {}
  public onComponentRemoved(entity: Entity, component: Component): void {}

  public addEntity(entity: Entity): void {
    if (this.entities.has(entity)) {
      return;
    }

    if (this.matchesRequiredComponents(entity)) {
      this.entities.add(entity);
      this.onEntityAdded(entity);
    }
  }

  public removeEntity(entity: Entity): void {
    if (this.entities.has(entity)) {
      this.entities.delete(entity);
      this.onEntityRemoved(entity);
    }

    for (const query of this.entityQueries.values()) {
      query.delete(entity);
    }
  }

  public getEntities(): Set<Entity> {
    return new Set(this.entities);
  }

  public queryEntities(components: ComponentTypeEnum[]): Set<Entity> {
    const queryKey = components.sort().join(',');
    
    if (!this.entityQueries.has(queryKey)) {
      const matchingEntities = new Set<Entity>();
      
      for (const entity of this.entities) {
        if (components.every(type => entity.hasComponent(type))) {
          matchingEntities.add(entity);
        }
      }
      
      this.entityQueries.set(queryKey, matchingEntities);
    }
    
    return this.entityQueries.get(queryKey)!;
  }

  public clearEntityQueries(): void {
    this.entityQueries.clear();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setPriority(priority: number): void {
    this.priority = priority;
  }

  public getPriority(): number {
    return this.priority;
  }

  protected matchesRequiredComponents(entity: Entity): boolean {
    return this.requiredComponents.every(type => entity.hasComponent(type));
  }

  protected invalidateQueries(): void {
    this.entityQueries.clear();
  }

  public handleComponentChange(entity: Entity, component: Component, added: boolean): void {
    const wasMatching = this.entities.has(entity);
    const shouldMatch = this.matchesRequiredComponents(entity);

    if (!wasMatching && shouldMatch) {
      this.addEntity(entity);
    } else if (wasMatching && !shouldMatch) {
      this.removeEntity(entity);
    }

    this.invalidateQueries();

    if (added) {
      this.onComponentAdded(entity, component);
    } else {
      this.onComponentRemoved(entity, component);
    }
  }
}

export class RenderSystem extends System {
  constructor() {
    super('RenderSystem');
    this.requiredComponents = [ComponentTypeEnum.TRANSFORM, ComponentTypeEnum.MESH];
    this.priority = 100;
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    for (const entity of this.entities) {
      if (!entity.isActive()) {
        continue;
      }

      const transform = entity.getComponent(ComponentTypeEnum.TRANSFORM);
      const mesh = entity.getComponent(ComponentTypeEnum.MESH);

      if (transform && mesh && mesh.enabled) {
        this.renderEntity(entity, transform, mesh);
      }
    }
  }

  private renderEntity(entity: Entity, transform: Component, mesh: Component): void {
    // Rendering logic will be implemented based on the specific renderer
  }
}

export class TransformSystem extends System {
  constructor() {
    super('TransformSystem');
    this.requiredComponents = [ComponentTypeEnum.TRANSFORM];
    this.priority = 10;
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    for (const entity of this.entities) {
      if (!entity.isActive()) {
        continue;
      }

      const transform = entity.getComponent(ComponentTypeEnum.TRANSFORM);
      if (transform && transform.enabled && transform.dirty) {
        this.updateTransform(entity, transform);
        transform.clearDirty();
      }
    }
  }

  private updateTransform(entity: Entity, transform: Component): void {
    // Transform update logic
  }
}