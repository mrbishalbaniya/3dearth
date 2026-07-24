"use client";

import { useEarthStore } from "../../store/earthStore";
import {
  SEA_LEVEL_MAX_M,
  SEA_LEVEL_MIN_M,
  SEA_LEVEL_PRESETS,
  SEA_LEVEL_STOPS_M,
} from "../constants";
import { formatSeaLevel } from "../hypsometric";
import type {
  DryEarthColorMode,
  GeologicalLayerState,
} from "../types";

const COLOR_MODES: Array<{ id: DryEarthColorMode; label: string }> = [
  { id: "hypsometric", label: "Color" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
  { id: "wireframe", label: "Wire" },
];

const GEO_TOGGLES: Array<{
  key: keyof GeologicalLayerState;
  label: string;
}> = [
  { key: "continents", label: "Continents" },
  { key: "tectonicPlates", label: "Tectonic plates" },
  { key: "volcanoes", label: "Volcanoes" },
  { key: "earthquakes", label: "Earthquakes" },
  { key: "faultLines", label: "Fault lines" },
  { key: "oceanTrenches", label: "Ocean trenches" },
  { key: "mountainRanges", label: "Mountain ranges" },
  { key: "riverBasins", label: "River basins" },
];

export function DryEarthPanel() {
  const dry = useEarthStore((s) => s.dryEarth);
  const setDryEarth = useEarthStore((s) => s.setDryEarth);
  const setSeaLevelTarget = useEarthStore((s) => s.setSeaLevelTarget);
  const applySeaLevelPreset = useEarthStore((s) => s.applySeaLevelPreset);
  const toggleGeological = useEarthStore((s) => s.toggleGeological);

  const onSlider = (index: number) => {
    const meters = SEA_LEVEL_STOPS_M[index];
    if (meters == null) return;
    setSeaLevelTarget(meters);
    if (!dry.enabled) setDryEarth({ enabled: true });
  };

  const sliderIndex = (() => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < SEA_LEVEL_STOPS_M.length; i++) {
      const d = Math.abs(SEA_LEVEL_STOPS_M[i] - dry.targetSeaLevelM);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  })();

  return (
    <div className={`dry-panel ${dry.enabled ? "dry-panel--active" : ""}`}>
      <div className="dry-panel__head">
        <div>
          <div className="dry-panel__title">Dry Earth</div>
          <div className="dry-panel__sub">
            Drain oceans — real seafloor depth &amp; mountain height
          </div>
        </div>
        <button
          type="button"
          className={`earth-chip ${dry.enabled ? "earth-chip--active" : ""}`}
          onClick={() => {
            const next = !dry.enabled;
            setDryEarth({ enabled: next });
            if (next) {
              // Full drain — remove oceans so seafloor + mountains show
              setSeaLevelTarget(-11000);
            } else {
              setSeaLevelTarget(0);
            }
          }}
        >
          {dry.enabled ? "On" : "Off"}
        </button>
      </div>

      <div className="dry-panel__level">
        <span>{formatSeaLevel(dry.displaySeaLevelM)}</span>
        <span className="dry-panel__level-target">
          → {formatSeaLevel(dry.targetSeaLevelM)}
        </span>
      </div>

      <label className="dry-slider">
        <span className="dry-slider__cap">+{SEA_LEVEL_MAX_M} m</span>
        <input
          type="range"
          min={0}
          max={SEA_LEVEL_STOPS_M.length - 1}
          step={1}
          value={sliderIndex}
          onChange={(e) => onSlider(Number(e.target.value))}
          aria-label="Global water level"
        />
        <span className="dry-slider__cap">{SEA_LEVEL_MIN_M} m</span>
      </label>

      <div className="dry-presets">
        {SEA_LEVEL_PRESETS.filter((p) =>
          ["flood_extreme", "real", "dry", "ice_age", "abyss"].includes(p.id),
        ).map((p) => (
          <button
            key={p.id}
            type="button"
            className={`earth-chip ${
              dry.enabled && Math.abs(dry.targetSeaLevelM - p.meters) < 1
                ? "earth-chip--active"
                : ""
            }`}
            title={p.description}
            onClick={() => {
              setDryEarth({ enabled: true });
              applySeaLevelPreset(p.id);
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="earth-chip"
          onClick={() => {
            setSeaLevelTarget(0);
            setDryEarth({ enabled: true });
          }}
        >
          Reset
        </button>
      </div>

      <div className="dry-modes">
        {COLOR_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`earth-chip ${dry.colorMode === m.id ? "earth-chip--active" : ""}`}
            onClick={() => setDryEarth({ colorMode: m.id, enabled: true })}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="dry-toggles">
        <button
          type="button"
          className={`earth-switch ${dry.showLabels ? "earth-switch--on" : ""}`}
          onClick={() => setDryEarth({ showLabels: !dry.showLabels })}
        >
          <span className="earth-switch__track" aria-hidden>
            <span className="earth-switch__thumb" />
          </span>
          <span className="earth-switch__label">Labels</span>
        </button>
        <button
          type="button"
          className={`earth-switch ${dry.showLegend ? "earth-switch--on" : ""}`}
          onClick={() => setDryEarth({ showLegend: !dry.showLegend })}
        >
          <span className="earth-switch__track" aria-hidden>
            <span className="earth-switch__thumb" />
          </span>
          <span className="earth-switch__label">Legend</span>
        </button>
        <button
          type="button"
          className={`earth-switch ${dry.measureMode ? "earth-switch--on" : ""}`}
          onClick={() =>
            setDryEarth({
              measureMode: !dry.measureMode,
              crossSectionMode: false,
              enabled: true,
            })
          }
        >
          <span className="earth-switch__track" aria-hidden>
            <span className="earth-switch__thumb" />
          </span>
          <span className="earth-switch__label">Measure</span>
        </button>
        <button
          type="button"
          className={`earth-switch ${dry.crossSectionMode ? "earth-switch--on" : ""}`}
          onClick={() =>
            setDryEarth({
              crossSectionMode: !dry.crossSectionMode,
              measureMode: false,
              profileDraft: [],
              enabled: true,
            })
          }
        >
          <span className="earth-switch__track" aria-hidden>
            <span className="earth-switch__thumb" />
          </span>
          <span className="earth-switch__label">Profile</span>
        </button>
      </div>

      {dry.enabled && (
        <div className="dry-geo">
          <div className="earth-sidebar__group-label">Geological layers</div>
          {GEO_TOGGLES.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`earth-switch ${dry.geological[g.key] ? "earth-switch--on" : ""}`}
              onClick={() => toggleGeological(g.key)}
            >
              <span className="earth-switch__track" aria-hidden>
                <span className="earth-switch__thumb" />
              </span>
              <span className="earth-switch__label">{g.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
