"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { loadProgress } from "../../game/Save/SaveService";
import { GlassPanel, SimButton, SimChip, SimStat } from "../ui/Glass";
import { useSimUiStore } from "../stores/uiStore";

const NAV = [
  { id: "hangar", label: "Free Flight", hint: "Choose aircraft & runway" },
  { id: "planner", label: "Flight Planner", hint: "Route · fuel · weather" },
  { id: "missions", label: "Missions", hint: "Challenges & training" },
  { id: "profile", label: "Pilot Profile", hint: "Hours · badges · log" },
  { id: "multiplayer", label: "Multiplayer", hint: "Nearby pilots · voice ready" },
  { id: "settings", label: "Settings", hint: "Graphics · controls · audio" },
] as const;

export function SimMainMenu() {
  const open = useSimUiStore((s) => s.menuOpen);
  const closeMenu = useSimUiStore((s) => s.closeMenu);
  const setSettingsOpen = useSimUiStore((s) => s.setSettingsOpen);
  const setMissionsOpen = useSimUiStore((s) => s.setMissionsOpen);
  const setProfileOpen = useSimUiStore((s) => s.setProfileOpen);
  const setMultiplayerOpen = useSimUiStore((s) => s.setMultiplayerOpen);
  const pushToast = useSimUiStore((s) => s.pushToast);
  const setHangerOpen = useGameStore((s) => s.setHangerOpen);
  const setLogbookOpen = useGameStore((s) => s.setLogbookOpen);
  const progress = useGameStore((s) => s.progress);
  const setProgress = useGameStore((s) => s.setProgress);
  const flightMode = useGameStore((s) => s.mode === "flight");

  const [utc, setUtc] = useState("");

  useEffect(() => {
    setProgress(loadProgress());
  }, [setProgress]);

  useEffect(() => {
    const tick = () =>
      setUtc(
        new Date().toISOString().slice(11, 19) + " Z",
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!open || flightMode) return null;

  const onNav = (id: (typeof NAV)[number]["id"]) => {
    closeMenu();
    if (id === "hangar" || id === "planner") {
      setHangerOpen(true);
      pushToast({
        kind: "info",
        title: id === "planner" ? "Flight planner" : "Hangar",
        body: "Select aircraft and departure airport",
      });
    } else if (id === "missions") setMissionsOpen(true);
    else if (id === "profile") {
      setProfileOpen(true);
      setLogbookOpen(true);
    } else if (id === "multiplayer") setMultiplayerOpen(true);
    else if (id === "settings") setSettingsOpen(true);
  };

  return (
    <div className="sim-menu" role="dialog" aria-label="ORBIT main menu">
      <div className="sim-menu__veil" />
      <motion.div
        className="sim-menu__brand"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="sim-menu__eyebrow">Planetary observatory</p>
        <h1 className="sim-menu__logo">ORBIT</h1>
        <p className="sim-menu__tag">
          Explore Earth. Plan routes. Fly with living traffic.
        </p>
      </motion.div>

      <GlassPanel className="sim-menu__panel" wide>
        <div className="sim-menu__meta">
          <SimStat label="UTC" value={utc || "—"} />
          <SimStat
            label="Hours"
            value={progress.flightHours.toFixed(1)}
            unit="h"
          />
          <SimStat
            label="Airports"
            value={progress.airportsVisited.length}
          />
          <SimStat
            label="Badges"
            value={progress.achievements.length}
          />
        </div>

        <div className="sim-menu__grid">
          {NAV.map((item, i) => (
            <motion.button
              key={item.id}
              type="button"
              className="sim-menu__card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              onClick={() => onNav(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </motion.button>
          ))}
        </div>

        <footer className="sim-menu__foot">
          <div className="sim-menu__chips">
            <SimChip tone="cyan">Live Earth</SimChip>
            <SimChip tone="ok">ATC Ready</SimChip>
            <SimChip>6DOF Physics</SimChip>
          </div>
          <SimButton variant="ghost" onClick={closeMenu}>
            Enter world map
          </SimButton>
        </footer>
      </GlassPanel>
    </div>
  );
}
