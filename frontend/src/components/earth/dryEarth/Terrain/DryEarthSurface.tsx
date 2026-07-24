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
 * Displaced dry-earth globe — ocean basins dig below MSL (0 m), mountains rise.
 * Base Earth discards ocean pixels so these depth bowls are visible.
 * High segment count: 192 looked like giant pixels at continent zoom.
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
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const terrainExag = useEarthStore((s) => s.terrainExaggeration);
  const qualityId = useEarthStore((s) => s.qualityId);
  const blendRef = useRef(0);

  const segments =
    qualityId === "ultra" ? 512 : qualityId === "high" ? 448 : qualityId === "medium" ? 384 : 288;

  const geometry = useMemo(
    () => new SphereGeometry(EARTH_RADIUS, segments, segments),
    [segments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        // Opaque FrontSide shell — never see through to the far hemisphere
        transparent: false,
        depthWrite: true,
        depthTest: true,
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
          uExposure: { value: 1.15 },
          uTime: { value: 0 },
          uExaggeration: { value: 12 },
          uDepthExaggeration: { value: 28 },
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
    const drained = enabled && displaySea < -200;
    const target = drained ? 1 : 0;
    blendRef.current += (target - blendRef.current) * Math.min(1, delta * 3.5);
    material.uniforms.uSeaLevelM.value = displaySea;
    material.uniforms.uSunDirection.value.copy(sunDirection);
    material.uniforms.uExposure.value = exposure * 1.2;
    material.uniforms.uTime.value += delta;
    material.uniforms.uColorMode.value =
      colorMode === "satellite" ? 1 : colorMode === "terrain" ? 2 : 0;

    // Strong land exaggeration so mountain curves beat flat tabletops at orbit.
    // Collapse toward ~1× near the surface so city zoom isn't buried in the mesh.
    const landEx =
      altitudeM > 5_000_000
        ? Math.max(terrainExag, 34)
        : altitudeM > 1_000_000
          ? Math.max(terrainExag, 26)
          : altitudeM > 300_000
            ? Math.max(terrainExag, 16)
            : altitudeM > 80_000
              ? Math.max(terrainExag, 8)
              : altitudeM > 20_000
                ? Math.max(terrainExag, 3.5)
                : Math.max(terrainExag, 1.5);
    material.uniforms.uExaggeration.value = landEx;
    material.uniforms.uDepthExaggeration.value =
      landEx * (altitudeM > 5_000_000 ? 1.3 : altitudeM > 80_000 ? 1.6 : 1.2);

    // Soften displacement under DEM tiles — keep full opacity so the shell
    // never goes translucent (ghost continents through the ocean).
    const demZone = altitudeM < 14_000_000 && altitudeM > 80;
    const underlay =
      demZone && altitudeM < 20_000
        ? 0.12
        : demZone && altitudeM < 2_000_000
          ? 0.2
          : demZone && altitudeM < 5_000_000
            ? 0.4
            : demZone && altitudeM < 10_000_000
              ? 0.65
              : 1;
    material.uniforms.uDryBlend.value =
      blendRef.current > 0.02
        ? Math.max(
            altitudeM > 5_000_000 ? 0.95 : altitudeM < 20_000 ? 0.35 : 0.75,
            blendRef.current * underlay,
          )
        : 0;

    if (meshRef.current) {
      meshRef.current.visible = blendRef.current > 0.02;
    }
    material.visible = blendRef.current > 0.02;
  });

  if (!enabled) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={2}
      frustumCulled={false}
    />
  );
}
