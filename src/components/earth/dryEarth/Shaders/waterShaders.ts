import { HYPSO_GLSL } from "../hypsometric";

/**
 * Dynamic water shell — renders only where terrain elev < sea level.
 * At globe scale uses specular ocean mask + approx bathymetry; tile DEM
 * feeds uHasDem / uDemElev when available (regional).
 */
export const waterVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const waterFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uSeaLevelM;
uniform float uDryBlend;
uniform vec3 uSunDirection;
uniform sampler2D uSpecularMap;
uniform sampler2D uDayMap;

varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vViewDir;

${HYPSO_GLSL}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

/** Approximate elevation (m) from Blue Marble + specular (ocean mask). */
float approxElevation(vec2 uv) {
  float spec = texture2D(uSpecularMap, uv).r;
  vec3 day = texture2D(uDayMap, uv).rgb;
  float ocean = smoothstep(0.08, 0.55, spec);
  float land = 1.0 - ocean;

  // Land: brightness + green/brown heuristics → rough elev
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  float green = day.g - day.r * 0.5;
  float landElev = mix(-20.0, 4500.0, clamp(lum * 0.55 + (1.0 - green) * 0.35, 0.0, 1.0));
  landElev += (noise(uv * 40.0) - 0.5) * 800.0;

  // Ocean: deeper where darker blue / higher specular mid
  float depthT = clamp(1.0 - day.b * 0.85 + (1.0 - lum) * 0.4, 0.0, 1.0);
  float ridge = noise(uv * 18.0 + vec2(3.1, 1.7));
  float trench = pow(noise(uv * 9.0 + 7.0), 3.0);
  float oceanElev = mix(-180.0, -5200.0, depthT);
  oceanElev += ridge * 1200.0;          // mid-ocean ridges
  oceanElev -= trench * 4500.0;         // trench pockets
  oceanElev = max(oceanElev, -10900.0);

  return mix(oceanElev, landElev, land);
}

void main() {
  float elev = approxElevation(vUv);
  float coastSoft = 45.0; // meters of soft shoreline blend
  float under = smoothstep(uSeaLevelM + coastSoft, uSeaLevelM - coastSoft, elev);

  if (under < 0.01) discard;

  float waterDepth = max(0.0, uSeaLevelM - elev);
  float depthNorm = clamp(waterDepth / 6000.0, 0.0, 1.0);

  vec3 shallow = vec3(0.15, 0.55, 0.62);
  vec3 mid = vec3(0.04, 0.22, 0.45);
  vec3 deep = vec3(0.01, 0.05, 0.14);
  vec3 waterCol = mix(shallow, mid, smoothstep(0.0, 0.35, depthNorm));
  waterCol = mix(waterCol, deep, smoothstep(0.35, 1.0, depthNorm));

  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uSunDirection);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  float lambert = max(dot(N, L), 0.0);

  // Micro-waves
  float wave = noise(vUv * 220.0 + vec2(uTime * 0.04, -uTime * 0.03)) * 2.0 - 1.0;
  waterCol += vec3(0.04, 0.08, 0.1) * wave * (1.0 - depthNorm);

  // Reflection / refraction hints
  vec3 reflectTint = vec3(0.55, 0.7, 0.9) * fresnel * (0.35 + lambert * 0.65);
  vec3 refractTint = hypsometricColor(elev) * 0.22 * (1.0 - depthNorm) * (1.0 - fresnel);
  waterCol = waterCol + reflectTint + refractTint;

  float alpha = uOpacity * under * mix(0.55, 0.92, depthNorm * 0.5 + fresnel * 0.35);
  // Fade water as Dry Earth drains toward abyss
  alpha *= mix(1.0, smoothstep(-11000.0, -500.0, uSeaLevelM), uDryBlend * 0.15);

  gl_FragColor = vec4(waterCol, clamp(alpha, 0.0, 0.95));
}
`;

/**
 * Global hypsometric dry-earth surface (reveals seafloor when water drops).
 */
export const drySurfaceVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vViewDir;
varying vec3 vObjectNormal;

void main() {
  vUv = uv;
  vObjectNormal = normalize(normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const drySurfaceFragmentShader = /* glsl */ `
uniform sampler2D uDayMap;
uniform sampler2D uSpecularMap;
uniform sampler2D uNormalMap;
uniform vec3 uSunDirection;
uniform float uSeaLevelM;
uniform float uDryBlend;
uniform float uColorMode; // 0 hypsometric, 1 satellite mix, 2 terrain
uniform float uExposure;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vViewDir;
varying vec3 vObjectNormal;

${HYPSO_GLSL}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float approxElevation(vec2 uv) {
  float spec = texture2D(uSpecularMap, uv).r;
  vec3 day = texture2D(uDayMap, uv).rgb;
  float ocean = smoothstep(0.08, 0.55, spec);
  float land = 1.0 - ocean;
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  float green = day.g - day.r * 0.5;
  float landElev = mix(-20.0, 4800.0, clamp(lum * 0.5 + (1.0 - green) * 0.4, 0.0, 1.0));
  landElev += (noise(uv * 48.0) - 0.5) * 900.0;
  // Ice caps
  float lat = abs(normalize(vObjectNormal).y);
  landElev += smoothstep(0.72, 0.92, lat) * 2000.0;

  float depthT = clamp(1.0 - day.b * 0.85 + (1.0 - lum) * 0.45, 0.0, 1.0);
  float ridge = noise(uv * 16.0 + vec2(2.2, 4.1));
  float trench = pow(noise(uv * 8.5 + 5.5), 3.2);
  float canyon = noise(uv * 55.0) * noise(uv * 12.0 + 3.0);
  float oceanElev = mix(-120.0, -4800.0, depthT);
  oceanElev += ridge * 1400.0;
  oceanElev -= trench * 5200.0;
  oceanElev -= canyon * 600.0;
  oceanElev = clamp(oceanElev, -10950.0, -5.0);

  return mix(oceanElev, landElev, land);
}

void main() {
  float elev = approxElevation(vUv);
  float coastSoft = 60.0;
  float dry = smoothstep(uSeaLevelM - coastSoft, uSeaLevelM + coastSoft, elev);
  // Show seafloor / land that is above current water
  float reveal = dry;

  vec3 day = texture2D(uDayMap, vUv).rgb;
  vec3 hypo = hypsometricColor(elev);
  vec3 terrainTint = mix(hypo, day, 0.25);

  vec3 albedo = hypo;
  if (uColorMode > 0.5 && uColorMode < 1.5) {
    albedo = mix(hypo, day, 0.55);
  } else if (uColorMode > 1.5) {
    albedo = terrainTint;
  }

  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(vViewDir);
  float lambert = max(dot(N, L), 0.0);
  float ambient = 0.08;
  vec3 lit = albedo * (ambient + lambert * 0.95) * uExposure;

  // Shoreline foam / yellow band near sea level
  float shore = 1.0 - smoothstep(0.0, 80.0, abs(elev - uSeaLevelM));
  lit = mix(lit, vec3(0.95, 0.9, 0.45), shore * 0.35 * reveal);

  // Subtle ridge highlight on exposed seafloor
  float floorMask = step(elev, -50.0) * reveal;
  lit += vec3(0.05, 0.12, 0.18) * floorMask * lambert * 0.25;

  float alpha = clamp(uDryBlend * mix(0.0, 0.92, reveal), 0.0, 0.95);
  // Always tint flooded land slightly when water is high
  float flooded = (1.0 - reveal) * uDryBlend * 0.15;
  alpha = max(alpha, flooded);

  if (alpha < 0.02) discard;
  gl_FragColor = vec4(lit, alpha);
}
`;
