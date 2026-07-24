/**
 * Solar System body catalog — derived from NASA/IAU physical constants.
 * Planet radii = true Earth radii (Earth scene unit = 1).
 * Heliocentric distances use display compression (see ephemeris.auToSceneDistance).
 * Moon orbits locally compressed so systems stay readable (periods/phases real).
 */
import type { PlanetId } from "./ephemeris";
import {
  BODY_PHYSICAL,
  MOON_PHYSICAL,
  SATURN_RINGS,
  SUN_RADIUS_KM,
  URANUS_RINGS,
  AU_KM,
  EARTH_RADIUS_KM,
  displayRadiusFromKm,
  radiusEarthUnits,
  siderealDayFromWDot,
  type IauRotation,
  type MoonPhysical,
  type RingPhysical,
} from "./physical";

/** threex.planets CDN — CORS-friendly planet maps. */
const TEX =
  "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images";

export type SolarBodyId = PlanetId | "sun";

export interface MoonDef {
  id: string;
  label: string;
  /** Scene orbit radius (local display units) */
  orbitScene: number;
  /** Scene moon radius */
  radiusScene: number;
  color: string;
  periodDays: number;
  inclinationDeg: number;
  meanLongitudeJ2000Deg: number;
  /** True semi-major axis km (for science / UI) */
  semiMajorKm: number;
  radiusKm: number;
  textureUrl?: string;
}

export interface RingDef {
  innerScale: number;
  outerScale: number;
  color: string;
  opacity: number;
  textureUrl?: string;
  /** Ring plane tilt relative to planet equator (rad) */
  tiltRad: number;
}

export interface AtmosphereDef {
  color: string;
  sunsetColor: string;
  intensity: number;
  thickness: number;
  radiusScale: number;
}

export interface CloudsDef {
  opacity: number;
  layerCount: number;
  wind: number;
  density: number;
  tint: string;
  mapUrl?: string;
}

export interface PlanetDef {
  id: Exclude<PlanetId, "earth">;
  label: string;
  color: string;
  /** Mesh radius (display units; from true km via power law) */
  radius: number;
  /** True mean radius (km) */
  radiusKm: number;
  /** True mean radius in Earth radii */
  radiusEarth: number;
  specular: number;
  nightFill: number;
  siderealDayDays: number;
  obliquityDeg: number;
  rotation: IauRotation;
  textureUrl?: string;
  bumpUrl?: string;
  nightUrl?: string;
  atmosphere?: AtmosphereDef;
  clouds?: CloudsDef;
  rings?: RingDef;
  moons: MoonDef[];
}

/** Target local radius of outermost moon orbit (scene units). */
const MOON_SYSTEM_SPAN = 1.55;

function ringFromPhysical(
  planetRadiusKm: number,
  ring: RingPhysical,
  tiltRad: number,
  textureUrl?: string,
): RingDef {
  return {
    innerScale: ring.innerKm / planetRadiusKm,
    outerScale: ring.outerKm / planetRadiusKm,
    color: ring.color,
    opacity: ring.opacity,
    textureUrl: textureUrl ?? ring.textureUrl,
    tiltRad,
  };
}

function moonsForParent(parentId: string, parentRadiusKm: number, parentRadiusScene: number): MoonDef[] {
  const list = MOON_PHYSICAL.filter((m) => m.parentId === parentId);
  if (list.length === 0) return [];

  const maxA = Math.max(...list.map((m) => m.semiMajorKm));
  const trueOuterScene = (maxA / parentRadiusKm) * parentRadiusScene;
  const compress = Math.min(1, MOON_SYSTEM_SPAN / Math.max(trueOuterScene, 1e-6));

  return list.map((m: MoonPhysical) => ({
    id: m.id,
    label: m.label,
    orbitScene: (m.semiMajorKm / parentRadiusKm) * parentRadiusScene * compress,
    // Tiny moons get a visibility floor so they remain visible at overview
    radiusScene: Math.max(
      0.012,
      radiusEarthUnits(m.radiusKm) * Math.min(1, compress * 4),
    ),
    color: m.color,
    periodDays: m.periodDays,
    inclinationDeg: m.inclinationDeg,
    meanLongitudeJ2000Deg: m.meanLongitudeJ2000Deg,
    semiMajorKm: m.semiMajorKm,
    radiusKm: m.radiusKm,
    textureUrl: m.textureUrl,
  }));
}

function planetFromPhysical(
  id: Exclude<PlanetId, "earth">,
  extras: Partial<PlanetDef> & Pick<PlanetDef, "specular" | "nightFill">,
): PlanetDef {
  const p = BODY_PHYSICAL[id];
  const radiusEarth = radiusEarthUnits(p.radiusKm);
  const radius = displayRadiusFromKm(p.radiusKm);
  return {
    id,
    label: p.label,
    color: p.color,
    radius,
    radiusKm: p.radiusKm,
    radiusEarth,
    siderealDayDays: siderealDayFromWDot(p.rotation.wDotDegPerDay),
    obliquityDeg: p.obliquityDeg,
    rotation: p.rotation,
    moons: moonsForParent(id, p.radiusKm, radius),
    ...extras,
  };
}

/**
 * Sun: true angular size at 1 AU, with modest visibility boost.
 * True angular radius ≈ 0.266° → at sceneDistance d, R = d·tan(θ).
 */
