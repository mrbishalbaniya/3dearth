"use client";

import { useState } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useCockpitStore } from "../../cockpit/stores/cockpitStore";
import type { CameraMode } from "../../game/Types";

const MODES: { id: CameraMode; label: string }[] = [
  { id: "cockpit", label: "Cockpit" },
  { id: "chase", label: "Chase" },
  { id: "wing", label: "Wing" },
  { id: "tower", label: "Tower" },
  { id: "drone", label: "Drone" },
  { id: "cinematic", label: "Cinema" },
  { id: "free", label: "Free" },
];

export function CameraRadial() {
  const mode = useGameStore((s) => s.mode);
  const camera = useGameStore((s) => s.cameraMode);
  const setCamera = useGameStore((s) => s.setCameraMode);
  const setDeck = useCockpitStore((s) => s.setDeckOpen);
  const [open, setOpen] = useState(false);

  if (mode !== "flight") return null;

  return (
    <div className={`sim-radial ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="sim-radial__hub"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Camera"
      >
        CAM
      </button>
      {open && (
        <ul className="sim-radial__ring">
          {MODES.map((m, i) => {
            const angle = (i / MODES.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 78;
            const y = Math.sin(angle) * 78;
            return (
              <li
                key={m.id}
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <button
                  type="button"
                  className={camera === m.id ? "is-active" : ""}
                  onClick={() => {
                    setCamera(m.id);
                    setDeck(m.id === "cockpit");
                    setOpen(false);
                  }}
                >
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
