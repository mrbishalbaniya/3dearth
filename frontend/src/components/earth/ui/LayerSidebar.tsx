"use client";

import { useEffect, useState } from "react";
import { GIS_LAYER_META, type GisLayerId } from "../gis";
import { useEarthStore } from "../store/earthStore";
import type { BaseMapMode } from "../types";
import { WEATHER_FX_META, type WeatherFxId } from "../weather/types";
import { dayPhaseLabel } from "../weather/seasons";
import { EarthEngine } from "../engine/core/EarthEngine";
import type { SearchHit } from "../engine/core/types";
import { DryEarthPanel } from "../dryEarth";
import { isSolarSystemView } from "../solarSystem/view";
import { SolarSystemSidebar } from "./SolarSystemSidebar";

const BASE_MODES: Array<{ id: BaseMapMode; label: string }> = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];

const GIS_GROUPS = [
  { id: "base", label: "Base" },
  { id: "physical", label: "Physical" },
  { id: "infra", label: "Infrastructure" },
  { id: "admin", label: "Administrative" },
  { id: "poi", label: "Points of Interest" },
] as const;

type SectionId =
  | "search"
  | "basemap"
  | "dryearth"
  | "layers"
  | "scene"
  | "weather"
  | "settings"
  | "tour"
  | "body";

