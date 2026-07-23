/** Season + day-phase helpers for live Earth lighting. */

import type { DayPhase, Season } from "./types";

export function getSeason(date: Date, latitude: number): Season {
  const month = date.getUTCMonth(); // 0–11
  // Meteorological seasons; flip for southern hemisphere
  let season: Season;
  if (month >= 2 && month <= 4) season = "spring";
  else if (month >= 5 && month <= 7) season = "summer";
  else if (month >= 8 && month <= 10) season = "autumn";
  else season = "winter";

  if (latitude < 0) {
    const flip: Record<Season, Season> = {
      spring: "autumn",
      summer: "winter",
      autumn: "spring",
      winter: "summer",
    };
    return flip[season];
  }
  return season;
}

/** 0 = midwinter, 1 = midsummer for given hemisphere (via latitude). */
export function seasonFactor(date: Date, latitude: number): number {
  const day =
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 0)) /
    86400000;
  // Northern: peak summer ~ day 172
  let t = 0.5 + 0.5 * Math.sin(((day - 80) / 365) * Math.PI * 2);
  if (latitude < 0) t = 1 - t;
  return t;
}

/**
 * Day phase from solar elevation (direction.y in unit sun vector)
 * and optional is_day flag from provider.
 */
export function getDayPhase(
  sunElevation: number,
  isDay: boolean | null,
): DayPhase {
  if (sunElevation < -0.25) return "midnight";
  if (sunElevation < -0.08) return "night";
  if (sunElevation < 0.02) {
    // Blue hour / twilight
    if (isDay === false || sunElevation < 0) return "blue_hour";
    return sunElevation < 0.01 ? "sunrise" : "sunset";
  }
  if (sunElevation < 0.12) {
    // Golden hour band
    return sunElevation > 0.06 ? "morning" : "golden_hour";
  }
  if (sunElevation < 0.35) return "morning";
  if (sunElevation > 0.55) return "midday";
  // Afternoon → approaching golden hour
  if (sunElevation < 0.2) return "golden_hour";
  return "midday";
}

export function dayPhaseLabel(phase: DayPhase): string {
  const map: Record<DayPhase, string> = {
    midnight: "Midnight",
    night: "Night",
    blue_hour: "Blue hour",
    sunrise: "Sunrise",
    morning: "Morning",
    midday: "Midday",
    golden_hour: "Golden hour",
    sunset: "Sunset",
  };
  return map[phase];
}

/** Forest / land tint multiplier RGB for seasons. */
export function seasonLandTint(season: Season): [number, number, number] {
  switch (season) {
    case "spring":
      return [0.92, 1.05, 0.9];
    case "summer":
      return [0.95, 1.08, 0.88];
    case "autumn":
      return [1.12, 0.92, 0.72];
    case "winter":
      return [0.88, 0.92, 1.05];
  }
}
