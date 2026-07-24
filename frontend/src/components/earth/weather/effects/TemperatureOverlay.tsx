"use client";

/**
 * Globe temperature tint — blue → green → yellow → red.
 * Uses latitude climate model + local observation bias near focus.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { seasonFactor } from "../seasons";

const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPosition = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
uniform float uOpacity;
uniform float uSeason; // 0 winter-ish poles colder
uniform vec3 uFocusDir;
uniform float uFocusTemp; // °C
uniform float uFocusBlend;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

vec3 tempColor(float t) {
  // t normalized -20..45 → 0..1
  float n = clamp((t + 20.0) / 65.0, 0.0, 1.0);
  vec3 cold = vec3(0.15, 0.35, 0.95);
  vec3 cool = vec3(0.2, 0.75, 0.55);
  vec3 warm = vec3(0.95, 0.85, 0.2);
  vec3 hot = vec3(0.95, 0.25, 0.1);
  if (n < 0.33) return mix(cold, cool, n / 0.33);
  if (n < 0.66) return mix(cool, warm, (n - 0.33) / 0.33);
  return mix(warm, hot, (n - 0.66) / 0.34);
}

void main() {
  float lat = asin(clamp(vNormal.y, -1.0, 1.0)); // -pi/2..pi/2
  // Base climate: equator warm, poles cold, seasonal shift
  float base = 28.0 * cos(lat) - 12.0 * (1.0 - uSeason) * abs(sin(lat));
  float focusW = pow(max(0.0, dot(normalize(vNormal), uFocusDir)), 8.0) * uFocusBlend;
  float t = mix(base, uFocusTemp, focusW * 0.85);
  vec3 col = tempColor(t);
  float alpha = uOpacity * 0.42;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export function TemperatureOverlay() {
  const fx = useEarthStore((s) => s.weatherFx);
  const weather = useEarthStore((s) => s.weather);
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const focusLat = useEarthStore((s) => s.focusLat);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(
    () => new SphereGeometry(EARTH_RADIUS * 1.0018, 64, 48),
    [],
  );
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uOpacity: { value: 0 },
          uSeason: { value: 0.5 },
          uFocusDir: { value: new Vector3(0, 1, 0) },
          uFocusTemp: { value: 15 },
          uFocusBlend: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const on = fx.temperature && zoomLevel <= 3;
    const target = on ? 0.55 * Math.max(0.3, intensities.temperatureBlend) : 0;
    material.uniforms.uOpacity.value +=
      (target - material.uniforms.uOpacity.value) * Math.min(1, delta * 2);
    material.uniforms.uSeason.value = seasonFactor(new Date(), focusLat);
    if (weather) {
      material.uniforms.uFocusTemp.value = weather.temperatureC;
      material.uniforms.uFocusBlend.value = 1;
      const dir = latLngToVector3(weather.lat, weather.lng, 1).normalize();
      material.uniforms.uFocusDir.value.copy(dir);
    }
    if (meshRef.current) {
      meshRef.current.visible = material.uniforms.uOpacity.value > 0.02;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={4}
    />
  );
}
