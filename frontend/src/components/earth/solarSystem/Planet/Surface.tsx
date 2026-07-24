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
  Vector3,
} from "three";
import type { PlanetDef } from "../catalog";
import {
  bodySurfaceFragmentShader,
  bodySurfaceVertexShader,
} from "../shaders";
import { loadBodyTexture } from "../textures";
import { daysSinceJ2000, getSolarSystemDate, iauRotationRad } from "../time";

interface SurfaceProps {
  def: PlanetDef;
  sunDirection: Vector3;
  sunColor?: Color;
  segments: number;
}

export function Surface({
  def,
  sunDirection,
  sunColor,
  segments,
}: SurfaceProps) {
  const meshRef = useRef<Mesh>(null);
  const [dayMap, setDayMap] = useState<Texture | null>(null);
  const [bumpMap, setBumpMap] = useState<Texture | null>(null);
  const [nightMap, setNightMap] = useState<Texture | null>(null);

  const geometry = useMemo(
    () => new SphereGeometry(def.radius, segments, segments),
    [def.radius, segments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: bodySurfaceVertexShader,
        fragmentShader: bodySurfaceFragmentShader,
        side: FrontSide,
        uniforms: {
          uDayMap: { value: null },
          uBumpMap: { value: null },
          uNightMap: { value: null },
          uSunDirection: { value: sunDirection.clone() },
          uSunColor: { value: new Color("#fff5e6") },
          uFallbackColor: { value: new Color(def.color) },
          uHasDayMap: { value: 0 },
          uHasBumpMap: { value: 0 },
          uHasNightMap: { value: 0 },
          uBumpScale: { value: 0.02 },
          uExposure: { value: 1.15 },
          uSpecular: { value: def.specular },
          uNightFill: { value: def.nightFill },
        },
      }),
    [def.color, def.specular, def.nightFill, sunDirection],
  );

  useEffect(() => {
    let cancelled = false;
    if (def.textureUrl) {
      void loadBodyTexture(def.textureUrl).then((tex) => {
        if (cancelled || !tex) return;
        setDayMap(tex);
        material.uniforms.uDayMap.value = tex;
        material.uniforms.uHasDayMap.value = 1;
      });
    }
    if (def.bumpUrl) {
      void loadBodyTexture(def.bumpUrl).then((tex) => {
        if (cancelled || !tex) return;
        setBumpMap(tex);
        material.uniforms.uBumpMap.value = tex;
        material.uniforms.uHasBumpMap.value = 1;
      });
    }
    if (def.nightUrl) {
      void loadBodyTexture(def.nightUrl).then((tex) => {
        if (cancelled || !tex) return;
        setNightMap(tex);
        material.uniforms.uNightMap.value = tex;
        material.uniforms.uHasNightMap.value = 1;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [def, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
    if (sunColor) material.uniforms.uSunColor.value.copy(sunColor);
    if (meshRef.current) {
      const days = daysSinceJ2000(getSolarSystemDate());
      meshRef.current.rotation.y = iauRotationRad(days, def.rotation);
    }
    void dayMap;
    void bumpMap;
    void nightMap;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
