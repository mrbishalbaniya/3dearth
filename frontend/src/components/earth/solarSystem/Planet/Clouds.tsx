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
import type { CloudsDef } from "../catalog";
import {
  bodyCloudsFragmentShader,
  bodyCloudsVertexShader,
} from "../shaders";
import { loadBodyTexture } from "../textures";
import { daysSinceJ2000, getSolarSystemDate, iauRotationRad } from "../time";
import type { IauRotation } from "../physical";

interface CloudsProps {
  radius: number;
  clouds: CloudsDef;
  sunDirection: Vector3;
  rotation: IauRotation;
  segments: number;
  reducedMotion: boolean;
}

export function Clouds({
  radius,
  clouds,
  sunDirection,
  rotation,
  segments,
  reducedMotion,
}: CloudsProps) {
  const matsRef = useRef<ShaderMaterial[]>([]);
  const meshesRef = useRef<(Mesh | null)[]>([]);
  const [map, setMap] = useState<Texture | null>(null);

  const layerCount = Math.max(1, Math.min(3, clouds.layerCount));
  const offsets = [0.012, 0.022, 0.032].slice(0, layerCount);

  const geometries = useMemo(
    () =>
      offsets.map(
        (off) =>
          new SphereGeometry(
            radius * (1 + off),
            Math.max(24, Math.floor(segments * 0.65)),
            Math.max(24, Math.floor(segments * 0.65)),
          ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [radius, segments, layerCount],
  );

  const materials = useMemo(() => {
    const mats = offsets.map(
      (_, i) =>
        new ShaderMaterial({
          vertexShader: bodyCloudsVertexShader,
          fragmentShader: bodyCloudsFragmentShader,
          uniforms: {
            uCloudMap: { value: null },
            uSunDirection: { value: sunDirection.clone() },
            uOpacity: { value: clouds.opacity * (1 - i * 0.2) },
            uTime: { value: 0 },
            uWind: { value: clouds.wind },
            uDensity: { value: clouds.density },
            uLayer: { value: i },
            uHasMap: { value: 0 },
            uTint: { value: new Color(clouds.tint) },
          },
          transparent: true,
          depthWrite: false,
          side: FrontSide,
          depthTest: true,
        }),
    );
    matsRef.current = mats;
    return mats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clouds, sunDirection, layerCount]);

  useEffect(() => {
    let cancelled = false;
    if (clouds.mapUrl) {
      void loadBodyTexture(clouds.mapUrl).then((tex) => {
        if (cancelled || !tex) return;
        setMap(tex);
        for (const mat of matsRef.current) {
          mat.uniforms.uCloudMap.value = tex;
          mat.uniforms.uHasMap.value = 1;
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [clouds.mapUrl]);

  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    };
  }, [geometries, materials]);

  useFrame((_, delta) => {
    for (const mat of matsRef.current) {
      mat.uniforms.uSunDirection.value.copy(sunDirection);
      if (!reducedMotion) mat.uniforms.uTime.value += delta;
    }
    const days = daysSinceJ2000(getSolarSystemDate());
    const base = iauRotationRad(days, rotation);
    for (let i = 0; i < meshesRef.current.length; i++) {
      const mesh = meshesRef.current[i];
      if (!mesh) continue;
      // Slight differential drift vs solid body (zonal wind proxy)
      mesh.rotation.y = base + i * 0.085;
    }
    void map;
  });

  return (
    <group name="clouds">
      {geometries.map((geo, i) => (
        <mesh
          key={i}
          ref={(node) => {
            meshesRef.current[i] = node;
          }}
          geometry={geo}
          material={materials[i]}
          frustumCulled={false}
          renderOrder={3 + i}
        />
      ))}
    </group>
  );
}
