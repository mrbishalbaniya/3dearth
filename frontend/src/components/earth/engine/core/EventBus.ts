/**
 * Typed pub/sub event bus for Earth Engine managers & plugins.
 */
import type { EngineEventMap } from "./types";

type Handler<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof EngineEventMap>(
    event: K,
    handler: Handler<EngineEventMap[K]>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EngineEventMap>(
    event: K,
    handler: Handler<EngineEventMap[K]>,
  ): void {
    this.listeners.get(event as string)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EngineEventMap>(
    event: K,
    ...args: EngineEventMap[K] extends undefined
      ? [] | [undefined]
      : [EngineEventMap[K]]
  ): void {
    const payload = args[0] as EngineEventMap[K];
    const set = this.listeners.get(event as string);
    if (!set) return;
    for (const h of set) {
      try {
        h(payload);
      } catch (err) {
        console.error(`[EventBus] handler error on ${String(event)}`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
