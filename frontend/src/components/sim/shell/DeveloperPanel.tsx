"use client";

import { useEffect, useState } from "react";
import { useSimUiStore } from "../stores/uiStore";
import { useGameStore } from "../../game/store/gameStore";

export function DeveloperPanel() {
  const open = useSimUiStore((s) => s.developerOpen);
  const setOpen = useSimUiStore((s) => s.setDeveloperOpen);
  const mode = useGameStore((s) => s.mode);
  const flight = useGameStore((s) => s.flightState);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyD") {
        e.preventDefault();
        setOpen(!useSimUiStore.getState().developerOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      frames++;
      if (t - last >= 500) {
        setFps(Math.round((frames * 1000) / (t - last)));
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  return (
    <aside className="sim-dev" aria-label="Developer panel">
      <header>
        <strong>DEV</strong>
        <button type="button" onClick={() => setOpen(false)}>
          ×
        </button>
      </header>
      <dl>
        <div>
          <dt>FPS</dt>
          <dd>{fps}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{mode}</dd>
        </div>
        <div>
          <dt>Alt MSL</dt>
          <dd>{flight ? flight.altM.toFixed(0) : "—"}</dd>
        </div>
        <div>
          <dt>IAS</dt>
          <dd>{flight ? flight.airspeedMs.toFixed(1) : "—"} m/s</dd>
        </div>
        <div>
          <dt>Ctrl+Shift+D</dt>
          <dd>toggle</dd>
        </div>
      </dl>
    </aside>
  );
}
