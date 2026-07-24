"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { AtmosphereDef } from "../catalog";
import {
  bodyAtmosphereFragmentShader,
  bodyAtmosphereVertexShader,
} from "../shaders";

interface AtmosphereProps {
  radius: number;
  atmosphere: AtmosphereDef;
  sunDirection: Vector3;
  segments: number;
}

export function Atmosphere({
  radius,
  atmosphere,
  sunDirection,
  segments,
}: AtmosphereProps) {
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(
    () =>
      new SphereGeometry(
        radius * atmosphere.radiusScale,
        Math.max(24, segments / 2),
        Math.max(24, segments / 2),
      ),
    [radius, atmosphere.radiusScale, segments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: bodyAtmosphereVertexShader,
        fragmentShader: bodyAtmosphereFragmentShader,
        uniforms: {
          uSunDirection: { value: sunDirection.clone() },
          uAtmosphereColor: { value: new Color(atmosphere.color) },
          uSunsetColor: { value: new Color(atmosphere.sunsetColor) },
          uIntensity: { value: atmosphere.intensity },
          uThickness: { value: atmosphere.thickness },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [atmosphere, sunDirection],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={2}
    />
  );
}
