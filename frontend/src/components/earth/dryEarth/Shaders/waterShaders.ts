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
 * Global hypsometric dry-earth surface with real geometric depth below MSL.
 * Oceans displace inward; land outward — base Earth discards oceans so bowls show.
 */
export const drySurfaceVertexShader = /* glsl */ `
uniform sampler2D uDayMap;
uniform sampler2D uSpecularMap;
uniform float uExaggeration;
uniform float uDepthExaggeration;
uniform float uSeaLevelM;
uniform float uDryBlend;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vViewDir;
varying vec3 vObjectNormal;
varying float vElev;

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

float approxElevation(vec2 uv, vec3 objN) {
  float spec = texture2D(uSpecularMap, uv).r;
  vec3 day = texture2D(uDayMap, uv).rgb;
  float ocean = smoothstep(0.08, 0.55, spec);
  float land = 1.0 - ocean;
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  float green = day.g - day.r * 0.5;
  // Snow / ice peaks (Himalaya, Andes, Alps) — bright equal RGB
  float snow = smoothstep(0.62, 0.88, min(min(day.r, day.g), day.b));
  // Brown / grey highlands & plateaus (Tibet, Rockies foothills)
  float highland = smoothstep(0.02, 0.28, day.r - day.g) *
    smoothstep(0.25, 0.55, lum) * (1.0 - snow);
  // Low green vegetation plains
  float plains = clamp(green * 1.4 * (1.0 - snow) * (1.0 - highland), 0.0, 1.0);

  float landElev = mix(80.0, 900.0, clamp(1.0 - plains, 0.0, 1.0));
  landElev = mix(landElev, mix(2800.0, 5200.0, clamp(lum, 0.0, 1.0)), highland);
  landElev = mix(landElev, mix(5000.0, 8800.0, clamp(lum, 0.0, 1.0)), snow);
  landElev += (noise(uv * 48.0) - 0.5) * 600.0;
  // Extra roughness from day contrast → foothill texture
  float contrast = abs(day.r - day.b) + abs(day.g - day.r);
  landElev += contrast * 900.0 * (1.0 - plains);
  float lat = abs(normalize(objN).y);
  landElev += smoothstep(0.72, 0.92, lat) * 2200.0;
  landElev = clamp(landElev, -20.0, 8850.0);

  // Depth below MSL (0): deep blue / dark water → abyssal / trench
  float depthT = clamp((1.0 - lum) * 0.5 + (1.0 - day.b) * 0.4 + spec * 0.55, 0.0, 1.0);
  float ridge = noise(uv * 18.0 + vec2(2.2, 4.1));
  float trench = pow(noise(uv * 7.5 + 5.5), 2.6);
  float canyon = noise(uv * 55.0) * noise(uv * 12.0 + 3.0);
  float oceanElev = mix(-80.0, -5500.0, depthT);
  oceanElev += ridge * 1100.0;
  oceanElev -= trench * 5500.0;
  oceanElev -= canyon * 700.0;
  oceanElev = clamp(oceanElev, -10950.0, -10.0);

  return mix(oceanElev, landElev, land);
}

void main() {
  vUv = uv;
  vObjectNormal = normalize(normal);
  float elev = approxElevation(uv, vObjectNormal);
  vElev = elev;

  // Meters → scene units; oceans dig inward, mountains rise (visible vs MSL=0)
  float exag = elev < 0.0 ? uDepthExaggeration : uExaggeration;
  float displace = (elev * exag) / 6371000.0 * uDryBlend;
  vec3 n0 = normalize(normal);
  vec3 displaced = position + n0 * displace;

  // Finite-difference normals from elevation — real slope lighting on mountains/hills
  float eps = 0.0035;
  vec2 uvE = uv + vec2(eps, 0.0);
  vec2 uvN = uv + vec2(0.0, eps);
  float elevE = approxElevation(uvE, vObjectNormal);
  float elevN = approxElevation(uvN, vObjectNormal);
  float exagE = elevE < 0.0 ? uDepthExaggeration : uExaggeration;
  float exagN = elevN < 0.0 ? uDepthExaggeration : uExaggeration;
  float dE = (elevE * exagE) / 6371000.0 * uDryBlend;
  float dN = (elevN * exagN) / 6371000.0 * uDryBlend;

  // Local tangent frame on the sphere
  vec3 up = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, n0));
  vec3 bitangent = normalize(cross(n0, tangent));
  float stepArc = eps * 3.14159265; // uv eps → rough radians on unit sphere
  vec3 pE = n0 + tangent * stepArc;
  pE = normalize(pE) * (1.0 + dE);
  vec3 pN = n0 + bitangent * stepArc;
  pN = normalize(pN) * (1.0 + dN);
  vec3 p0 = n0 * (1.0 + displace);
  vec3 slopeNormal = normalize(cross(pE - p0, pN - p0));
  // Keep outward-facing
  if (dot(slopeNormal, n0) < 0.0) slopeNormal = -slopeNormal;

  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * slopeNormal);
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
varying float vElev;

${HYPSO_GLSL}

void main() {
  float elev = vElev;
  float coastSoft = 40.0;
  // Reveal everything above the drained water line
  float reveal = smoothstep(uSeaLevelM - coastSoft, uSeaLevelM + coastSoft, elev);

  vec3 day = texture2D(uDayMap, vUv).rgb;
  vec3 hypo = hypsometricColor(elev);

  vec3 albedo = hypo;
  if (uColorMode > 0.5 && uColorMode < 1.5) {
    albedo = mix(hypo, day, 0.4);
  } else if (uColorMode > 1.5) {
    albedo = mix(hypo, day, 0.2);
  }

  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDirection);
  float lambert = max(dot(N, L), 0.0);
  // Directional sun + soft fill — terrain relief must read on land/hills
  float halfL = pow(lambert, 0.85);
  vec3 lit = albedo * (0.32 + halfL * 0.85) * uExposure;
  // Specular glint on steep sun-facing slopes (mountains)
  vec3 V = normalize(vViewDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0) * lambert;
  lit += vec3(1.0, 0.97, 0.9) * spec * 0.18;

  // Yellow band at real MSL coastline (0 m)
  float mslShore = 1.0 - smoothstep(0.0, 120.0, abs(elev));
  lit = mix(lit, vec3(0.95, 0.9, 0.4), mslShore * 0.45 * reveal);

  // Opaque globe shell — never alpha-blend through to the far side
  if (uDryBlend < 0.02) discard;
  lit = mix(lit * 0.55, lit, reveal);
  gl_FragColor = vec4(lit, 1.0);
}
`;
