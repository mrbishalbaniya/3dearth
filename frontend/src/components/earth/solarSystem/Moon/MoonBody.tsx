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
import type { MoonDef } from "../catalog";
import {
  bodySurfaceFragmentShader,
  bodySurfaceVertexShader,
} from "../shaders";
import { loadBodyTexture } from "../textures";
import { daysSinceJ2000, getSolarSystemDate, siderealRotationRad } from "../time";

interface MoonBodyProps {
  moon: MoonDef;
  sunDirection: Vector3;
  sunColor?: Color;
  segments?: number;
}

export function MoonBody({
  moon,
  sunDirection,
  sunColor,
  segments = 20,
}: MoonBodyProps) {
  const meshRef = useRef<Mesh>(null);
  const [map, setMap] = useState<Texture | null>(null);

  const r = moon.radiusScene;
  const orbit = moon.orbitScene;
  const incline = (moon.inclinationDeg * Math.PI) / 180;

  const geometry = useMemo(
    () => new SphereGeometry(r, segments, segments),
    [r, segments],
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
          uFallbackColor: { value: new Color(moon.color) },
          uHasDayMap: { value: 0 },
          uHasBumpMap: { value: 0 },
          uHasNightMap: { value: 0 },
          uBumpScale: { value: 0.015 },
          uExposure: { value: 1.1 },
          uSpecular: { value: 0.1 },
          uNightFill: { value: 0.05 },
        },
      }),
    [moon.color, sunDirection],
  );

  useEffect(() => {
    let cancelled = false;
    if (moon.textureUrl) {
      void loadBodyTexture(moon.textureUrl).then((tex) => {
        if (cancelled || !tex) return;
        setMap(tex);
        material.uniforms.uDayMap.value = tex;
        material.uniforms.uHasDayMap.value = 1;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [moon.textureUrl, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
    if (sunColor) material.uniforms.uSunColor.value.copy(sunColor);

    if (!meshRef.current) return;
    const days = daysSinceJ2000(getSolarSystemDate());
    // Mean longitude from J2000 + n·t (periodDays < 0 ⇒ retrograde)
    const lon =
      (moon.meanLongitudeJ2000Deg * Math.PI) / 180 +
      siderealRotationRad(days, moon.periodDays, 0);
    const cosI = Math.cos(incline);
    const sinI = Math.sin(incline);
    meshRef.current.position.set(
      Math.cos(lon) * orbit,
      Math.sin(lon) * orbit * sinI,
      Math.sin(lon) * orbit * cosI,
    );
    // Synchronous rotation (tidally locked)
    meshRef.current.rotation.y = lon + Math.PI;
    void map;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      name={`moon-${moon.id}`}
    />
  );
}
