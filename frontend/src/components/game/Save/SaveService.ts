import type { PlayerProgress } from "../Types";
import { DEFAULT_BINDINGS } from "../store/gameStore";

const KEY = "orbit-flight-progress-v1";

const defaultProgress = (): PlayerProgress => ({
  flightHours: 0,
  unlocks: ["cirrus_sr22", "baron_b58", "citation_cj"],
  achievements: [],
  airportsVisited: [],
  bindings: { ...DEFAULT_BINDINGS },
});

export function loadProgress(): PlayerProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: PlayerProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota */
  }
}

export function addFlightTime(progress: PlayerProgress, hours: number): PlayerProgress {
  const next = {
    ...progress,
    flightHours: progress.flightHours + hours,
  };
  saveProgress(next);
  return next;
}

export function markAirportVisited(
  progress: PlayerProgress,
  icao: string,
): PlayerProgress {
  if (progress.airportsVisited.includes(icao)) return progress;
  const next = {
    ...progress,
    airportsVisited: [...progress.airportsVisited, icao],
  };
  if (next.airportsVisited.length >= 10 && !next.achievements.includes("explorer_10")) {
    next.achievements = [...next.achievements, "explorer_10"];
  }
  saveProgress(next);
  return next;
}
