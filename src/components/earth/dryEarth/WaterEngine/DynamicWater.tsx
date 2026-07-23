"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { LoadedEarthTextures } from "../../utils/textures";
import { EARTH_RADIUS } from "../../utils/constants";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import { useEarthStore } from "../../store/earthStore";
import { WATER_SHELL_EPS } from "../constants";
import {
  waterFragmentShader,
  waterVertexShader,
} from "../Shaders/waterShaders";

interface DynamicWaterProps {
  textures: LoadedEarthTextures;
  sunDirection: Vector3;
}

/**
 * GPU water volume — radius tracks sea level; fragment discards land above MSL.
 */
export function DynamicWater({ textures, sunDirection }: DynamicWaterProps) {
  const meshRef = useRef<Mesh>(null);
  const dryOn = useEarthStore((s) => s.dryEarth.enabled);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const altitudeM = useEarthStore((s) => s.altitudeM);

  const geometry = useMemo(
    () => new SphereGeometry(EARTH_RADIUS, 128, 128),
    [],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.72 },
          uSeaLevelM: { value: 0 },
          uDryBlend: { value: 0 },
          uSunDirection: { value: sunDirection.clone() },
          uSpecularMap: { value: textures.specular },
          uDayMap: { value: textures.day },
          uColor: { value: new Color("#0a3d66") },
        },
      }),
    [textures, sunDirection],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const sea = displaySea;
    const r =
      EARTH_RADIUS * (1 + sea / EARTH_RADIUS_M) + WATER_SHELL_EPS;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(Math.max(0.97, r));
    }
    material.uniforms.uTime.value += delta;
    material.uniforms.uSeaLevelM.value = sea;
    material.uniforms.uDryBlend.value = dryOn ? 1 : 0;
    material.uniforms.uSunDirection.value.copy(sunDirection);

    // Opacity: stronger mid-orbit; fade when fully drained or far
    let op = 0.78;
    if (sea < -8000) op *= Math.max(0, 1 + sea / 11000);
    if (sea > 5000) op *= 0.85;
    if (altitudeM > 8_000_000) op *= 0.55;
    material.uniforms.uOpacity.value = op;
    material.visible = op > 0.02;
  });

  if (!dryOn) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={3}
      frustumCulled
    />
  );
}
