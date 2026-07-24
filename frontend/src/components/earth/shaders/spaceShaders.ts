/**
 * Procedural cinematic space — sized stars, milky-way dust, soft nebula wash.
 */
export const starsVertexShader = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPixelRatio;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = -mvPosition.z;
  gl_PointSize = aSize * uScale * uPixelRatio * (80.0 / max(dist, 1.0));
  gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);
  vAlpha = smoothstep(120.0, 20.0, dist);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const starsFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
uniform float uOpacity;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.08, d);
  float core = smoothstep(0.2, 0.0, d);
  float alpha = (soft * 0.65 + core * 0.85) * uOpacity * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`;

export const nebulaVertexShader = /* glsl */ `
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const nebulaFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec3 vWorldPosition;
varying vec2 vUv;

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
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv * 3.0 + vec2(uTime * 0.004, -uTime * 0.002);
  float n = fbm(uv);
  float band = smoothstep(0.25, 0.75, n);
  vec3 color = mix(uColorA, uColorB, n);
  float alpha = band * uOpacity * 0.22;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
}
`;
