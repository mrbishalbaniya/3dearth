import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';

export class TerrainChunk {
  public readonly key: string;
  public readonly mesh: GroundMesh;
  public readonly chunkX: number;
  public readonly chunkZ: number;

  constructor(
    scene: Scene,
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    resolution: number,
    maxHeight: number
  ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.key = `${chunkX}:${chunkZ}`;

    this.mesh = MeshBuilder.CreateGround(
      `terrain_${this.key}`,
      {
        width: chunkSize,
        height: chunkSize,
        subdivisions: resolution,
        updatable: true,
      },
      scene
    );

    this.mesh.position.x = chunkX * chunkSize;
    this.mesh.position.z = chunkZ * chunkSize;

    const material = new StandardMaterial(`terrain_mat_${this.key}`, scene);
    material.diffuseColor = new Color3(0.23, 0.42, 0.24);
    material.specularColor = new Color3(0.05, 0.05, 0.05);
    this.mesh.material = material;

    this.applyHeightField(chunkSize, resolution, maxHeight);
    this.mesh.checkCollisions = true;
    this.mesh.receiveShadows = true;
  }

  private heightFunction(worldX: number, worldZ: number, maxHeight: number): number {
    const base =
      Math.sin(worldX * 0.003) * 0.45 +
      Math.cos(worldZ * 0.0025) * 0.35 +
      Math.sin((worldX + worldZ) * 0.0018) * 0.2;

    const ridge = Math.sin(worldX * 0.013) * Math.cos(worldZ * 0.011) * 0.1;
    return (base + ridge) * maxHeight;
  }

  private applyHeightField(chunkSize: number, resolution: number, maxHeight: number): void {
    const positions = this.mesh.getVerticesData(VertexData.PositionKind);
    if (!positions) {
      // Some runtime/driver paths can return no CPU-side vertex array.
      // Keep the chunk as flat terrain instead of crashing the whole engine.
      return;
    }

    const step = chunkSize / resolution;
    const half = chunkSize * 0.5;

    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i];
      const localZ = positions[i + 2];
      const worldX = localX + this.chunkX * chunkSize + half;
      const worldZ = localZ + this.chunkZ * chunkSize + half;
      positions[i + 1] = this.heightFunction(worldX, worldZ, maxHeight);
    }

    this.mesh.updateVerticesData(VertexData.PositionKind, positions, true);
    this.mesh.refreshBoundingInfo(true);
    this.mesh.createNormals(true);
  }

  public dispose(): void {
    this.mesh.material?.dispose(true, true);
    this.mesh.dispose(false, true);
  }
}
