"use client";

import { useEffect } from "react";
import type { InputBindings } from "../Types";
import { useGameStore } from "../store/gameStore";

function formatKey(code: string): string {
  const map: Record<string, string> = {
    ShiftLeft: "⇧ Shift",
    ShiftRight: "⇧ Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
    Escape: "Esc",
    Space: "Space",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

const ROWS: { action: string; keys: (keyof InputBindings)[]; extra?: string }[] = [
  { action: "Pitch", keys: ["pitchUp", "pitchDown"], extra: "or ↑ ↓" },
  { action: "Roll", keys: ["rollLeft", "rollRight"], extra: "or ← →" },
  { action: "Yaw", keys: ["yawLeft", "yawRight"] },
  { action: "Throttle", keys: ["throttleUp", "throttleDown"] },
  { action: "Flaps", keys: ["flaps"] },
  { action: "Gear", keys: ["gear"] },
  { action: "Brakes", keys: ["brakes"] },
  { action: "Camera", keys: ["camera"] },
  { action: "Pause", keys: ["pause"] },
];

export function FlightHelpPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mode = useGameStore((s) => s.mode);
  const bindings = useGameStore((s) => s.bindings);

  useEffect(() => {
    if (mode !== "flight") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyH" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, open, onOpenChange]);

  if (mode !== "flight" || !open) return null;

  return (
    <div className="flight-help" role="dialog" aria-label="Flight controls">
      <div className="flight-help__panel">
        <div className="flight-help__head">
          <span>Controls</span>
          <kbd>H</kbd>
        </div>
        <ul className="flight-help__list">
          {ROWS.map((row) => (
            <li key={row.action} className="flight-help__row">
              <span className="flight-help__action">{row.action}</span>
              <span className="flight-help__keys">
                {row.keys.map((k, i) => (
                  <span key={k}>
                    {i > 0 && <span className="flight-help__sep">/</span>}
                    <kbd>{formatKey(bindings[k])}</kbd>
                  </span>
                ))}
                {row.extra && (
                  <span className="flight-help__extra">{row.extra}</span>
                )}
              </span>
            </li>
          ))}
          <li className="flight-help__row">
            <span className="flight-help__action">Gamepad</span>
            <span className="flight-help__keys flight-help__keys--plain">
              Stick · RT/LT · A/B
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
