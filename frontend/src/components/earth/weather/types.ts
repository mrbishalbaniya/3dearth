/**
 * Weather engine types — provider-agnostic so Open-Meteo / OpenWeather
 * can be swapped without touching renderers.
 */

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "overcast"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "snow"
  | "blizzard"
  | "fog"
  | "mist"
  | "dust"
  | "sandstorm"
  | "cyclone"
  | "hurricane"
  | "typhoon";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type DayPhase =
  | "night"
  | "midnight"
  | "blue_hour"
  | "sunrise"
  | "morning"
  | "midday"
  | "golden_hour"
  | "sunset";

/** Normalized 0–1 intensities driven by the weather engine (smoothly lerped). */
export interface WeatherIntensities {
  rain: number;
  snow: number;
  fog: number;
  storm: number;
  wind: number;
  cloudDensity: number;
  dust: number;
  wetness: number;
  snowCover: number;
  lightning: number;
  temperatureBlend: number;
  waveStorm: number;
}

export const DEFAULT_WEATHER_INTENSITIES: WeatherIntensities = {
  rain: 0,
  snow: 0,
  fog: 0,
  storm: 0,
  wind: 0,
  cloudDensity: 0.45,
  dust: 0,
  wetness: 0,
  snowCover: 0,
  lightning: 0,
  temperatureBlend: 0,
  waveStorm: 0,
};

/** Toggleable weather visualization layers. */
export type WeatherFxId =
  | "rain"
  | "snow"
  | "clouds"
  | "wind"
  | "storms"
  | "temperature"
  | "pressure"
  | "humidity"
  | "visibility"
  | "lightning"
  | "fog";

export type WeatherFxState = Record<WeatherFxId, boolean>;

export const DEFAULT_WEATHER_FX: WeatherFxState = {
  rain: true,
  snow: true,
  clouds: true,
  wind: true,
  storms: true,
  temperature: false,
  pressure: false,
  humidity: false,
  visibility: false,
  lightning: true,
  fog: true,
};

export const WEATHER_FX_META: Array<{
  id: WeatherFxId;
  label: string;
  description: string;
}> = [
  { id: "clouds", label: "Clouds", description: "Dynamic cloud density & storm decks" },
  { id: "rain", label: "Rain", description: "Particle rain & wetness" },
  { id: "snow", label: "Snow", description: "Snowfall & accumulation" },
  { id: "fog", label: "Fog", description: "Distance / valley fog" },
  { id: "wind", label: "Wind", description: "Wind streaks & direction" },
  { id: "storms", label: "Storms", description: "Cyclone / hurricane intensity" },
  { id: "lightning", label: "Lightning", description: "Strikes & flash illumination" },
  { id: "temperature", label: "Temperature", description: "Globe temperature tint" },
  { id: "humidity", label: "Humidity", description: "Humidity readout" },
  { id: "pressure", label: "Pressure", description: "Pressure readout" },
  { id: "visibility", label: "Visibility", description: "Visibility readout" },
];

/**
 * Canonical observation from any weather provider.
 * Rendering never reads raw API JSON — only this shape.
 */
export interface WeatherObservation {
  condition: WeatherCondition;
  label: string;
  weatherCode: number;
  temperatureC: number;
  feelsLikeC: number | null;
  humidity: number | null;
  pressureHpa: number | null;
  cloudCover: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  precipitationMm: number;
  precipitationProbability: number | null;
  visibilityKm: number | null;
  sunriseIso: string | null;
  sunsetIso: string | null;
  isDay: boolean | null;
  lat: number;
  lng: number;
  fetchedAt: number;
  provider: string;
}

/** @deprecated use WeatherObservation — kept for store migration */
export type WeatherSnapshot = WeatherObservation;

export interface WeatherProvider {
  id: string;
  fetchObservation(lat: number, lng: number, signal?: AbortSignal): Promise<WeatherObservation>;
}

export function emptyIntensities(): WeatherIntensities {
  return { ...DEFAULT_WEATHER_INTENSITIES };
}
