import { TerrainChunk } from './TerrainChunk';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

export interface StitchingEdge {
  chunkA: TerrainChunk;
  chunkB: TerrainChunk;
  edge: 'north' | 'south' | 'east' | 'west';
  vertices: Vector3[];
}

export class TerrainStitcher {
  private stitchedEdges = new Map<string, StitchingEdge>();

  public stitchChunks(chunks: TerrainChunk[]): void {
    this.clearStitching();
    
    const chunkMap = new Map<string, TerrainChunk>();
    chunks.forEach(chunk => {
      chunkMap.set(`${chunk.x}_${chunk.z}`, chunk);
    });

    for (const chunk of chunks) {
      if (!chunk.loaded || !chunk.mesh) continue;

      this.stitchChunkEdges(chunk, chunkMap);
    }
  }

  private stitchChunkEdges(chunk: TerrainChunk, chunkMap: Map<string, TerrainChunk>): void {
    const neighbors = this.findNeighbors(chunk, chunkMap);
    
    for (const [direction, neighbor] of neighbors) {
      if (neighbor && neighbor.loaded && neighbor.mesh) {
        this.stitchEdge(chunk, neighbor, direction);
      }
    }
  }

  private findNeighbors(chunk: TerrainChunk, chunkMap: Map<string, TerrainChunk>): Map<string, TerrainChunk | null> {
    const neighbors = new Map<string, TerrainChunk | null>();
    
    // North neighbor (z - chunk.size)
    neighbors.set('north', chunkMap.get(`${chunk.x}_${chunk.z - chunk.size}`) || null);
    
    // South neighbor (z + chunk.size)
    neighbors.set('south', chunkMap.get(`${chunk.x}_${chunk.z + chunk.size}`) || null);
    
    // East neighbor (x + chunk.size)
    neighbors.set('east', chunkMap.get(`${chunk.x + chunk.size}_${chunk.z}`) || null);
    
    // West neighbor (x - chunk.size)
    neighbors.set('west', chunkMap.get(`${chunk.x - chunk.size}_${chunk.z}`) || null);

    return neighbors;
  }

  private stitchEdge(chunkA: TerrainChunk, chunkB: TerrainChunk, direction: string): void {
    const edgeKey = this.getEdgeKey(chunkA, chunkB, direction);
    
    if (this.stitchedEdges.has(edgeKey)) {
      return; // Already stitched
    }

    const levelDiff = Math.abs(chunkA.level - chunkB.level);
    
    if (levelDiff === 0) {
      // Same LOD level - simple stitching
      this.stitchSameLOD(chunkA, chunkB, direction);
    } else if (levelDiff === 1) {
      // Adjacent LOD levels - complex stitching
      this.stitchDifferentLOD(chunkA, chunkB, direction);
    } else {
      // Too different - might need intermediate chunks
      this.stitchLargeLODDiff(chunkA, chunkB, direction);
    }
  }

  private stitchSameLOD(chunkA: TerrainChunk, chunkB: TerrainChunk, direction: string): void {
    if (!chunkA.mesh || !chunkB.mesh) return;

    const edgeVerticesA = this.getEdgeVertices(chunkA, direction);
    const edgeVerticesB = this.getEdgeVertices(chunkB, this.getOppositeDirection(direction));

    // Ensure vertices match exactly
    for (let i = 0; i < Math.min(edgeVerticesA.length, edgeVerticesB.length); i++) {
      this.alignVertices(edgeVerticesA[i], edgeVerticesB[i], direction);
    }

    this.updateMeshGeometry(chunkA);
    this.updateMeshGeometry(chunkB);

    const edgeKey = this.getEdgeKey(chunkA, chunkB, direction);
    this.stitchedEdges.set(edgeKey, {
      chunkA,
      chunkB,
      edge: direction as any,
      vertices: edgeVerticesA
    });
  }

  private stitchDifferentLOD(chunkA: TerrainChunk, chunkB: TerrainChunk, direction: string): void {
    const higherLOD = chunkA.level > chunkB.level ? chunkA : chunkB;
    const lowerLOD = chunkA.level > chunkB.level ? chunkB : chunkA;
    
    const higherEdge = this.getEdgeVertices(higherLOD, chunkA === higherLOD ? direction : this.getOppositeDirection(direction));
    const lowerEdge = this.getEdgeVertices(lowerLOD, chunkA === lowerLOD ? direction : this.getOppositeDirection(direction));

    // Interpolate vertices from lower LOD to match higher LOD
    this.interpolateEdgeVertices(lowerEdge, higherEdge);

    this.updateMeshGeometry(lowerLOD);

    const edgeKey = this.getEdgeKey(chunkA, chunkB, direction);
    this.stitchedEdges.set(edgeKey, {
      chunkA,
      chunkB,
      edge: direction as any,
      vertices: higherEdge
    });
  }

  private stitchLargeLODDiff(chunkA: TerrainChunk, chunkB: TerrainChunk, direction: string): void {
    // For large LOD differences, create transition geometry
    // This is a simplified approach - in production, you might want intermediate chunks
    
    const edgeVerticesA = this.getEdgeVertices(chunkA, direction);
    const edgeVerticesB = this.getEdgeVertices(chunkB, this.getOppositeDirection(direction));

    // Create a blended edge
    const blendedVertices = this.createBlendedEdge(edgeVerticesA, edgeVerticesB);

    // Apply blended positions
    for (let i = 0; i < edgeVerticesA.length; i++) {
      if (i < blendedVertices.length) {
        edgeVerticesA[i].copyFrom(blendedVertices[i]);
      }
    }

    this.updateMeshGeometry(chunkA);
    this.updateMeshGeometry(chunkB);

    const edgeKey = this.getEdgeKey(chunkA, chunkB, direction);
    this.stitchedEdges.set(edgeKey, {
      chunkA,
      chunkB,
      edge: direction as any,
      vertices: blendedVertices
    });
  }

