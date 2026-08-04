/**
 * Per-aircraft cockpit GLB registry.
 * Drop files under /public/models/cockpit/ and point urls here.
 */

import type { AircraftSpec } from "../../game/Types";

export interface CockpitModelDef {
  /** Aircraft id this cabin belongs to */
  aircraftId: string;
  /**
   * Public URL to glTF/GLB. Null = attachment-point rig only (no cabin mesh).
   * Example: "/models/cockpit/cirrus_sr22_cockpit.glb"
   */
  url: string | null;
  /** Uniform scale applied to the loaded scene */
  scale: number;
  /** Optional Y offset if authoring origin differs */
  offsetY: number;
}

const REGISTRY: Record<string, CockpitModelDef> = {
  // URLs null until GLBs exist under public/models/cockpit/
  cirrus_sr22: {
    aircraftId: "cirrus_sr22",
    url: null,
    scale: 1,
    offsetY: 0,
  },
  baron_b58: {
    aircraftId: "baron_b58",
    url: null,
    scale: 1,
    offsetY: 0,
  },
  dhc6_twin_otter: {
    aircraftId: "dhc6_twin_otter",
    url: null,
    scale: 1,
    offsetY: 0,
  },
  citation_cj: {
    aircraftId: "citation_cj",
    url: null,
    scale: 1,
    offsetY: 0,
  },
};

export function getCockpitModelDef(
  aircraftId: string,
  spec?: AircraftSpec,
): CockpitModelDef {
  const fromRegistry = REGISTRY[aircraftId];
  if (fromRegistry) {
    return {
      ...fromRegistry,
      url: spec?.cockpitModelUrl ?? fromRegistry.url,
      scale: spec?.cockpitModelScale ?? fromRegistry.scale,
    };
  }
  return {
    aircraftId,
    url: spec?.cockpitModelUrl ?? null,
    scale: spec?.cockpitModelScale ?? 1,
    offsetY: 0,
  };
}

export function listCockpitRegistry(): CockpitModelDef[] {
  return Object.values(REGISTRY);
}
