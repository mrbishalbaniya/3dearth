import { TerrainChunk as ITerrainChunk, BoundingBox, HeightmapData, TerrainVertex } from '../types/TerrainTypes';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Logger } from '../../core/Logger';

export class TerrainChunk implements ITerrainChunk {
  public id: string;
  public x: number;
  public z: number;
  public level: number;
  public size: number;
  public worldPosition: { x: number; z: number };
  public bounds: BoundingBox;
  public heightData: Float32Array | null = null;
  public mesh: Mesh | null = null;
  public loaded: boolean = false;
  public loading: boolean = false;
  public lastAccessTime: number = 0;
  public children: TerrainChunk[] | null = null;
  public parent: TerrainChunk | null = null;

  private resolution: number;
  private heightScale: number;
  private logger = Logger.getInstance();

  constructor(
    x: number,
    z: number,
    level: number,
    size: number,
    heightScale: number = 1.0,
    resolution: number = 65
  ) {
    this.x = x;
    this.z = z;
    this.level = level;
    this.size = size;
    this.heightScale = heightScale;
    this.resolution = resolution;
    this.worldPosition = { x, z };
    this.id = `chunk_${x}_${z}_${level}`;
    
    this.bounds = this.calculateBounds();
    this.lastAccessTime = Date.now();
  }

  private calculateBounds(): BoundingBox {
    return {
      min: {
        x: this.worldPosition.x,
        y: 0,
        z: this.worldPosition.z
      },
      max: {
        x: this.worldPosition.x + this.size,
        y: 1000 * this.heightScale,
        z: this.worldPosition.z + this.size
      }
    };
  }

