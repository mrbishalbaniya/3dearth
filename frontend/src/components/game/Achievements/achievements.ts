/**
 * Achievements — FAA-training-inspired milestones (civilian).
 */

import type { PlayerProgress } from "../Types";
import { saveProgress } from "../Save/SaveService";

export const ACHIEVEMENT_DEFS: Record<
  string,
  { title: string; description: string }
> = {
  first_takeoff: {
    title: "First Takeoff",
    description: "Became airborne for the first time",
  },
  first_landing: {
    title: "First Landing",
    description: "Completed a landing",
  },
  hours_10: { title: "10 Hours", description: "Logged 10 flight hours" },
  hours_100: { title: "100 Hours", description: "Logged 100 flight hours" },
  explorer_10: {
    title: "Airport Explorer",
    description: "Visited 10 airports",
  },
  smooth_landing: {
    title: "Greaser",
    description: "Landed under 200 fpm",
  },
  long_haul: {
    title: "Long Distance",
    description: "Completed a flight over 500 nm",
  },
  night_owl: {
    title: "Night Owl",
    description: "Completed a night flight",
  },
};

export function unlockAchievement(
  progress: PlayerProgress,
  id: string,
): PlayerProgress {
  if (progress.achievements.includes(id)) return progress;
  const next = {
    ...progress,
    achievements: [...progress.achievements, id],
  };
  saveProgress(next);
  return next;
}

export function evaluateProgressAchievements(
  progress: PlayerProgress,
): PlayerProgress {
  let p = progress;
  if (p.flightHours >= 10) p = unlockAchievement(p, "hours_10");
  if (p.flightHours >= 100) p = unlockAchievement(p, "hours_100");
  if (p.airportsVisited.length >= 10) p = unlockAchievement(p, "explorer_10");
  return p;
}
