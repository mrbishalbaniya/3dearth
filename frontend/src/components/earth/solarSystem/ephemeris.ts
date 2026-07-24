/**
 * Heliocentric ecliptic positions (AU) for major planets.
 * JPL Keplerian elements + rates (valid ~1800–2050).
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * Accuracy: typically <~0.01–0.1° in ecliptic longitude for this era —
 * scientific for visualization (not spacecraft-grade DE440).
 */
import { MathUtils, Quaternion, Vector3 } from "three";

const DEG = MathUtils.DEG2RAD;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

interface OrbitalElements {
  id: PlanetId;
  /** Semi-major axis AU @ J2000 + AU/century */
  a: number;
  aDot: number;
  e: number;
  eDot: number;
  /** Inclination deg */
  i: number;
  iDot: number;
  /** Mean longitude deg */
  L: number;
  LDot: number;
  /** Longitude of perihelion deg */
  longPeri: number;
  longPeriDot: number;
  /** Longitude of ascending node deg */
  node: number;
  nodeDot: number;
}

/** Classic 6-element set + rates (degrees / AU, per Julian century). */
const ELEMENTS: OrbitalElements[] = [
  {
    id: "mercury",
    a: 0.38709927,
    aDot: 0.00000037,
    e: 0.20563593,
    eDot: 0.00001906,
    i: 7.00497902,
    iDot: -0.00594749,
    L: 252.2503235,
    LDot: 149472.67411175,
    longPeri: 77.45779628,
    longPeriDot: 0.16047689,
    node: 48.33076593,
    nodeDot: -0.12534081,
  },
  {
    id: "venus",
    a: 0.72333566,
    aDot: 0.0000039,
    e: 0.00677672,
    eDot: -0.00004107,
    i: 3.39467605,
    iDot: -0.0007889,
    L: 181.9790995,
    LDot: 58517.81538729,
    longPeri: 131.60246718,
    longPeriDot: 0.00268329,
    node: 76.67984255,
    nodeDot: -0.27769418,
  },
  {
    id: "earth",
    a: 1.00000261,
    aDot: 0.00000562,
    e: 0.01671123,
    eDot: -0.00004392,
    i: -0.00001531,
    iDot: -0.01294668,
    L: 100.46457166,
    LDot: 35999.37244981,
    longPeri: 102.93768193,
    longPeriDot: 0.32327364,
    node: 0,
    nodeDot: 0,
  },
  {
    id: "mars",
    a: 1.52371034,
    aDot: 0.00001847,
    e: 0.0933941,
    eDot: 0.00007882,
    i: 1.84969142,
    iDot: -0.00813131,
    L: -4.55343205,
    LDot: 19140.30268499,
    longPeri: -23.94362959,
    longPeriDot: 0.44441088,
    node: 49.55953891,
    nodeDot: -0.29257343,
  },
  {
    id: "jupiter",
    a: 5.202887,
    aDot: -0.00011607,
    e: 0.04838624,
    eDot: -0.00013253,
    i: 1.30439695,
    iDot: -0.00183714,
    L: 34.39644051,
    LDot: 3034.74612775,
    longPeri: 14.72847983,
    longPeriDot: 0.21252668,
    node: 100.47390909,
    nodeDot: 0.20469106,
  },
  {
    id: "saturn",
    a: 9.53667594,
    aDot: -0.0012506,
    e: 0.05386179,
    eDot: -0.00050991,
    i: 2.48599187,
    iDot: 0.00193609,
    L: 49.95424423,
    LDot: 1222.49362201,
    longPeri: 92.59887831,
    longPeriDot: -0.41897216,
    node: 113.66242448,
    nodeDot: -0.28867794,
  },
  {
    id: "uranus",
    a: 19.18916464,
    aDot: -0.00196176,
    e: 0.04725744,
    eDot: -0.00004397,
    i: 0.77263783,
    iDot: -0.00242939,
    L: 313.23810451,
    LDot: 428.48202785,
    longPeri: 170.9542763,
    longPeriDot: 0.40805281,
    node: 74.01692503,
    nodeDot: 0.04240589,
  },
  {
    id: "neptune",
    a: 30.06992276,
    aDot: 0.00026291,
    e: 0.00859048,
    eDot: 0.00005105,
    i: 1.77004347,
    iDot: 0.00035372,
    L: -55.12002969,
    LDot: 218.45945325,
    longPeri: 44.96476227,
    longPeriDot: -0.32241464,
    node: 131.78422574,
    nodeDot: -0.00508664,
  },
  {
    id: "pluto",
    a: 39.48211675,
    aDot: -0.00031596,
    e: 0.2488273,
    eDot: 0.0000517,
    i: 17.14001206,
    iDot: 0.0000482,
    L: 238.92903833,
    LDot: 145.20780515,
    longPeri: 224.06891629,
    longPeriDot: -0.04062942,
    node: 110.30393684,
    nodeDot: -0.01183482,
  },
];

