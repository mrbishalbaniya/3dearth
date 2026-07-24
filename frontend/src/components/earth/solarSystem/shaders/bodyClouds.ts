/**
 * Cloud / haze shells for Venus and gas giants.
 */
export const bodyCloudsVertexShader = /* glsl */ `
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

export const bodyCloudsFragmentShader = /* glsl */ `
uniform sampler2D uCloudMap;
uniform vec3 uSunDirection;
uniform float uOpacity;
uniform float uTime;
uniform float uWind;
uniform float uDensity;
uniform float uLayer;
uniform float uHasMap;
uniform vec3 uTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv + vec2(uTime * uWind * (0.01 + uLayer * 0.004), uTime * uWind * 0.003);
  uv += vec2(uLayer * 0.015, uLayer * -0.01);

  float density;
  if (uHasMap > 0.5) {
    density = pow(texture2D(uCloudMap, uv).r, mix(0.8, 1.3, uDensity));
  } else {
    // Procedural haze bands
    density = smoothstep(0.35, 0.75, hash(floor(uv * 40.0)) * 0.6 + sin(uv.y * 28.0 + uTime * 0.2) * 0.25 + 0.35);
    density *= uDensity;
  }

  float alpha = density * uOpacity * mix(1.0, 0.55, uLayer * 0.4);
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDirection);
  float lambert = max(dot(N, L), 0.0);
  float night = smoothstep(0.15, -0.1, dot(N, L));

  vec3 lit = uTint * (0.4 + lambert * 0.6);
  vec3 color = mix(lit, uTint * 0.15, night * 0.85);

  if (alpha < 0.02) discard;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
}
`;
