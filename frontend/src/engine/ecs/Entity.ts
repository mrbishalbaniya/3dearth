import { Component } from './Component';
import { ComponentTypeEnum } from '../types/Core';

export class Entity {
  public readonly id: string;
  public name: string;
  public active: boolean = true;
  public tag: string = '';
  public layer: number = 0;
  
  private components = new Map<ComponentTypeEnum, Component>();
  private componentsByType = new Map<string, Component[]>();

  constructor(name: string = 'Entity') {
    this.id = crypto.randomUUID();
    this.name = name;
  }

  public addComponent<T extends Component>(component: T): T {
    if (this.components.has(component.type)) {
      throw new Error(`Entity ${this.name} already has component of type ${component.type}`);
    }

    component.entityId = this.id;
    this.components.set(component.type, component);
    
    const typeName = component.constructor.name;
    if (!this.componentsByType.has(typeName)) {
      this.componentsByType.set(typeName, []);
    }
    this.componentsByType.get(typeName)!.push(component);

    component.onAttached();
    return component;
  }

  public removeComponent(type: ComponentTypeEnum): boolean {
    const component = this.components.get(type);
    if (!component) {
      return false;
    }

    component.onDetached();
    component.entityId = null;
    this.components.delete(type);

    const typeName = component.constructor.name;
    const typeComponents = this.componentsByType.get(typeName);
    if (typeComponents) {
      const index = typeComponents.indexOf(component);
      if (index !== -1) {
        typeComponents.splice(index, 1);
        if (typeComponents.length === 0) {
          this.componentsByType.delete(typeName);
        }
      }
    }

    return true;
  }

  public getComponent<T extends Component>(type: ComponentTypeEnum): T | null {
    return (this.components.get(type) as T) || null;
  }

  public getComponentByClass<T extends Component>(componentClass: new (...args: any[]) => T): T | null {
    const typeName = componentClass.name;
    const components = this.componentsByType.get(typeName);
    return (components?.[0] as T) || null;
  }

  public getComponents<T extends Component>(componentClass: new (...args: any[]) => T): T[] {
    const typeName = componentClass.name;
    return (this.componentsByType.get(typeName) as T[]) || [];
  }

  public hasComponent(type: ComponentTypeEnum): boolean {
    return this.components.has(type);
  }

  public hasComponentByClass<T extends Component>(componentClass: new (...args: any[]) => T): boolean {
    const typeName = componentClass.name;
    return this.componentsByType.has(typeName);
  }

  public getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  public setActive(active: boolean): void {
    if (this.active === active) {
      return;
    }

    this.active = active;
    
    for (const component of this.components.values()) {
      if (active) {
        component.onEnabled();
      } else {
        component.onDisabled();
      }
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public setTag(tag: string): void {
    this.tag = tag;
  }

  public getTag(): string {
    return this.tag;
  }

  public setLayer(layer: number): void {
    this.layer = layer;
  }

  public getLayer(): number {
    return this.layer;
  }

  public destroy(): void {
    for (const component of this.components.values()) {
      component.onDetached();
      component.entityId = null;
    }
    this.components.clear();
    this.componentsByType.clear();
  }

  public clone(name?: string): Entity {
    const cloned = new Entity(name || `${this.name}_Clone`);
    cloned.tag = this.tag;
    cloned.layer = this.layer;
    cloned.active = this.active;

    for (const component of this.components.values()) {
      const clonedComponent = component.clone();
      cloned.addComponent(clonedComponent);
    }

    return cloned;
  }

  public serialize(): Record<string, any> {
    const componentsData: Record<string, any> = {};
    
    for (const [type, component] of this.components) {
      componentsData[type] = component.serialize();
    }

    return {
      id: this.id,
      name: this.name,
      active: this.active,
      tag: this.tag,
      layer: this.layer,
      components: componentsData
    };
  }

  public static deserialize(data: Record<string, any>): Entity {
    const entity = new Entity(data.name);
    entity.active = data.active ?? true;
    entity.tag = data.tag || '';
    entity.layer = data.layer || 0;

    return entity;
  }
}