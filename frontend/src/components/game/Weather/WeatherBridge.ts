import { useEarthStore } from "../../earth/store/earthStore";
import type { WindSample } from "../Physics/FlightDynamics";
import { getWeatherApi, type ApiWeather } from "../../../lib/api/client";

let lastSample: ApiWeather | null = null;
let lastFetchAt = 0;
let lastKey = "";
let inflight: Promise<void> | null = null;

/** Prefetch backend weather for the current aircraft position (non-blocking). */
export function prefetchFlightWeather(lat: number, lng: number): void {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const now = Date.now();
  if (inflight) return;
  if (key === lastKey && now - lastFetchAt < 30_000) return;

  inflight = getWeatherApi(lat, lng)
    .then((w) => {
      lastSample = w;
      lastFetchAt = Date.now();
      lastKey = key;
    })
    .catch(() => {
      /* keep Earth-store fallback */
    })
    .finally(() => {
      inflight = null;
    });
}

/** Bridge backend weather (when available) + Earth weather intensities into flight wind. */
export function sampleFlightWind(lat?: number, lng?: number): WindSample {
  if (lat != null && lng != null) prefetchFlightWeather(lat, lng);

  if (lastSample) {
    const wx = useEarthStore.getState().weatherIntensities;
    const storm = wx.storm ?? 0;
    return {
      speedMs: lastSample.windSpeedMs + storm * 8,
      fromDeg: lastSample.windFromDeg,
      turbulence:
        Math.min(1.5, lastSample.windSpeedMs / 20) * 0.4 + storm * 0.8,
    };
  }

  const wx = useEarthStore.getState().weatherIntensities;
  const storm = wx.storm ?? 0;
  const wind = wx.wind ?? 0;
  return {
    speedMs: 2 + wind * 18 + storm * 12,
    fromDeg: (Date.now() / 60000) % 360,
    turbulence: wind * 0.35 + storm * 0.8,
  };
}
