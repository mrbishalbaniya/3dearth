export interface TerrainChunk {
  id: string;
  x: number;
  z: number;
  level: number;
  size: number;
  worldPosition: { x: number; z: number };
  bounds: BoundingBox;
  heightData: Float32Array | null;
  mesh: any | null;
  loaded: boolean;
  loading: boolean;
  lastAccessTime: number;
  children: TerrainChunk[] | null;
  parent: TerrainChunk | null;
}

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface HeightmapData {
  width: number;
  height: number;
  data: Float32Array;
  minHeight: number;
  maxHeight: number;
}

export interface TerrainConfig {
  chunkSize: number;
  heightScale: number;
  maxLOD: number;
  lodDistance: number[];
  heightmapResolution: number;
  textureResolution: number;
  maxChunksInMemory: number;
  frustumCullingEnabled: boolean;
  stitchingEnabled: boolean;
  instancedRenderingEnabled: boolean;
}

export interface TerrainMaterial {
  diffuseTextures: string[];
  normalTextures: string[];
  roughnessTextures: string[];
  blendMap: string;
  tileScale: number[];
}

export interface LODSettings {
  level: number;
  distance: number;
  resolution: number;
  vertexCount: number;
}

export interface QuadTreeNode {
  id: string;
  level: number;
  x: number;
  z: number;
  bounds: BoundingBox;
  children: QuadTreeNode[] | null;
  parent: QuadTreeNode | null;
  chunk: TerrainChunk | null;
  visible: boolean;
  distance: number;
}

export interface TerrainStreamingState {
  centerX: number;
  centerZ: number;
  loadRadius: number;
  unloadRadius: number;
  activeChunks: Map<string, TerrainChunk>;
  loadingChunks: Set<string>;
  pendingUnloads: Set<string>;
}

export interface HeightmapSource {
  type: 'url' | 'file' | 'procedural';
  source: string | File | ((x: number, z: number) => number);
  format: 'png' | 'jpg' | 'raw' | 'hgt';
  tileSize: number;
  overlap: number;
}

export interface TerrainVertex {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  color?: Float32Array;
}