/**
 * Shared 2D painters for PFD / ND / EICAS — used by DOM canvas and 3D CanvasTextures.
 */
import { useGameStore } from "../../game/store/gameStore";
import { useAutopilotStore } from "../stores/autopilotStore";
import { useCockpitStore } from "../stores/cockpitStore";
import { worldTraffic } from "../../game/World/WorldTrafficEngine";
import { getAircraftSpec } from "../../game/Aircraft/fleet";
import { LAYOUT_BY_CLASS } from "../types";

function kts(ms: number) {
  return ms * 1.94384;
}
function fpm(ms: number) {
  return ms * 196.85;
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

export function paintPfd(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const st = useGameStore.getState().flightState;
  const bright = useCockpitStore.getState().panelBrightness;
  const ap = useAutopilotStore.getState().ap;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = `rgba(4, 10, 18, ${0.95 * bright})`;
  ctx.fillRect(0, 0, width, height);

  if (!st) {
    ctx.fillStyle = "#5ec8ff";
    ctx.font = "12px IBM Plex Sans, sans-serif";
    ctx.fillText("PFD — NO DATA", 16, 24);
    return;
  }

  const cx = width * 0.52;
  const cy = height * 0.48;
  const R = Math.min(78, height * 0.28);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate((-st.rollDeg * Math.PI) / 180);
  ctx.translate(0, (st.pitchDeg / 25) * (R * 0.7));
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
  ctx.restore();

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

  drawTape(ctx, 8, 28, 54, height - 56, kts(st.airspeedMs), "IAS", "#5ec8ff");
  drawTape(ctx, width - 62, 28, 54, height - 56, st.altM, "ALT", "#7ef0d0", true);

  const vs = fpm(st.verticalSpeedMs);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(width - 14, 40, 6, height - 80);
  const vsY = height / 2 - Math.max(-1, Math.min(1, vs / 2000)) * 70;
  ctx.fillStyle = vs > 0 ? "#7ef0d0" : "#ffb454";
  ctx.fillRect(width - 16, vsY - 3, 10, 6);

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

  if (ap.master) {
    ctx.fillStyle = "#c084fc";
    ctx.font = "10px IBM Plex Sans, sans-serif";
    ctx.fillText("FD AP", cx + R - 24, cy - R + 12);
  }
  if (st.stalled) {
    ctx.fillStyle = "rgba(255,80,60,0.85)";
    ctx.fillRect(cx - 40, cy - 12, 80, 24);
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px Syne, sans-serif";
    ctx.fillText("STALL", cx - 28, cy + 5);
  }
}

export function paintNd(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const st = useGameStore.getState().flightState;
  const route = useGameStore.getState().route;
  const range = useCockpitStore.getState().ndRangeNm;
  const wx = useCockpitStore.getState().wxRadarOn;
  const bright = useCockpitStore.getState().panelBrightness;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = `rgba(2, 12, 10, ${0.95 * bright})`;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + 8;
  ctx.strokeStyle = "rgba(94,228,168,0.25)";
  ctx.fillStyle = "rgba(94,228,168,0.55)";
  ctx.font = "10px IBM Plex Sans, sans-serif";
  for (const f of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, (Math.min(width, height) * 0.42) * f, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillText(`${range} nm`, 8, 16);
  if (!st) return;

  const pxPerNm = (Math.min(width, height) * 0.42) / range;
  const hdgRad = (st.yawDeg * Math.PI) / 180;

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
  }

  try {
    for (const ac of worldTraffic.getRenderable(12)) {
      const dLat = (ac.lat - st.lat) * 60;
      const dLng = (ac.lng - st.lng) * 60 * Math.cos((st.lat * Math.PI) / 180);
      const xBody = dLng * Math.cos(hdgRad) - dLat * Math.sin(hdgRad);
      const yBody = dLng * Math.sin(hdgRad) + dLat * Math.cos(hdgRad);
      if (Math.hypot(xBody, yBody) > range) continue;
      ctx.fillStyle = "#ffb454";
      ctx.fillRect(cx + xBody * pxPerNm - 3, cy - yBody * pxPerNm - 3, 6, 6);
    }
  } catch {
    /* optional */
  }

  ctx.fillStyle = "#7ef0d0";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx - 7, cy + 8);
  ctx.lineTo(cx + 7, cy + 8);
  ctx.closePath();
  ctx.fill();
}

export function paintEicas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const sys = useGameStore.getState().systemsState;
  const id = useGameStore.getState().selectedAircraftId;
  const layout =
    LAYOUT_BY_CLASS[getAircraftSpec(id).class] ?? LAYOUT_BY_CLASS.sep;
  const bright = useCockpitStore.getState().panelBrightness;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = `rgba(6, 10, 16, ${0.95 * bright})`;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#5ec8ff";
  ctx.font = "600 11px Syne, sans-serif";
  ctx.fillText("ENGINE", 10, 18);
  if (!sys) return;

  const engines = sys.engines.slice(0, layout.engineCount);
  const colW = (width - 16) / Math.max(1, engines.length);
  engines.forEach((eng, i) => {
    const x = 8 + i * colW;
    ctx.fillStyle = "rgba(200,220,255,0.55)";
    ctx.font = "10px IBM Plex Sans, sans-serif";
    ctx.fillText(`ENG ${i + 1}`, x, 36);
    const h = 48;
    const w = 16;
    const t = Math.max(0, Math.min(1, eng.rpmOrN1 / 110));
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + colW / 2 - 8, 48, w, h);
    ctx.fillStyle = t > 0.95 ? "#ff6b5a" : "#5ec8ff";
    ctx.fillRect(x + colW / 2 - 8, 48 + h * (1 - t), w, h * t);
    ctx.fillStyle = "#ffb454";
    ctx.fillText(`EGT ${Math.round(eng.egtC)}`, x, 120);
    ctx.fillStyle = "#7ef0d0";
    ctx.fillText(`FF ${(eng.fuelFlowKgS * 3600).toFixed(0)}`, x, 136);
    ctx.fillStyle =
      eng.phase === "running" || eng.phase === "idle" ? "#7ef0d0" : "#ff6b5a";
    ctx.fillText(eng.phase.toUpperCase(), x, 152);
  });

  const fuel = sys.fuel;
  const barW = width - 20;
  const frac =
    fuel.totalKg /
    Math.max(1, fuel.tanks.reduce((a, t) => a + t.capacityKg, 0));
  ctx.fillStyle = "#5ec8ff";
  ctx.fillText("FUEL", 10, height - 42);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(10, height - 32, barW, 10);
  ctx.fillStyle = fuel.starved ? "#ff6b5a" : "#7ef0d0";
  ctx.fillRect(10, height - 32, barW * frac, 10);
  ctx.fillStyle = "rgba(200,220,255,0.7)";
  ctx.fillText(`${Math.round(fuel.totalKg)} kg`, 10, height - 8);

  ctx.fillStyle = "rgba(200,220,255,0.7)";
  ctx.fillText(
    `HYD ${Math.round(sys.hydraulic.pressurePsi)}  ELEC ${sys.electrical.batteryV.toFixed(1)}V`,
    10,
    height - 56,
  );
}
