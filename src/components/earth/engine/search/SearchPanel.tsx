"use client";

/**
 * Search panel — uses SearchManager; fly-to on result click.
 */
import { useCallback, useState } from "react";
import { EarthEngine } from "../core/EarthEngine";
import type { SearchHit } from "../core/types";

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (value: string) => {
    setQ(value);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    try {
      const results = await EarthEngine.shared.search.search(value);
      setHits(results);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="earth-search">
      <div className="earth-hud__title">Search</div>
      <input
        className="earth-search__input"
        type="search"
        placeholder="City, country, place…"
        value={q}
        onChange={(e) => void run(e.target.value)}
        aria-label="Search places"
      />
      {busy && <div className="earth-search__status">Searching…</div>}
      <ul className="earth-search__list">
        {hits.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              className="earth-search__hit"
              onClick={() =>
                EarthEngine.shared.camera.flyTo(
                  h.lat,
                  h.lng,
                  h.altitudeM ?? 50_000,
                  1.5,
                )
              }
            >
              <span className="earth-search__hit-label">{h.label}</span>
              <span className="earth-search__hit-kind">{h.kind}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
