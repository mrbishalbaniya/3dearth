import type { WeatherObservation } from "../weather/types";
import type { AirportLightingState } from "./types";

export class AirportWeather {
  buildLighting(weather: WeatherObservation | null): AirportLightingState {
    const windSpeedMs = weather?.windSpeedMs ?? 2.5;
    const windFromDeg = weather?.windFromDeg ?? 180;
    const visibilityM = weather?.visibilityM ?? 20_000;
    const cloudCover = weather?.cloudsOctas != null ? weather.cloudsOctas / 8 : 0.2;
    const temperatureC = weather?.tempC ?? 22;
    const wetRunway = cloudCover > 0.55 || visibilityM < 6000;
    const night = false;

    return {
      night,
      wetRunway,
      visibilityM,
      cloudCover,
      windSpeedMs,
      windFromDeg,
      temperatureC,
    };
  }
}
