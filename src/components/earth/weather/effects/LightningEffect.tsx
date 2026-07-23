"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  LineSegments,
  PointLight,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";

/** Lightning bolts + flash illumination with delayed strike cadence. */
export function LightningEffect() {
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const fx = useEarthStore((s) => s.weatherFx);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);

  const lightRef = useRef<PointLight>(null);
  const lineRef = useRef<LineSegments>(null);
  const nextStrike = useRef(2 + Math.random() * 4);
  const flash = useRef(0);
  const boltLife = useRef(0);

  const { geometry, material } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(24 * 3); // up to 12 segments
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    const mat = new LineBasicMaterial({
      color: new Color("#e8f0ff"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const ready =
      fx.lightning &&
      intensities.lightning > 0.2 &&
      altitudeM < 200_000 &&
      !reducedMotion;

    if (lightRef.current) lightRef.current.intensity = 0;
    if (!ready) {
      material.opacity = 0;
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }

    nextStrike.current -= delta;
    flash.current = Math.max(0, flash.current - delta * 4);
    boltLife.current = Math.max(0, boltLife.current - delta * 6);

    if (nextStrike.current <= 0) {
      // Strike
      const jitterLat = focusLat + (Math.random() - 0.5) * 1.5;
      const jitterLng = focusLng + (Math.random() - 0.5) * 1.5;
      const top = latLngToVector3(jitterLat, jitterLng, EARTH_RADIUS * 1.035);
      const bot = latLngToVector3(
        jitterLat + (Math.random() - 0.5) * 0.15,
        jitterLng + (Math.random() - 0.5) * 0.15,
        EARTH_RADIUS * 1.004,
      );

      const pos = geometry.getAttribute("position") as BufferAttribute;
      const segs = 8;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = top.clone().lerp(bot, t);
        // Jagged offset
        p.x += (Math.random() - 0.5) * 0.008 * (1 - Math.abs(t - 0.5) * 2);
        p.y += (Math.random() - 0.5) * 0.008;
        p.z += (Math.random() - 0.5) * 0.008;
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      // Line segments need pairs — duplicate for consecutive
      const lined = new Float32Array(segs * 2 * 3);
      for (let i = 0; i < segs; i++) {
        lined[i * 6] = pos.getX(i);
        lined[i * 6 + 1] = pos.getY(i);
        lined[i * 6 + 2] = pos.getZ(i);
        lined[i * 6 + 3] = pos.getX(i + 1);
        lined[i * 6 + 4] = pos.getY(i + 1);
        lined[i * 6 + 5] = pos.getZ(i + 1);
      }
      geometry.setAttribute("position", new BufferAttribute(lined, 3));
      geometry.computeBoundingSphere();

      flash.current = 0.7 + Math.random() * 0.5;
      boltLife.current = 0.18 + Math.random() * 0.12;
      // Thunder delay scales with distance (fake local)
      nextStrike.current =
        (1.8 + Math.random() * 5) / Math.max(0.4, intensities.lightning);

      if (lightRef.current) {
        lightRef.current.position.copy(top);
      }
    }

    material.opacity = boltLife.current > 0 ? 0.95 : 0;
    if (lineRef.current) lineRef.current.visible = boltLife.current > 0;

    if (lightRef.current) {
      lightRef.current.intensity = flash.current * 8 * intensities.lightning;
      lightRef.current.distance = 0.8;
    }
  });

  return (
    <group>
      <lineSegments
        ref={lineRef}
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={12}
      />
      <pointLight
        ref={lightRef}
        color="#dce9ff"
        intensity={0}
        distance={1}
        decay={2}
      />
    </group>
  );
}
