"use client";

import { GIS_LAYER_META, type GisLayerId } from "../gis";
import { useEarthStore } from "../store/earthStore";
import type { BaseMapMode } from "../types";

const GROUPS: Array<{ id: string; label: string }> = [
  { id: "base", label: "Base" },
  { id: "physical", label: "Physical" },
  { id: "infra", label: "Infrastructure" },
  { id: "admin", label: "Administrative" },
  { id: "poi", label: "Points of Interest" },
];

const MODES: Array<{ id: BaseMapMode; label: string }> = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];

export function GisLayerPanel() {
  const gisLayers = useEarthStore((s) => s.gisLayers);
  const toggleGisLayer = useEarthStore((s) => s.toggleGisLayer);
  const baseMapMode = useEarthStore((s) => s.baseMapMode);
  const setBaseMapMode = useEarthStore((s) => s.setBaseMapMode);
  const terrainExaggeration = useEarthStore((s) => s.terrainExaggeration);
  const setTerrainExaggeration = useEarthStore((s) => s.setTerrainExaggeration);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const layers = useEarthStore((s) => s.layers);
  const toggleLayer = useEarthStore((s) => s.toggleLayer);

  return (
    <div className="earth-gis-panel">
      <div className="earth-hud__title">Base map</div>
      <div className="earth-basemap-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`earth-chip ${baseMapMode === m.id ? "earth-chip--active" : ""}`}
            onClick={() => setBaseMapMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="earth-hud__divider" />
      <div className="earth-hud__title">GIS Layers</div>

      {GROUPS.map((group) => {
        const items = GIS_LAYER_META.filter((m) => m.group === group.id);
        if (!items.length) return null;
        return (
          <div key={group.id} className="earth-gis-group">
            <div className="earth-gis-group__label">{group.label}</div>
            {items.map((meta) => {
              const active = gisLayers[meta.id];
              const belowMin = zoomLevel < meta.minZoom;
              return (
                <button
                  key={meta.id}
                  type="button"
                  className={`earth-toggle ${active ? "earth-toggle--on" : ""}`}
                  onClick={() => toggleGisLayer(meta.id as GisLayerId)}
                  aria-pressed={active}
                  title={`${meta.description} · ${meta.source}`}
                >
                  <span className="earth-toggle__dot" />
                  <span className="earth-toggle__text">
                    {meta.label}
                    {belowMin && (
                      <span className="earth-toggle__hint">L{meta.minZoom}+</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      <div className="earth-gis-group">
        <div className="earth-gis-group__label">Atmosphere</div>
        {(
          [
            ["atmosphere", "Atmosphere"],
            ["clouds", "Clouds"],
            ["dayNight", "Day / Night"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`earth-toggle ${layers[key] ? "earth-toggle--on" : ""}`}
            onClick={() => toggleLayer(key)}
            aria-pressed={layers[key]}
          >
            <span className="earth-toggle__dot" />
            {label}
          </button>
        ))}
      </div>

      <div className="earth-hud__divider" />
      <label className="earth-slider">
        <span>Terrain exaggeration ×{terrainExaggeration.toFixed(1)}</span>
        <input
          type="range"
          min={0.5}
          max={3.5}
          step={0.1}
          value={terrainExaggeration}
          onChange={(e) => setTerrainExaggeration(Number(e.target.value))}
          aria-label="Terrain exaggeration"
        />
      </label>
    </div>
  );
}
