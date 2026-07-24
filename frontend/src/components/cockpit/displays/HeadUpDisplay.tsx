"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useCockpitStore } from "../stores/cockpitStore";

/** Transparent HUD overlay for jets / HUD-capable layouts */
export function HeadUpDisplay() {
  const enabled = useCockpitStore((s) => s.hudEnabled);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const st = useGameStore.getState().flightState;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      if (!st) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const cx = w / 2;
      const cy = h * 0.42;
      ctx.strokeStyle = "rgba(80, 255, 160, 0.75)";
      ctx.fillStyle = "rgba(80, 255, 160, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.font = "14px IBM Plex Sans, monospace";

      // FPM
      ctx.beginPath();
      ctx.arc(cx, cy - st.pitchDeg * 2, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 40, cy);
      ctx.lineTo(cx - 12, cy);
      ctx.moveTo(cx + 12, cy);
      ctx.lineTo(cx + 40, cy);
      ctx.stroke();

      ctx.fillText(
        `${Math.round(st.airspeedMs * 1.94384)}`,
        cx - 120,
        cy,
      );
      ctx.fillText(`${Math.round(st.altM)}`, cx + 90, cy);
      ctx.fillText(
        Math.round(((st.yawDeg % 360) + 360) % 360)
          .toString()
          .padStart(3, "0"),
        cx - 14,
        cy - 48,
      );

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <canvas
      ref={ref}
      className="ck-hud-overlay"
      aria-hidden
    />
  );
}
