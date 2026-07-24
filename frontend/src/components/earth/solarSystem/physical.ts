/**
 * Scientific physical constants (NASA fact sheets / IAU WGCCRE).
 * Scene unit: Earth mean radius = 1 (matches the observatory globe).
 *
 * Sources:
 * - NASA Planetary Fact Sheets
 * - IAU WGCCRE rotational elements (W = W0 + Ẇ·d)
 * - JPL SSD approx_pos (planet orbits — see ephemeris.ts)
 */

/** Earth volumetric mean radius (km) — IAU / NASA. */
export const EARTH_RADIUS_KM = 6371.0;

/** 1 AU in km (IAU 2012 exact). */
export const AU_KM = 149_597_870.7;

/** Sun volumetric mean radius (km). */
export const SUN_RADIUS_KM = 695_700;

export interface IauRotation {
  /** Prime meridian W at J2000.0 (deg) */
  w0Deg: number;
  /** dW/dday (deg/day); negative = retrograde */
  wDotDegPerDay: number;
}

export interface BodyPhysical {
  id: string;
  label: string;
  /** Mean radius km */
  radiusKm: number;
  /** Obliquity to orbit (deg) */
  obliquityDeg: number;
  /** IAU prime-meridian rotation */
  rotation: IauRotation;
  /** Approximate albedo tint for fallback shading */
  color: string;
}

export interface MoonPhysical {
  id: string;
  label: string;
  parentId: string;
  radiusKm: number;
  /** Semi-major axis km (planet-centered) */
  semiMajorKm: number;
  /** Sidereal orbital period (days); negative = retrograde */
  periodDays: number;
  /** Inclination to parent equator (deg) */
  inclinationDeg: number;
  /** Mean longitude at J2000 (deg), approximate */
  meanLongitudeJ2000Deg: number;
  color: string;
  textureUrl?: string;
}

export interface RingPhysical {
  /** Inner edge km from planet center */
  innerKm: number;
  /** Outer edge km from planet center */
  outerKm: number;
  color: string;
  opacity: number;
  textureUrl?: string;
}

/** Mean radii + IAU W (System III for gas giants). */
export const BODY_PHYSICAL: Record<string, BodyPhysical> = {
  sun: {
    id: "sun",
    label: "Sun",
    radiusKm: SUN_RADIUS_KM,
    obliquityDeg: 7.25,
    rotation: { w0Deg: 84.176, wDotDegPerDay: 14.1844 },
    color: "#fff4c8",
  },
  mercury: {
    id: "mercury",
    label: "Mercury",
    radiusKm: 2439.7,
    obliquityDeg: 0.034,
    rotation: { w0Deg: 329.5469, wDotDegPerDay: 6.1385025 },
    color: "#a8a29e",
  },
  venus: {
    id: "venus",
    label: "Venus",
    radiusKm: 6051.8,
    obliquityDeg: 177.36,
    rotation: { w0Deg: 160.2, wDotDegPerDay: -1.4813688 },
    color: "#f5d0a9",
  },
  earth: {
    id: "earth",
    label: "Earth",
    radiusKm: EARTH_RADIUS_KM,
    obliquityDeg: 23.439281,
    rotation: { w0Deg: 190.147, wDotDegPerDay: 360.9856235 },
    color: "#4a90d9",
  },
  mars: {
    id: "mars",
    label: "Mars",
    radiusKm: 3389.5,
    obliquityDeg: 25.19,
    rotation: { w0Deg: 176.63, wDotDegPerDay: 350.89198226 },
    color: "#c45c3e",
  },
  jupiter: {
    id: "jupiter",
    label: "Jupiter",
    radiusKm: 69911,
    obliquityDeg: 3.13,
    rotation: { w0Deg: 284.95, wDotDegPerDay: 870.536 },
    color: "#d4a574",
  },
  saturn: {
    id: "saturn",
    label: "Saturn",
    radiusKm: 58232,
    obliquityDeg: 26.73,
    rotation: { w0Deg: 38.9, wDotDegPerDay: 810.7939024 },
    color: "#e8d5a3",
  },
  uranus: {
    id: "uranus",
    label: "Uranus",
    radiusKm: 25362,
    obliquityDeg: 97.77,
    rotation: { w0Deg: 203.81, wDotDegPerDay: -501.1600928 },
    color: "#7ec8e3",
  },
  neptune: {
    id: "neptune",
    label: "Neptune",
    radiusKm: 24622,
    obliquityDeg: 28.32,
    rotation: { w0Deg: 253.18, wDotDegPerDay: 536.3128492 },
    color: "#4b6fd6",
  },
  pluto: {
    id: "pluto",
    label: "Pluto",
    radiusKm: 1188.3,
    obliquityDeg: 122.53,
    rotation: { w0Deg: 236.77, wDotDegPerDay: -56.3623195 },
    color: "#c4b4a0",
  },
};

