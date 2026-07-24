"use client";

/**
 * Realistic Moon — textured sphere, sun-lit, slow orbit around Earth.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  TextureLoader,
  Vector3,
  SRGBColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
} from "three";
import {
  moonFragmentShader,
  moonVertexShader,
} from "./shaders/earthShaders";
import { useEarthStore } from "./store/earthStore";
import { MOON_ORBIT_RADIUS, MOON_RADIUS } from "./utils/constants";

const MOON_TEXTURE_LOCAL = "/textures/earth/moon.jpg";
const MOON_TEXTURE_CDN =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/moon_1024.jpg";

interface MoonProps {
  sunDirection: Vector3;
  segments?: number;
}

export function Moon({ sunDirection, segments = 48 }: MoonProps) {
  const meshRef = useRef<Mesh>(null);
  const angle = useRef(0.8);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    const apply = (tex: Texture) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearMipmapLinearFilter;
      tex.magFilter = LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = 8;
      setTexture(tex);
    };
    loader.load(
      MOON_TEXTURE_LOCAL,
      apply,
      undefined,
      () => loader.load(MOON_TEXTURE_CDN, apply),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(
    () => new SphereGeometry(MOON_RADIUS, segments, segments),
    [segments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: moonVertexShader,
        fragmentShader: moonFragmentShader,
        uniforms: {
          uMoonMap: { value: null },
          uSunDirection: { value: sunDirection.clone() },
          uIntensity: { value: 1.0 },
        },
      }),
    [sunDirection],
  );

  useEffect(() => {
    if (texture) material.uniforms.uMoonMap.value = texture;
  }, [texture, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture?.dispose();
    };
  }, [geometry, material, texture]);

  useFrame((_, delta) => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
    if (!reducedMotion) angle.current += delta * 0.012;

    if (meshRef.current) {
      const a = angle.current;
      const incline = 0.09;
      meshRef.current.position.set(
        Math.cos(a) * MOON_ORBIT_RADIUS,
        Math.sin(a) * MOON_ORBIT_RADIUS * incline,
        Math.sin(a) * MOON_ORBIT_RADIUS,
      );
      // Keep a face toward Earth (approx tidal lock)
      meshRef.current.lookAt(0, 0, 0);
      meshRef.current.rotateY(Math.PI);
      meshRef.current.visible = zoomLevel <= 2;
    }
  });

  if (!texture) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={0}
    />
  );
}
