"use client";

/**
 * WeatherSystem — orchestrates live weather effects.
 * Data via provider interface (Open-Meteo by default).
 */
import { useMemo } from "react";
import { useEarthStore } from "../store/earthStore";
import { useWeatherEngine, isMobileUa } from "./useWeatherEngine";
import { particleBudget } from "./math";
import { RainEffect } from "./effects/RainEffect";
import { SnowEffect } from "./effects/SnowEffect";
import { FogEffect } from "./effects/FogEffect";
import { LightningEffect } from "./effects/LightningEffect";
import { WindEffect } from "./effects/WindEffect";
import { TemperatureOverlay } from "./effects/TemperatureOverlay";
import { SplashEffect } from "./effects/SplashEffect";

interface WeatherSystemProps {
  sunElevation: number;
}

export function WeatherSystem({ sunElevation }: WeatherSystemProps) {
  useWeatherEngine(sunElevation);

  const enabled = useEarthStore((s) => s.gisLayers.weather);
  const qualityId = useEarthStore((s) => s.qualityId);

  const budget = useMemo(
    () => particleBudget(qualityId, isMobileUa()),
    [qualityId],
  );

  if (!enabled) return null;

  return (
    <group name="weather-system">
      <TemperatureOverlay />
      <FogEffect />
      <RainEffect count={budget.rain} />
      <SnowEffect count={budget.snow} />
      <SplashEffect count={budget.splash} />
      <WindEffect count={budget.wind} />
      <LightningEffect />
    </group>
  );
}
