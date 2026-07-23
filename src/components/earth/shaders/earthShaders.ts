/**
 * Cinematic Earth surface — PBR maps, ocean Fresnel/waves, polar ice,
 * night lights, AO from normals, coast blending.
 */
export const earthVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDirection;
varying vec3 vObjectNormal;

void main() {
  vUv = uv;
  vObjectNormal = normalize(normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDirection = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const earthFragmentShader = /* glsl */ `
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uNormalMap;
uniform sampler2D uSpecularMap;
uniform sampler2D uRoughnessMap;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uDayNightBlend;
uniform float uNightLights;
uniform float uTime;
uniform float uSeason;
uniform vec3 uAtmosphereColor;
uniform vec3 uSunsetColor;
uniform float uNormalScale;
uniform float uExposure;
uniform float uWetness;
uniform float uSnowCover;
uniform float uWaveStorm;
uniform vec3 uSeasonTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDirection;
varying vec3 vObjectNormal;

vec3 perturbNormal(vec3 N, vec3 mapN, float scale) {
  mapN = mapN * 2.0 - 1.0;
  mapN.xy *= scale;
  vec3 q0 = dFdx(vWorldPosition);
  vec3 q1 = dFdy(vWorldPosition);
  vec2 st0 = dFdx(vUv);
  vec2 st1 = dFdy(vUv);
  vec3 T = normalize(q0 * st1.t - q1 * st0.t);
  vec3 B = -normalize(cross(N, T));
  mat3 TBN = mat3(T, B, N);
  return normalize(TBN * mapN);
}

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

void main() {
  vec3 dayColor = texture2D(uDayMap, vUv).rgb;
  vec3 nightColor = texture2D(uNightMap, vUv).rgb;
  vec3 normalSample = texture2D(uNormalMap, vUv).xyz;
  float specularMask = texture2D(uSpecularMap, vUv).r;
  float roughnessSample = texture2D(uRoughnessMap, vUv).r;

  // Approximate AO from normal map relief + roughness
  float ao = mix(0.72, 1.0, normalSample.z);
  ao *= mix(0.85, 1.0, 1.0 - roughnessSample * 0.35);

  float ocean = smoothstep(0.08, 0.55, specularMask);
  float land = 1.0 - ocean;

  // Animated ocean micro-waves — storm amplifies
  float stormAmp = 1.0 + uWaveStorm * 2.2;
  float wave = noise(vUv * 180.0 + vec2(uTime * 0.035 * stormAmp, uTime * 0.022)) * 2.0 - 1.0;
  float wave2 = noise(vUv * 90.0 - vec2(uTime * 0.02 * stormAmp, -uTime * 0.018)) * 2.0 - 1.0;
  vec3 wavePerturb = vec3(wave * 0.045 * stormAmp, wave2 * 0.045 * stormAmp, 0.0) * ocean;

  vec3 N = perturbNormal(normalize(vNormal), normalSample + wavePerturb, uNormalScale);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(vViewDirection);
  vec3 H = normalize(L + V);

  float NdotL = dot(N, L);
  float lambert = max(NdotL, 0.0);
  float dayFactor = smoothstep(-0.14, 0.32, NdotL);

  // Soft terminator + sunrise/sunset warming
  float terminator = 1.0 - smoothstep(-0.08, 0.4, abs(NdotL));
  vec3 sunsetWarm = mix(dayColor, dayColor * uSunsetColor * 1.35, terminator * 0.6);

  // Polar ice (Greenland / Antarctica) + seasonal snow boost
  float lat = abs(normalize(vObjectNormal).y);
  float polarMask = smoothstep(0.68, 0.92, lat);
  float iceFromSpec = smoothstep(0.35, 0.85, specularMask) * polarMask;
  float iceFromColor = smoothstep(0.55, 0.85, (dayColor.r + dayColor.g + dayColor.b) / 3.0) * polarMask;
  float ice = max(iceFromSpec, iceFromColor * 0.85);
  ice *= mix(0.85, 1.15, uSeason);
  // Seasonal / weather snow accumulation on land (mountains & high lat)
  float landSnow = land * uSnowCover * smoothstep(0.25, 0.85, lat + roughnessSample * 0.3);
  ice = max(ice, landSnow);
  vec3 iceColor = vec3(0.88, 0.94, 1.0);
  sunsetWarm = mix(sunsetWarm, max(sunsetWarm, iceColor), ice * 0.85);

  // Seasonal forest / land tint
  sunsetWarm *= mix(vec3(1.0), uSeasonTint, land * 0.55);

  // Ocean: deep → shallow Fresnel, sun glitter
  float fresnelOcean = pow(1.0 - max(dot(N, V), 0.0), 4.2);
  vec3 deepWater = vec3(0.01, 0.05, 0.14);
  vec3 shallowWater = vec3(0.04, 0.28, 0.42);
  vec3 oceanBase = mix(deepWater, shallowWater, fresnelOcean * 0.55 + 0.15);
  // Storm darkens / greys oceans
  oceanBase = mix(oceanBase, oceanBase * vec3(0.55, 0.65, 0.7), uWaveStorm * 0.45);
  oceanBase = mix(oceanBase, sunsetWarm * vec3(0.55, 0.75, 0.95), 0.35);
  vec3 surfaceColor = mix(sunsetWarm, oceanBase, ocean * 0.92);

  // Coast blending + foam near coast in storms
  float coast = smoothstep(0.15, 0.45, specularMask) * (1.0 - smoothstep(0.45, 0.75, specularMask));
  surfaceColor = mix(surfaceColor, mix(shallowWater, sunsetWarm, 0.45), coast * 0.35);
  surfaceColor = mix(surfaceColor, vec3(0.85, 0.92, 0.98), coast * uWaveStorm * 0.4);

  // Wet ground — darker + higher specular on land
  surfaceColor = mix(surfaceColor, surfaceColor * 0.72, land * uWetness * 0.55);

  // Roughness / specular (GGX-ish Blinn)
  float roughness = mix(0.42, 0.045, ocean);
  roughness = mix(roughness, 0.12, ice);
  roughness *= mix(0.85, 1.15, roughnessSample);
  roughness = mix(roughness, roughness * 0.45, land * uWetness);
  float shininess = mix(12.0, 220.0, 1.0 - clamp(roughness, 0.02, 1.0));
  float spec = pow(max(dot(N, H), 0.0), shininess) * lambert;
  float fresnelSpec = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 specular =
    uSunColor *
    spec *
    mix(0.08 * land + land * uWetness * 0.55, 1.55 + fresnelSpec * 2.2 * (1.0 + uWaveStorm), ocean) *
    mix(1.0, 1.8, ice);

  // Night city lights — soft metropolitan glow, fades at terminator
  float nightFactor = (1.0 - dayFactor) * uDayNightBlend;
  float cityMask = max(max(nightColor.r, nightColor.g), nightColor.b);
  vec3 cityLights =
    nightColor * nightFactor * uNightLights * (1.6 + cityMask * 3.2);
  // Soft bloom-like halo around dense cities
  cityLights += nightColor * nightFactor * uNightLights * cityMask * 0.85;

  vec3 ambient = surfaceColor * (0.035 + 0.02 * ao) + vec3(0.008, 0.012, 0.028);
  vec3 lit =
    surfaceColor * ao * (0.1 + lambert * 0.95) * mix(vec3(1.0), uSunColor, 0.25) +
    specular;

  vec3 color = mix(lit, ambient + cityLights, nightFactor);

  // Subtle atmosphere Fresnel rim on the globe
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  color += uAtmosphereColor * fresnel * 0.28 * (0.35 + dayFactor * 0.65);

  color *= uExposure;
  // Filmic curve (ACES-ish) — final ACES also in post
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 1.9));

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Atmosphere — Rayleigh + Mie scattering approximation with altitude fade.
 */
export const atmosphereVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const atmosphereFragmentShader = /* glsl */ `
uniform vec3 uSunDirection;
uniform vec3 uAtmosphereColor;
uniform vec3 uSunsetColor;
uniform float uIntensity;
uniform float uThickness;
uniform float uCameraAltitude; // scene units from surface (~0 in space far)

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uSunDirection);

  float NdV = abs(dot(N, V));
  float fresnel = pow(1.0 - NdV, mix(2.4, 4.2, uThickness));

  float cosTheta = dot(V, L);
  // Rayleigh phase ~ 1 + cos²θ
  float rayleigh = 0.75 * (1.0 + cosTheta * cosTheta);
  // Mie (Henyey–Greenstein-ish)
  float g = 0.76;
  float g2 = g * g;
  float mie = (1.0 - g2) / max(0.001, pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));

  float sunFacing = max(dot(N, L), 0.0);
  float nightSide = smoothstep(0.35, -0.15, dot(N, L));

  vec3 rayleighColor = uAtmosphereColor * rayleigh * (0.45 + sunFacing * 0.9);
  vec3 mieColor = uSunsetColor * mie * 0.35 * sunFacing;
  float limb = pow(1.0 - abs(dot(N, L)), 2.2);
  vec3 sunsetLimb = mix(uAtmosphereColor, uSunsetColor, limb * 0.85);

  vec3 color = mix(rayleighColor + mieColor, sunsetLimb, limb * 0.55);
  color = mix(color, uAtmosphereColor * 0.25, nightSide * 0.7);

  // Atmosphere shadow on night limb
  float shadow = mix(1.0, 0.35, nightSide);

  float alpha = fresnel * uIntensity * shadow * (0.55 + sunFacing * 0.55);
  // Fade as camera approaches surface
  float nearFade = smoothstep(0.02, 0.55, uCameraAltitude);
  alpha *= nearFade;

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

