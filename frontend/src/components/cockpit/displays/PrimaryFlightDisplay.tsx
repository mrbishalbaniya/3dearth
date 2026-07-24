"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useAutopilotStore } from "../stores/autopilotStore";
import { useCockpitStore } from "../stores/cockpitStore";

function kts(ms: number) {
  return ms * 1.94384;
}
function fpm(ms: number) {
  return ms * 196.85;
}

/**
 * Canvas PFD — paints every animation frame from store snapshots (no React re-renders).
 */
export function PrimaryFlightDisplay({
  width = 320,
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
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const st = useGameStore.getState().flightState;
      const bright = useCockpitStore.getState().panelBrightness;
      const ap = useAutopilotStore.getState().ap;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `rgba(4, 10, 18, ${0.92 * bright})`;
      ctx.fillRect(0, 0, width, height);

      if (!st) {
        ctx.fillStyle = "#5ec8ff";
        ctx.font = "12px IBM Plex Sans, sans-serif";
        ctx.fillText("PFD — NO DATA", 16, 24);
        raf = requestAnimationFrame(draw);
        return;
      }

      const cx = width * 0.52;
      const cy = height * 0.48;
      const R = 78;

      // Horizon
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.rotate((-st.rollDeg * Math.PI) / 180);
      ctx.translate(0, (st.pitchDeg / 25) * 55);
      ctx.fillStyle = "#3a7ab0";
      ctx.fillRect(-200, -200, 400, 200);
      ctx.fillStyle = "#6b5436";
      ctx.fillRect(-200, 0, 400, 200);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-90, 0);
      ctx.lineTo(90, 0);
      ctx.stroke();
      // pitch ladder
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px IBM Plex Sans, sans-serif";
      ctx.lineWidth = 1;
      for (let p = -20; p <= 20; p += 10) {
        if (p === 0) continue;
        const y = (-p / 25) * 55;
        ctx.beginPath();
        ctx.moveTo(-28, y);
        ctx.lineTo(28, y);
        ctx.stroke();
        ctx.fillText(String(Math.abs(p)), 32, y + 3);
      }
      ctx.restore();

      // Aircraft ref
      ctx.strokeStyle = "#ffd24a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy);
      ctx.lineTo(cx - 10, cy);
      ctx.moveTo(cx + 10, cy);
      ctx.lineTo(cx + 36, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      // Bank ticks
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "rgba(200,220,255,0.55)";
      for (const a of [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60]) {
        const rad = (a * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(Math.sin(rad) * (R + 2), -Math.cos(rad) * (R + 2));
        ctx.lineTo(Math.sin(rad) * (R + 10), -Math.cos(rad) * (R + 10));
        ctx.stroke();
      }
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.moveTo(0, -R - 2);
      ctx.lineTo(-5, -R - 12);
      ctx.lineTo(5, -R - 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Slip
      const slip = Math.max(-1, Math.min(1, (st.betaDeg ?? 0) / 8));
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(cx - 28, cy + R + 8, 56, 6);
      ctx.fillStyle = "#7ef0d0";
      ctx.fillRect(cx - 4 + slip * 22, cy + R + 7, 8, 8);

      // Airspeed tape
      drawTape(ctx, 8, 28, 54, height - 56, kts(st.airspeedMs), "IAS", "#5ec8ff");
      // Altitude tape
      drawTape(
        ctx,
        width - 62,
        28,
        54,
        height - 56,
        st.altM,
        "ALT",
        "#7ef0d0",
        true,
      );

      // VS
      const vs = fpm(st.verticalSpeedMs);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(width - 14, 40, 6, height - 80);
      const vsY = height / 2 - Math.max(-1, Math.min(1, vs / 2000)) * 70;
      ctx.fillStyle = vs > 0 ? "#7ef0d0" : "#ffb454";
      ctx.fillRect(width - 16, vsY - 3, 10, 6);

      // HDG / GS / TAS
      ctx.fillStyle = "#c8d6f0";
      ctx.font = "600 13px Syne, sans-serif";
      const hdg = Math.round(((st.yawDeg % 360) + 360) % 360)
        .toString()
        .padStart(3, "0");
      ctx.fillText(`HDG ${hdg}°`, cx - 28, 18);
      ctx.font = "11px IBM Plex Sans, sans-serif";
      ctx.fillStyle = "rgba(200,220,255,0.7)";
      ctx.fillText(
        `GS ${Math.round(kts(st.groundSpeedMs))}  TAS ${Math.round(kts(st.airspeedMs))}`,
        70,
        height - 10,
      );

      // Flight director (AP)
      if (ap.master) {
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 1.5;
        const fdRoll = ap.lateral === "hdg" ? 0 : 0;
        const fdPitch = ap.vertical !== "off" ? -8 : 0;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + fdPitch);
        ctx.lineTo(cx + 20, cy + fdPitch);
        ctx.moveTo(cx + fdRoll, cy - 16 + fdPitch);
        ctx.lineTo(cx + fdRoll, cy + 16 + fdPitch);
        ctx.stroke();
        ctx.fillStyle = "#c084fc";
        ctx.font = "10px IBM Plex Sans, sans-serif";
        ctx.fillText("FD", cx + R - 10, cy - R + 12);
      }

      if (st.stalled) {
        ctx.fillStyle = "rgba(255,80,60,0.85)";
        ctx.fillRect(cx - 40, cy - 12, 80, 24);
        ctx.fillStyle = "#fff";
        ctx.font = "700 14px Syne, sans-serif";
        ctx.fillText("STALL", cx - 28, cy + 5);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className="ck-display ck-display--pfd"
      style={{ width, height }}
      width={width}
      height={height}
      aria-label="Primary flight display"
    />
  );
}

function drawTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  label: string,
  color: string,
  round = false,
) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(180,210,255,0.2)";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const mid = y + h / 2;
  const step = round ? 50 : 10;
  const pxPerUnit = h / (step * 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "rgba(200,220,255,0.55)";
  ctx.font = "10px IBM Plex Sans, sans-serif";
  for (let v = value - step * 5; v <= value + step * 5; v += step) {
    const yy = mid - (v - value) * pxPerUnit;
    ctx.beginPath();
    ctx.moveTo(x + 4, yy);
    ctx.lineTo(x + 14, yy);
    ctx.strokeStyle = "rgba(200,220,255,0.35)";
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), x + 16, yy + 3);
  }
  ctx.restore();

  ctx.fillStyle = color;
  ctx.fillRect(x, mid - 12, w, 24);
  ctx.fillStyle = "#061018";
  ctx.font = "700 13px Syne, sans-serif";
  ctx.fillText(String(Math.round(value)), x + 8, mid + 5);
  ctx.fillStyle = color;
  ctx.font = "9px IBM Plex Sans, sans-serif";
  ctx.fillText(label, x + 6, y + 12);
}
