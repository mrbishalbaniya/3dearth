import { HeightmapData, HeightmapSource } from '../types/TerrainTypes';
import { Logger } from '../../core/Logger';
import { EventBus } from '../../core/EventBus';

export class HeightmapLoader {
  private logger = Logger.getInstance();
  private eventBus = EventBus.getInstance();
  private cache = new Map<string, HeightmapData>();
  private loadingPromises = new Map<string, Promise<HeightmapData>>();

  public async loadHeightmap(
    source: HeightmapSource,
    x: number,
    z: number,
    size: number
  ): Promise<HeightmapData> {
    const cacheKey = `${x}_${z}_${size}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    const promise = this.loadHeightmapInternal(source, x, z, size);
    this.loadingPromises.set(cacheKey, promise);

    try {
      const data = await promise;
      this.cache.set(cacheKey, data);
      this.loadingPromises.delete(cacheKey);
      return data;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  private async loadHeightmapInternal(
    source: HeightmapSource,
    x: number,
    z: number,
    size: number
  ): Promise<HeightmapData> {
    switch (source.type) {
      case 'url':
        return this.loadFromURL(source.source as string, x, z, size, source.format);
      case 'file':
        return this.loadFromFile(source.source as File, x, z, size, source.format);
      case 'procedural':
        return this.generateProcedural(source.source as Function, x, z, size);
      default:
        throw new Error(`Unsupported heightmap source type: ${source.type}`);
    }
  }

  private async loadFromURL(
    url: string,
    x: number,
    z: number,
    size: number,
    format: string
  ): Promise<HeightmapData> {
    const tileUrl = this.buildTileURL(url, x, z, size);
    
    try {
      if (format === 'raw' || format === 'hgt') {
        return this.loadRawHeightmap(tileUrl, size);
      } else {
        return this.loadImageHeightmap(tileUrl, size);
      }
    } catch (error) {
      this.logger.error(`Failed to load heightmap from ${tileUrl}:`, error);
      return this.createFallbackHeightmap(size);
    }
  }

  private async loadFromFile(
    file: File,
    x: number,
    z: number,
    size: number,
    format: string
  ): Promise<HeightmapData> {
    try {
      if (format === 'raw' || format === 'hgt') {
        const buffer = await file.arrayBuffer();
        return this.parseRawHeightmap(new DataView(buffer), size);
      } else {
        const url = URL.createObjectURL(file);
        const data = await this.loadImageHeightmap(url, size);
        URL.revokeObjectURL(url);
        return data;
      }
    } catch (error) {
      this.logger.error(`Failed to load heightmap from file:`, error);
      return this.createFallbackHeightmap(size);
    }
  }

  private async generateProcedural(
    generator: Function,
    x: number,
    z: number,
    size: number
  ): Promise<HeightmapData> {
    const resolution = size + 1;
    const data = new Float32Array(resolution * resolution);
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const worldX = x + (j / (resolution - 1)) * size;
        const worldZ = z + (i / (resolution - 1)) * size;
        const height = generator(worldX, worldZ);
        
        data[i * resolution + j] = height;
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    return {
      width: resolution,
      height: resolution,
      data,
      minHeight,
      maxHeight
    };
  }

  private async loadRawHeightmap(url: string, size: number): Promise<HeightmapData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return this.parseRawHeightmap(new DataView(buffer), size);
  }

  private parseRawHeightmap(dataView: DataView, size: number): HeightmapData {
    const resolution = size + 1;
    const expectedBytes = resolution * resolution * 2; // 16-bit heightmap
    
    if (dataView.byteLength < expectedBytes) {
      throw new Error(`Invalid heightmap size: expected ${expectedBytes} bytes, got ${dataView.byteLength}`);
    }

    const data = new Float32Array(resolution * resolution);
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let i = 0; i < resolution * resolution; i++) {
      const height = dataView.getUint16(i * 2, false) / 65535.0 * 8848.0; // Normalize to Everest height
      data[i] = height;
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }

    return {
      width: resolution,
      height: resolution,
      data,
      minHeight,
      maxHeight
    };
  }

  private async loadImageHeightmap(url: string, size: number): Promise<HeightmapData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const resolution = size + 1;
          canvas.width = resolution;
          canvas.height = resolution;
          
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, resolution, resolution);
          
          const imageData = ctx.getImageData(0, 0, resolution, resolution);
          const pixels = imageData.data;
          
          const data = new Float32Array(resolution * resolution);
          let minHeight = Infinity;
          let maxHeight = -Infinity;
          
          for (let i = 0; i < resolution * resolution; i++) {
            const pixelIndex = i * 4;
            const height = (pixels[pixelIndex] / 255.0) * 8848.0; // Use red channel
            data[i] = height;
            minHeight = Math.min(minHeight, height);
            maxHeight = Math.max(maxHeight, height);
          }
          
          resolve({
            width: resolution,
            height: resolution,
            data,
            minHeight,
            maxHeight
          });
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  private buildTileURL(baseUrl: string, x: number, z: number, size: number): string {
    return baseUrl
      .replace('{x}', x.toString())
      .replace('{z}', z.toString())
      .replace('{size}', size.toString());
  }

  private createFallbackHeightmap(size: number): HeightmapData {
    const resolution = size + 1;
    const data = new Float32Array(resolution * resolution);
    
    // Generate simple noise pattern
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x = j / resolution;
        const z = i / resolution;
        data[i * resolution + j] = Math.sin(x * Math.PI * 4) * Math.cos(z * Math.PI * 4) * 50;
      }
    }

    return {
      width: resolution,
      height: resolution,
      data,
      minHeight: -50,
      maxHeight: 50
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public getCachedData(x: number, z: number, size: number): HeightmapData | null {
    const cacheKey = `${x}_${z}_${size}`;
    return this.cache.get(cacheKey) || null;
  }

  public removeCachedData(x: number, z: number, size: number): boolean {
    const cacheKey = `${x}_${z}_${size}`;
    return this.cache.delete(cacheKey);
  }
}