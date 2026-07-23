/**
 * Open-Meteo weather provider (free, no API key).
 * https://open-meteo.com/
 */
import {
  conditionFromWmo,
  labelForCondition,
} from "../weatherCodes";
import type { WeatherObservation, WeatherProvider } from "../types";

function hurricaneBasin(lng: number): "atlantic" | "pacific" | "indian" | "unknown" {
  if (lng > -100 && lng < 0) return "atlantic";
  if (lng >= 100 || lng <= -100) return "pacific";
  if (lng > 40 && lng < 100) return "indian";
  return "unknown";
}

export const openMeteoProvider: WeatherProvider = {
  id: "open-meteo",

  async fetchObservation(
    lat: number,
    lng: number,
    signal?: AbortSignal,
  ): Promise<WeatherObservation> {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
      `is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,` +
      `pressure_msl,wind_speed_10m,wind_direction_10m,visibility` +
      `&daily=sunrise,sunset,precipitation_probability_max` +
      `&wind_speed_unit=kmh&timezone=auto`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();
    const c = data.current;
    if (!c) throw new Error("Open-Meteo: missing current");

    const wind = c.wind_speed_10m ?? 0;
    const code = c.weather_code ?? 0;
    const condition = conditionFromWmo(code, wind, {
      basin: hurricaneBasin(lng),
    });

    const precip =
      (c.precipitation ?? 0) +
      (c.rain ?? 0) * 0 +
      (c.showers ?? 0) * 0 +
      (c.snowfall ?? 0) * 0.1;

    return {
      condition,
      label: labelForCondition(condition),
      weatherCode: code,
      temperatureC: c.temperature_2m ?? 0,
      feelsLikeC: c.apparent_temperature ?? null,
      humidity: c.relative_humidity_2m ?? null,
      pressureHpa: c.pressure_msl ?? null,
      cloudCover: c.cloud_cover ?? 0,
      windSpeedKmh: wind,
      windDirectionDeg: c.wind_direction_10m ?? 0,
      precipitationMm: precip,
      precipitationProbability:
        data.daily?.precipitation_probability_max?.[0] ?? null,
      visibilityKm:
        typeof c.visibility === "number" ? c.visibility / 1000 : null,
      sunriseIso: data.daily?.sunrise?.[0] ?? null,
      sunsetIso: data.daily?.sunset?.[0] ?? null,
      isDay: typeof c.is_day === "number" ? c.is_day === 1 : null,
      lat,
      lng,
      fetchedAt: Date.now(),
      provider: "open-meteo",
    };
  },
};

/** Active provider — swap for OpenWeather later without touching effects. */
let activeProvider: WeatherProvider = openMeteoProvider;

export function setWeatherProvider(provider: WeatherProvider) {
  activeProvider = provider;
}

export function getWeatherProvider(): WeatherProvider {
  return activeProvider;
}
