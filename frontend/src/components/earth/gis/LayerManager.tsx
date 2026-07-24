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

/**
 * Free/open GIS layer stack — paint order matters.
 * Streaming imagery/DEM via LodSelector + TileScheduler + flight corridor.
 * Flight mode strips vector layers to keep Chrome's GPU process alive.
 */
export function LayerManager({ quality }: { quality: EarthQualityProfile }) {
  void quality;
  const flightMode = useGameStore((s) => s.mode === "flight");

  return (
    <group name="gis-layers">
      <SatelliteLayer />
      {!flightMode && <LandCoverLayer />}
      <TerrainLayer />
      {!flightMode && <ParksLayer />}
      {!flightMode && <ForestLayer />}
      {!flightMode && <VegetationLayer />}
      <WaterLayer />
      {!flightMode && <BorderLayer />}
      {!flightMode && <RoadLayer />}
      {!flightMode && <BuildingLayer />}
      {!flightMode && <NaturalFeaturesLayer />}
      {!flightMode && <PoiLayer />}
      {!flightMode && <LabelLayer />}
      <UserLocationLayer />
      <CorridorDebugLayer />
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
