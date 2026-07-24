"use client";

import { GlassPanel, SimButton, SimChip } from "../ui/Glass";
import { useSimUiStore } from "../stores/uiStore";
import { useGameStore } from "../../game/store/gameStore";

const MISSIONS = [
  {
    id: "landing",
    title: "Landing Challenge",
    difficulty: "Easy",
    duration: "15 min",
    reward: "250 XP",
    tone: "ok" as const,
  },
  {
    id: "crosswind",
    title: "Crosswind Landing",
    difficulty: "Medium",
    duration: "20 min",
    reward: "400 XP",
    tone: "warn" as const,
  },
  {
    id: "island",
    title: "Island Hopping",
    difficulty: "Medium",
    duration: "45 min",
    reward: "600 XP",
    tone: "cyan" as const,
  },
  {
    id: "night",
    title: "Night Flight",
    difficulty: "Hard",
    duration: "60 min",
    reward: "800 XP",
    tone: "warn" as const,
  },
  {
    id: "mountain",
    title: "Mountain Flying",
    difficulty: "Hard",
    duration: "40 min",
    reward: "750 XP",
    tone: "crit" as const,
  },
  {
    id: "emergency",
    title: "Emergency Landing",
    difficulty: "Expert",
    duration: "25 min",
    reward: "1,000 XP",
    tone: "crit" as const,
  },
];

export function MissionsPanel() {
  const open = useSimUiStore((s) => s.missionsOpen);
  const setOpen = useSimUiStore((s) => s.setMissionsOpen);
  const pushToast = useSimUiStore((s) => s.pushToast);
  const setHangerOpen = useGameStore((s) => s.setHangerOpen);
  const setMission = useGameStore((s) => s.setMission);

  if (!open) return null;

  return (
    <div className="sim-overlay">
      <GlassPanel
        className="sim-panel-lg"
        title="Missions"
        subtitle="Structured challenges across the globe"
        onClose={() => setOpen(false)}
        wide
      >
        <div className="sim-mission-grid">
          {MISSIONS.map((m) => (
            <article key={m.id} className="sim-mission-card">
              <header>
                <h3>{m.title}</h3>
                <SimChip tone={m.tone}>{m.difficulty}</SimChip>
              </header>
              <p>
                {m.duration} · {m.reward}
              </p>
              <SimButton
                variant="accent"
                onClick={() => {
                  setMission("free_flight");
                  setOpen(false);
                  setHangerOpen(true);
                  pushToast({
                    kind: "success",
                    title: m.title,
                    body: "Mission queued — select aircraft in hangar",
                  });
                }}
              >
                Start
              </SimButton>
            </article>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
