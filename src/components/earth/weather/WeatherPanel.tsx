"use client";

import { useEarthStore } from "../store/earthStore";
import { WEATHER_FX_META, type WeatherFxId } from "./types";
import { dayPhaseLabel } from "./seasons";

function formatWindDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTime(iso: string | null): string {
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

export function WeatherPanel() {
  const weather = useEarthStore((s) => s.weather);
  const enabled = useEarthStore((s) => s.gisLayers.weather);
  const toggleGisLayer = useEarthStore((s) => s.toggleGisLayer);
  const weatherFx = useEarthStore((s) => s.weatherFx);
  const toggleWeatherFx = useEarthStore((s) => s.toggleWeatherFx);
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const season = useEarthStore((s) => s.season);
  const dayPhase = useEarthStore((s) => s.dayPhase);

  return (
    <div className="earth-weather-panel">
      <div className="earth-hud__title">Weather</div>

      <button
        type="button"
        className={`earth-toggle ${enabled ? "earth-toggle--on" : ""}`}
        onClick={() => toggleGisLayer("weather")}
        aria-pressed={enabled}
      >
        <span className="earth-toggle__dot" />
        Live weather engine
      </button>

      {!enabled && (
        <p className="earth-weather-panel__hint">
          Enable to stream Open-Meteo conditions for the camera focus.
        </p>
      )}

      {enabled && weather && (
        <div className="earth-weather-card earth-weather-card--rich">
          <div className="earth-weather-card__label">{weather.provider}</div>
          <div className="earth-weather-card__value">
            {weather.label} · {Math.round(weather.temperatureC)}°C
          </div>
          {weather.feelsLikeC != null && (
            <div className="earth-weather-card__meta">
              Feels {Math.round(weather.feelsLikeC)}°C
            </div>
          )}
          <div className="earth-weather-grid">
            <div>
              <span>Humidity</span>
              <strong>
                {weather.humidity != null ? `${Math.round(weather.humidity)}%` : "—"}
              </strong>
            </div>
            <div>
              <span>Pressure</span>
              <strong>
                {weather.pressureHpa != null
                  ? `${Math.round(weather.pressureHpa)} hPa`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Wind</span>
              <strong>
                {Math.round(weather.windSpeedKmh)} km/h{" "}
                {formatWindDir(weather.windDirectionDeg)}
              </strong>
            </div>
            <div>
              <span>Visibility</span>
              <strong>
                {weather.visibilityKm != null
                  ? `${weather.visibilityKm.toFixed(1)} km`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Clouds</span>
              <strong>{Math.round(weather.cloudCover)}%</strong>
            </div>
            <div>
              <span>Rain chance</span>
              <strong>
                {weather.precipitationProbability != null
                  ? `${Math.round(weather.precipitationProbability)}%`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Sunrise</span>
              <strong>{formatTime(weather.sunriseIso)}</strong>
            </div>
            <div>
              <span>Sunset</span>
              <strong>{formatTime(weather.sunsetIso)}</strong>
            </div>
          </div>
          <div className="earth-weather-card__meta">
            {dayPhaseLabel(dayPhase)} · {season} · wetness{" "}
            {Math.round(intensities.wetness * 100)}%
          </div>
        </div>
      )}

      {enabled && (
        <>
          <div className="earth-hud__divider" />
          <div className="earth-gis-group__label">Weather layers</div>
          {WEATHER_FX_META.map((meta) => (
            <button
              key={meta.id}
              type="button"
              className={`earth-toggle ${weatherFx[meta.id] ? "earth-toggle--on" : ""}`}
              onClick={() => toggleWeatherFx(meta.id as WeatherFxId)}
              aria-pressed={weatherFx[meta.id]}
              title={meta.description}
            >
              <span className="earth-toggle__dot" />
              {meta.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
