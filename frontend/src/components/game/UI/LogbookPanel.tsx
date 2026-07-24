"use client";

import { useMemo } from "react";
import { loadLogbook } from "../Logbook/LogbookService";
import { ACHIEVEMENT_DEFS } from "../Achievements/achievements";
import { useGameStore } from "../store/gameStore";

export function LogbookPanel() {
  const open = useGameStore((s) => s.logbookOpen);
  const setOpen = useGameStore((s) => s.setLogbookOpen);
  const progress = useGameStore((s) => s.progress);
  const entries = useMemo(() => (open ? loadLogbook() : []), [open]);

  if (!open) return null;

  return (
    <div className="flight-hangar" role="dialog" aria-label="Pilot logbook">
      <div className="flight-hangar__panel">
        <header className="flight-hangar__head">
          <div>
            <h2>Pilot Logbook</h2>
            <p>
              {progress.flightHours.toFixed(1)} h · {progress.airportsVisited.length}{" "}
              airports · {progress.achievements.length} achievements
            </p>
          </div>
          <button type="button" className="earth-chip" onClick={() => setOpen(false)}>
            Close
          </button>
        </header>

        <section className="flight-hangar__section">
          <h3>Achievements</h3>
          <div className="flight-hangar__fleet">
            {Object.entries(ACHIEVEMENT_DEFS).map(([id, def]) => {
              const unlocked = progress.achievements.includes(id);
              return (
                <div
                  key={id}
                  className={`flight-hangar__ac ${unlocked ? "is-active" : ""}`}
                  style={{ opacity: unlocked ? 1 : 0.45 }}
                >
                  <strong>{def.title}</strong>
                  <span>{def.description}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flight-hangar__section">
          <h3>Recent flights</h3>
          <div className="flight-hangar__list">
            {entries.length === 0 && (
              <p className="flight-hangar__hint">No flights logged yet.</p>
            )}
            {entries.map((e) => (
              <div key={e.id} className="flight-hangar__row">
                <strong>
                  {e.departureIcao}
                  {e.arrivalIcao ? ` → ${e.arrivalIcao}` : ""}
                </strong>
                <span>{(e.durationSec / 3600).toFixed(2)} h</span>
                <em>
                  {e.distanceNm.toFixed(0)} nm · {Math.round(e.fuelUsedKg)} kg ·{" "}
                  {e.landingFpm != null
                    ? `${Math.round(e.landingFpm)} fpm`
                    : "—"}
                </em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
