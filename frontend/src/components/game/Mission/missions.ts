import type { MissionDef, MissionId } from "../Types";

export const MISSIONS: MissionDef[] = [
  {
    id: "free_flight",
    title: "Free Flight",
    description: "Depart any airport and explore the planet",
    active: true,
  },
  {
    id: "precision_landing",
    title: "Precision Landing",
    description: "Future: score a stable approach and touchdown",
    active: false,
  },
  {
    id: "long_distance",
    title: "Long-Distance Flight",
    description: "Future: complete a great-circle route",
    active: false,
  },
  {
    id: "island_hopping",
    title: "Island Hopping",
    description: "Future: chain short island runways",
    active: false,
  },
  {
    id: "mountain",
    title: "Mountain Flying",
    description: "Future: high-altitude valley challenge",
    active: false,
  },
  {
    id: "emergency",
    title: "Emergency Landing",
    description: "Future: engine-out scenario",
    active: false,
  },
  {
    id: "weather_challenge",
    title: "Weather Challenge",
    description: "Future: storm / low-vis approach",
    active: false,
  },
  {
    id: "airport_challenge",
    title: "Airport Challenge",
    description: "Future: taxi + takeoff checklist",
    active: false,
  },
];

export function startMission(id: MissionId): void {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m?.active) {
    console.info(`[Mission] ${id} is scaffolded — Free Flight only in v1`);
  }
}
