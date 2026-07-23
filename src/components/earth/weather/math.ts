import type { WeatherIntensities } from "./types";
import { DEFAULT_WEATHER_INTENSITIES } from "./types";
import { targetsFromCondition } from "./weatherCodes";
import type { WeatherObservation } from "./types";

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function dampIntensities(
  current: WeatherIntensities,
  target: WeatherIntensities,
  dt: number,
  speed = 1.2,
): WeatherIntensities {
  const d = (c: number, t: number, s = speed) => damp(c, t, s, dt);
  return {
    rain: d(current.rain, target.rain, 0.9),
    snow: d(current.snow, target.snow, 0.7),
    fog: d(current.fog, target.fog, 0.8),
    storm: d(current.storm, target.storm, 1.0),
    wind: d(current.wind, target.wind, 1.4),
    cloudDensity: d(current.cloudDensity, target.cloudDensity, 0.6),
    dust: d(current.dust, target.dust, 0.85),
    wetness: d(current.wetness, target.wetness, 0.35),
    snowCover: d(current.snowCover, target.snowCover, 0.25),
    lightning: d(current.lightning, target.lightning, 1.5),
    temperatureBlend: d(current.temperatureBlend, target.temperatureBlend, 0.5),
    waveStorm: d(current.waveStorm, target.waveStorm, 0.9),
  };
}

export function targetIntensitiesFromObservation(
  obs: WeatherObservation | null,
  seasonSnowBias: number,
): WeatherIntensities {
  if (!obs) return { ...DEFAULT_WEATHER_INTENSITIES };

  const t = targetsFromCondition(
    obs.condition,
    obs.cloudCover,
    obs.windSpeedKmh,
    obs.precipitationMm,
  );

  const cold = obs.temperatureC < 1;
  const snowCover =
    (t.snow > 0.2 ? t.snow * 0.6 : 0) +
    (cold ? 0.15 : 0) +
    seasonSnowBias * (obs.lat > 45 || obs.lat < -45 ? 0.35 : 0.1);

  const wetness = Math.max(t.rain * 0.85, t.storm * 0.5);

  return {
    rain: t.rain,
    snow: t.snow,
    fog: t.fog,
    storm: t.storm,
    wind: t.wind,
    cloudDensity: t.cloudDensity,
    dust: t.dust,
    wetness,
    snowCover: Math.min(1, snowCover),
    lightning: t.lightning,
    temperatureBlend: 1,
    waveStorm: t.waveStorm,
  };
}

export function particleBudget(
  qualityId: "ultra" | "high" | "medium" | "low",
  isMobile: boolean,
): { rain: number; snow: number; wind: number; splash: number } {
  const scale = isMobile ? 0.45 : 1;
  const table = {
    ultra: { rain: 2800, snow: 2200, wind: 900, splash: 400 },
    high: { rain: 1600, snow: 1300, wind: 600, splash: 250 },
    medium: { rain: 800, snow: 650, wind: 350, splash: 120 },
    low: { rain: 280, snow: 220, wind: 140, splash: 40 },
  } as const;
  const b = table[qualityId];
  return {
    rain: Math.floor(b.rain * scale),
    snow: Math.floor(b.snow * scale),
    wind: Math.floor(b.wind * scale),
    splash: Math.floor(b.splash * scale),
  };
}
