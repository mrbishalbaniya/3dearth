"use client";

import type { Vector3 } from "three";
import type { LoadedEarthTextures } from "../utils/textures";
import { SeaLevelTicker } from "./WaterEngine/SeaLevelTicker";
import { DynamicWater } from "./WaterEngine/DynamicWater";
import { DryEarthSurface } from "./Terrain/DryEarthSurface";
import { BathymetryLayer } from "./Bathymetry/BathymetryLayer";
import { FeatureLabels } from "./Layers/FeatureLabels";
import { GeologicalLayers } from "./Layers/GeologicalLayers";
import { MeasurementTool } from "./Measurement/MeasurementTool";

interface DryEarthSystemProps {
  textures: LoadedEarthTextures;
  sunDirection: Vector3;
}

/**
 * Dry Earth scene graph — water engine, hypsometric surface,
 * bathymetry tiles, labels, geology, measurement.
 */
export function DryEarthSystem({
  textures,
  sunDirection,
}: DryEarthSystemProps) {
  return (
    <group name="dry-earth">
      <SeaLevelTicker />
      <DryEarthSurface textures={textures} sunDirection={sunDirection} />
      <DynamicWater textures={textures} sunDirection={sunDirection} />
      <BathymetryLayer />
      <GeologicalLayers />
      <FeatureLabels />
      <MeasurementTool />
    </group>
  );
}
