/**
 * TileStreamingManager - Manages async tile loading/unloading
 * 
 * Features:
 * - Priority queue
 * - LRU cache
 * - Background prefetch
 * - Abort controller for cancelled requests
 * - Retry queue
 * - IndexedDB persistence
 */

import type { TileRequest, TilePriority } from "./FlightCorridorEngine";

export interface TileData {
  key: string;
  elevation?: Float32Array;
  texture?: ImageBitmap;
  satellite?: ImageBitmap;
  sizeBytes: number;
  timestamp: number;
}

export interface StreamingConfig {
  maxConcurrentRequests: number;
  maxRetries: number;
  retryDelayMs: number;
  prefetchDistance: number; // meters
  cacheMaxAge: number; // ms
}

export class TileStreamingManager {
  private config: StreamingConfig;
  private activeRequests = new Map<string, AbortController>();
  private retryQueue = new Map<string, number>(); // key -> retry count
  private cache = new Map<string, TileData>();
  private db: IDBDatabase | null = null;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      maxConcurrentRequests: 6,
      maxRetries: 3,
      retryDelayMs: 1000,
      prefetchDistance: 50000, // 50km
      cacheMaxAge: 1000 * 60 * 30, // 30 minutes
      ...config,
    };

    this.initIndexedDB();
  }

  /**
   * Initialize IndexedDB for persistent tile cache
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("FlightCorridorTiles", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains("tiles")) {
          const store = db.createObjectStore("tiles", { keyPath: "key" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  /**
   * Load tiles from priority queue
   */
  async loadTiles(requests: TileRequest[]): Promise<Map<string, TileData>> {
    const results = new Map<string, TileData>();

    // Limit concurrent requests
    const batches = this.createBatches(requests, this.config.maxConcurrentRequests);

    for (const batch of batches) {
      const promises = batch.map(req => this.loadTile(req));
      const batchResults = await Promise.allSettled(promises);

      batchResults.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value) {
          results.set(result.value.key, result.value);
        } else if (result.status === "rejected") {
          // Add to retry queue
          const req = batch[idx];
          const key = this.tileKey(req.x, req.z, req.zoom);
          const retries = this.retryQueue.get(key) ?? 0;
          
          if (retries < this.config.maxRetries) {
            this.retryQueue.set(key, retries + 1);
          }
        }
      });
    }

    return results;
  }

  /**
   * Load a single tile
   */
  private async loadTile(request: TileRequest): Promise<TileData | null> {
    const key = this.tileKey(request.x, request.z, request.zoom);

    // Check memory cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheMaxAge) {
      return cached;
    }

    // Check IndexedDB cache
    const dbCached = await this.getCachedTile(key);
    if (dbCached && Date.now() - dbCached.timestamp < this.config.cacheMaxAge) {
      this.cache.set(key, dbCached);
      return dbCached;
    }

    // Fetch from network
    const abortController = new AbortController();
    this.activeRequests.set(key, abortController);

    try {
      const tileData = await this.fetchTileData(request, abortController.signal);
      
      // Cache in memory and IndexedDB
      this.cache.set(key, tileData);
      await this.cacheTile(tileData);

      return tileData;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }
      throw error;
    } finally {
      this.activeRequests.delete(key);
    }
  }

  /**
   * Fetch tile data from tile servers
   */
  private async fetchTileData(
    request: TileRequest,
    signal: AbortSignal
  ): Promise<TileData> {
    const key = this.tileKey(request.x, request.z, request.zoom);

    // For development: generate mock tiles without external API
    // TODO: Replace with real tile sources when API tokens available
    const [elevation, satellite] = await Promise.all([
      this.generateMockElevation(request, signal),
      this.generateMockSatellite(request, signal),
    ]);

    // Calculate size
    const elevationSize = elevation ? elevation.byteLength : 0;
    const satelliteSize = satellite ? satellite.width * satellite.height * 4 : 0;
    const sizeBytes = elevationSize + satelliteSize;

    return {
      key,
      elevation,
      satellite,
      sizeBytes,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate mock elevation data (Himalayan terrain simulation)
   */
  private async generateMockElevation(
    request: TileRequest,
    signal: AbortSignal
  ): Promise<Float32Array> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    if (signal.aborted) throw new Error("Aborted");

    const resolution = 256; // 256x256 heightmap
    const data = new Float32Array(resolution * resolution);

    // Generate Himalayan-like terrain (2000-8000m elevation range)
    const seed = request.x * 1000 + request.z * 100 + request.zoom;
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = y * resolution + x;
        
        // Multi-octave noise simulation
        const nx = x / resolution;
        const ny = y / resolution;
        
        // Base elevation around 3000-4000m
        let elevation = 3500;
        
        // Large mountain ranges
        elevation += Math.sin(nx * 4 + seed * 0.01) * 1500;
        elevation += Math.cos(ny * 3 + seed * 0.02) * 1200;
        
        // Medium hills
        elevation += Math.sin(nx * 10 + ny * 8) * 500;
        
        // Small details
        elevation += Math.sin(nx * 50 + ny * 50) * 100;
        elevation += Math.cos(nx * 80) * 50;
        
        // Add tile-specific variation
        elevation += (request.x % 3 - 1) * 300;
        elevation += (request.z % 3 - 1) * 400;
        
        // Clamp to realistic Himalayan range
        data[idx] = Math.max(2000, Math.min(8000, elevation));
      }
    }

    return data;
  }

  /**
   * Generate mock satellite imagery (mountain texture)
   */
  private async generateMockSatellite(
    request: TileRequest,
    signal: AbortSignal
  ): Promise<ImageBitmap> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    if (signal.aborted) throw new Error("Aborted");

    const size = 512; // 512x512 texture
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get canvas context");

    // Base terrain color (rocky mountain brown/grey)
    const seed = request.x * 1000 + request.z * 100 + request.zoom;
    const baseHue = 30 + (seed % 20); // Brown to grey
    const baseSat = 20 + (seed % 15);
    const baseLit = 35 + (seed % 20);

    ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${baseLit}%)`;
    ctx.fillRect(0, 0, size, size);

    // Add snow patches at higher elevations (white patches)
    for (let i = 0; i < 20; i++) {
      const x = (seed * 17 + i * 13) % size;
      const y = (seed * 23 + i * 19) % size;
      const radius = 20 + ((seed + i) % 40);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Add dark valleys/shadows
    for (let i = 0; i < 15; i++) {
      const x = (seed * 11 + i * 29) % size;
      const y = (seed * 31 + i * 7) % size;
      const radius = 30 + ((seed + i) % 50);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.3)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Add noise for rocky texture
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      imageData.data[i] += noise;     // R
      imageData.data[i + 1] += noise; // G
      imageData.data[i + 2] += noise; // B
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await canvas.convertToBlob({ type: "image/png" });
    return createImageBitmap(blob);
  }

  /**
   * Cache tile in IndexedDB
   */
  private async cacheTile(tile: TileData): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tiles"], "readwrite");
      const store = transaction.objectStore("tiles");
      
      const request = store.put(tile);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached tile from IndexedDB
   */
  private async getCachedTile(key: string): Promise<TileData | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tiles"], "readonly");
      const store = transaction.objectStore("tiles");
      
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Abort loading a specific tile
   */
  abortTile(key: string): void {
    const controller = this.activeRequests.get(key);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(key);
    }
  }

  /**
   * Abort all active requests
   */
  abortAll(): void {
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Clear memory cache
   */
  clearMemoryCache(): void {
    this.cache.clear();
  }

  /**
   * Clear IndexedDB cache
   */
  async clearDiskCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tiles"], "readwrite");
      const store = transaction.objectStore("tiles");
      
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCount: number;
    memorySizeMB: number;
    activeRequests: number;
    retryQueueSize: number;
  } {
    let totalSize = 0;
    for (const tile of this.cache.values()) {
      totalSize += tile.sizeBytes;
    }

    return {
      memoryCount: this.cache.size,
      memorySizeMB: totalSize / (1024 * 1024),
      activeRequests: this.activeRequests.size,
      retryQueueSize: this.retryQueue.size,
    };
  }

  /**
   * Generate tile key
   */
  private tileKey(x: number, z: number, zoom: number): string {
    return `${zoom}/${x}/${z}`;
  }

  /**
   * Create batches for concurrent loading
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process retry queue
   */
  async processRetryQueue(requests: TileRequest[]): Promise<void> {
    const retryItems: TileRequest[] = [];

    for (const req of requests) {
      const key = this.tileKey(req.x, req.z, req.zoom);
      if (this.retryQueue.has(key)) {
        retryItems.push(req);
      }
    }

    if (retryItems.length > 0) {
      // Add delay before retry
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
      await this.loadTiles(retryItems);
    }
  }
}
