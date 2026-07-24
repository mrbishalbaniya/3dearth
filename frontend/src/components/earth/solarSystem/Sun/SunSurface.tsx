"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  FrontSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Texture,
} from "three";
import { SUN_DEF } from "../catalog";
import { sunFragmentShader, sunVertexShader } from "../shaders";
import { loadBodyTexture } from "../textures";
import { daysSinceJ2000, getSolarSystemDate, iauRotationRad } from "../time";

interface SunSurfaceProps {
  segments?: number;
  tint?: Color;
  radius: number;
}

export function SunSurface({ segments = 64, tint, radius }: SunSurfaceProps) {
  const meshRef = useRef<Mesh>(null);
  const [map, setMap] = useState<Texture | null>(null);

  const geometry = useMemo(
    () => new SphereGeometry(radius, segments, segments),
    [radius, segments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sunVertexShader,
        fragmentShader: sunFragmentShader,
        side: FrontSide,
        toneMapped: false,
        uniforms: {
          uSunMap: { value: null },
          uHasMap: { value: 0 },
          uColor: { value: new Color(SUN_DEF.color) },
          uTime: { value: 0 },
          uIntensity: { value: SUN_DEF.intensity },
        },
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void loadBodyTexture(SUN_DEF.textureUrl).then((tex) => {
      if (cancelled || !tex) return;
      setMap(tex);
      material.uniforms.uSunMap.value = tex;
      material.uniforms.uHasMap.value = 1;
    });
    return () => {
      cancelled = true;
    };
  }, [material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    if (tint) {
      material.uniforms.uColor.value
        .copy(tint)
        .lerp(new Color(SUN_DEF.color), 0.55);
    }
    if (meshRef.current) {
      const days = daysSinceJ2000(getSolarSystemDate());
      meshRef.current.rotation.y = iauRotationRad(days, SUN_DEF.rotation);
    }
    void map;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-1}
    />
  );
}