export const atmosphereHaloFragmentShader = /* glsl */ `
uniform vec3 uAtmosphereColor;
uniform vec3 uSunsetColor;
uniform vec3 uSunDirection;
uniform float uIntensity;
uniform float uCameraAltitude;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uSunDirection);
  float fresnel = pow(1.0 - abs(dot(N, V)), 1.45);
  float limb = pow(1.0 - abs(dot(N, L)), 2.0);
  vec3 color = mix(uAtmosphereColor, uSunsetColor, limb * 0.5);
  float alpha = fresnel * uIntensity * 0.5 * smoothstep(0.04, 0.6, uCameraAltitude);
  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Volumetric-looking multi-layer clouds — soft alpha, wind, lighting.
 */
export const cloudsVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const cloudsFragmentShader = /* glsl */ `
uniform sampler2D uCloudMap;
uniform vec3 uSunDirection;
uniform float uOpacity;
uniform float uTime;
uniform float uWind;
uniform float uDensity;
uniform float uLayer; // 0, 1, 2 for multi-layer offsets

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv + vec2(uTime * uWind * (0.008 + uLayer * 0.003), uTime * uWind * 0.002);
  // Slight parallax between layers
  uv += vec2(uLayer * 0.017, uLayer * -0.011);

  vec4 cloud = texture2D(uCloudMap, uv);
  float density = pow(cloud.r, mix(0.85, 1.35, uDensity));
  float alpha = density * uOpacity * mix(1.0, 0.55, uLayer * 0.35);

  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDirection);
  float lambert = max(dot(N, L), 0.0);
  float night = smoothstep(0.2, -0.12, dot(N, L));

  // Soft self-shadow / underside darkening
  float thickness = smoothstep(0.2, 0.8, density);
  vec3 lit = vec3(1.0, 0.99, 0.97) * (0.45 + lambert * 0.55);
  lit *= mix(0.75, 1.0, 1.0 - thickness * 0.35 * (1.0 - lambert));
  vec3 nightCloud = vec3(0.12, 0.14, 0.22);
  vec3 color = mix(lit, nightCloud, night * 0.9);

  // Silver lining on sunward cloud edges
  float rim = pow(1.0 - abs(dot(N, normalize(cameraPosition - vWorldPosition))), 2.5);
  color += vec3(1.0, 0.95, 0.85) * rim * lambert * density * 0.35;

  alpha *= smoothstep(0.04, 0.5, density);
  if (alpha < 0.015) discard;
  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Moon surface — lit by the same sun, soft limb darkening.
 */
export const moonVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const moonFragmentShader = /* glsl */ `
uniform sampler2D uMoonMap;
uniform vec3 uSunDirection;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 albedo = texture2D(uMoonMap, vUv).rgb;
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDirection);
  float lambert = max(dot(N, L), 0.0);
  float ambient = 0.04;
  // Soft terminator
  float lit = smoothstep(-0.05, 0.35, lambert);
  vec3 color = albedo * (ambient + lit * 0.95) * uIntensity;
  // Earthshine on night side
  color += albedo * (1.0 - lit) * 0.035;
  gl_FragColor = vec4(color, 1.0);
}
`;
