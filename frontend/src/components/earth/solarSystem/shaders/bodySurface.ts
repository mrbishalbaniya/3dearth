/**
 * Cinematic planetary surface — day map, optional bump, sun lighting,
 * soft terminator + night-side fill (Earth-style, catalog-driven).
 */
export const bodySurfaceVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDirection;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDirection = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const bodySurfaceFragmentShader = /* glsl */ `
uniform sampler2D uDayMap;
uniform sampler2D uBumpMap;
uniform sampler2D uNightMap;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFallbackColor;
uniform float uHasDayMap;
uniform float uHasBumpMap;
uniform float uHasNightMap;
uniform float uBumpScale;
uniform float uExposure;
uniform float uSpecular;
uniform float uNightFill;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDirection;

vec3 perturbNormal(vec3 N, float bump) {
  // Lightweight bump from grayscale height sample
  float eps = 0.002;
  float h0 = bump;
  float hx = texture2D(uBumpMap, vUv + vec2(eps, 0.0)).r;
  float hy = texture2D(uBumpMap, vUv + vec2(0.0, eps)).r;
  vec3 T = normalize(cross(N, vec3(0.0, 1.0, 0.0)));
  if (length(T) < 0.01) T = normalize(cross(N, vec3(1.0, 0.0, 0.0)));
  vec3 B = normalize(cross(N, T));
  vec3 n = normalize(N + T * (hx - h0) * uBumpScale * 8.0 + B * (hy - h0) * uBumpScale * 8.0);
  return n;
}

void main() {
  vec3 albedo = uFallbackColor;
  if (uHasDayMap > 0.5) {
    albedo = texture2D(uDayMap, vUv).rgb;
  }

  vec3 N = normalize(vNormal);
  if (uHasBumpMap > 0.5) {
    float bump = texture2D(uBumpMap, vUv).r;
    N = perturbNormal(N, bump);
  }

  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(vViewDirection);
  vec3 H = normalize(L + V);

  float NdotL = dot(N, L);
  float lambert = max(NdotL, 0.0);
  float dayFactor = smoothstep(-0.12, 0.28, NdotL);
  float nightFactor = 1.0 - dayFactor;

  float spec = pow(max(dot(N, H), 0.0), 48.0) * lambert * uSpecular;

  vec3 lit = albedo * (0.06 + lambert * 0.94) * mix(vec3(1.0), uSunColor, 0.3);
  lit += uSunColor * spec * 0.55;

  // Night side: optional lights map or soft fill (earthshine-style)
  vec3 nightCol = albedo * uNightFill;
  if (uHasNightMap > 0.5) {
    vec3 lights = texture2D(uNightMap, vUv).rgb;
    nightCol += lights * 1.8;
  }
  vec3 color = mix(lit, nightCol, nightFactor * 0.92);

  // Limb darkening
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);
  color *= 1.0 - fresnel * 0.18;

  color *= uExposure;
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 1.85));

  gl_FragColor = vec4(color, 1.0);
}
`;