function Switch({
  on,
  label,
  hint,
  title,
  onToggle,
}: {
  on: boolean;
  label: string;
  hint?: string;
  title?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`earth-switch ${on ? "earth-switch--on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
      title={title}
    >
      <span className="earth-switch__track" aria-hidden>
        <span className="earth-switch__thumb" />
      </span>
      <span className="earth-switch__label">
        {label}
        {hint ? <span className="earth-switch__hint">{hint}</span> : null}
      </span>
    </button>
  );
}

function Accordion({
  id,
  title,
  open,
  onToggle,
  children,
  badge,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className={`earth-acc ${open ? "earth-acc--open" : ""}`}>
      <button
        type="button"
        className="earth-acc__head"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="earth-acc__meta">
          {badge ? <span className="earth-acc__badge">{badge}</span> : null}
          <span className="earth-acc__chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {open && <div className="earth-acc__body">{children}</div>}
    </div>
  );
}

function formatWindDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function LayerSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSection, setOpenSection] = useState<SectionId | null>("tour");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const gisLayers = useEarthStore((s) => s.gisLayers);
  const toggleGisLayer = useEarthStore((s) => s.toggleGisLayer);
  const layers = useEarthStore((s) => s.layers);
  const toggleLayer = useEarthStore((s) => s.toggleLayer);
  const baseMapMode = useEarthStore((s) => s.baseMapMode);
  const setBaseMapMode = useEarthStore((s) => s.setBaseMapMode);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const terrainExaggeration = useEarthStore((s) => s.terrainExaggeration);
  const setTerrainExaggeration = useEarthStore((s) => s.setTerrainExaggeration);
  const useRealSun = useEarthStore((s) => s.useRealSun);
  const setUseRealSun = useEarthStore((s) => s.setUseRealSun);
  const sunTimeOffsetHours = useEarthStore((s) => s.sunTimeOffsetHours);
  const setSunTimeOffsetHours = useEarthStore((s) => s.setSunTimeOffsetHours);
  const exposure = useEarthStore((s) => s.exposure);
  const setExposure = useEarthStore((s) => s.setExposure);
  const qualityId = useEarthStore((s) => s.qualityId);
  const setQualityId = useEarthStore((s) => s.setQualityId);
  const weather = useEarthStore((s) => s.weather);
  const weatherFx = useEarthStore((s) => s.weatherFx);
  const toggleWeatherFx = useEarthStore((s) => s.toggleWeatherFx);
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const season = useEarthStore((s) => s.season);
  const dayPhase = useEarthStore((s) => s.dayPhase);
  const dryEnabled = useEarthStore((s) => s.dryEarth.enabled);
  const selectedSolarBody = useEarthStore((s) => s.selectedSolarBody);

  const solarView = isSolarSystemView({ layers, zoomLevel, altitudeM });

  useEffect(() => {
    if (solarView) {
      setOpenSection((cur) =>
        cur === "dryearth" || cur === "layers" || cur === "weather" || cur === "basemap"
          ? "tour"
          : cur ?? "tour",
      );
    } else {
      setOpenSection((cur) =>
        cur === "tour" || cur === "body" ? "dryearth" : cur,
      );
    }
  }, [solarView]);

  const toggleSection = (id: SectionId | string) => {
    setOpenSection((cur) => (cur === id ? null : (id as SectionId)));
  };

  const onSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      setHits(await EarthEngine.shared.search.search(value));
    } finally {
      setSearching(false);
    }
  };

  const title = solarView ? "Solar System" : "Layers";
  const subtitle = solarView
    ? selectedSolarBody === "overview"
      ? "Planet tour & body layers"
      : `Tour · ${selectedSolarBody}`
    : "Toggle map & scene";

  return (
    <div
      className={`earth-sidebar-root ${sidebarOpen ? "earth-sidebar-root--open" : "earth-sidebar-root--closed"}`}
    >
      <button
        type="button"
        className="earth-sidebar-tab"
        onClick={() => setSidebarOpen(true)}
        aria-expanded={false}
        aria-controls="earth-layers-sidebar"
        aria-label="Expand layers sidebar"
        title="Expand layers"
        hidden={sidebarOpen}
      >
        <span className="earth-sidebar-tab__icon" aria-hidden>
          ☰
        </span>
        <span className="earth-sidebar-tab__label">
          {solarView ? "Tour" : "Layers"}
        </span>
      </button>

      <aside
        id="earth-layers-sidebar"
        className={`earth-sidebar ${sidebarOpen ? "earth-sidebar--open" : "earth-sidebar--closed"}`}
        aria-label="Layers and settings"
        aria-hidden={!sidebarOpen}
      >
        <div className="earth-sidebar__header">
          <div>
            <div className="earth-sidebar__title">{title}</div>
            <div className="earth-sidebar__sub">{subtitle}</div>
          </div>
          <button
            type="button"
            className="earth-sidebar__collapse"
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse layers sidebar"
            title="Collapse"
          >
            ‹
          </button>
        </div>

        <div className="earth-sidebar__scroll">
          {solarView ? (
            <>
              <SolarSystemSidebar
                openSection={openSection}
                onToggleSection={toggleSection}
              />
              <Accordion
                id="settings"
                title="Settings"
                open={openSection === "settings"}
                onToggle={toggleSection}
              >
                <Switch
                  on={useRealSun}
                  label="Real UTC sun"
                  onToggle={() => setUseRealSun(!useRealSun)}
                />
                <label className="earth-slider">
                  <span>Sun offset {sunTimeOffsetHours}h</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={sunTimeOffsetHours}
                    onChange={(e) =>
                      setSunTimeOffsetHours(Number(e.target.value))
                    }
                    aria-label="Sun time offset hours"
                  />
                </label>
                <label className="earth-slider">
                  <span>Exposure ×{exposure.toFixed(2)}</span>
                  <input
                    type="range"
                    min={0.55}
                    max={1.6}
                    step={0.05}
                    value={exposure}
                    onChange={(e) => setExposure(Number(e.target.value))}
                    aria-label="Exposure"
                  />
                </label>
                <label className="earth-slider">
                  <span>Quality</span>
                  <select
                    className="earth-select"
                    value={qualityId}
                    onChange={(e) =>
                      setQualityId(e.target.value as typeof qualityId)
                    }
                    aria-label="Render quality"
                  >
                    <option value="ultra">Ultra</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </Accordion>
            </>
          ) : (
            <>
              <Accordion
                id="search"
                title="Search"
                open={openSection === "search"}
                onToggle={toggleSection}
              >
                <input
                  className="earth-search__input"
                  type="search"
                  placeholder="City, country, place…"
                  value={query}
                  onChange={(e) => void onSearch(e.target.value)}
                  aria-label="Search places"
                />
                {searching && (
                  <div className="earth-search__status">Searching…</div>
                )}
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
                        <span className="earth-search__hit-label">
                          {h.label}
                        </span>
                        <span className="earth-search__hit-kind">{h.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Accordion>

              <Accordion
                id="basemap"
                title="Base map"
                open={openSection === "basemap"}
                onToggle={toggleSection}
                badge={baseMapMode}
              >
                <div className="earth-basemap-modes">
                  {BASE_MODES.map((m) => (
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
              </Accordion>

              <Accordion
                id="dryearth"
                title="Dry Earth"
                open={openSection === "dryearth"}
                onToggle={toggleSection}
                badge={dryEnabled ? "live" : undefined}
              >
                <DryEarthPanel />
              </Accordion>

              <Accordion
                id="layers"
                title="Map layers"
                open={openSection === "layers"}
                onToggle={toggleSection}
              >
                {GIS_GROUPS.map((group) => {
                  const items = GIS_LAYER_META.filter(
                    (m) => m.group === group.id && m.id !== "weather",
                  );
                  if (!items.length) return null;
                  return (
                    <div key={group.id} className="earth-sidebar__group">
                      <div className="earth-sidebar__group-label">
                        {group.label}
                      </div>
                      {items.map((meta) => (
                        <Switch
                          key={meta.id}
                          on={gisLayers[meta.id]}
                          label={meta.label}
                          hint={
                            zoomLevel < meta.minZoom
                              ? `L${meta.minZoom}+`
                              : undefined
                          }
                          title={`${meta.description} · ${meta.source}`}
                          onToggle={() =>
                            toggleGisLayer(meta.id as GisLayerId)
                          }
                        />
                      ))}
                    </div>
                  );
                })}
                <label className="earth-slider">
                  <span>
                    Terrain exaggeration ×{terrainExaggeration.toFixed(1)}
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={3.5}
                    step={0.1}
                    value={terrainExaggeration}
                    onChange={(e) =>
                      setTerrainExaggeration(Number(e.target.value))
                    }
                    aria-label="Terrain exaggeration"
                  />
                </label>
              </Accordion>

              <Accordion
                id="scene"
                title="Scene"
                open={openSection === "scene"}
                onToggle={toggleSection}
              >
                {(
                  [
                    ["atmosphere", "Atmosphere"],
                    ["clouds", "Clouds"],
                    ["stars", "Stars & planets"],
                    ["dayNight", "Day / Night"],
                  ] as const
                ).map(([key, label]) => (
                  <Switch
                    key={key}
                    on={layers[key]}
                    label={label}
                    onToggle={() => toggleLayer(key)}
                  />
                ))}
              </Accordion>

              <Accordion
                id="weather"
                title="Weather"
                open={openSection === "weather"}
                onToggle={toggleSection}
                badge={gisLayers.weather ? "on" : "off"}
              >
                <Switch
                  on={gisLayers.weather}
                  label="Live weather"
                  title="Open-Meteo conditions at camera focus"
                  onToggle={() => toggleGisLayer("weather")}
                />

                {gisLayers.weather && weather && (
                  <div className="earth-weather-card earth-weather-card--rich">
                    <div className="earth-weather-card__value">
                      {weather.label} · {Math.round(weather.temperatureC)}°C
                    </div>
                    <div className="earth-weather-card__meta">
                      {dayPhaseLabel(dayPhase)} · {season}
                      {weather.humidity != null
                        ? ` · ${Math.round(weather.humidity)}% RH`
                        : ""}
                      {` · ${Math.round(weather.windSpeedKmh)} km/h ${formatWindDir(weather.windDirectionDeg)}`}
                    </div>
                    <div className="earth-weather-card__meta">
                      ↑ {formatTime(weather.sunriseIso)} · ↓{" "}
                      {formatTime(weather.sunsetIso)}
                      {weather.precipitationProbability != null
                        ? ` · rain ${Math.round(weather.precipitationProbability)}%`
                        : ""}
                    </div>
                    <div className="earth-weather-card__meta">
                      Wetness {Math.round(intensities.wetness * 100)}%
                    </div>
                  </div>
                )}

                {gisLayers.weather && (
                  <div className="earth-sidebar__group">
                    <div className="earth-sidebar__group-label">Effects</div>
                    {WEATHER_FX_META.filter(
                      (m) =>
                        !["humidity", "pressure", "visibility"].includes(m.id),
                    ).map((meta) => (
                      <Switch
                        key={meta.id}
                        on={weatherFx[meta.id]}
                        label={meta.label}
                        title={meta.description}
                        onToggle={() =>
                          toggleWeatherFx(meta.id as WeatherFxId)
                        }
                      />
                    ))}
                  </div>
                )}
              </Accordion>

              <Accordion
                id="settings"
                title="Settings"
                open={openSection === "settings"}
                onToggle={toggleSection}
              >
                <Switch
                  on={useRealSun}
                  label="Real UTC sun"
                  onToggle={() => setUseRealSun(!useRealSun)}
                />
                <label className="earth-slider">
                  <span>Sun offset {sunTimeOffsetHours}h</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={sunTimeOffsetHours}
                    onChange={(e) =>
                      setSunTimeOffsetHours(Number(e.target.value))
                    }
                    aria-label="Sun time offset hours"
                  />
                </label>
                <label className="earth-slider">
                  <span>Exposure ×{exposure.toFixed(2)}</span>
                  <input
                    type="range"
                    min={0.55}
                    max={1.6}
                    step={0.05}
                    value={exposure}
                    onChange={(e) => setExposure(Number(e.target.value))}
                    aria-label="Exposure"
                  />
                </label>
                <label className="earth-slider">
                  <span>Quality</span>
                  <select
                    className="earth-select"
                    value={qualityId}
                    onChange={(e) =>
                      setQualityId(e.target.value as typeof qualityId)
                    }
                    aria-label="Render quality"
                  >
                    <option value="ultra">Ultra</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </Accordion>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
