"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { NEPAL_BOUNDS, NEPAL_CAMERA_CONFIG } from "@/components/game/NepalGame";
import { FlightCorridorTerrain } from "@/components/earth/streaming/FlightCorridorTerrain";
import { StreamingDebugWrapper } from "@/components/earth/streaming/StreamingDebugWrapper";
import { FlightMapOverlay } from "@/components/earth/streaming/FlightMapOverlay";
import { CityNavigator } from "@/components/navigation/CityNavigator";

const NepalGameHUD = dynamic(
  () => import("@/components/game/NepalGame").then((m) => m.NepalGameHUD),
  { ssr: false }
);

const NepalFlightSim = dynamic(
  () => import("@/components/game/NepalGame").then((m) => m.NepalFlightSim),
  { ssr: false }
);

export default function GamePage() {
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);
  const isReady = useEarthStore((s) => s.isReady);
  const setLayer = useEarthStore((s) => s.setLayer);

  useEffect(() => {
    // Disable full Earth layers for flight corridor mode
    setLayer("atmosphere", false);
    setLayer("clouds", false);
    setLayer("borders", false);
    setLayer("stars", false);
    setLayer("dayNight", false);
    
    // Disable all GIS layers - we stream only what's needed
    const store = useEarthStore.getState();
    store.setGisLayer("satellite", false);
    store.setGisLayer("nightLights", false);
  }, [setLayer]);

  return (
    <div className="game-page game-page--nepal">
      {/* Flight corridor-based terrain streaming - NO FULL EARTH */}
      <Canvas
        camera={{ 
          position: [0, 6000, 15000], 
          fov: 60, 
          near: 1, 
          far: 300000,
        }}
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 3000, 0); // Look at terrain center
        }}
      >
        <FlightCorridorTerrain />
      </Canvas>

      {/* UI overlays OUTSIDE Canvas */}
      <NepalFlightSim />
      <NepalGameHUD />
      
      {/* Flight Map Overlay */}
      <FlightMapOverlay />
      
      {/* City Navigator - NEW! */}
      <CityNavigator />
      
      {/* Debug panel - Press F3 to toggle */}
      <StreamingDebugWrapper />

      {/* Minimal UI - only essential elements */}

      <style jsx>{`
        .game-page--nepal {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: linear-gradient(to bottom, #0a0e1a 0%, #000000 100%);
        }

        .game-page__nav--nepal {
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.95),
            rgba(239, 68, 68, 0.90),
            rgba(30, 64, 175, 0.85)
          );
          backdrop-filter: blur(16px);
          border-bottom: 2px solid rgba(251, 191, 36, 0.3);
          box-shadow: 0 4px 24px rgba(220, 38, 38, 0.3);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .game-page__back {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .game-page__back:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(-2px);
        }

        .game-page__title-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .game-page__title {
          font-size: 28px;
          font-weight: 800;
          color: white;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          margin: 0;
        }

        @media (max-width: 768px) {
          .game-page__nav--nepal {
            padding: 12px 16px;
            flex-direction: column;
            gap: 12px;
          }

          .game-page__back {
            align-self: flex-start;
            font-size: 13px;
            padding: 6px 12px;
          }

          .game-page__title {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}