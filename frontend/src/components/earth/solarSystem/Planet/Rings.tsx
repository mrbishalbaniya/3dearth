"use client";

import { useEffect, useMemo } from "react";
import {
  DoubleSide,
  MeshBasicMaterial,
  RingGeometry,
} from "three";
import type { RingDef } from "../catalog";
import { loadBodyTexture } from "../textures";

interface RingsProps {
  radius: number;
  rings: RingDef;
}

export function Rings({ radius, rings }: RingsProps) {
  const geometry = useMemo(
    () =>
      new RingGeometry(
        radius * rings.innerScale,
        radius * rings.outerScale,
        96,
      ),
    [radius, rings.innerScale, rings.outerScale],
  );

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: rings.color,
        transparent: true,
        opacity: rings.opacity,
        side: DoubleSide,
        depthWrite: false,
      }),
    [rings.color, rings.opacity],
  );

  useEffect(() => {
    let cancelled = false;
    if (rings.textureUrl) {
      void loadBodyTexture(rings.textureUrl).then((tex) => {
        if (cancelled || !tex) return;
        material.map = tex;
        material.needsUpdate = true;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [rings.textureUrl, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[rings.tiltRad, 0, 0]}
      frustumCulled={false}
      renderOrder={1}
    />
  );
}
