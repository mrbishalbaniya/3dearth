"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
  Vector3,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";

/** Brief splash sparks near surface during rain. */
export function SplashEffect({ count }: { count: number }) {
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const fx = useEarthStore((s) => s.weatherFx);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const pointsRef = useRef<Points>(null);
  const ages = useRef(new Float32Array(count));

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    const mat = new PointsMaterial({
      size: 0.0025,
      color: new Color("#c8e4ff"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(() => {
    ages.current = new Float32Array(count);
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, count]);

  useFrame((_, delta) => {
    const intensity = fx.rain ? intensities.rain * intensities.wetness : 0;
    const show = intensity > 0.15 && altitudeM < 25_000 && !reducedMotion;
    material.opacity = show ? intensity * 0.5 : 0;
    if (pointsRef.current) pointsRef.current.visible = show;
    if (!show) return;

    const center = latLngToVector3(focusLat, focusLng, EARTH_RADIUS * 1.0035);
    const up = center.clone().normalize();
    const east = new Vector3().crossVectors(new Vector3(0, 1, 0), up).normalize();
    if (east.lengthSq() < 0.1) east.set(1, 0, 0);
    const north = new Vector3().crossVectors(up, east).normalize();
    const span = Math.min(0.06, Math.max(0.008, (altitudeM / EARTH_RADIUS_M) * 4));
    const pos = geometry.getAttribute("position") as BufferAttribute;
    const active = Math.floor(count * Math.min(1, intensity));

    for (let i = 0; i < count; i++) {
      ages.current[i] -= delta;
      if (i >= active || ages.current[i] <= 0) {
        if (i < active && Math.random() < intensity * 0.08) {
          const p = center
            .clone()
            .addScaledVector(east, (Math.random() - 0.5) * span)
            .addScaledVector(north, (Math.random() - 0.5) * span)
            .addScaledVector(up, 0.0008 + Math.random() * 0.002);
          pos.setXYZ(i, p.x, p.y, p.z);
          ages.current[i] = 0.15 + Math.random() * 0.2;
        } else if (i >= active) {
          pos.setXYZ(i, 0, 0, 0);
        }
        continue;
      }
      const cur = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      cur.addScaledVector(up, delta * 0.004);
      pos.setXYZ(i, cur.x, cur.y, cur.z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
