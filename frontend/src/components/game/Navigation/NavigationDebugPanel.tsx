"use client";

/**
 * NavigationDebugPanel — In-flight navigation debug overlay.
 * Shows: flight plan, active waypoint, distance/ETA, heading, CDI,
 * terrain alerts, airspace status, GPS health, autopilot modes.
 */

import { useMemo } from "react";
import { useGameStore } from "../store/gameStore";
import { navigationComputer } from "./NavigationComputer";
import { autopilotManager } from "./AutopilotManager";
import { terrainAwareness } from "./TerrainAwareness";
import { airspaceManager } from "./AirspaceManager";
import { gpsManager } from "./GPSManager";
import { radioNav } from "./RadioNavigation";
import { atcManager } from "./ATCManager";

function Row({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4 font-mono text-xs">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={warn ? "text-red-400 font-bold" : "text-green-300"}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
      <div className="space-y-0.5 pl-1">{children}</div>
    </div>
  );
}

function fmtNm(nm: number): string {
  return nm < 0.1 ? "< 0.1 nm" : `${nm.toFixed(1)} nm`;
}
function fmtEta(sec: number | null): string {
  if (sec == null || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
function fmtAlt(m: number): string {
  return `${Math.round(m)} m / FL${Math.round(m / 30.48 / 10) * 10}`;
}
function fmtHdg(deg: number): string {
  return `${Math.round(deg).toString().padStart(3, "0")}°`;
}

export function NavigationDebugPanel() {
  const flightState = useGameStore((s) => s.flightState);
  const route       = useGameStore((s) => s.route);

  if (!flightState) return null;

  const nav      = navigationComputer.getState();
  const ap       = autopilotManager.getState();
  const terrain  = terrainAwareness.getState();
  const gps      = gpsManager.getPosition();
  const atcFreq  = atcManager.getActiveFrequency(flightState.lat, flightState.lng, flightState.altM);
  const sector   = airspaceManager.getSectorName(flightState.lat, flightState.lng, flightState.altM);
  const nav1     = radioNav.nav1;
  const ilsSt    = radioNav.ils;

  const planWaypoints = nav.activeWaypoint
    ? `${nav.activeWaypointIndex + 1} / ${(nav.remainingDistanceNm > 0 ? ">" : "") + navigationComputer.getRoute().length}`
    : "—";

  return (
    <div
      className="fixed bottom-4 right-4 w-72 bg-black/85 text-white rounded-lg p-3 border border-gray-700 overflow-y-auto max-h-[90vh]"
      style={{ zIndex: 9999, backdropFilter: "blur(8px)" }}
    >
      <div className="text-cyan-400 font-bold text-sm mb-2 border-b border-gray-700 pb-1">
        NAV DEBUG
      </div>

      <Section title="Position">
        <Row label="LAT"      value={flightState.lat.toFixed(5) + "°"} />
        <Row label="LNG"      value={flightState.lng.toFixed(5) + "°"} />
        <Row label="ALT"      value={fmtAlt(flightState.altM)} />
        <Row label="AGL"      value={`${Math.round(terrain.aglM)} m`} />
      </Section>

      <Section title="Flight Data">
        <Row label="HDG"      value={fmtHdg(flightState.yawDeg)} />
        <Row label="IAS"      value={`${Math.round(flightState.airspeedMs * 1.94384)} kt`} />
        <Row label="GS"       value={`${Math.round(flightState.groundSpeedMs * 1.94384)} kt`} />
        <Row label="VS"       value={`${Math.round(flightState.verticalSpeedMs * 196.85)} fpm`} />
      </Section>

      <Section title="Navigation">
        <Row label="SOURCE"   value={nav.source} />
        <Row label="PHASE"    value={nav.phase} />
        <Row label="WPT"      value={nav.activeWaypoint?.id ?? "—"} />
        <Row label="NEXT"     value={nav.nextWaypoint?.id ?? "—"} />
        <Row label="WPT #"    value={planWaypoints} />
        <Row label="DIST WPT" value={fmtNm(nav.distanceToWptNm)} />
        <Row label="BRNG WPT" value={fmtHdg(nav.bearingToWptDeg)} />
        <Row label="DIST REM" value={fmtNm(nav.remainingDistanceNm)} />
        <Row label="ETA WPT"  value={fmtEta(nav.etaNextWptSec)} />
        <Row label="ETA DEST" value={fmtEta(nav.etaDestSec)} />
        <Row label="XTK"      value={`${Math.round(nav.crossTrackErrorM)} m`} warn={Math.abs(nav.crossTrackErrorM) > 500} />
        <Row label="CDI DOTS" value={nav.cdi.cdiDots.toFixed(2)} warn={Math.abs(nav.cdi.cdiDots) > 1.5} />
        <Row label="RNP"      value={`${nav.requiredNavPerformanceNm.toFixed(1)} nm`} />
        <Row label="ANP"      value={`${nav.actualNavPerformanceNm.toFixed(1)} nm`} warn={!nav.navigationIntegrity} />
        <Row label="INT"      value={nav.navigationIntegrity ? "OK" : "FAIL"} warn={!nav.navigationIntegrity} />
      </Section>

      <Section title="Route">
        <Row label="ORIGIN"   value={route.departureIcao ?? "—"} />
        <Row label="DEST"     value={route.destIcao ?? "—"} />
        <Row label="DIST"     value={`${route.distanceNm.toFixed(0)} nm`} />
        <Row label="BRG"      value={fmtHdg(route.bearingDeg)} />
        <Row label="ETA"      value={fmtEta(route.etaSec)} />
      </Section>

      <Section title="GPS">
        <Row label="FIX"      value={gps.fixType.toUpperCase()} warn={gps.fixType === "none"} />
        <Row label="SATS"     value={gps.satellites} warn={gps.satellites < 4} />
        <Row label="HDOP"     value={gps.hdop.toFixed(1)} warn={gps.hdop > 3} />
        <Row label="ACC"      value={`${Math.round(gps.accuracyM)} m`} warn={gps.accuracyM > 100} />
        <Row label="WAAS"     value={gpsManager.hasWAAS() ? "YES" : "NO"} />
        <Row label="RAIM"     value={gpsManager.raimCheck() ? "OK" : "FAIL"} warn={!gpsManager.raimCheck()} />
      </Section>

      <Section title="Autopilot">
        <Row label="MASTER"   value={ap.masterEngage ? "ON" : "OFF"} warn={!ap.masterEngage} />
        <Row label="FD"       value={ap.fdActive ? "ON" : "OFF"} />
        <Row label="AT"       value={ap.atActive ? "ON" : "OFF"} />
        <Row label="LAT"      value={ap.lateral} />
        <Row label="VERT"     value={ap.vertical} />
        <Row label="TGT HDG"  value={fmtHdg(ap.targetHdgDeg)} />
        <Row label="TGT ALT"  value={fmtAlt(ap.targetAltM)} />
        <Row label="TGT VS"   value={`${(ap.targetVsMs * 196.85).toFixed(0)} fpm`} />
        <Row label="TGT SPD"  value={`${Math.round(ap.targetSpeedKt)} kt`} />
      </Section>

      <Section title="Radio Nav">
        <Row label="NAV1 ID"  value={nav1.navaid?.id ?? "—"} />
        <Row label="NAV1 BRG" value={fmtHdg(nav1.bearingToDeg)} />
        <Row label="NAV1 DME" value={nav1.dmeNm != null ? `${nav1.dmeNm.toFixed(1)} nm` : "—"} />
        <Row label="NAV1 CDI" value={nav1.cdiDeflection.toFixed(2)} />
        <Row label="ILS"      value={ilsSt.tuned ? `LOC ${ilsSt.locDeflection.toFixed(2)} GS ${ilsSt.gsDeflection.toFixed(2)}` : "—"} />
        <Row label="OM/MM"    value={`${ilsSt.outerMarker ? "OM " : ""}${ilsSt.middleMarker ? "MM" : ""}` || "—"} />
      </Section>

      <Section title="Terrain">
        <Row label="TERRAIN"  value={`${Math.round(terrain.terrainElevationM)} m`} />
        <Row label="AGL"      value={`${Math.round(terrain.aglM)} m`} warn={terrain.aglM < 300} />
        <Row label="MSA"      value={`${Math.round(terrain.msaM)} m`} />
        <Row label="MORA"     value={`${Math.round(terrain.gridMoraM)} m`} />
        <Row label="LOOKAHEAD" value={`${terrain.lookAheadClearNm.toFixed(1)} nm`} warn={terrain.lookAheadClearNm < 3} />
        <Row
          label="ALERT"
          value={terrain.alert.level === "NONE" ? "CLEAR" : `${terrain.alert.level}: ${terrain.alert.message}`}
          warn={terrain.alert.level !== "NONE"}
        />
      </Section>

      <Section title="Airspace">
        <Row label="SECTOR"   value={sector} />
        <Row label="ATC FREQ" value={atcFreq != null ? `${atcFreq.toFixed(2)} MHz` : "UNICOM 122.5"} />
        <Row label="SQUAWK"   value={atcManager.getClearanceHistory(1)[0]?.squawk ?? "2000"} />
        <Row label="TRAFFIC"  value={`${atcManager.getAllTraffic().length} contacts`} />
      </Section>
    </div>
  );
}
