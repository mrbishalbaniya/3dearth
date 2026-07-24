"use client";

/**
 * Exterior aircraft mesh — prefers GLB (Sketchfab / FR24 / custom),
 * falls back to procedural boxes if the asset is missing.
 */
import { useMemo } from "react";
import { EARTH_RADIUS_M } from "../../earth/utils/zoomLevels";
import type { AircraftSpec } from "../Types";
import { useCockpitGltf } from "../../cockpit/models/useCockpitGltf";
import { getExteriorModelDef } from "./exteriorRegistry";
import { ProceduralAircraftMesh } from "./ProceduralAircraftMesh";

const METERS_TO_SCENE = 1 / EARTH_RADIUS_M;

export function AircraftExteriorMesh({
  spec,
  hideCabin = false,
}: {
  spec: AircraftSpec;
  hideCabin?: boolean;
}) {
  const def = useMemo(
    () => getExteriorModelDef(spec.id, spec),
    [spec],
  );
  const { scene, status } = useCockpitGltf(def.url);

  // Cockpit view: hide exterior to avoid clipping through cabin
  if (hideCabin) return null;

  if (def.url && status === "ready" && scene) {
    const s = METERS_TO_SCENE * spec.visualScale * def.scale;
    return (
      <group scale={s} rotation={def.rotation}>
        <primitive object={scene} />
      </group>
    );
  }

  // Loading or missing → procedural stand-in (never block flight)
  if (def.url && status === "loading") {
    return <ProceduralAircraftMesh spec={spec} hideCabin={false} />;
  }

  return <ProceduralAircraftMesh spec={spec} hideCabin={false} />;
}
