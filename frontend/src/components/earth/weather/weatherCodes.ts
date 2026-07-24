/**
 * WMO weather interpretation codes → cinematic WeatherCondition.
 * https://open-meteo.com/en/docs
 */
import type { WeatherCondition } from "./types";

export function conditionFromWmo(
  code: number,
  windKmh: number,
  opts?: { basin?: "atlantic" | "pacific" | "indian" | "unknown" },
): WeatherCondition {
  // Extreme wind → cyclone family
  if (windKmh >= 119) {
    if (opts?.basin === "pacific") return "typhoon";
    if (opts?.basin === "atlantic") return "hurricane";
    return "cyclone";
  }
  if (windKmh >= 90 && (code >= 95 || code === 65 || code === 82)) {
    return "cyclone";
  }

  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly_cloudy";
  if (code === 3) return "overcast";
  if (code === 45) return "fog";
  if (code === 48) return "mist";
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return "rain";
  }
  if (code === 61 || code === 63 || code === 66 || code === 80 || code === 81) {
    return "rain";
  }
  if (code === 65 || code === 67 || code === 82) return "heavy_rain";
  if (code === 71 || code === 73 || code === 77 || code === 85) return "snow";
  if (code === 75 || code === 86) return windKmh > 40 ? "blizzard" : "snow";
  if (code >= 95 && code <= 99) return "thunderstorm";

  // Dust / sand (Open-Meteo rarely emits these; allow hook for other providers)
  if (code === 7) return "dust";
  if (code === 8) return "sandstorm";

  return "partly_cloudy";
}

export function labelForCondition(c: WeatherCondition): string {
  const map: Record<WeatherCondition, string> = {
    clear: "Clear sky",
    partly_cloudy: "Partly cloudy",
    overcast: "Overcast",
    rain: "Rain",
    heavy_rain: "Heavy rain",
    thunderstorm: "Thunderstorm",
    snow: "Snow",
    blizzard: "Blizzard",
    fog: "Fog",
    mist: "Mist",
    dust: "Dust storm",
    sandstorm: "Sandstorm",
    cyclone: "Cyclone",
    hurricane: "Hurricane",
    typhoon: "Typhoon",
  };
  return map[c];
}

/** Target intensities from a condition (before smoothing). */
export function targetsFromCondition(
  condition: WeatherCondition,
  cloudCover: number,
  windKmh: number,
  precipMm: number,
): {
  rain: number;
  snow: number;
  fog: number;
  storm: number;
  wind: number;
  cloudDensity: number;
  dust: number;
  lightning: number;
  waveStorm: number;
} {
  const wind = Math.min(1, windKmh / 80);
  const cover = Math.min(1, cloudCover / 100);
  const precip = Math.min(1, precipMm / 8);

  const base = {
    rain: 0,
    snow: 0,
    fog: 0,
    storm: 0,
    wind,
    cloudDensity: Math.max(0.25, cover),
    dust: 0,
    lightning: 0,
    waveStorm: wind * 0.35,
  };

  switch (condition) {
    case "clear":
      return { ...base, cloudDensity: Math.min(0.25, cover) };
    case "partly_cloudy":
      return { ...base, cloudDensity: Math.max(0.4, cover) };
    case "overcast":
      return { ...base, cloudDensity: Math.max(0.75, cover) };
    case "rain":
      return {
        ...base,
        rain: Math.max(0.35, precip * 0.7 + 0.25),
        cloudDensity: Math.max(0.7, cover),
        waveStorm: 0.4 + wind * 0.3,
      };
    case "heavy_rain":
      return {
        ...base,
        rain: Math.max(0.7, precip),
        cloudDensity: 0.9,
        storm: 0.35,
        waveStorm: 0.7,
      };
    case "thunderstorm":
      return {
        ...base,
        rain: Math.max(0.55, precip),
        storm: 0.85,
        lightning: 1,
        cloudDensity: 0.95,
        waveStorm: 0.85,
      };
    case "snow":
      return {
        ...base,
        snow: Math.max(0.4, precip * 0.6 + 0.3),
        cloudDensity: Math.max(0.65, cover),
      };
    case "blizzard":
      return {
        ...base,
        snow: 0.95,
        wind: Math.max(0.75, wind),
        storm: 0.5,
        cloudDensity: 0.95,
      };
    case "fog":
      return { ...base, fog: 0.85, cloudDensity: Math.max(0.5, cover) };
    case "mist":
      return { ...base, fog: 0.45, cloudDensity: Math.max(0.4, cover) };
    case "dust":
      return { ...base, dust: 0.7, fog: 0.25, cloudDensity: 0.55 };
    case "sandstorm":
      return { ...base, dust: 1, fog: 0.4, wind: Math.max(0.7, wind), storm: 0.4 };
    case "cyclone":
    case "hurricane":
    case "typhoon":
      return {
        ...base,
        rain: 0.9,
        storm: 1,
        wind: 1,
        lightning: 0.7,
        cloudDensity: 1,
        waveStorm: 1,
      };
    default:
      return base;
  }
}
