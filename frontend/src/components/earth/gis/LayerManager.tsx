"use client";

import { TerrainLayer } from "./layers/TerrainLayer";
import { SatelliteLayer } from "./layers/SatelliteLayer";
import { WaterLayer } from "./layers/WaterLayer";
import { RoadLayer } from "./layers/RoadLayer";
import { LandCoverLayer } from "./layers/LandCoverLayer";
import { ForestLayer } from "./layers/ForestLayer";
import { BuildingLayer } from "./layers/BuildingLayer";
import { BorderLayer } from "./layers/BorderLayer";
import { PoiLayer } from "./layers/PoiLayer";
import { NaturalFeaturesLayer } from "./layers/NaturalFeaturesLayer";
import { LabelLayer } from "./layers/LabelLayer";
import { ParksLayer } from "./layers/ParksLayer";
import { VegetationLayer } from "./layers/VegetationLayer";
import { UserLocationLayer } from "./layers/UserLocationLayer";
import { CorridorDebugLayer } from "../streaming/CorridorDebugLayer";
import type { EarthQualityProfile } from "../types";
import { useGameStore } from "../../game/store/gameStore";
import { useEarthAppMode } from "../appMode";

/**
 * Free/open GIS layer stack — paint order matters.
 * Streaming imagery/DEM via LodSelector + TileScheduler + flight corridor.
 * Flight mode strips vector layers to keep Chrome's GPU process alive.
 */
export function LayerManager({ quality }: { quality: EarthQualityProfile }) {
  void quality;
  const flightMode = useGameStore((s) => s.mode === "flight");
  const appMode = useEarthAppMode();

  // Keep non-game flight lean, but preserve core imagery/terrain in game flight.
  const disableLayers = flightMode && appMode !== "game";
  const gameMode = appMode === "game";

  return (
    <group name="gis-layers">
      {/* Core 3D map stack: always available in game mode (including flight). */}
      {!disableLayers && <SatelliteLayer />}
      {!disableLayers && <TerrainLayer />}

      {/* Heavy thematic layers only outside game mode to protect frame time. */}
      {!disableLayers && !gameMode && <LandCoverLayer />}
      {!disableLayers && !gameMode && <ParksLayer />}
      {!disableLayers && !gameMode && <ForestLayer />}
      {!disableLayers && !gameMode && <VegetationLayer />}
      {!disableLayers && <WaterLayer />}
      {!disableLayers && <BorderLayer />}
      {!disableLayers && !gameMode && <RoadLayer />}
      {!disableLayers && !gameMode && <BuildingLayer />}
      {!disableLayers && !gameMode && <NaturalFeaturesLayer />}
      {!disableLayers && !gameMode && <PoiLayer />}
      {!disableLayers && !gameMode && <LabelLayer />}
      {!disableLayers && !gameMode && <UserLocationLayer />}
      {!disableLayers && !gameMode && <CorridorDebugLayer />}
    </group>
  );
}

export {
  TerrainLayer,
  SatelliteLayer,
  WaterLayer,
  RoadLayer,
  BuildingLayer,
  LandCoverLayer,
  VegetationLayer,
};
