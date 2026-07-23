"use client";

/**
 * Weather engine hook — fetches observation, drives smooth intensities,
 * season + day phase. Rendering reads store only.
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useEarthStore } from "../store/earthStore";
import { getWeatherProvider } from "./providers/openMeteo";
import {
  dampIntensities,
  targetIntensitiesFromObservation,
} from "./math";
import { getDayPhase, getSeason, seasonFactor } from "./seasons";
import { quantizeFocus } from "../gis/overpass";

function isMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function useWeatherEngine(sunElevation: number) {
  const enabled = useEarthStore((s) => s.gisLayers.weather);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const setWeather = useEarthStore((s) => s.setWeather);
  const setWeatherIntensities = useEarthStore((s) => s.setWeatherIntensities);
  const setSeason = useEarthStore((s) => s.setSeason);
  const setDayPhase = useEarthStore((s) => s.setDayPhase);
  const weather = useEarthStore((s) => s.weather);

  const q = quantizeFocus(focusLat, focusLng, 0.2);
  const targetsRef = useRef(targetIntensitiesFromObservation(null, 0));

  // Fetch observation when focus moves
  useEffect(() => {
    if (!enabled) {
      setWeather(null);
      targetsRef.current = targetIntensitiesFromObservation(null, 0);
      return;
    }

    const ctrl = new AbortController();
    const provider = getWeatherProvider();
    const seasonSnow =
      1 - seasonFactor(new Date(), q.lat);

    provider
      .fetchObservation(q.lat, q.lng, ctrl.signal)
      .then((obs) => {
        setWeather(obs);
        targetsRef.current = targetIntensitiesFromObservation(obs, seasonSnow);
        setSeason(getSeason(new Date(), obs.lat));
      })
      .catch(() => {
        /* keep last good observation */
      });

    // Refresh every 10 minutes
    const timer = window.setInterval(() => {
      provider
        .fetchObservation(q.lat, q.lng)
        .then((obs) => {
          setWeather(obs);
          targetsRef.current = targetIntensitiesFromObservation(
            obs,
            1 - seasonFactor(new Date(), obs.lat),
          );
        })
        .catch(() => undefined);
    }, 600_000);

    return () => {
      ctrl.abort();
      window.clearInterval(timer);
    };
  }, [enabled, q.lat, q.lng, setWeather, setSeason]);

  // Smooth intensity + day phase every frame
  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const store = useEarthStore.getState();
    const next = dampIntensities(store.weatherIntensities, targetsRef.current, dt);
    setWeatherIntensities(next);

    const phase = getDayPhase(sunElevation, weather?.isDay ?? null);
    if (store.dayPhase !== phase) setDayPhase(phase);

    const season = getSeason(new Date(), store.focusLat);
    if (store.season !== season) setSeason(season);
  });
}

export { isMobileUa };
