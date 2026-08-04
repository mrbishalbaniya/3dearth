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
import { FlightHUD } from "../../game/HUD/FlightHUD";
import {
  FlightPauseMenu,
  FlightTouchControls,
  HangarPanel,
} from "../../game/UI/HangarPanel";
import { LogbookPanel } from "../../game/UI/LogbookPanel";
import { FlightHelpPanel } from "../../game/UI/FlightHelpPanel";
import { AtcRadioPanel } from "../../game/World/AtcRadioPanel";
import { useGameStore } from "../../game/store/gameStore";
import { SimShell, useSimUiStore } from "../../sim";
import { CockpitRoot, useCockpitStore } from "../../cockpit";
import { PerfDebugOverlay } from "../performance/PerfDebugOverlay";

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

  const flightMode = useGameStore((s) => s.mode === "flight");
  const setHangerOpen = useGameStore((s) => s.setHangerOpen);
  const setLogbookOpen = useGameStore((s) => s.setLogbookOpen);
  const endFlight = useGameStore((s) => s.endFlight);
  const setPaused = useGameStore((s) => s.setPaused);
  const openMenu = useSimUiStore((s) => s.openMenu);
  const setSettingsOpen = useSimUiStore((s) => s.setSettingsOpen);
  const menuOpen = useSimUiStore((s) => s.menuOpen);
  const deckOpen = useCockpitStore((s) => s.deckOpen);
  const setDeckOpen = useCockpitStore((s) => s.setDeckOpen);
  const setCamera = useGameStore((s) => s.setCameraMode);

  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);

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
      duration: 2.4,
      approach: "rotateThenZoom",
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
    </>
  );
}
