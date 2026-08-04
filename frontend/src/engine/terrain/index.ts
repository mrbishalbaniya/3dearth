// Main terrain streaming engine
export { TerrainStreamingEngine } from './TerrainStreamingEngine';

// Core components
export { HeightmapLoader } from './core/HeightmapLoader';
export { TerrainChunk } from './core/TerrainChunk';
export { QuadTree } from './core/QuadTree';
export { ChunkManager } from './core/ChunkManager';
export { FrustumCuller } from './core/FrustumCuller';
export { TerrainStitcher } from './core/TerrainStitcher';
export { InstancedRenderer } from './core/InstancedRenderer';

// Types and interfaces
export * from './types/TerrainTypes';

// Utility functions
export const TerrainUtils = {
  /**
   * Convert world coordinates to chunk coordinates
   */
  worldToChunk(worldX: number, worldZ: number, chunkSize: number): { x: number; z: number } {
    return {
      x: Math.floor(worldX / chunkSize) * chunkSize,
      z: Math.floor(worldZ / chunkSize) * chunkSize
    };
  },

  /**
   * Convert chunk coordinates to world coordinates (center)
   */
  chunkToWorld(chunkX: number, chunkZ: number, chunkSize: number): { x: number; z: number } {
    return {
      x: chunkX + chunkSize * 0.5,
      z: chunkZ + chunkSize * 0.5
    };
  },

  /**
   * Calculate distance between two points
   */
  distance2D(x1: number, z1: number, x2: number, z2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
  },

  /**
   * Calculate appropriate LOD level based on distance
   */
  calculateLOD(distance: number, lodDistances: number[]): number {
    for (let i = 0; i < lodDistances.length; i++) {
      if (distance <= lodDistances[i]) {
        return i;
      }
    }
    return lodDistances.length - 1;
  },

  /**
   * Generate chunk ID string
   */
  generateChunkId(x: number, z: number, level: number): string {
    return `chunk_${x}_${z}_${level}`;
  },

  /**
   * Parse chunk ID string
   */
  parseChunkId(chunkId: string): { x: number; z: number; level: number } | null {
    const parts = chunkId.split('_');
    if (parts.length !== 4 || parts[0] !== 'chunk') {
      return null;
    }
    
    return {
      x: parseInt(parts[1], 10),
      z: parseInt(parts[2], 10),
      level: parseInt(parts[3], 10)
    };
  },

  /**
   * Create default terrain configuration
   */
  createDefaultConfig(): import('./types/TerrainTypes').TerrainConfig {
    return {
      chunkSize: 1024,
      heightScale: 100,
      maxLOD: 6,
      lodDistance: [500, 1000, 2000, 4000, 8000, 16000],
      heightmapResolution: 65,
      textureResolution: 512,
      maxChunksInMemory: 100,
      frustumCullingEnabled: true,
      stitchingEnabled: true,
      instancedRenderingEnabled: true
    };
  },

  /**
   * Create procedural heightmap source
   */
  createProceduralSource(generator?: (x: number, z: number) => number): import('./types/TerrainTypes').HeightmapSource {
    return {
      type: 'procedural',
      source: generator || ((x: number, z: number) => {
        return Math.sin(x * 0.001) * Math.cos(z * 0.001) * 100;
      }),
      format: 'raw',
      tileSize: 1024,
      overlap: 0
    };
  },

  /**
   * Create URL-based heightmap source
   */
  createURLSource(baseUrl: string, format: 'png' | 'jpg' | 'raw' | 'hgt' = 'png'): import('./types/TerrainTypes').HeightmapSource {
    return {
      type: 'url',
      source: baseUrl,
      format,
      tileSize: 1024,
      overlap: 0
    };
  }
};