/** Major moons — NASA SSD / fact sheets. */
export const MOON_PHYSICAL: MoonPhysical[] = [
  {
    id: "phobos",
    label: "Phobos",
    parentId: "mars",
    radiusKm: 11.27,
    semiMajorKm: 9376,
    periodDays: 0.31891,
    inclinationDeg: 1.093,
    meanLongitudeJ2000Deg: 112.0,
    color: "#8a7a6a",
  },
  {
    id: "deimos",
    label: "Deimos",
    parentId: "mars",
    radiusKm: 6.2,
    semiMajorKm: 23463,
    periodDays: 1.26244,
    inclinationDeg: 0.93,
    meanLongitudeJ2000Deg: 260.0,
    color: "#9a8a7a",
  },
  {
    id: "io",
    label: "Io",
    parentId: "jupiter",
    radiusKm: 1821.6,
    semiMajorKm: 421800,
    periodDays: 1.769138,
    inclinationDeg: 0.05,
    meanLongitudeJ2000Deg: 342.0,
    color: "#e8c84a",
  },
  {
    id: "europa",
    label: "Europa",
    parentId: "jupiter",
    radiusKm: 1560.8,
    semiMajorKm: 671100,
    periodDays: 3.551181,
    inclinationDeg: 0.47,
    meanLongitudeJ2000Deg: 171.0,
    color: "#d8d0c0",
  },
  {
    id: "ganymede",
    label: "Ganymede",
    parentId: "jupiter",
    radiusKm: 2634.1,
    semiMajorKm: 1_070_400,
    periodDays: 7.154553,
    inclinationDeg: 0.2,
    meanLongitudeJ2000Deg: 317.0,
    color: "#a89880",
  },
  {
    id: "callisto",
    label: "Callisto",
    parentId: "jupiter",
    radiusKm: 2410.3,
    semiMajorKm: 1_882_700,
    periodDays: 16.689017,
    inclinationDeg: 0.2,
    meanLongitudeJ2000Deg: 182.0,
    color: "#6a5a4a",
  },
  {
    id: "mimas",
    label: "Mimas",
    parentId: "saturn",
    radiusKm: 198.2,
    semiMajorKm: 185540,
    periodDays: 0.942422,
    inclinationDeg: 1.53,
    meanLongitudeJ2000Deg: 40.0,
    color: "#d0d0d0",
  },
  {
    id: "enceladus",
    label: "Enceladus",
    parentId: "saturn",
    radiusKm: 252.1,
    semiMajorKm: 238040,
    periodDays: 1.370218,
    inclinationDeg: 0.0,
    meanLongitudeJ2000Deg: 120.0,
    color: "#f0f4f8",
  },
  {
    id: "tethys",
    label: "Tethys",
    parentId: "saturn",
    radiusKm: 531.1,
    semiMajorKm: 294670,
    periodDays: 1.887802,
    inclinationDeg: 1.09,
    meanLongitudeJ2000Deg: 200.0,
    color: "#e8e8e0",
  },
  {
    id: "dione",
    label: "Dione",
    parentId: "saturn",
    radiusKm: 561.4,
    semiMajorKm: 377420,
    periodDays: 2.736915,
    inclinationDeg: 0.02,
    meanLongitudeJ2000Deg: 280.0,
    color: "#d8d0c8",
  },
  {
    id: "rhea",
    label: "Rhea",
    parentId: "saturn",
    radiusKm: 763.8,
    semiMajorKm: 527070,
    periodDays: 4.518212,
    inclinationDeg: 0.35,
    meanLongitudeJ2000Deg: 50.0,
    color: "#c8c0b8",
  },
  {
    id: "titan",
    label: "Titan",
    parentId: "saturn",
    radiusKm: 2574.7,
    semiMajorKm: 1_221_870,
    periodDays: 15.945421,
    inclinationDeg: 0.33,
    meanLongitudeJ2000Deg: 130.0,
    color: "#c4a060",
  },
  {
    id: "iapetus",
    label: "Iapetus",
    parentId: "saturn",
    radiusKm: 734.5,
    semiMajorKm: 3_560_820,
    periodDays: 79.330183,
    inclinationDeg: 15.47,
    meanLongitudeJ2000Deg: 310.0,
    color: "#6a5850",
  },
  {
    id: "miranda",
    label: "Miranda",
    parentId: "uranus",
    radiusKm: 235.8,
    semiMajorKm: 129900,
    periodDays: 1.413479,
    inclinationDeg: 4.34,
    meanLongitudeJ2000Deg: 30.0,
    color: "#c0c4c8",
  },
  {
    id: "ariel",
    label: "Ariel",
    parentId: "uranus",
    radiusKm: 578.9,
    semiMajorKm: 190900,
    periodDays: 2.520379,
    inclinationDeg: 0.04,
    meanLongitudeJ2000Deg: 90.0,
    color: "#b0b8c0",
  },
  {
    id: "umbriel",
    label: "Umbriel",
    parentId: "uranus",
    radiusKm: 584.7,
    semiMajorKm: 266000,
    periodDays: 4.144177,
    inclinationDeg: 0.13,
    meanLongitudeJ2000Deg: 150.0,
    color: "#707878",
  },
  {
    id: "titania",
    label: "Titania",
    parentId: "uranus",
    radiusKm: 788.9,
    semiMajorKm: 436300,
    periodDays: 8.705872,
    inclinationDeg: 0.08,
    meanLongitudeJ2000Deg: 210.0,
    color: "#a0a8b0",
  },
  {
    id: "oberon",
    label: "Oberon",
    parentId: "uranus",
    radiusKm: 761.4,
    semiMajorKm: 583500,
    periodDays: 13.463239,
    inclinationDeg: 0.07,
    meanLongitudeJ2000Deg: 270.0,
    color: "#909098",
  },
  {
    id: "triton",
    label: "Triton",
    parentId: "neptune",
    radiusKm: 1353.4,
    semiMajorKm: 354759,
    periodDays: -5.876854,
    inclinationDeg: 156.885,
    meanLongitudeJ2000Deg: 200.0,
    color: "#c8d0d8",
  },
  {
    id: "charon",
    label: "Charon",
    parentId: "pluto",
    radiusKm: 606.0,
    semiMajorKm: 19591,
    periodDays: 6.38723,
    inclinationDeg: 0.0,
    meanLongitudeJ2000Deg: 0.0,
    color: "#9a9088",
  },
];