  public async load(heightmapData: HeightmapData, scene: Scene): Promise<void> {
    if (this.loaded || this.loading) {
      return;
    }

    this.loading = true;
    
    try {
      this.heightData = heightmapData.data;
      await this.generateMesh(heightmapData, scene);
      this.loaded = true;
      this.lastAccessTime = Date.now();
    } catch (error) {
      this.logger.error(`Failed to load terrain chunk ${this.id}:`, error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  private async generateMesh(heightmapData: HeightmapData, scene: Scene): Promise<void> {
    const vertices = this.generateVertices(heightmapData);
    const indices = this.generateIndices();
    const normals = this.calculateNormals(vertices.position, indices);

    const vertexData = new VertexData();
    vertexData.positions = vertices.position;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = vertices.uv;

    if (this.mesh) {
      this.mesh.dispose();
    }

    this.mesh = new Mesh(this.id, scene);
    vertexData.applyToMesh(this.mesh);

    this.mesh.position = new Vector3(this.worldPosition.x, 0, this.worldPosition.z);
    this.mesh.material = this.createMaterial(scene);
    this.mesh.receiveShadows = true;

    this.updateBounds(heightmapData);
  }

  private generateVertices(heightmapData: HeightmapData): TerrainVertex {
    const vertexCount = this.resolution * this.resolution;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    let vertexIndex = 0;

    for (let z = 0; z < this.resolution; z++) {
      for (let x = 0; x < this.resolution; x++) {
        const u = x / (this.resolution - 1);
        const v = z / (this.resolution - 1);
        
        const heightIndex = z * heightmapData.width + x;
        const height = (heightmapData.data[heightIndex] || 0) * this.heightScale;

        positions[vertexIndex * 3] = u * this.size;
        positions[vertexIndex * 3 + 1] = height;
        positions[vertexIndex * 3 + 2] = v * this.size;

        uvs[vertexIndex * 2] = u;
        uvs[vertexIndex * 2 + 1] = v;

        vertexIndex++;
      }
    }

    return {
      position: positions,
      normal: new Float32Array(0), // Calculated separately
      uv: uvs
    };
  }

  private generateIndices(): Uint32Array {
    const faceCount = (this.resolution - 1) * (this.resolution - 1) * 2;
    const indices = new Uint32Array(faceCount * 3);

    let index = 0;

    for (let z = 0; z < this.resolution - 1; z++) {
      for (let x = 0; x < this.resolution - 1; x++) {
        const topLeft = z * this.resolution + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * this.resolution + x;
        const bottomRight = bottomLeft + 1;

        // First triangle
        indices[index++] = topLeft;
        indices[index++] = bottomLeft;
        indices[index++] = topRight;

        // Second triangle
        indices[index++] = topRight;
        indices[index++] = bottomLeft;
        indices[index++] = bottomRight;
      }
    }

    return indices;
  }

  private calculateNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
    const normals = new Float32Array(positions.length);
    
    // Initialize normals to zero
    for (let i = 0; i < normals.length; i += 3) {
      normals[i] = 0;
      normals[i + 1] = 0;
      normals[i + 2] = 0;
    }

    // Calculate face normals and add to vertex normals
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = new Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v2 = new Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
      const v3 = new Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

      const edge1 = v2.subtract(v1);
      const edge2 = v3.subtract(v1);
      const faceNormal = Vector3.Cross(edge1, edge2).normalize();

      // Add face normal to each vertex normal
      normals[i1] += faceNormal.x;
      normals[i1 + 1] += faceNormal.y;
      normals[i1 + 2] += faceNormal.z;

      normals[i2] += faceNormal.x;
      normals[i2 + 1] += faceNormal.y;
      normals[i2 + 2] += faceNormal.z;

      normals[i3] += faceNormal.x;
      normals[i3 + 1] += faceNormal.y;
      normals[i3 + 2] += faceNormal.z;
    }

    // Normalize vertex normals
    for (let i = 0; i < normals.length; i += 3) {
      const normal = new Vector3(normals[i], normals[i + 1], normals[i + 2]).normalize();
      normals[i] = normal.x;
      normals[i + 1] = normal.y;
      normals[i + 2] = normal.z;
    }

    return normals;
  }

  private createMaterial(scene: Scene): StandardMaterial {
    const material = new StandardMaterial(`${this.id}_material`, scene);
    material.wireframe = false;
    material.backFaceCulling = true;
    
    // Basic terrain coloring based on height
    material.diffuseColor.set(0.6, 0.4, 0.2); // Brown earth tone
    material.specularColor.set(0.1, 0.1, 0.1);
    material.roughness = 0.8;

    return material;
  }

  private updateBounds(heightmapData: HeightmapData): void {
    this.bounds.min.y = heightmapData.minHeight * this.heightScale;
    this.bounds.max.y = heightmapData.maxHeight * this.heightScale;
  }

  public unload(): void {
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    
    this.heightData = null;
    this.loaded = false;
    this.loading = false;
  }

  public isVisible(cameraPosition: Vector3, frustumPlanes: any[]): boolean {
    // Simple distance check
    const centerX = this.worldPosition.x + this.size * 0.5;
    const centerZ = this.worldPosition.z + this.size * 0.5;
    const distance = Math.sqrt(
      Math.pow(cameraPosition.x - centerX, 2) + 
      Math.pow(cameraPosition.z - centerZ, 2)
    );

    // Basic visibility check - can be enhanced with proper frustum culling
    return distance < 10000; // 10km visibility range
  }

  public getDistance(point: Vector3): number {
    const centerX = this.worldPosition.x + this.size * 0.5;
    const centerZ = this.worldPosition.z + this.size * 0.5;
    
    return Math.sqrt(
      Math.pow(point.x - centerX, 2) + 
      Math.pow(point.z - centerZ, 2)
    );
  }

  public subdivide(): TerrainChunk[] {
    if (this.children) {
      return this.children;
    }

    const halfSize = this.size * 0.5;
    const nextLevel = this.level + 1;

    this.children = [
      new TerrainChunk(this.x, this.z, nextLevel, halfSize, this.heightScale, this.resolution),
      new TerrainChunk(this.x + halfSize, this.z, nextLevel, halfSize, this.heightScale, this.resolution),
      new TerrainChunk(this.x, this.z + halfSize, nextLevel, halfSize, this.heightScale, this.resolution),
      new TerrainChunk(this.x + halfSize, this.z + halfSize, nextLevel, halfSize, this.heightScale, this.resolution)
    ];

    this.children.forEach(child => {
      child.parent = this;
    });

    return this.children;
  }

  public merge(): void {
    if (this.children) {
      this.children.forEach(child => child.unload());
      this.children = null;
    }
  }

  public updateAccessTime(): void {
    this.lastAccessTime = Date.now();
  }

  public getMemoryUsage(): number {
    let usage = 0;
    
    if (this.heightData) {
      usage += this.heightData.byteLength;
    }
    
    if (this.mesh) {
      const vertexData = this.mesh.getVerticesData('position');
      if (vertexData) {
        usage += vertexData.length * 4; // Float32 = 4 bytes
      }
    }
    
    return usage;
  }
}