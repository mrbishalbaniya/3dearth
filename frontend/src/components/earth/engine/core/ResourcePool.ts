/**
 * Resource pool with reference counting — prevents GPU leaks.
 */
import type { Disposable } from "./types";

interface Entry<T> {
  value: T;
  refs: number;
  dispose: (v: T) => void;
  lastUsed: number;
}

export class ResourcePool<T> implements Disposable {
  private map = new Map<string, Entry<T>>();
  private maxSize: number;

  constructor(maxSize = 256) {
    this.maxSize = maxSize;
  }

  acquire(key: string, create: () => T, dispose: (v: T) => void): T {
    const hit = this.map.get(key);
    if (hit) {
      hit.refs += 1;
      hit.lastUsed = performance.now();
      return hit.value;
    }
    this.evictIfNeeded();
    const value = create();
    this.map.set(key, {
      value,
      refs: 1,
      dispose,
      lastUsed: performance.now(),
    });
    return value;
  }

  release(key: string): void {
    const hit = this.map.get(key);
    if (!hit) return;
    hit.refs = Math.max(0, hit.refs - 1);
    hit.lastUsed = performance.now();
    if (hit.refs === 0) {
      // Soft retain until eviction — avoids thrashing
    }
  }

  private evictIfNeeded() {
    if (this.map.size < this.maxSize) return;
    let victim: string | null = null;
    let oldest = Infinity;
    for (const [k, v] of this.map) {
      if (v.refs > 0) continue;
      if (v.lastUsed < oldest) {
        oldest = v.lastUsed;
        victim = k;
      }
    }
    if (!victim) return;
    const entry = this.map.get(victim)!;
    try {
      entry.dispose(entry.value);
    } catch {
      /* ignore */
    }
    this.map.delete(victim);
  }

  get size() {
    return this.map.size;
  }

  dispose(): void {
    for (const entry of this.map.values()) {
      try {
        entry.dispose(entry.value);
      } catch {
        /* ignore */
      }
    }
    this.map.clear();
  }
}

/** WeakMap cache for object→metadata without preventing GC. */
export class WeakCache<K extends object, V> {
  private map = new WeakMap<K, V>();

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  set(key: K, value: V): void {
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }
}
