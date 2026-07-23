/**
 * CacheManager — memory LRU + offline-ready IndexedDB stub.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager } from "../core/types";

interface CacheEntry {
  bytes: number;
  expiresAt: number;
  payload: unknown;
}

export class CacheManager implements EngineManager {
  readonly id = "cache";
  private mem = new Map<string, CacheEntry>();
  private maxBytes = 64 * 1024 * 1024;
  private usedBytes = 0;
  private engine!: EarthEngine;

  init(engine: EarthEngine): void {
    this.engine = engine;
    this.engine.logger.info(this.id, "initialized", { maxBytes: this.maxBytes });
  }

  setMaxBytes(n: number) {
    this.maxBytes = n;
  }

  get<T>(key: string): T | null {
    const e = this.mem.get(key);
    if (!e) return null;
    if (e.expiresAt > 0 && Date.now() > e.expiresAt) {
      this.delete(key);
      return null;
    }
    // refresh LRU order
    this.mem.delete(key);
    this.mem.set(key, e);
    return e.payload as T;
  }

  set(key: string, payload: unknown, bytes = 1024, ttlMs = 0): void {
    this.delete(key);
    while (this.usedBytes + bytes > this.maxBytes && this.mem.size > 0) {
      const oldest = this.mem.keys().next().value as string;
      this.delete(oldest);
    }
    this.mem.set(key, {
      payload,
      bytes,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
    });
    this.usedBytes += bytes;
  }

  delete(key: string): void {
    const e = this.mem.get(key);
    if (!e) return;
    this.usedBytes -= e.bytes;
    this.mem.delete(key);
    this.engine?.events.emit("tile:evicted", { key });
  }

  get stats() {
    return {
      entries: this.mem.size,
      usedBytes: this.usedBytes,
      maxBytes: this.maxBytes,
    };
  }

  /** Offline cache hook — IndexedDB adapter can replace this later. */
  async persistStub(_key: string): Promise<void> {
    // Intentionally empty — wire IDB without changing callers
  }

  dispose(): void {
    this.mem.clear();
    this.usedBytes = 0;
  }
}
