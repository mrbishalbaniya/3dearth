/**
 * Sun photosphere + corona shaders.
 */
export const sunVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const sunFragmentShader = /* glsl */ `
uniform sampler2D uSunMap;
uniform float uHasMap;
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 albedo = uColor;
  if (uHasMap > 0.5) {
    vec2 uv = vUv + vec2(uTime * 0.004, 0.0);
    albedo = texture2D(uSunMap, uv).rgb;
    albedo = mix(albedo, uColor, 0.15);
  }
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 1.6);
  vec3 color = albedo * uIntensity * (0.85 + fresnel * 0.45);
  color = pow(color, vec3(0.92));
  gl_FragColor = vec4(color, 1.0);
}
`;

export const sunCoronaFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 1.35);
  float pulse = 0.85 + 0.15 * sin(uTime * 0.7);
  float alpha = fresnel * uIntensity * pulse;
  gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.85));
}
`;
