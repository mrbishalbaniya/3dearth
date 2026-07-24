import type { SeaLevelPreset } from "./types";

/** Present mean sea level. */
export const REAL_SEA_LEVEL_M = 0;

/** Full interactive range for Dry Earth water engine. */
export const SEA_LEVEL_MAX_M = 9000;
export const SEA_LEVEL_MIN_M = -11000;

/** Discrete stops for the slider (smooth animation between). */
export const SEA_LEVEL_STOPS_M: number[] = [
  9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 0, -500, -1000, -2000,
  -3000, -4000, -5000, -6000, -7000, -8000, -9000, -11000,
];

export const SEA_LEVEL_PRESETS: SeaLevelPreset[] = [
  {
    id: "flood_extreme",
    label: "Flood Earth",
    meters: 9000,
    description: "Extreme flood — only the highest peaks remain islands",
  },
  {
    id: "flood_high",
    label: "+1000 m",
    meters: 1000,
    description: "Highstand flood covering coastal plains",
  },
  {
    id: "real",
    label: "Real Sea Level",
    meters: 0,
    description: "Present-day mean sea level",
  },
  {
    id: "dry",
    label: "Dry Earth",
    meters: -11000,
    description: "Drain all oceans — reveal full bathymetry",
  },
  {
    id: "ice_age",
    label: "Ice Age (−120 m)",
    meters: -120,
    description: "Last Glacial Maximum approximate lowstand",
  },
  {
    id: "abyss",
    label: "Abyss (−6000 m)",
    meters: -6000,
    description: "Reveal abyssal plains and ridges",
  },
  {
    id: "mariana",
    label: "Mariana (−11000 m)",
    meters: -11000,
    description: "Expose the deepest trenches",
  },
];

/** Hypsometric color stops (elevation meters → RGB 0–1). */
export const HYPSO_STOPS: Array<{ elev: number; rgb: [number, number, number] }> =
  [
    { elev: 9000, rgb: [1.0, 1.0, 1.0] },
    { elev: 6000, rgb: [0.78, 0.8, 0.84] },
    { elev: 3000, rgb: [0.55, 0.42, 0.32] },
    { elev: 1500, rgb: [0.42, 0.55, 0.28] },
    { elev: 400, rgb: [0.55, 0.72, 0.38] },
    { elev: 50, rgb: [0.72, 0.82, 0.48] },
    { elev: 0, rgb: [0.92, 0.88, 0.45] },
    { elev: -500, rgb: [0.55, 0.88, 0.9] },
    { elev: -1000, rgb: [0.25, 0.72, 0.85] },
    { elev: -3000, rgb: [0.12, 0.35, 0.72] },
    { elev: -6000, rgb: [0.05, 0.12, 0.38] },
    { elev: -11000, rgb: [0.02, 0.03, 0.08] },
  ];

/** Smooth sea-level lerp speed (1/e seconds roughly). */
export const SEA_LEVEL_LERP = 2.4;

/** Water shell base offset above mean ellipsoid (scene units). */
export const WATER_SHELL_EPS = 0.00035;
