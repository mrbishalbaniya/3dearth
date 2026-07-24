"use client";

import {
  useCallback,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

/** Soft click for switches — Web Audio, no asset dependency */
function clickSound(freq = 420, dur = 0.04) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = "square";
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur);
    window.setTimeout(() => void ctx.close(), 80);
  } catch {
    /* ignore */
  }
}

export function ToggleSwitch({
  label,
  on,
  onChange,
  danger,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`ck-switch ${on ? "is-on" : ""} ${danger ? "is-danger" : ""}`}
      aria-pressed={on}
      onClick={() => {
        clickSound(on ? 280 : 520);
        onChange(!on);
      }}
    >
      <span className="ck-switch__rail">
        <span className="ck-switch__knob" />
      </span>
      <span className="ck-switch__label">{label}</span>
    </button>
  );
}

export function PushButton({
  children,
  lit,
  active,
  tone = "cyan",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  lit?: boolean;
  active?: boolean;
  tone?: "cyan" | "green" | "amber" | "red" | "white";
}) {
  return (
    <button
      type="button"
      className={`ck-push ck-push--${tone} ${lit || active ? "is-lit" : ""} ${className}`}
      {...props}
      onClick={(e) => {
        clickSound(660, 0.03);
        props.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

export function Lever({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  vertical = true,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  vertical?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let t: number;
      if (vertical) {
        t = 1 - (clientY - r.top) / r.height;
      } else {
        t = (clientX - r.left) / r.width;
      }
      t = Math.max(0, Math.min(1, t));
      onChange(min + t * (max - min));
    },
    [min, max, onChange, vertical],
  );

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={`ck-lever ${vertical ? "ck-lever--v" : "ck-lever--h"}`}>
      <span className="ck-lever__label">{label}</span>
      <div
        ref={track}
        className="ck-lever__track"
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          const step = (max - min) * 0.05;
          if (e.key === "ArrowUp" || e.key === "ArrowRight")
            onChange(Math.min(max, value + step));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft")
            onChange(Math.max(min, value - step));
        }}
      >
        <div
          className="ck-lever__fill"
          style={
            vertical
              ? { height: `${pct}%` }
              : { width: `${pct}%` }
          }
        />
        <div
          className="ck-lever__handle"
          style={
            vertical
              ? { bottom: `${pct}%` }
              : { left: `${pct}%` }
          }
        />
      </div>
      <em>{Math.round(pct)}%</em>
    </div>
  );
}

export function Annunciator({
  children,
  level,
  active,
}: {
  children: ReactNode;
  level: "warning" | "caution" | "advisory";
  active: boolean;
}) {
  return (
    <div
      className={`ck-annun ck-annun--${level} ${active ? "is-active" : ""}`}
      role="status"
    >
      {children}
    </div>
  );
}
