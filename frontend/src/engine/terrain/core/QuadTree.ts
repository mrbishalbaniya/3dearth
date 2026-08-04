import { QuadTreeNode, BoundingBox, LODSettings } from '../types/TerrainTypes';
import { TerrainChunk } from './TerrainChunk';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '../../core/Logger';

export class QuadTree {
  private root: QuadTreeNode;
  private maxDepth: number;
  private lodSettings: LODSettings[];
  private logger = Logger.getInstance();

  constructor(
    bounds: BoundingBox,
    maxDepth: number = 8,
    lodSettings: LODSettings[]
  ) {
    this.maxDepth = maxDepth;
    this.lodSettings = lodSettings.sort((a, b) => a.level - b.level);
    
    this.root = {
      id: 'root',
      level: 0,
      x: bounds.min.x,
      z: bounds.min.z,
      bounds,
      children: null,
      parent: null,
      chunk: null,
      visible: false,
      distance: 0
    };
  }

  public update(cameraPosition: Vector3, frustumPlanes: any[]): void {
    this.updateNode(this.root, cameraPosition, frustumPlanes);
  }

  private updateNode(node: QuadTreeNode, cameraPosition: Vector3, frustumPlanes: any[]): void {
    // Calculate distance from camera to node center
    const centerX = node.bounds.min.x + (node.bounds.max.x - node.bounds.min.x) * 0.5;
    const centerZ = node.bounds.min.z + (node.bounds.max.z - node.bounds.min.z) * 0.5;
    
    node.distance = Math.sqrt(
      Math.pow(cameraPosition.x - centerX, 2) + 
      Math.pow(cameraPosition.z - centerZ, 2)
    );

    // Check visibility using frustum culling
    node.visible = this.isNodeVisible(node, frustumPlanes);
    
    if (!node.visible) {
      this.collapseNode(node);
      return;
    }

    // Determine required LOD level based on distance
    const requiredLOD = this.calculateRequiredLOD(node.distance);

    if (node.level < requiredLOD && node.level < this.maxDepth) {
      // Need to subdivide
      this.subdivideNode(node);
      
      if (node.children) {
        for (const child of node.children) {
          this.updateNode(child, cameraPosition, frustumPlanes);
        }
      }
    } else {
      // Use this level
      this.collapseNode(node);
      this.ensureChunkExists(node);
    }
  }

  private calculateRequiredLOD(distance: number): number {
    for (let i = this.lodSettings.length - 1; i >= 0; i--) {
      if (distance <= this.lodSettings[i].distance) {
        return this.lodSettings[i].level;
      }
    }
    return 0;
  }

  private isNodeVisible(node: QuadTreeNode, frustumPlanes: any[]): boolean {
    // Simple distance-based culling for now
    // Can be enhanced with proper frustum plane intersection
    return node.distance < 50000; // 50km max render distance
  }

  private subdivideNode(node: QuadTreeNode): void {
    if (node.children || node.level >= this.maxDepth) {
      return;
    }

    const bounds = node.bounds;
    const centerX = bounds.min.x + (bounds.max.x - bounds.min.x) * 0.5;
    const centerZ = bounds.min.z + (bounds.max.z - bounds.min.z) * 0.5;
    const nextLevel = node.level + 1;

    node.children = [
      // Top-left
      {
        id: `${node.id}_0`,
        level: nextLevel,
        x: bounds.min.x,
        z: bounds.min.z,
        bounds: {
          min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
          max: { x: centerX, y: bounds.max.y, z: centerZ }
        },
        children: null,
        parent: node,
        chunk: null,
        visible: false,
        distance: 0
      },
      // Top-right
      {
        id: `${node.id}_1`,
        level: nextLevel,
        x: centerX,
        z: bounds.min.z,
        bounds: {
          min: { x: centerX, y: bounds.min.y, z: bounds.min.z },
          max: { x: bounds.max.x, y: bounds.max.y, z: centerZ }
        },
        children: null,
        parent: node,
        chunk: null,
        visible: false,
        distance: 0
      },
      // Bottom-left
      {
        id: `${node.id}_2`,
        level: nextLevel,
        x: bounds.min.x,
        z: centerZ,
        bounds: {
          min: { x: bounds.min.x, y: bounds.min.y, z: centerZ },
          max: { x: centerX, y: bounds.max.y, z: bounds.max.z }
        },
        children: null,
        parent: node,
        chunk: null,
        visible: false,
        distance: 0
      },
      // Bottom-right
      {
        id: `${node.id}_3`,
        level: nextLevel,
        x: centerX,
        z: centerZ,
        bounds: {
          min: { x: centerX, y: bounds.min.y, z: centerZ },
          max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
        },
        children: null,
        parent: node,
        chunk: null,
        visible: false,
        distance: 0
      }
    ];
  }