  private getEdgeVertices(chunk: TerrainChunk, direction: string): Vector3[] {
    if (!chunk.mesh) return [];

    const positions = chunk.mesh.getVerticesData('position');
    if (!positions) return [];

    const vertices: Vector3[] = [];
    const resolution = Math.sqrt(positions.length / 3);

    switch (direction) {
      case 'north': // Top edge (z = 0)
        for (let x = 0; x < resolution; x++) {
          const index = x * 3;
          vertices.push(new Vector3(positions[index], positions[index + 1], positions[index + 2]));
        }
        break;
      
      case 'south': // Bottom edge (z = max)
        for (let x = 0; x < resolution; x++) {
          const index = ((resolution - 1) * resolution + x) * 3;
          vertices.push(new Vector3(positions[index], positions[index + 1], positions[index + 2]));
        }
        break;
      
      case 'east': // Right edge (x = max)
        for (let z = 0; z < resolution; z++) {
          const index = (z * resolution + (resolution - 1)) * 3;
          vertices.push(new Vector3(positions[index], positions[index + 1], positions[index + 2]));
        }
        break;
      
      case 'west': // Left edge (x = 0)
        for (let z = 0; z < resolution; z++) {
          const index = (z * resolution) * 3;
          vertices.push(new Vector3(positions[index], positions[index + 1], positions[index + 2]));
        }
        break;
    }

    return vertices;
  }

  private alignVertices(vertexA: Vector3, vertexB: Vector3, direction: string): void {
    // Average the Y coordinates to ensure seamless connection
    const avgY = (vertexA.y + vertexB.y) * 0.5;
    vertexA.y = avgY;
    vertexB.y = avgY;

    // Ensure X/Z coordinates match exactly on shared edges
    if (direction === 'north' || direction === 'south') {
      vertexA.x = vertexB.x; // Align X coordinates
    } else {
      vertexA.z = vertexB.z; // Align Z coordinates
    }
  }

  private interpolateEdgeVertices(lowerLODEdge: Vector3[], higherLODEdge: Vector3[]): void {
    if (lowerLODEdge.length >= higherLODEdge.length) return;

    const ratio = higherLODEdge.length / lowerLODEdge.length;

    for (let i = 0; i < lowerLODEdge.length; i++) {
      const targetIndex = Math.floor(i * ratio);
      if (targetIndex < higherLODEdge.length) {
        lowerLODEdge[i].y = higherLODEdge[targetIndex].y;
      }
    }
  }

  private createBlendedEdge(edgeA: Vector3[], edgeB: Vector3[]): Vector3[] {
    const maxLength = Math.max(edgeA.length, edgeB.length);
    const blended: Vector3[] = [];

    for (let i = 0; i < maxLength; i++) {
      const ratioA = i / (edgeA.length - 1);
      const ratioB = i / (edgeB.length - 1);
      
      const indexA = Math.min(Math.floor(ratioA * (edgeA.length - 1)), edgeA.length - 1);
      const indexB = Math.min(Math.floor(ratioB * (edgeB.length - 1)), edgeB.length - 1);

      const vertexA = edgeA[indexA];
      const vertexB = edgeB[indexB];

      const blendedVertex = Vector3.Lerp(vertexA, vertexB, 0.5);
      blended.push(blendedVertex);
    }

    return blended;
  }

  private updateMeshGeometry(chunk: TerrainChunk): void {
    if (!chunk.mesh) return;

    const positions = chunk.mesh.getVerticesData('position');
    const indices = chunk.mesh.getIndices();
    
    if (!positions || !indices) return;

    // Recalculate normals
    const normals = new Float32Array(positions.length);
    VertexData.ComputeNormals(positions, indices, normals);

    chunk.mesh.setVerticesData('normal', normals);
    chunk.mesh.markVerticesDataAsUpdatable('position', true);
    chunk.mesh.markVerticesDataAsUpdatable('normal', true);
  }

  private getOppositeDirection(direction: string): string {
    const opposites: { [key: string]: string } = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east'
    };
    return opposites[direction] || direction;
  }

  private getEdgeKey(chunkA: TerrainChunk, chunkB: TerrainChunk, direction: string): string {
    const minId = chunkA.id < chunkB.id ? chunkA.id : chunkB.id;
    const maxId = chunkA.id < chunkB.id ? chunkB.id : chunkA.id;
    return `${minId}_${maxId}_${direction}`;
  }

  public clearStitching(): void {
    this.stitchedEdges.clear();
  }

  public getStitchedEdges(): StitchingEdge[] {
    return Array.from(this.stitchedEdges.values());
  }

  public isEdgeStitched(chunkA: TerrainChunk, chunkB: TerrainChunk, direction: string): boolean {
    const edgeKey = this.getEdgeKey(chunkA, chunkB, direction);
    return this.stitchedEdges.has(edgeKey);
  }
}