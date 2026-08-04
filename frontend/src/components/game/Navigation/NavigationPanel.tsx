"use client";

/**
 * NavigationPanel — In-game navigation control panel.
 * Allows selecting destination, loading routes, engaging autopilot,
 * and viewing flight plan waypoints.
 */

import { useState, useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { useAutopilotStore } from "../../cockpit/stores/autopilotStore";
import { airportDb } from "./AirportDatabase";
import { navigationManager } from "./NavigationManager";
import { navigationComputer } from "./NavigationComputer";
import { autopilotManager } from "./AutopilotManager";
import { getAircraftSpec } from "../Aircraft/fleet";

function cls(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export function NavigationPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"route" | "ap" | "waypoints">("route");
  const [depInput, setDepInput] = useState("VNKT");
  const [destInput, setDestInput] = useState("VNPK");
  const [altInput, setAltInput] = useState("4600");
  const [directInput, setDirectInput] = useState("");

  const flightState = useGameStore((s) => s.flightState);
  const route = useGameStore((s) => s.route);
  const selectedAircraftId = useGameStore((s) => s.selectedAircraftId);
  const apStore = useAutopilotStore();
  const ap = apStore.ap;

  const navRoute = navigationComputer.getRoute();
  const navState = navigationComputer.getState();

  const handleLoadRoute = useCallback(() => {
    const dep = depInput.trim().toUpperCase();
    const dest = destInput.trim().toUpperCase();
    const altM = parseFloat(altInput) || 4600;
    const spec = getAircraftSpec(selectedAircraftId);
    navigationManager.buildAndLoadPlan({ departureIcao: dep, destinationIcao: dest, spec, cruiseAltM: altM });
  }, [depInput, destInput, altInput, selectedAircraftId]);

  const handleDirectTo = useCallback(() => {
    const id = directInput.trim().toUpperCase();
    if (!id) return;
    const st = flightState;
    if (!st) return;
    navigationManager.directTo(id, st.lat, st.lng);
    setDirectInput("");
  }, [directInput, flightState]);

  const handleClearRoute = useCallback(() => {
    navigationManager.clearRoute();
    useGameStore.getState().setRoute({ destIcao: null, waypoints: [], distanceNm: 0, etaSec: null, bearingDeg: 0 });
  }, []);

  const handleEngageAP = useCallback(() => {
    if (ap.master) {
      apStore.setMaster(false);
      autopilotManager.disengageMaster();
    } else {
      const st = flightState;
      if (!st) return;
      apStore.setMaster(true);
      apStore.setLateral(navRoute.length > 0 ? "lnav" : "hdg");
      apStore.setVertical("alt");
      apStore.setTargetHdg(Math.round(st.yawDeg));
      apStore.setTargetAlt(Math.round(st.altM / 50) * 50);
      autopilotManager.engageMaster();
    }
  }, [ap.master, apStore, flightState, navRoute.length]);

  if (!flightState) return null;

  return (
    <div className="fixed top-4 left-4 z-[9998]" style={{ pointerEvents: "auto" }}>
      {/* Toggle button */}
      <button
        className="bg-slate-900/90 border border-cyan-500/40 text-cyan-400 px-3 py-1.5 rounded text-xs font-mono hover:bg-slate-800 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▲ NAV" : "▼ NAV"}
      </button>

      {open && (
        <div className="mt-1 w-72 bg-slate-950/95 border border-slate-700 rounded-lg text-white font-mono text-xs overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {(["route", "ap", "waypoints"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cls(
                  "flex-1 py-1.5 uppercase tracking-wider text-[10px]",
                  tab === t ? "bg-cyan-900/60 text-cyan-300" : "text-slate-400 hover:text-white",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Route tab */}
          {tab === "route" && (
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-slate-400 text-[10px]">FROM</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs uppercase mt-0.5"
                    value={depInput}
                    onChange={(e) => setDepInput(e.target.value.toUpperCase())}
                    maxLength={4}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-slate-400 text-[10px]">TO</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs uppercase mt-0.5"
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value.toUpperCase())}
                    maxLength={4}
                  />
                </div>
                <div className="w-20">
                  <label className="text-slate-400 text-[10px]">ALT(m)</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs mt-0.5"
                    value={altInput}
                    onChange={(e) => setAltInput(e.target.value)}
                    type="number"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-cyan-700 hover:bg-cyan-600 rounded py-1 text-white font-bold uppercase text-[10px]"
                  onClick={handleLoadRoute}
                >
                  Load Plan
                </button>
                <button
                  className="flex-1 bg-slate-700 hover:bg-slate-600 rounded py-1 text-slate-300 uppercase text-[10px]"
                  onClick={handleClearRoute}
                >
                  Clear
                </button>
              </div>

              {/* Direct-to */}
              <div className="border-t border-slate-700 pt-2">
                <label className="text-slate-400 text-[10px]">DIRECT-TO (fix/ICAO)</label>
                <div className="flex gap-2 mt-0.5">
                  <input
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs uppercase"
                    value={directInput}
                    onChange={(e) => setDirectInput(e.target.value.toUpperCase())}
                    maxLength={5}
                    placeholder="KINDA"
                  />
                  <button
                    className="bg-yellow-700 hover:bg-yellow-600 rounded px-3 py-1 text-white uppercase text-[10px]"
                    onClick={handleDirectTo}
                  >
                    D→
                  </button>
                </div>
              </div>

              {/* Active route summary */}
              {route.destIcao && (
                <div className="border-t border-slate-700 pt-2 space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">DEST</span>
                    <span className="text-cyan-300 font-bold">{route.destIcao}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">DIST</span>
                    <span className="text-green-300">{route.distanceNm.toFixed(0)} nm</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">ETA</span>
                    <span className="text-green-300">
                      {route.etaSec != null ? `${Math.round(route.etaSec / 60)}m` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">WPT</span>
                    <span className="text-yellow-300">{navState.activeWaypoint?.id ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">XTK</span>
                    <span className={Math.abs(navState.crossTrackErrorM) > 500 ? "text-red-400" : "text-green-300"}>
                      {Math.round(navState.crossTrackErrorM)} m
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Autopilot tab */}
          {tab === "ap" && (
            <div className="p-3 space-y-2">
              <button
                onClick={handleEngageAP}
                className={cls(
                  "w-full rounded py-1.5 font-bold uppercase text-xs tracking-wider",
                  ap.master ? "bg-green-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600",
                )}
              >
                {ap.master ? "AP ENGAGED" : "AP OFF — Engage"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Lateral */}
                <div>
                  <div className="text-slate-400 text-[10px] mb-1">LATERAL</div>
                  {(["off", "hdg", "lnav", "loc"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { apStore.setLateral(m); autopilotManager.setLateralMode(m === "off" ? "OFF" : m.toUpperCase() as any); }}
                      className={cls(
                        "w-full text-left rounded px-2 py-0.5 uppercase text-[10px] mb-0.5",
                        ap.lateral === m ? "bg-cyan-800 text-cyan-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {/* Vertical */}
                <div>
                  <div className="text-slate-400 text-[10px] mb-1">VERTICAL</div>
                  {(["off", "alt", "vs", "vnav", "gs"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { apStore.setVertical(m); autopilotManager.setVerticalMode(m === "off" ? "OFF" : m.toUpperCase() as any); }}
                      className={cls(
                        "w-full text-left rounded px-2 py-0.5 uppercase text-[10px] mb-0.5",
                        ap.vertical === m ? "bg-blue-800 text-blue-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-700 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">TGT HDG</span>
                  <input
                    type="number" min={0} max={359}
                    className="w-16 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] text-right"
                    value={Math.round(ap.targetHdgDeg)}
                    onChange={(e) => apStore.setTargetHdg(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">TGT ALT m</span>
                  <input
                    type="number" step={50}
                    className="w-20 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] text-right"
                    value={Math.round(ap.targetAltM)}
                    onChange={(e) => { const v = parseFloat(e.target.value) || 0; apStore.setTargetAlt(v); autopilotManager.setTargetAltitude(v); }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">TGT VS m/s</span>
                  <input
                    type="number" step={0.5}
                    className="w-16 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] text-right"
                    value={ap.targetVsMs.toFixed(1)}
                    onChange={(e) => apStore.setTargetVs(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Waypoints tab */}
          {tab === "waypoints" && (
            <div className="p-2 max-h-64 overflow-y-auto">
              {navRoute.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-[10px]">No route loaded</div>
              ) : (
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-0.5">#</th>
                      <th className="text-left">ID</th>
                      <th className="text-right">LAT</th>
                      <th className="text-right">LNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navRoute.map((wp, i) => (
                      <tr
                        key={wp.id + i}
                        className={cls(
                          "border-b border-slate-800",
                          i === navState.activeWaypointIndex ? "text-cyan-300 font-bold" : "text-slate-300",
                        )}
                      >
                        <td className="py-0.5 text-slate-500">{i + 1}</td>
                        <td>{wp.id}</td>
                        <td className="text-right">{wp.lat.toFixed(3)}</td>
                        <td className="text-right">{wp.lng.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
