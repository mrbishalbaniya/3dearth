/**
 * Planetary atmosphere — Fresnel limb + sun-facing tint (Earth atmosphere port).
 */
export const bodyAtmosphereVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const bodyAtmosphereFragmentShader = /* glsl */ `
uniform vec3 uSunDirection;
uniform vec3 uAtmosphereColor;
uniform vec3 uSunsetColor;
uniform float uIntensity;
uniform float uThickness;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uSunDirection);

  float NdV = abs(dot(N, V));
  float fresnel = pow(1.0 - NdV, mix(2.2, 4.0, uThickness));

  float sunFacing = max(dot(N, L), 0.0);
  float nightSide = smoothstep(0.3, -0.12, dot(N, L));
  float limb = pow(1.0 - abs(dot(N, L)), 2.0);

  vec3 color = mix(uAtmosphereColor, uSunsetColor, limb * 0.65);
  color *= 0.4 + sunFacing * 0.9;
  color = mix(color, uAtmosphereColor * 0.22, nightSide * 0.75);

  float alpha = fresnel * uIntensity * mix(1.0, 0.35, nightSide);
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
}
`;
