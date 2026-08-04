/**
 * Cockpit module contracts — aircraft-agnostic glass deck.
 * Future airframes plug in via CockpitLayout profiles.
 */

export type CockpitSeat =
  | "captain"
  | "first_officer"
  | "jump"
  | "overhead"
  | "pedestal"
  | "instrument";

export type ExternalCam =
  | "chase"
  | "wing"
  | "tower"
  | "free"
  | "drone"
  | "cinematic";

export type PanelBrightness = number; // 0..1

export interface CockpitLayoutId {
  /** e.g. g1000_sep | citation_glass | airliner_dual */
  id: string;
  engineCount: 1 | 2 | 4;
  hasWeatherRadar: boolean;
  hasHud: boolean;
}

export type ChecklistPhase =
  | "cold_dark"
  | "engine_start"
  | "taxi"
  | "before_takeoff"
  | "climb"
  | "cruise"
  | "descent"
  | "approach"
  | "landing"
  | "shutdown";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export type WarningId =
  | "master_warning"
  | "master_caution"
  | "overspeed"
  | "stall"
  | "terrain"
  | "pull_up"
  | "low_fuel"
  | "engine_fire"
  | "gear"
  | "hydraulic"
  | "electrical"
  | "weather";

export interface WarningAnnunciation {
  id: WarningId;
  level: "warning" | "caution" | "advisory";
  text: string;
  active: boolean;
}

export interface OverheadState {
  battery: boolean;
  alternator: boolean;
  avionics: boolean;
  fuelPumpL: boolean;
  fuelPumpR: boolean;
  hydPump: boolean;
  beacon: boolean;
  navLights: boolean;
  strobe: boolean;
  landingLight: boolean;
  taxiLight: boolean;
  pitotHeat: boolean;
  apu: boolean;
  engStart1: boolean;
  engStart2: boolean;
  bleed: boolean;
  pack: boolean;
  emergencyLight: boolean;
}

export const DEFAULT_OVERHEAD: OverheadState = {
  battery: true,
  alternator: true,
  avionics: true,
  fuelPumpL: true,
  fuelPumpR: true,
  hydPump: true,
  beacon: true,
  navLights: true,
  strobe: true,
  landingLight: false,
  taxiLight: false,
  pitotHeat: false,
  apu: false,
  engStart1: false,
  engStart2: false,
  bleed: true,
  pack: true,
  emergencyLight: false,
};

export const LAYOUT_BY_CLASS: Record<string, CockpitLayoutId> = {
  sep: { id: "g1000_sep", engineCount: 1, hasWeatherRadar: false, hasHud: false },
  tep: { id: "g1000_twin", engineCount: 2, hasWeatherRadar: false, hasHud: false },
  turboprop_twin: { id: "g1000_twin", engineCount: 2, hasWeatherRadar: false, hasHud: false },
  business_jet: {
    id: "citation_glass",
    engineCount: 2,
    hasWeatherRadar: true,
    hasHud: true,
  },
  airliner: {
    id: "airliner_dual",
    engineCount: 2,
    hasWeatherRadar: true,
    hasHud: true,
  },
  cargo: {
    id: "airliner_dual",
    engineCount: 2,
    hasWeatherRadar: true,
    hasHud: false,
  },
  helicopter: {
    id: "g1000_sep",
    engineCount: 1,
    hasWeatherRadar: false,
    hasHud: false,
  },
  fighter: {
    id: "fighter_hud",
    engineCount: 1,
    hasWeatherRadar: true,
    hasHud: true,
  },
};
