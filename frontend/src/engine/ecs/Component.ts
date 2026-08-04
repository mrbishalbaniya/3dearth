import { ComponentTypeEnum } from '../types/Core';

export abstract class Component {
  public readonly id: string;
  public readonly type: ComponentTypeEnum;
  public entityId: string | null = null;
  public enabled: boolean = true;
  public dirty: boolean = false;

  constructor(type: ComponentTypeEnum) {
    this.id = crypto.randomUUID();
    this.type = type;
  }

  public abstract serialize(): Record<string, any>;
  public abstract deserialize(data: Record<string, any>): void;
  public abstract clone(): Component;

  public markDirty(): void {
    this.dirty = true;
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public onAttached(): void {}
  public onDetached(): void {}
  public onEnabled(): void {}
  public onDisabled(): void {}
}

export class TransformComponent extends Component {
  public position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  public rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  public scale: { x: number; y: number; z: number } = { x: 1, y: 1, z: 1 };
  public parent: TransformComponent | null = null;
  public children: TransformComponent[] = [];

  constructor() {
    super(ComponentTypeEnum.TRANSFORM);
  }

  public setPosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.markDirty();
  }

  public setRotation(x: number, y: number, z: number): void {
    this.rotation.x = x;
    this.rotation.y = y;
    this.rotation.z = z;
    this.markDirty();
  }

  public setScale(x: number, y: number, z: number): void {
    this.scale.x = x;
    this.scale.y = y;
    this.scale.z = z;
    this.markDirty();
  }

  public addChild(child: TransformComponent): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
    child.markDirty();
  }

  public removeChild(child: TransformComponent): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      child.markDirty();
    }
  }

  public serialize(): Record<string, any> {
    return {
      position: this.position,
      rotation: this.rotation,
      scale: this.scale
    };
  }

  public deserialize(data: Record<string, any>): void {
    if (data.position) {
      this.position = { ...data.position };
    }
    if (data.rotation) {
      this.rotation = { ...data.rotation };
    }
    if (data.scale) {
      this.scale = { ...data.scale };
    }
    this.markDirty();
  }

  public clone(): TransformComponent {
    const clone = new TransformComponent();
    clone.position = { ...this.position };
    clone.rotation = { ...this.rotation };
    clone.scale = { ...this.scale };
    return clone;
  }
}

export class MeshComponent extends Component {
  public meshId: string | null = null;
  public materialId: string | null = null;
  public visible: boolean = true;
  public castShadows: boolean = true;
  public receiveShadows: boolean = true;

  constructor() {
    super(ComponentTypeEnum.MESH);
  }

  public setMesh(meshId: string): void {
    this.meshId = meshId;
    this.markDirty();
  }

  public setMaterial(materialId: string): void {
    this.materialId = materialId;
    this.markDirty();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.markDirty();
  }

  public serialize(): Record<string, any> {
    return {
      meshId: this.meshId,
      materialId: this.materialId,
      visible: this.visible,
      castShadows: this.castShadows,
      receiveShadows: this.receiveShadows
    };
  }

  public deserialize(data: Record<string, any>): void {
    this.meshId = data.meshId || null;
    this.materialId = data.materialId || null;
    this.visible = data.visible ?? true;
    this.castShadows = data.castShadows ?? true;
    this.receiveShadows = data.receiveShadows ?? true;
    this.markDirty();
  }

  public clone(): MeshComponent {
    const clone = new MeshComponent();
    clone.meshId = this.meshId;
    clone.materialId = this.materialId;
    clone.visible = this.visible;
    clone.castShadows = this.castShadows;
    clone.receiveShadows = this.receiveShadows;
    return clone;
  }
}