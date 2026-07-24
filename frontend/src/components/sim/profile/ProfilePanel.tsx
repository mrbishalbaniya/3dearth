"use client";

import { GlassPanel, SimButton, SimStat } from "../ui/Glass";
import { useSimUiStore } from "../stores/uiStore";
import { useGameStore } from "../../game/store/gameStore";

export function ProfilePanel() {
  const open = useSimUiStore((s) => s.profileOpen);
  const setOpen = useSimUiStore((s) => s.setProfileOpen);
  const progress = useGameStore((s) => s.progress);
  const setLogbookOpen = useGameStore((s) => s.setLogbookOpen);

  if (!open) return null;

  return (
    <div className="sim-overlay">
      <GlassPanel
        className="sim-panel-md"
        title="Pilot Profile"
        subtitle="Career summary & certificates"
        onClose={() => {
          setOpen(false);
          setLogbookOpen(false);
        }}
      >
        <div className="sim-profile">
          <div className="sim-avatar" aria-hidden>P</div>
          <div>
            <h3>Pilot</h3>
            <p className="sim-muted">
              Rank {Math.max(1, Math.floor(progress.flightHours / 10) + 1)} ·{" "}
              {progress.achievements.length} achievements
            </p>
          </div>
        </div>

        <div className="sim-menu__meta" style={{ marginTop: 16 }}>
          <SimStat
            label="Flight hours"
            value={progress.flightHours.toFixed(1)}
            unit="h"
          />
          <SimStat
            label="Airports"
            value={progress.airportsVisited.length}
          />
          <SimStat label="Unlocks" value={progress.unlocks.length} />
          <SimStat
            label="Badges"
            value={progress.achievements.length}
          />
        </div>

        <div className="sim-ach-grid">
          {progress.achievements.length === 0 ? (
            <p className="sim-muted">No badges yet — take your first flight.</p>
          ) : (
            progress.achievements.map((a) => (
              <span key={a} className="sim-tag sim-tag--cyan">
                {a}
              </span>
            ))
          )}
        </div>

        <footer className="sim-panel-actions">
          <SimButton
            variant="ghost"
            onClick={() => {
              setLogbookOpen(true);
              setOpen(false);
            }}
          >
            Open logbook
          </SimButton>
        </footer>
      </GlassPanel>
    </div>
  );
}
