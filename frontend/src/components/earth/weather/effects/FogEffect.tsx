"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS } from "../../utils/constants";

const fogVert = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vNormal;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPosition = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fogFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDust;
varying vec3 vWorldPosition;
varying vec3 vNormal;
void main() {
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), V)), 1.8);
  float dens = mix(0.35, 0.85, fresnel);
  vec3 col = mix(uColor, vec3(0.72, 0.58, 0.38), uDust);
  float alpha = dens * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

/** Local volumetric-looking fog shell around focus. */
export function FogEffect() {
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const fx = useEarthStore((s) => s.weatherFx);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => new SphereGeometry(1, 32, 24), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: fogVert,
        fragmentShader: fogFrag,
        uniforms: {
          uColor: { value: new Color("#c5d4e8") },
          uOpacity: { value: 0 },
          uDust: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
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
    const fog = fx.fog ? intensities.fog : 0;
    const dust = fx.fog ? intensities.dust : 0;
    const amount = Math.max(fog, dust * 0.85);
    const show = amount > 0.03 && altitudeM < 120_000;
    const target = show ? amount * 0.55 : 0;
    material.uniforms.uOpacity.value +=
      (target - material.uniforms.uOpacity.value) * Math.min(1, delta * 1.5);
    material.uniforms.uDust.value = dust;
    material.uniforms.uColor.value.set(dust > 0.4 ? "#c4a574" : "#c5d4e8");

    if (!meshRef.current) return;
    meshRef.current.visible = material.uniforms.uOpacity.value > 0.02;
    if (!meshRef.current.visible) return;

    const center = latLngToVector3(focusLat, focusLng, EARTH_RADIUS * 1.02);
    meshRef.current.position.copy(center);
    const scale = Math.min(0.35, Math.max(0.04, altitudeM / 400_000));
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={8}
    />
  );
}
