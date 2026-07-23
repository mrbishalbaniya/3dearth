"use client";

import { motion } from "framer-motion";
import { useState, type RefObject } from "react";
import { useEarthStore } from "../store/earthStore";
import { formatCoordinate } from "../utils/geo";
import { formatAltitude } from "../utils/zoomLevels";
import { useLiveLocation } from "../hooks/useLiveLocation";
import { ScaleBar } from "./ScaleBar";
import { LayerSidebar } from "./LayerSidebar";
import { GamepadPads } from "./GamepadPads";
import { ElevationLegend, MeasureInfoPanel } from "../dryEarth";

interface EarthControlsProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

function GlassButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`earth-btn ${active ? "earth-btn--active" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function EarthControls({ containerRef }: EarthControlsProps) {
  useLiveLocation();

  const requestZoom = useEarthStore((s) => s.requestZoom);
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);
  const setFullscreen = useEarthStore((s) => s.setFullscreen);
  const isFullscreen = useEarthStore((s) => s.isFullscreen);
  const pointerCoords = useEarthStore((s) => s.pointerCoords);
  const compassHeading = useEarthStore((s) => s.compassHeading);
  const cameraPitch = useEarthStore((s) => s.cameraPitch);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const zoomLevelName = useEarthStore((s) => s.zoomLevelName);
  const tilesLoading = useEarthStore((s) => s.tilesLoading);
  const fps = useEarthStore((s) => s.fps);
  const hoveredCountry = useEarthStore((s) => s.hoveredCountry);
  const selectedCountry = useEarthStore((s) => s.selectedCountry);
  const northLock = useEarthStore((s) => s.northLock);
  const toggleNorthLock = useEarthStore((s) => s.toggleNorthLock);
  const debugMode = useEarthStore((s) => s.debugMode);
  const toggleDebugMode = useEarthStore((s) => s.toggleDebugMode);
  const locationTracking = useEarthStore((s) => s.locationTracking);
  const setLocationTracking = useEarthStore((s) => s.setLocationTracking);
  const userLocation = useEarthStore((s) => s.userLocation);

  const [telemetryOpen, setTelemetryOpen] = useState(true);

  const toggleLiveLocation = () => {
    if (!navigator.geolocation) {
      window.alert("Location is not supported in this browser.");
      return;
    }
    if (locationTracking) {
      setLocationTracking(false);
      return;
    }
    setLocationTracking(true);
  };

  const recenterOnMe = () => {
    if (!userLocation) return;
    requestFlyTo({
      lat: userLocation.lat,
      lng: userLocation.lng,
      altitudeM: Math.min(12_000, Math.max(1_200, altitudeM)),
      duration: 1.2,
    });
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
      setFullscreen(true);
    } else {
      void document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <>
      <motion.div
        className="earth-hud earth-hud--brand"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="earth-brand">ORBIT</div>
        <div className="earth-brand-sub">Planetary Observatory</div>
        <div className="earth-zoom-badge">
          <span className="earth-zoom-badge__level">L{zoomLevel}</span>
          <span className="earth-zoom-badge__name">{zoomLevelName}</span>
        </div>
        {locationTracking && (
          <button
            type="button"
            className="earth-live-badge"
            onClick={recenterOnMe}
            title="Recenter on me"
          >
            <span className="earth-live-badge__dot" />
            Live · ±{Math.round(userLocation?.accuracyM ?? 0)} m
          </button>
        )}
      </motion.div>

      <motion.div
        className="earth-hud earth-hud--zoom"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <GlassButton label="Zoom in" onClick={() => requestZoom(0.4)}>
          +
        </GlassButton>
        <GlassButton label="Zoom out" onClick={() => requestZoom(-0.4)}>
          −
        </GlassButton>
        <GlassButton
          label={
            locationTracking
              ? "Stop live location"
              : "Start live location"
          }
          onClick={toggleLiveLocation}
          active={locationTracking}
        >
          ⌖
        </GlassButton>
        <GlassButton
          label="North lock"
          onClick={() => toggleNorthLock()}
          active={northLock}
        >
          N
        </GlassButton>
        <GlassButton
          label="Debug (Ctrl+D)"
          onClick={() => toggleDebugMode()}
          active={debugMode}
        >
          ⌁
        </GlassButton>
        <GlassButton
          label="Fullscreen"
          onClick={toggleFullscreen}
          active={isFullscreen}
        >
          ⛶
        </GlassButton>
      </motion.div>

      <LayerSidebar />
      <ElevationLegend />
      <MeasureInfoPanel />
      <GamepadPads />

      <motion.div
        className="earth-hud earth-hud--compass"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        aria-label={`Heading ${Math.round(compassHeading)}°, pitch ${Math.round(cameraPitch)}°`}
      >
        <div
          className="earth-compass"
          style={{ transform: `rotate(${-compassHeading}deg)` }}
        >
          <span className="earth-compass__n">N</span>
          <span className="earth-compass__needle" />
        </div>
      </motion.div>

      <motion.div
        className={`earth-hud earth-hud--footer ${telemetryOpen ? "earth-hud--footer-open" : ""}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {telemetryOpen && (
          <div className="earth-footer-bar" role="status" aria-live="polite">
            <div className="earth-meta earth-meta--inline">
              <span className="earth-meta__label">Zoom</span>
              <span className="earth-meta__value">
                L{zoomLevel} · {zoomLevelName}
              </span>
            </div>
            <div className="earth-meta earth-meta--inline">
              <span className="earth-meta__label">Alt</span>
              <span className="earth-meta__value">{formatAltitude(altitudeM)}</span>
            </div>
            <div className="earth-meta earth-meta--inline">
              <span className="earth-meta__label">Coords</span>
              <span className="earth-meta__value">
                {formatCoordinate(pointerCoords.lat, pointerCoords.lng)}
              </span>
            </div>
            <div className="earth-meta earth-meta--inline">
              <span className="earth-meta__label">Hdg</span>
              <span className="earth-meta__value">
                {Math.round(compassHeading)}°
              </span>
            </div>
            <div className="earth-meta earth-meta--inline">
              <span className="earth-meta__label">Pitch</span>
              <span className="earth-meta__value">
                {Math.round(cameraPitch)}°
              </span>
            </div>
            <div className="earth-meta earth-meta--inline earth-meta--fps">
              <span className="earth-meta__label">FPS</span>
              <span className="earth-meta__value">{fps}</span>
            </div>
            <ScaleBar />
            {(hoveredCountry || selectedCountry) && (
              <div className="earth-meta earth-meta--inline">
                <span className="earth-meta__label">
                  {selectedCountry ? "Sel" : "Region"}
                </span>
                <span className="earth-meta__value">
                  {selectedCountry || hoveredCountry}
                </span>
              </div>
            )}
            {tilesLoading > 0 && (
              <div className="earth-meta earth-meta--inline earth-meta--loading">
                <span className="earth-meta__label">Tiles</span>
                <span className="earth-meta__value">…</span>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="earth-footer-toggle"
          onClick={() => setTelemetryOpen((v) => !v)}
          aria-expanded={telemetryOpen}
          aria-label={telemetryOpen ? "Hide telemetry" : "Show telemetry"}
          title={telemetryOpen ? "Hide" : "Show"}
        >
          {telemetryOpen ? "▾ Hide" : "▴ Status"}
        </button>
      </motion.div>
    </>
  );
}
