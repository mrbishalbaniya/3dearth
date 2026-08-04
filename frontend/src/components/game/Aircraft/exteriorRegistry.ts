/**
 * Exterior aircraft GLB registry.
 * Drop Sketchfab / FR24 / custom GLBs under /public/models/aircraft/
 */

import type { AircraftSpec } from "../../game/Types";

export interface ExteriorModelDef {
  aircraftId: string;
  /** Public URL to glTF/GLB. Null = use procedural mesh. */
  url: string | null;
  /** Extra uniform scale on top of AircraftSpec.visualScale */
  scale: number;
  /**
   * Euler radians [x,y,z] applied before flight orientation.
   * FR24 / FlightGear models often nose +X → rotate Y by −π/2 to face −Z.
   */
  rotation: [number, number, number];
  /** Attribution / license note */
  credit?: string;
}

const REGISTRY: Record<string, ExteriorModelDef> = {
  citation_cj: {
    aircraftId: "citation_cj",
    url: "/models/aircraft/citation_cj.glb",
    scale: 1,
    rotation: [0, -Math.PI / 2, 0],
    credit:
      "Cessna Citation II — Flightradar24 / FlightGear (GPLv2). Replace with a Sketchfab GLB anytime.",
  },
  cirrus_sr22: {
    aircraftId: "cirrus_sr22",
    url: "/models/aircraft/cirrus_sr22.glb",
    scale: 1,
    rotation: [0, -Math.PI / 2, 0],
    credit: "Piper PA-28 stand-in — Flightradar24 / FlightGear (GPLv2).",
  },
  baron_b58: {
    aircraftId: "baron_b58",
    url: null, // procedural until a twin-prop GLB is dropped in
    scale: 1,
    rotation: [0, -Math.PI / 2, 0],
  },
  dhc6_twin_otter: {
    aircraftId: "dhc6_twin_otter",
    url: "/models/aircraft/dhc6_twin_otter.glb",
    scale: 1,
    rotation: [0, -Math.PI / 2, 0],
    credit: "DHC-6 Twin Otter stand-in. Add a licensed GLB under /public/models/aircraft/ to override the procedural airframe.",
  },
};

export function getExteriorModelDef(
  aircraftId: string,
  spec?: AircraftSpec,
): ExteriorModelDef {
  const fromRegistry = REGISTRY[aircraftId];
  const base: ExteriorModelDef = fromRegistry ?? {
    aircraftId,
    url: null,
    scale: 1,
    rotation: [0, -Math.PI / 2, 0],
  };
  return {
    ...base,
    url: spec?.exteriorModelUrl ?? base.url,
    scale: spec?.exteriorModelScale ?? base.scale,
  };
}