function wrap180(deg: number): number {
  const x = ((deg + 180) % 360 + 360) % 360 - 180;
  return x;
}

/** Solve Kepler's equation M = E - e sin E (radians). */
function keplerE(M: number, e: number): number {
  let E = M;
  for (let n = 0; n < 12; n++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

/** Heliocentric ecliptic XYZ in AU for one body. */
function heliocentricEcliptic(
  el: OrbitalElements,
  T: number,
  out: Vector3,
): Vector3 {
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const i = (el.i + el.iDot * T) * DEG;
  const L = el.L + el.LDot * T;
  const longPeri = el.longPeri + el.longPeriDot * T;
  const nodeDeg = el.node + el.nodeDot * T;
  const node = nodeDeg * DEG;
  const w = (longPeri - nodeDeg) * DEG;
  const M = wrap180(L - longPeri) * DEG;

  const E = keplerE(M, e);
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosO = Math.cos(node);
  const sinO = Math.sin(node);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const x =
    (cosW * cosO - sinW * sinO * cosI) * xOrb +
    (-sinW * cosO - cosW * sinO * cosI) * yOrb;
  const y =
    (cosW * sinO + sinW * cosO * cosI) * xOrb +
    (-sinW * sinO + cosW * cosO * cosI) * yOrb;
  const z = sinW * sinI * xOrb + cosW * sinI * yOrb;

  return out.set(x, y, z);
}

export interface PlanetState {
  id: PlanetId;
  /** Heliocentric ecliptic AU */
  heliocentric: Vector3;
  /** Earth-relative ecliptic AU */
  fromEarth: Vector3;
  /** Distance from Earth in AU */
  distanceAu: number;
}

const _heli = new Vector3();
const _earth = new Vector3();
const _rel = new Vector3();
const _sunEcl = new Vector3();
const _sunScene = new Vector3();
const _q = new Quaternion();
const _axis = new Vector3();

/**
 * Julian centuries since J2000.0 for a Date.
 */
export function centuriesSinceJ2000(date: Date): number {
  return (date.getTime() - J2000) / (36525 * 86400000);
}

/**
 * All planet states (incl. Earth) for UTC date.
 */
export function computePlanetStates(date: Date): PlanetState[] {
  const T = centuriesSinceJ2000(date);
  heliocentricEcliptic(ELEMENTS[2], T, _earth);

  return ELEMENTS.map((el) => {
    heliocentricEcliptic(el, T, _heli);
    _rel.copy(_heli).sub(_earth);
    return {
      id: el.id,
      heliocentric: _heli.clone(),
      fromEarth: _rel.clone(),
      distanceAu: _rel.length(),
    };
  });
}

/**
 * Rotate ecliptic Earth-relative vectors into scene space so
 * Earth→Sun matches `sunDirectionScene` (unit vector).
 */
export function eclipticToSceneAligningSun(
  fromEarthEcliptic: Vector3,
  sunDirectionScene: Vector3,
  earthHeliocentricEcliptic: Vector3,
  out: Vector3,
): Vector3 {
  // Earth→Sun in ecliptic = -earth_heliocentric
  _sunEcl.copy(earthHeliocentricEcliptic).negate().normalize();
  _sunScene.copy(sunDirectionScene).normalize();

  const dot = MathUtils.clamp(_sunEcl.dot(_sunScene), -1, 1);
  if (dot > 0.9995) {
    return out.copy(fromEarthEcliptic);
  }
  if (dot < -0.9995) {
    // 180° flip — pick arbitrary perpendicular axis
    _axis.set(0, 1, 0).cross(_sunEcl);
    if (_axis.lengthSq() < 1e-8) _axis.set(1, 0, 0).cross(_sunEcl);
    _axis.normalize();
    _q.setFromAxisAngle(_axis, Math.PI);
  } else {
    _axis.copy(_sunEcl).cross(_sunScene).normalize();
    _q.setFromAxisAngle(_axis, Math.acos(dot));
  }
  return out.copy(fromEarthEcliptic).applyQuaternion(_q);
}

/**
 * Map true Earth-relative AU → scene distance for the observatory camera.
 * Directions come from real ephemeris; only radial scale is compressed
 * (1 AU ≈ Sun distance) so Neptune fits deep-space view.
 */
export function auToSceneDistance(distanceAu: number): number {
  const compressed = Math.pow(Math.max(0.05, distanceAu), 0.62) * 6.4;
  return MathUtils.clamp(compressed, 0.45, 11.2);
}

/** Typical Earth–Sun scene distance near J2000 (1 AU compressed). */
export const SUN_SCENE_DISTANCE = auToSceneDistance(1);