export const SUN_ANGULAR_RADIUS_RAD = Math.atan(SUN_RADIUS_KM / AU_KM);
/** Visibility multiplier so the photosphere reads at deep-space overview. */
export const SUN_ANGULAR_VIS_MULT = 6.5;

export function sunRadiusAtSceneDistance(sceneDistance: number): number {
  return sceneDistance * Math.tan(SUN_ANGULAR_RADIUS_RAD) * SUN_ANGULAR_VIS_MULT;
}

export const SUN_DEF = {
  id: "sun" as const,
  label: "Sun",
  radiusKm: SUN_RADIUS_KM,
  textureUrl: `${TEX}/sunmap.jpg`,
  color: BODY_PHYSICAL.sun.color,
  glowColor: "#ffb347",
  coronaColor: "#ff9944",
  coronaInnerScale: 1.55,
  coronaOuterScale: 2.15,
  intensity: 1.35,
  rotation: BODY_PHYSICAL.sun.rotation,
  siderealDayDays: siderealDayFromWDot(BODY_PHYSICAL.sun.rotation.wDotDegPerDay),
  obliquityDeg: BODY_PHYSICAL.sun.obliquityDeg,
};

export const PLANET_DEFS: PlanetDef[] = [
  planetFromPhysical("mercury", {
    specular: 0.08,
    nightFill: 0.04,
    textureUrl: `${TEX}/mercury.jpg`,
    bumpUrl: `${TEX}/mercurybump.jpg`,
  }),
  planetFromPhysical("venus", {
    specular: 0.15,
    nightFill: 0.06,
    textureUrl: `${TEX}/venusmap.jpg`,
    bumpUrl: `${TEX}/venusbump.jpg`,
    atmosphere: {
      color: "#ffcc88",
      sunsetColor: "#ff8844",
      intensity: 1.1,
      thickness: 0.7,
      radiusScale: 1.08,
    },
    clouds: {
      opacity: 0.72,
      layerCount: 2,
      wind: 0.6,
      density: 0.7,
      tint: "#ffe0b8",
      mapUrl: `${TEX}/venuscloudmap.jpg`,
    },
  }),
  planetFromPhysical("mars", {
    specular: 0.06,
    nightFill: 0.05,
    textureUrl: `${TEX}/marsmap1k.jpg`,
    bumpUrl: `${TEX}/marsbump1k.jpg`,
    atmosphere: {
      color: "#e8a080",
      sunsetColor: "#ff6a3a",
      intensity: 0.45,
      thickness: 0.35,
      radiusScale: 1.045,
    },
  }),
  planetFromPhysical("jupiter", {
    specular: 0.2,
    nightFill: 0.05,
    textureUrl: `${TEX}/jupitermap.jpg`,
    atmosphere: {
      color: "#c9a882",
      sunsetColor: "#e8b070",
      intensity: 0.85,
      thickness: 0.55,
      radiusScale: 1.06,
    },
    clouds: {
      opacity: 0.28,
      layerCount: 2,
      wind: 1.4,
      density: 0.55,
      tint: "#e8c9a0",
    },
  }),
  planetFromPhysical("saturn", {
    specular: 0.18,
    nightFill: 0.05,
    textureUrl: `${TEX}/saturnmap.jpg`,
    atmosphere: {
      color: "#e0d0a8",
      sunsetColor: "#f0c080",
      intensity: 0.7,
      thickness: 0.5,
      radiusScale: 1.055,
    },
    rings: ringFromPhysical(
      BODY_PHYSICAL.saturn.radiusKm,
      { ...SATURN_RINGS, textureUrl: `${TEX}/saturnringcolor.jpg` },
      Math.PI / 2,
    ),
  }),
  planetFromPhysical("uranus", {
    specular: 0.35,
    nightFill: 0.06,
    textureUrl: `${TEX}/uranusmap.jpg`,
    atmosphere: {
      color: "#9ad4e8",
      sunsetColor: "#c8e8f0",
      intensity: 0.75,
      thickness: 0.5,
      radiusScale: 1.06,
    },
    rings: ringFromPhysical(
      BODY_PHYSICAL.uranus.radiusKm,
      URANUS_RINGS,
      Math.PI / 2,
    ),
  }),
  planetFromPhysical("neptune", {
    specular: 0.4,
    nightFill: 0.06,
    textureUrl: `${TEX}/neptunemap.jpg`,
    atmosphere: {
      color: "#6a8cf0",
      sunsetColor: "#88aaf8",
      intensity: 0.8,
      thickness: 0.55,
      radiusScale: 1.06,
    },
  }),
  planetFromPhysical("pluto", {
    specular: 0.12,
    nightFill: 0.04,
    textureUrl: `${TEX}/plutomap1k.jpg`,
    bumpUrl: `${TEX}/plutobump1k.jpg`,
  }),
];

/** Main-belt: real AU range (2.1–3.3), statistical bodies. */
export const ASTEROID_BELT = {
  innerAu: 2.1,
  outerAu: 3.3,
  count: 900,
  color: "#8a8078",
  minSize: 0.004,
  maxSize: 0.018,
};

/** Classical Kuiper belt AU span. */
export const KUIPER_HINT = {
  count: 120,
  color: "#6a7888",
  minAu: 30,
  maxAu: 48,
};

export { EARTH_RADIUS_KM, AU_KM };
