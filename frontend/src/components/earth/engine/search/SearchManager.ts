/**
 * SearchService — pluggable geocoder architecture with local catalog fallback.
 * Ready for Photon / Nominatim / custom APIs without engine changes.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager, SearchHit } from "../core/types";
import { DEFAULT_MARKERS } from "../../utils/constants";
import { MAP_LABELS } from "../../utils/labels";

export interface GeocoderProvider {
  id: string;
  search(query: string, signal?: AbortSignal): Promise<SearchHit[]>;
}

/** Built-in offline-ish catalog from markers + curated labels. */
export const localCatalogProvider: GeocoderProvider = {
  id: "local-catalog",
  async search(query: string) {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const hits: SearchHit[] = [];

    for (const m of DEFAULT_MARKERS) {
      if (m.name.toLowerCase().includes(q)) {
        hits.push({
          id: `marker:${m.id}`,
          label: m.name,
          kind: "city",
          lat: m.lat,
          lng: m.lng,
          altitudeM: 8_000,
          score: m.name.toLowerCase().startsWith(q) ? 1 : 0.7,
        });
      }
    }

    for (const l of MAP_LABELS) {
      if (l.name.toLowerCase().includes(q)) {
        hits.push({
          id: `label:${l.id}`,
          label: l.name,
          kind: l.kind || "place",
          lat: l.lat,
          lng: l.lng,
          altitudeM:
            l.kind === "continent"
              ? 8_000_000
              : l.kind === "country"
                ? 2_000_000
                : 50_000,
          score: 0.55,
        });
      }
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, 20);
  },
};

export class SearchManager implements EngineManager {
  readonly id = "search";
  private engine!: EarthEngine;
  private providers: GeocoderProvider[] = [localCatalogProvider];

  init(engine: EarthEngine): void {
    this.engine = engine;
    this.engine.events.on("search:query", ({ q }) => {
      void this.search(q);
    });
  }

  registerProvider(provider: GeocoderProvider) {
    this.providers = [
      provider,
      ...this.providers.filter((p) => p.id !== provider.id),
    ];
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
    const results: SearchHit[] = [];
    for (const p of this.providers) {
      try {
        const hits = await p.search(query, signal);
        results.push(...hits);
      } catch (err) {
        this.engine.logger.warn(this.id, `provider ${p.id} failed`, err);
      }
    }
    const dedup = new Map<string, SearchHit>();
    for (const h of results) {
      const prev = dedup.get(h.id);
      if (!prev || h.score > prev.score) dedup.set(h.id, h);
    }
    return [...dedup.values()].sort((a, b) => b.score - a.score).slice(0, 25);
  }

  async searchAndFly(query: string) {
    const hits = await this.search(query);
    const top = hits[0];
    if (top) {
      this.engine.camera.flyTo(
        top.lat,
        top.lng,
        top.altitudeM ?? 50_000,
        1.6,
      );
    }
    return hits;
  }

  dispose(): void {
    this.providers = [localCatalogProvider];
  }
}