  private collapseNode(node: QuadTreeNode): void {
    if (node.children) {
      for (const child of node.children) {
        this.collapseNode(child);
        if (child.chunk) {
          child.chunk.unload();
          child.chunk = null;
        }
      }
      node.children = null;
    }
  }

  private ensureChunkExists(node: QuadTreeNode): void {
    if (!node.chunk && node.visible) {
      const size = node.bounds.max.x - node.bounds.min.x;
      const lodSetting = this.getLODSetting(node.level);
      
      node.chunk = new TerrainChunk(
        node.x,
        node.z,
        node.level,
        size,
        1.0, // height scale
        lodSetting ? lodSetting.vertexCount : 65
      );
    }
  }

  private getLODSetting(level: number): LODSettings | null {
    return this.lodSettings.find(lod => lod.level === level) || null;
  }

  public getVisibleChunks(): TerrainChunk[] {
    const chunks: TerrainChunk[] = [];
    this.collectVisibleChunks(this.root, chunks);
    return chunks;
  }

  private collectVisibleChunks(node: QuadTreeNode, chunks: TerrainChunk[]): void {
    if (node.visible && node.chunk && !node.children) {
      chunks.push(node.chunk);
    }

    if (node.children) {
      for (const child of node.children) {
        this.collectVisibleChunks(child, chunks);
      }
    }
  }

  public getNodeCount(): number {
    return this.countNodes(this.root);
  }

  private countNodes(node: QuadTreeNode): number {
    let count = 1;
    
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    
    return count;
  }

  public getMaxDepth(): number {
    return this.getNodeDepth(this.root);
  }

  private getNodeDepth(node: QuadTreeNode): number {
    if (!node.children) {
      return node.level;
    }

    let maxDepth = node.level;
    for (const child of node.children) {
      maxDepth = Math.max(maxDepth, this.getNodeDepth(child));
    }
    
    return maxDepth;
  }

  public clear(): void {
    this.collapseNode(this.root);
  }

  public getRoot(): QuadTreeNode {
    return this.root;
  }

  public findNodeAt(x: number, z: number): QuadTreeNode | null {
    return this.findNodeAtPosition(this.root, x, z);
  }

  private findNodeAtPosition(node: QuadTreeNode, x: number, z: number): QuadTreeNode | null {
    const bounds = node.bounds;
    
    if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) {
      return null;
    }

    if (!node.children) {
      return node;
    }

    for (const child of node.children) {
      const result = this.findNodeAtPosition(child, x, z);
      if (result) {
        return result;
      }
    }

    return node;
  }

  public getStatistics(): {
    totalNodes: number;
    visibleNodes: number;
    loadedChunks: number;
    maxDepth: number;
    memoryUsage: number;
  } {
    const stats = {
      totalNodes: 0,
      visibleNodes: 0,
      loadedChunks: 0,
      maxDepth: 0,
      memoryUsage: 0
    };

    this.calculateStatistics(this.root, stats);
    
    return stats;
  }

  private calculateStatistics(node: QuadTreeNode, stats: any): void {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, node.level);
    
    if (node.visible) {
      stats.visibleNodes++;
    }
    
    if (node.chunk && node.chunk.loaded) {
      stats.loadedChunks++;
      stats.memoryUsage += node.chunk.getMemoryUsage();
    }

    if (node.children) {
      for (const child of node.children) {
        this.calculateStatistics(child, stats);
      }
    }
  }
}