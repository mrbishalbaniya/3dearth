"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  FrontSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { LoadedEarthTextures } from "../../utils/textures";
import { EARTH_RADIUS } from "../../utils/constants";
import { useEarthStore } from "../../store/earthStore";
import {
  drySurfaceFragmentShader,
  drySurfaceVertexShader,
} from "../Shaders/waterShaders";

interface DryEarthSurfaceProps {
  textures: LoadedEarthTextures;
  sunDirection: Vector3;
}

/**
 * Hypsometric overlay that reveals land + seafloor above the water plane.
 */
export function DryEarthSurface({
  textures,
  sunDirection,
}: DryEarthSurfaceProps) {
  const meshRef = useRef<Mesh>(null);
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const colorMode = useEarthStore((s) => s.dryEarth.colorMode);
  const exposure = useEarthStore((s) => s.exposure);
  const blendRef = useRef(0);

  const geometry = useMemo(
    () => new SphereGeometry(EARTH_RADIUS * 1.00015, 128, 128),
    [],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: FrontSide,
        vertexShader: drySurfaceVertexShader,
        fragmentShader: drySurfaceFragmentShader,
        uniforms: {
          uDayMap: { value: textures.day },
          uSpecularMap: { value: textures.specular },
          uNormalMap: { value: textures.normal },
          uSunDirection: { value: sunDirection.clone() },
          uSeaLevelM: { value: 0 },
          uDryBlend: { value: 0 },
          uColorMode: { value: 0 },
          uExposure: { value: 1 },
          uTime: { value: 0 },
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
    const target = enabled ? 1 : 0;
    blendRef.current += (target - blendRef.current) * Math.min(1, delta * 2.8);
    material.uniforms.uDryBlend.value = blendRef.current;
    material.uniforms.uSeaLevelM.value = displaySea;
    material.uniforms.uSunDirection.value.copy(sunDirection);
    material.uniforms.uExposure.value = exposure;
    material.uniforms.uTime.value += delta;
    material.uniforms.uColorMode.value =
      colorMode === "satellite" ? 1 : colorMode === "terrain" ? 2 : 0;
    material.visible = blendRef.current > 0.02;
    if (meshRef.current) meshRef.current.visible = material.visible;
  });

  if (!enabled && blendRef.current < 0.02) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={2}
      frustumCulled
    />
  );
}
