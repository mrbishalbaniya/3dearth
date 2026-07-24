/**
 * Uniform grid spatial index for nearby traffic queries (LOD / separation).
 */

import type { TrafficAircraft } from "../types";

const CELL_DEG = 1; // ~111 km

function cellKey(lat: number, lng: number): string {
  const i = Math.floor(lat / CELL_DEG);
  const j = Math.floor(lng / CELL_DEG);
  return `${i}:${j}`;
}

export class TrafficSpatialIndex {
  private cells = new Map<string, Set<string>>();
  private pos = new Map<string, { lat: number; lng: number }>();

  clear() {
    this.cells.clear();
    this.pos.clear();
  }

  upsert(id: string, lat: number, lng: number) {
    const prev = this.pos.get(id);
    if (prev) {
      const oldKey = cellKey(prev.lat, prev.lng);
      const set = this.cells.get(oldKey);
      set?.delete(id);
    }
    const key = cellKey(lat, lng);
    let set = this.cells.get(key);
    if (!set) {
      set = new Set();
      this.cells.set(key, set);
    }
    set.add(id);
    this.pos.set(id, { lat, lng });
  }

  remove(id: string) {
    const prev = this.pos.get(id);
    if (!prev) return;
    this.cells.get(cellKey(prev.lat, prev.lng))?.delete(id);
    this.pos.delete(id);
  }

  /** IDs in cells covering radiusDeg around focus */
  query(lat: number, lng: number, radiusDeg: number): string[] {
    const r = Math.ceil(radiusDeg / CELL_DEG);
    const i0 = Math.floor(lat / CELL_DEG);
    const j0 = Math.floor(lng / CELL_DEG);
    const out: string[] = [];
    for (let di = -r; di <= r; di++) {
      for (let dj = -r; dj <= r; dj++) {
        const set = this.cells.get(`${i0 + di}:${j0 + dj}`);
        if (set) out.push(...set);
      }
    }
    return out;
  }

  nearest(
    aircraft: Map<string, TrafficAircraft>,
    lat: number,
    lng: number,
    radiusDeg: number,
    excludeId?: string,
  ): TrafficAircraft | null {
    let best: TrafficAircraft | null = null;
    let bestD = Infinity;
    for (const id of this.query(lat, lng, radiusDeg)) {
      if (id === excludeId) continue;
      const a = aircraft.get(id);
      if (!a) continue;
      const d = Math.hypot(a.lat - lat, a.lng - lng);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }
}
