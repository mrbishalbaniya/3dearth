"use client";

/**
 * NavigationOverlay — Mounts all navigation UI elements onto the page.
 * Add this component alongside FlightHUD in the game page layout.
 * Shows: NavigationPanel, NavigationDebugPanel (dev), terrain alerts,
 * ATC frequency popups, and moving-map layer toggle.
 */

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { NavigationPanel } from "./NavigationPanel";
import { NavigationDebugPanel } from "./NavigationDebugPanel";
import { terrainAwareness } from "./TerrainAwareness";
import { atcManager } from "./ATCManager";
import { navigationManager } from "./NavigationManager";

// ─── Terrain alert toast ──────────────────────────────────────────────────────

function TerrainAlertToast() {
  const flightState = useGameStore((s) => s.flightState);
  const [alert, setAlert] = useState({ level: "NONE", message: "" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      const st = terrainAwareness.getState();
      setAlert({ level: st.alert.level, message: st.alert.message });
    }, 200);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!flightState || alert.level === "NONE") return null;

  const color =
    alert.level === "PULL_UP" ? "bg-red-600 animate-pulse" :
    alert.level === "WARNING" ? "bg-orange-600 animate-pulse" :
    "bg-yellow-600";

  return (
    <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[9997] px-6 py-2 rounded-full text-white font-bold text-sm tracking-wider ${color}`}>
      ⚠ {alert.message}
    </div>
  );
}

// ─── ATC frequency popup ──────────────────────────────────────────────────────

function ATCFrequencyToast() {
  const flightState = useGameStore((s) => s.flightState);
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({ text: "", visible: false });
  const lastFreq = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!flightState) return;
      const freq = atcManager.getActiveFrequency(flightState.lat, flightState.lng, flightState.altM);
      if (freq !== null && freq !== lastFreq.current) {
        lastFreq.current = freq;
        const sector = atcManager.getAllFacilities().find((f) => f.primaryFreqMhz === freq);
        setToast({ text: `Contact ${sector?.name ?? "ATC"} on ${freq.toFixed(2)} MHz`, visible: true });
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [flightState]);

  if (!toast.visible) return null;

  return (
    <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[9997] px-4 py-1.5 bg-blue-900/90 border border-blue-500/40 rounded text-cyan-300 text-xs font-mono">
      📡 {toast.text}
    </div>
  );
}

// ─── Airspace entry banner ────────────────────────────────────────────────────

function AirspaceBanner() {
  const flightState = useGameStore((s) => s.flightState);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const remove = navigationManager.on
      ? (() => {
          const handler = (payload: { event: string; data?: Record<string, unknown> }) => {
            if (payload.event === "airspace_entered") {
              const id = payload.data?.airspaceId as string;
              const boundary = id
                ? (navigationManager.getAirspaceManager().getAllActive
                    ? null
                    : navigationManager.getAirspaceManager().getAll().find((a) => a.id === id))
                : null;
              const name = boundary?.name ?? id;
              setBanner(`Entering ${name}`);
              if (bannerTimer.current) clearTimeout(bannerTimer.current);
              bannerTimer.current = setTimeout(() => setBanner(null), 3500);
            }
          };
          navigationManager.on("airspace_entered", handler);
          return () => { navigationManager.off("airspace_entered", handler); };
        })()
      : () => {};
    return () => {
      remove();
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  void flightState;
  if (!banner) return null;

  return (
    <div className="fixed top-36 left-1/2 -translate-x-1/2 z-[9997] px-4 py-1 bg-slate-800/90 border border-slate-500/40 rounded text-slate-300 text-xs font-mono">
      ✈ {banner}
    </div>
  );
}

// ─── Dev debug toggle ─────────────────────────────────────────────────────────

function DebugToggle() {
  const [show, setShow] = useState(false);
  const flightState = useGameStore((s) => s.flightState);
  if (!flightState) return null;
  return (
    <>
      <button
        onClick={() => setShow((v) => !v)}
        className="fixed bottom-4 left-4 z-[9999] bg-slate-900/80 border border-slate-600 text-slate-400 hover:text-white text-[10px] font-mono px-2 py-1 rounded"
      >
        {show ? "▼ NAV DBG" : "▲ NAV DBG"}
      </button>
      {show && <NavigationDebugPanel />}
    </>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function NavigationOverlay() {
  const mode = useGameStore((s) => s.mode);
  if (mode !== "flight") return null;

  return (
    <>
      <NavigationPanel />
      <TerrainAlertToast />
      <ATCFrequencyToast />
      <AirspaceBanner />
      {process.env.NODE_ENV === "development" && <DebugToggle />}
    </>
  );
}
