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
import type { EarthQualityProfile } from "../types";

/**
 * Free/open GIS layer stack — paint order matters.
 * Streaming imagery/DEM via LodSelector + TileScheduler.
 */
export function LayerManager({ quality }: { quality: EarthQualityProfile }) {
  void quality;
  return (
    <group name="gis-layers">
      <SatelliteLayer />
      <LandCoverLayer />
      <TerrainLayer />
      <ParksLayer />
      <ForestLayer />
      <VegetationLayer />
      <WaterLayer />
      <BorderLayer />
      <RoadLayer />
      <BuildingLayer />
      <NaturalFeaturesLayer />
      <PoiLayer />
      <LabelLayer />
      <UserLocationLayer />
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
