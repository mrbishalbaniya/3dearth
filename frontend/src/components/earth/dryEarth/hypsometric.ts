import { HYPSO_STOPS } from "./constants";

/** Smooth RGB blend along hypsometric stops. */
export function elevToHypsometricRgb(
  elevM: number,
): [number, number, number] {
  const stops = HYPSO_STOPS;
  if (elevM >= stops[0].elev) return [...stops[0].rgb];
  if (elevM <= stops[stops.length - 1].elev) {
    return [...stops[stops.length - 1].rgb];
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (elevM <= a.elev && elevM >= b.elev) {
      const t = (a.elev - elevM) / (a.elev - b.elev);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t,
      ];
    }
  }
  return [0.5, 0.5, 0.5];
}

/** CSS hex for legend / UI. */
export function elevToHypsometricHex(elevM: number): string {
  const [r, g, b] = elevToHypsometricRgb(elevM);
  const to = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Classify terrain from elevation relative to sea level. */
export function classifyTerrain(
  elevM: number,
  seaLevelM: number,
): string {
  const rel = elevM - seaLevelM;
  if (rel < -6000) return "Hadzal / Trench";
  if (rel < -3000) return "Abyssal Plain";
  if (rel < -1000) return "Continental Rise / Slope";
  if (rel < -200) return "Continental Shelf";
  if (rel < 0) return "Shallow / Intertidal";
  if (rel < 200) return "Coastal Lowland";
  if (rel < 800) return "Lowland / Plains";
  if (rel < 2000) return "Hills / Highlands";
  if (rel < 4000) return "Mountains";
  if (rel < 6000) return "High Mountains";
  return "Extreme Peak / Ice Cap";
}

/** GLSL snippet — hypsometric color from elevation meters. */
export const HYPSO_GLSL = /* glsl */ `
vec3 hypsometricColor(float elev) {
  // Highest mountains → white
  if (elev >= 6000.0) return mix(vec3(0.78, 0.80, 0.84), vec3(1.0), smoothstep(6000.0, 9000.0, elev));
  if (elev >= 3000.0) return mix(vec3(0.55, 0.42, 0.32), vec3(0.78, 0.80, 0.84), smoothstep(3000.0, 6000.0, elev));
  if (elev >= 1500.0) return mix(vec3(0.42, 0.55, 0.28), vec3(0.55, 0.42, 0.32), smoothstep(1500.0, 3000.0, elev));
  if (elev >= 400.0)  return mix(vec3(0.55, 0.72, 0.38), vec3(0.42, 0.55, 0.28), smoothstep(400.0, 1500.0, elev));
  if (elev >= 50.0)   return mix(vec3(0.72, 0.82, 0.48), vec3(0.55, 0.72, 0.38), smoothstep(50.0, 400.0, elev));
  if (elev >= 0.0)    return mix(vec3(0.92, 0.88, 0.45), vec3(0.72, 0.82, 0.48), smoothstep(0.0, 50.0, elev));
  if (elev >= -500.0) return mix(vec3(0.55, 0.88, 0.90), vec3(0.92, 0.88, 0.45), smoothstep(-500.0, 0.0, elev));
  if (elev >= -1000.0) return mix(vec3(0.25, 0.72, 0.85), vec3(0.55, 0.88, 0.90), smoothstep(-1000.0, -500.0, elev));
  if (elev >= -3000.0) return mix(vec3(0.12, 0.35, 0.72), vec3(0.25, 0.72, 0.85), smoothstep(-3000.0, -1000.0, elev));
  if (elev >= -6000.0) return mix(vec3(0.05, 0.12, 0.38), vec3(0.12, 0.35, 0.72), smoothstep(-6000.0, -3000.0, elev));
  return mix(vec3(0.02, 0.03, 0.08), vec3(0.05, 0.12, 0.38), smoothstep(-11000.0, -6000.0, elev));
}
`;

/** Snap slider value to nearest stop for discrete UI, keep continuous internally. */
export function nearestSeaLevelStop(m: number): number {
  const stops = [
    9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 0, -500, -1000,
    -2000, -3000, -4000, -5000, -6000, -7000, -8000, -9000, -11000,
  ];
  let best = stops[0];
  let bestD = Math.abs(m - best);
  for (const s of stops) {
    const d = Math.abs(m - s);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

export function formatSeaLevel(m: number): string {
  if (Math.abs(m) < 0.5) return "0 m (MSL)";
  const sign = m > 0 ? "+" : "";
  return `${sign}${Math.round(m).toLocaleString()} m`;
}

export function formatElevDepth(elevM: number, seaLevelM: number): {
  altitudeLabel: string;
  depthLabel: string;
} {
  // Depth / height always reported relative to mean sea level (0 m MSL)
  const vsMsl = elevM;
  const depthBelowMsl = vsMsl < 0 ? -vsMsl : 0;
  const heightAboveMsl = vsMsl >= 0 ? vsMsl : 0;

  // Also note depth under the current water surface when flooded
  const underWater = Math.max(0, seaLevelM - elevM);

  return {
    altitudeLabel:
      heightAboveMsl > 0
        ? `+${Math.round(heightAboveMsl).toLocaleString()} m MSL`
        : vsMsl >= -0.5
          ? "0 m MSL"
          : "—",
    depthLabel:
      depthBelowMsl > 0
        ? `${Math.round(depthBelowMsl).toLocaleString()} m below MSL${
            underWater > 0 && seaLevelM > elevM
              ? ` · ${Math.round(underWater).toLocaleString()} m water`
              : ""
          }`
        : underWater > 0
          ? `${Math.round(underWater).toLocaleString()} m water`
          : "—",
  };
}
