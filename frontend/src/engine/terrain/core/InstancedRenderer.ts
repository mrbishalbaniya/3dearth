import { TerrainChunk } from './TerrainChunk';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Logger } from '../../core/Logger';

export interface InstancedObject {
  id: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  mesh?: InstancedMesh;
}

export interface InstancedObjectType {
  name: string;
  meshTemplate: Mesh;
  maxInstances: number;
  instances: InstancedObject[];
  activeInstances: InstancedMesh[];
}

export class InstancedRenderer {
  private scene: Scene;
  private objectTypes = new Map<string, InstancedObjectType>();
  private instancePool = new Map<string, InstancedMesh[]>();
  private logger = Logger.getInstance();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public registerObjectType(
    name: string,
    meshTemplate: Mesh,
    maxInstances: number = 1000
  ): void {
    if (this.objectTypes.has(name)) {
      this.logger.warn(`Object type ${name} already registered`);
      return;
    }

    this.objectTypes.set(name, {
      name,
      meshTemplate,
      maxInstances,
      instances: [],
      activeInstances: []
    });

    this.instancePool.set(name, []);
    this.preAllocateInstances(name, Math.min(100, maxInstances));
  }

  private preAllocateInstances(typeName: string, count: number): void {
    const objectType = this.objectTypes.get(typeName);
    if (!objectType) return;

    const pool = this.instancePool.get(typeName)!;

    for (let i = 0; i < count; i++) {
      const instance = objectType.meshTemplate.createInstance(`${typeName}_instance_${i}`);
      instance.setEnabled(false);
      pool.push(instance);
    }
  }

  public addInstance(
    typeName: string,
    id: string,
    position: Vector3,
    rotation: Vector3 = Vector3.Zero(),
    scale: Vector3 = Vector3.One()
  ): InstancedObject | null {
    const objectType = this.objectTypes.get(typeName);
    if (!objectType) {
      this.logger.error(`Object type ${typeName} not registered`);
      return null;
    }

    if (objectType.instances.length >= objectType.maxInstances) {
      this.logger.warn(`Maximum instances reached for type ${typeName}`);
      return null;
    }

    const instancedObject: InstancedObject = {
      id,
      position: position.clone(),
      rotation: rotation.clone(),
      scale: scale.clone()
    };

    objectType.instances.push(instancedObject);
    return instancedObject;
  }

  public removeInstance(typeName: string, id: string): boolean {
    const objectType = this.objectTypes.get(typeName);
    if (!objectType) return false;

    const index = objectType.instances.findIndex(inst => inst.id === id);
    if (index === -1) return false;

    const instance = objectType.instances[index];
    
    if (instance.mesh) {
      this.returnInstanceToPool(typeName, instance.mesh);
      instance.mesh = undefined;
    }

    objectType.instances.splice(index, 1);
    return true;
  }

  public updateInstancesForChunks(chunks: TerrainChunk[]): void {
    // Clear current active instances
    for (const objectType of this.objectTypes.values()) {
      for (const instance of objectType.activeInstances) {
        this.returnInstanceToPool(objectType.name, instance);
      }
      objectType.activeInstances = [];
    }

    // Determine visible instances based on chunks
    const visibleBounds = this.calculateVisibleBounds(chunks);
    
    for (const [typeName, objectType] of this.objectTypes) {
      for (const instanceData of objectType.instances) {
        if (this.isInstanceVisible(instanceData, visibleBounds)) {
          const mesh = this.getInstanceFromPool(typeName);
          if (mesh) {
            this.configureInstance(mesh, instanceData);
            objectType.activeInstances.push(mesh);
            instanceData.mesh = mesh;
          }
        }
      }
    }
  }

