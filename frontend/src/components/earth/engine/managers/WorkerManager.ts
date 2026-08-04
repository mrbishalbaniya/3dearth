/**
 * WorkerManager — pool of Web Workers for heavy GIS compute.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager } from "../core/types";

type WorkerKind = "geo" | "terrain";

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  kind: WorkerKind;
}

export class WorkerManager implements EngineManager {
  readonly id = "worker";
  private engine!: EarthEngine;
  private pool: PooledWorker[] = [];
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();

  init(engine: EarthEngine): void {
    this.engine = engine;
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      this.engine.logger.info(this.id, "workers unavailable in this runtime; using fallbacks");
      return;
    }

    const isMobile =
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const hw = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
    const n = isMobile ? 1 : Math.min(2, hw);
    for (let i = 0; i < n; i++) {
      this.spawn("geo");
    }
    this.spawn("terrain");
    this.engine.logger.info(this.id, `pool size ${this.pool.length}`);
  }

  private spawn(kind: WorkerKind) {
    try {
      const worker =
        kind === "geo"
          ? new Worker(new URL("../workers/geo.worker.ts", import.meta.url))
          : new Worker(new URL("../workers/terrain.worker.ts", import.meta.url));
      worker.onmessage = (ev: MessageEvent) => {
        const { id, ok, result, error } = ev.data as {
          id: number;
          ok: boolean;
          result?: unknown;
          error?: string;
        };
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        const slot = this.pool.find((p) => p.worker === worker);
        if (slot) slot.busy = false;
        if (ok) pending.resolve(result);
        else pending.reject(new Error(error || "worker error"));
      };
      worker.onerror = (err) => {
        this.engine.logger.error(this.id, "worker error", err);
      };
      this.pool.push({ worker, busy: false, kind });
    } catch (err) {
      this.engine.logger.warn(this.id, `failed to spawn ${kind}`, err);
    }
  }

  get busyCount() {
    return this.pool.filter((p) => p.busy).length;
  }

  async run<T>(
    kind: WorkerKind,
    type: string,
    payload: unknown,
    transfer?: Transferable[],
  ): Promise<T> {
    const slot = this.pool.find((p) => p.kind === kind && !p.busy) ??
      this.pool.find((p) => p.kind === kind);
    if (!slot) {
      // Fallback: run sync stub on main thread for critical path
      return this.fallback<T>(type, payload);
    }
    slot.busy = true;
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      slot.worker.postMessage({ id, type, payload }, transfer ?? []);
    });
  }

  private fallback<T>(type: string, payload: unknown): T {
    if (type === "haversine") {
      const { lat1, lng1, lat2, lng2 } = payload as {
        lat1: number;
        lng1: number;
        lat2: number;
        lng2: number;
      };
      return haversineM(lat1, lng1, lat2, lng2) as T;
    }
    if (type === "parseJson") {
      return (typeof payload === "string" ? JSON.parse(payload) : payload) as T;
    }
    throw new Error(`No worker fallback for ${type}`);
  }

  dispose(): void {
    for (const p of this.pool) p.worker.terminate();
    this.pool = [];
    this.pending.clear();
  }
}

export function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLng = (lng2 - lng1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
