"use client";

import { useCockpitStore } from "../stores/cockpitStore";
import type { ChecklistPhase } from "../types";

const PHASES: ChecklistPhase[] = [
  "cold_dark",
  "engine_start",
  "taxi",
  "before_takeoff",
  "climb",
  "cruise",
  "descent",
  "approach",
  "landing",
  "shutdown",
];

export function ChecklistPanel() {
  const open = useCockpitStore((s) => s.showChecklist);
  const setOpen = useCockpitStore((s) => s.setShowChecklist);
  const phase = useCockpitStore((s) => s.checklistPhase);
  const setPhase = useCockpitStore((s) => s.setChecklistPhase);
  const items = useCockpitStore((s) => s.checklist);
  const toggle = useCockpitStore((s) => s.toggleChecklistItem);

  if (!open) return null;

  return (
    <aside className="ck-checklist" aria-label="Checklist">
      <header>
        <strong>CHECKLIST</strong>
        <button type="button" className="sim-chip" onClick={() => setOpen(false)}>
          Close
        </button>
      </header>
      <select
        value={phase}
        onChange={(e) => setPhase(e.target.value as ChecklistPhase)}
      >
        {PHASES.map((p) => (
          <option key={p} value={p}>
            {p.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
              />
              <span className={item.done ? "is-done" : ""}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </aside>
  );
}