/** Saturn: inner C ≈ 74_658 km, outer A ≈ 136_775 km. */
export const SATURN_RINGS: RingPhysical = {
  innerKm: 74_658,
  outerKm: 136_775,
  color: "#e8d5a3",
  opacity: 0.72,
};

/** Uranus ε-ring system span (approx). */
export const URANUS_RINGS: RingPhysical = {
  innerKm: 41_800,
  outerKm: 51_150,
  color: "#b8d4e0",
  opacity: 0.4,
};

/** Scene radius in Earth radii (true ratio). */
export function radiusEarthUnits(radiusKm: number): number {
  return radiusKm / EARTH_RADIUS_KM;
}

/**
 * Observatory display radius from true size.
 * Positions use AU compression; body meshes use a power law so giants
 * fit the deep-space camera while relative ordering stays scientific.
 */
export function displayRadiusFromKm(radiusKm: number): number {
  const earthRadii = radiusKm / EARTH_RADIUS_KM;
  const r = 0.115 * Math.pow(Math.max(earthRadii, 0.05), 0.5);
  return Math.min(0.4, Math.max(0.03, r));
}

/** Sidereal day length from IAU Ẇ (days per turn; sign follows Ẇ). */
export function siderealDayFromWDot(wDotDegPerDay: number): number {
  if (Math.abs(wDotDegPerDay) < 1e-12) return Infinity;
  return 360 / wDotDegPerDay;
}

/**
 * IAU prime-meridian angle W(d) in radians.
 * W = W0 + Ẇ·d  (d = days since J2000.0).
 */
export function iauPrimeMeridianRad(
  daysSinceJ2000: number,
  rotation: IauRotation,
): number {
  const wDeg = rotation.w0Deg + rotation.wDotDegPerDay * daysSinceJ2000;
  return ((wDeg % 360) + 360) % 360 * (Math.PI / 180);
}
