"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useCockpitStore } from "../stores/cockpitStore";
import { getAircraftSpec } from "../../game/Aircraft/fleet";
import { LAYOUT_BY_CLASS } from "../types";

export function EngineDisplay({
  width = 200,
  height = 280,
}: {
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (t: number) => {
      if (t - last < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;
      const sys = useGameStore.getState().systemsState;
      const id = useGameStore.getState().selectedAircraftId;
      const layout =
        LAYOUT_BY_CLASS[getAircraftSpec(id).class] ?? LAYOUT_BY_CLASS.sep;
      const bright = useCockpitStore.getState().panelBrightness;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `rgba(6, 10, 16, ${0.94 * bright})`;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#5ec8ff";
      ctx.font = "600 11px Syne, sans-serif";
      ctx.fillText("ENGINE", 10, 18);

      if (!sys) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const engines = sys.engines.slice(0, layout.engineCount);
      const colW = (width - 16) / Math.max(1, engines.length);

      engines.forEach((eng, i) => {
        const x = 8 + i * colW;
        ctx.fillStyle = "rgba(200,220,255,0.55)";
        ctx.font = "10px IBM Plex Sans, sans-serif";
        ctx.fillText(`ENG ${i + 1}`, x, 36);
        gauge(ctx, x + colW / 2 - 8, 48, eng.rpmOrN1, 110, "N1");
        gauge(ctx, x + colW / 2 - 8, 108, eng.n2 || eng.rpmOrN1 * 0.9, 110, "N2");
        ctx.fillStyle = "#ffb454";
        ctx.fillText(`EGT ${Math.round(eng.egtC)}`, x, 175);
        ctx.fillStyle = "#7ef0d0";
        ctx.fillText(`FF ${(eng.fuelFlowKgS * 3600).toFixed(0)}`, x, 190);
        ctx.fillStyle = "rgba(200,220,255,0.7)";
        ctx.fillText(`OIL ${Math.round(eng.oilPressurePsi)}`, x, 205);
        ctx.fillText(`OT ${Math.round(eng.oilTempC)}°`, x, 220);
        ctx.fillStyle =
          eng.phase === "running" || eng.phase === "idle"
            ? "#7ef0d0"
            : "#ff6b5a";
        ctx.fillText(eng.phase.toUpperCase(), x, 240);
      });

      // Fuel
      const fuel = sys.fuel;
      ctx.fillStyle = "#5ec8ff";
      ctx.fillText("FUEL", 10, height - 42);
      const barW = width - 20;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(10, height - 32, barW, 10);
      const frac =
        fuel.totalKg /
        Math.max(
          1,
          fuel.tanks.reduce((a, t) => a + t.capacityKg, 0),
        );
      ctx.fillStyle = fuel.starved ? "#ff6b5a" : "#7ef0d0";
      ctx.fillRect(10, height - 32, barW * frac, 10);
      ctx.fillStyle = "rgba(200,220,255,0.7)";
      ctx.font = "10px IBM Plex Sans, sans-serif";
      ctx.fillText(
        `${Math.round(fuel.totalKg)} kg  Δ${Math.round(fuel.imbalanceKg)}`,
        10,
        height - 8,
      );

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className="ck-display ck-display--eng"
      style={{ width, height }}
      aria-label="Engine display"
    />
  );
}

function gauge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  max: number,
  label: string,
) {
  const h = 48;
  const w = 16;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, w, h);
  const t = Math.max(0, Math.min(1, value / max));
  ctx.fillStyle = t > 0.95 ? "#ff6b5a" : t > 0.85 ? "#ffb454" : "#5ec8ff";
  ctx.fillRect(x, y + h * (1 - t), w, h * t);
  ctx.fillStyle = "rgba(200,220,255,0.7)";
  ctx.font = "9px IBM Plex Sans, sans-serif";
  ctx.fillText(label, x - 2, y - 4);
  ctx.fillText(String(Math.round(value)), x + 20, y + h / 2);
}

export function SystemDisplay({
  width = 200,
  height = 140,
}: {
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const sys = useGameStore.getState().systemsState;
      const oh = useCockpitStore.getState().overhead;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(8,12,20,0.94)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#5ec8ff";
      ctx.font = "600 11px Syne, sans-serif";
      ctx.fillText("SYSTEMS", 10, 16);
      if (!sys) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.font = "11px IBM Plex Sans, sans-serif";
      const rows: [string, string, boolean][] = [
        ["ELEC", `${sys.electrical.batteryV.toFixed(1)}V`, sys.electrical.busLive],
        ["BATT", `${Math.round(sys.electrical.batterySoc * 100)}%`, sys.electrical.batterySoc > 0.2],
        ["HYD", `${Math.round(sys.hydraulic.pressurePsi)} PSI`, sys.hydraulic.pressurePsi > 1500],
        ["GEAR", sys.gear.targetDown ? "DOWN" : "UP", !sys.gear.transitioning],
        ["AVIONICS", oh.avionics ? "ON" : "OFF", oh.avionics],
        ["APU", oh.apu ? "RUN" : "OFF", true],
      ];
      rows.forEach(([k, v, ok], i) => {
        const y = 36 + i * 16;
        ctx.fillStyle = "rgba(200,220,255,0.55)";
        ctx.fillText(k, 10, y);
        ctx.fillStyle = ok ? "#7ef0d0" : "#ff6b5a";
        ctx.fillText(v, 90, y);
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className="ck-display"
      style={{ width, height }}
      aria-label="System display"
    />
  );
}
