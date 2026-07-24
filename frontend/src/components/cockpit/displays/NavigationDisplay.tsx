"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useCockpitStore } from "../stores/cockpitStore";
import { worldTraffic } from "../../game/World/WorldTrafficEngine";

/**
 * Navigation Display — moving map, route, traffic, optional weather cells.
 */
export function NavigationDisplay({
  width = 280,
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
      const route = useGameStore.getState().route;
      const range = useCockpitStore.getState().ndRangeNm;
      const wx = useCockpitStore.getState().wxRadarOn;
      const bright = useCockpitStore.getState().panelBrightness;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `rgba(2, 12, 10, ${0.94 * bright})`;
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 8;

      // Range rings
      ctx.strokeStyle = "rgba(94,228,168,0.25)";
      ctx.fillStyle = "rgba(94,228,168,0.55)";
      ctx.font = "10px IBM Plex Sans, sans-serif";
      for (const f of [0.25, 0.5, 0.75, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, (Math.min(width, height) * 0.42) * f, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillText(`${range} nm`, 8, 16);

      if (!st) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const pxPerNm = (Math.min(width, height) * 0.42) / range;
      const hdgRad = (st.yawDeg * Math.PI) / 180;

      // Weather blobs (procedural)
      if (wx) {
        for (let i = 0; i < 5; i++) {
          const ang = hdgRad + i * 1.1 + st.lat * 0.01;
          const dist = 8 + ((i * 7 + Math.floor(st.lng)) % 20);
          const x = cx + Math.sin(ang) * dist * pxPerNm;
          const y = cy - Math.cos(ang) * dist * pxPerNm;
          const g = ctx.createRadialGradient(x, y, 2, x, y, 18);
          g.addColorStop(0, "rgba(255,80,60,0.55)");
          g.addColorStop(0.5, "rgba(80,200,80,0.25)");
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Route / dest
      if (route.destIcao && route.distanceNm > 0) {
        const brg = ((route.bearingDeg - st.yawDeg) * Math.PI) / 180;
        const d = Math.min(route.distanceNm, range * 0.95);
        const x = cx + Math.sin(brg) * d * pxPerNm;
        const y = cy - Math.cos(brg) * d * pxPerNm;
        ctx.strokeStyle = "#5ec8ff";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#5ec8ff";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(route.destIcao, x + 6, y + 3);
        ctx.fillStyle = "rgba(200,220,255,0.7)";
        ctx.fillText(
          `${route.distanceNm.toFixed(0)} nm` +
            (route.etaSec != null
              ? ` · ${Math.round(route.etaSec / 60)}m`
              : ""),
          8,
          height - 10,
        );
      }

      // Traffic
      try {
        const nearby = worldTraffic.getRenderable(16);
        for (const ac of nearby) {
          const dLat = (ac.lat - st.lat) * 60;
          const dLng =
            (ac.lng - st.lng) * 60 * Math.cos((st.lat * Math.PI) / 180);
          const east = dLng;
          const north = dLat;
          const xBody = east * Math.cos(hdgRad) - north * Math.sin(hdgRad);
          const yBody = east * Math.sin(hdgRad) + north * Math.cos(hdgRad);
          const distNm = Math.hypot(xBody, yBody);
          if (distNm > range) continue;
          const x = cx + xBody * pxPerNm;
          const y = cy - yBody * pxPerNm;
          ctx.fillStyle = "#ffb454";
          ctx.fillRect(x - 3, y - 3, 6, 6);
        }
      } catch {
        /* traffic optional */
      }

      // Ownship
      ctx.fillStyle = "#7ef0d0";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx - 7, cy + 8);
      ctx.lineTo(cx + 7, cy + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(200,220,255,0.65)";
      ctx.font = "10px IBM Plex Sans, sans-serif";
      ctx.fillText("TRK UP", width - 48, 16);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className="ck-display ck-display--nd"
      style={{ width, height }}
      aria-label="Navigation display"
    />
  );
}
