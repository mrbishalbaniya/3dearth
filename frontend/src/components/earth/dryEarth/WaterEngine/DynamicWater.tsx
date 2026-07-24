"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  FrontSide,
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
 * GPU water shell — NEVER scaled inside the globe (that caused black sawtooth
 * z-fighting). Drain is done by fragment discard + opacity, not inward scale.
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
        depthTest: true,
        side: FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
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
    // Fully drained — no water shell at all
    if (!dryOn || sea < -500) {
      material.visible = false;
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }

    const floodM = Math.max(0, sea);
    const liftM = Math.max(40, altitudeM * 0.003) + floodM;
    const r = EARTH_RADIUS * (1 + liftM / EARTH_RADIUS_M) + WATER_SHELL_EPS;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(Math.max(1.0002, r));
    }
    material.uniforms.uTime.value += delta;
    material.uniforms.uSeaLevelM.value = sea;
    material.uniforms.uDryBlend.value = 1;
    material.uniforms.uSunDirection.value.copy(sunDirection);

    let op = 0.72;
    if (sea < 0) {
      op *= smoothstepFade(sea, -500, 0);
    }
    if (sea > 5000) op *= 0.85;
    if (altitudeM > 8_000_000) op *= 0.5;

    material.uniforms.uOpacity.value = op;
    material.visible = op > 0.025;
    if (meshRef.current) meshRef.current.visible = material.visible;
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

function smoothstepFade(sea: number, a: number, b: number): number {
  // 1 at sea>=b, 0 at sea<=a
  if (sea <= a) return 0;
  if (sea >= b) return 1;
  const t = (sea - a) / (b - a);
  return t * t * (3 - 2 * t);
}