  private calculateVisibleBounds(chunks: TerrainChunk[]): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } {
    if (chunks.length === 0) {
      return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const chunk of chunks) {
      minX = Math.min(minX, chunk.bounds.min.x);
      maxX = Math.max(maxX, chunk.bounds.max.x);
      minZ = Math.min(minZ, chunk.bounds.min.z);
      maxZ = Math.max(maxZ, chunk.bounds.max.z);
    }

    return { minX, maxX, minZ, maxZ };
  }

  private isInstanceVisible(
    instance: InstancedObject,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  ): boolean {
    return instance.position.x >= bounds.minX &&
           instance.position.x <= bounds.maxX &&
           instance.position.z >= bounds.minZ &&
           instance.position.z <= bounds.maxZ;
  }

  private getInstanceFromPool(typeName: string): InstancedMesh | null {
    const pool = this.instancePool.get(typeName);
    if (!pool || pool.length === 0) {
      // Try to allocate more instances
      this.preAllocateInstances(typeName, 50);
      return pool && pool.length > 0 ? pool.pop()! : null;
    }

    return pool.pop()!;
  }

  private returnInstanceToPool(typeName: string, instance: InstancedMesh): void {
    const pool = this.instancePool.get(typeName);
    if (!pool) return;

    instance.setEnabled(false);
    pool.push(instance);
  }

  private configureInstance(mesh: InstancedMesh, instanceData: InstancedObject): void {
    mesh.position = instanceData.position.clone();
    mesh.rotation = instanceData.rotation.clone();
    mesh.scaling = instanceData.scale.clone();
    mesh.setEnabled(true);
  }

  public addVegetation(
    chunks: TerrainChunk[],
    vegetationType: string,
    density: number = 0.1
  ): void {
    for (const chunk of chunks) {
      if (!chunk.loaded || !chunk.heightData) continue;

      this.generateVegetationForChunk(chunk, vegetationType, density);
    }
  }

  private generateVegetationForChunk(
    chunk: TerrainChunk,
    vegetationType: string,
    density: number
  ): void {
    const objectType = this.objectTypes.get(vegetationType);
    if (!objectType) return;

    const samplesPerAxis = Math.floor(Math.sqrt(chunk.size * chunk.size * density));
    const step = chunk.size / samplesPerAxis;

    for (let x = 0; x < samplesPerAxis; x++) {
      for (let z = 0; z < samplesPerAxis; z++) {
        // Add some randomness to positioning
        const localX = x * step + (Math.random() - 0.5) * step * 0.8;
        const localZ = z * step + (Math.random() - 0.5) * step * 0.8;
        
        const worldX = chunk.worldPosition.x + localX;
        const worldZ = chunk.worldPosition.z + localZ;
        
        const height = this.getHeightAtPosition(chunk, localX, localZ);
        
        // Simple slope check - don't place vegetation on steep slopes
        const slope = this.calculateSlope(chunk, localX, localZ);
        if (slope > 0.5) continue;

        const position = new Vector3(worldX, height, worldZ);
        const rotation = new Vector3(0, Math.random() * Math.PI * 2, 0);
        const scale = new Vector3(
          0.8 + Math.random() * 0.4,
          0.8 + Math.random() * 0.4,
          0.8 + Math.random() * 0.4
        );

        const id = `${vegetationType}_${chunk.id}_${x}_${z}`;
        this.addInstance(vegetationType, id, position, rotation, scale);
      }
    }
  }

  private getHeightAtPosition(chunk: TerrainChunk, localX: number, localZ: number): number {
    if (!chunk.heightData) return 0;

    const resolution = Math.sqrt(chunk.heightData.length);
    const u = localX / chunk.size;
    const v = localZ / chunk.size;
    
    const x = Math.floor(u * (resolution - 1));
    const z = Math.floor(v * (resolution - 1));
    
    if (x < 0 || x >= resolution || z < 0 || z >= resolution) return 0;
    
    return chunk.heightData[z * resolution + x];
  }

  private calculateSlope(chunk: TerrainChunk, localX: number, localZ: number): number {
    if (!chunk.heightData) return 0;

    const resolution = Math.sqrt(chunk.heightData.length);
    const u = localX / chunk.size;
    const v = localZ / chunk.size;
    
    const x = Math.floor(u * (resolution - 1));
    const z = Math.floor(v * (resolution - 1));
    
    if (x < 1 || x >= resolution - 1 || z < 1 || z >= resolution - 1) return 0;
    
    const heightL = chunk.heightData[z * resolution + (x - 1)];
    const heightR = chunk.heightData[z * resolution + (x + 1)];
    const heightT = chunk.heightData[(z - 1) * resolution + x];
    const heightB = chunk.heightData[(z + 1) * resolution + x];
    
    const gradientX = (heightR - heightL) / 2.0;
    const gradientZ = (heightB - heightT) / 2.0;
    
    return Math.sqrt(gradientX * gradientX + gradientZ * gradientZ);
  }

  public clearInstancesInChunk(chunk: TerrainChunk): void {
    const chunkBounds = chunk.bounds;
    
    for (const [typeName, objectType] of this.objectTypes) {
      const instancesToRemove: string[] = [];
      
      for (const instance of objectType.instances) {
        if (instance.position.x >= chunkBounds.min.x &&
            instance.position.x <= chunkBounds.max.x &&
            instance.position.z >= chunkBounds.min.z &&
            instance.position.z <= chunkBounds.max.z) {
          instancesToRemove.push(instance.id);
        }
      }
      
      for (const id of instancesToRemove) {
        this.removeInstance(typeName, id);
      }
    }
  }

  public getStatistics(): {
    [typeName: string]: {
      totalInstances: number;
      activeInstances: number;
      poolSize: number;
    };
  } {
    const stats: { [typeName: string]: any } = {};
    
    for (const [typeName, objectType] of this.objectTypes) {
      const pool = this.instancePool.get(typeName) || [];
      
      stats[typeName] = {
        totalInstances: objectType.instances.length,
        activeInstances: objectType.activeInstances.length,
        poolSize: pool.length
      };
    }
    
    return stats;
  }

  public dispose(): void {
    for (const [typeName, objectType] of this.objectTypes) {
      for (const instance of objectType.activeInstances) {
        instance.dispose();
      }
      
      const pool = this.instancePool.get(typeName) || [];
      for (const instance of pool) {
        instance.dispose();
      }
    }
    
    this.objectTypes.clear();
    this.instancePool.clear();
  }
}