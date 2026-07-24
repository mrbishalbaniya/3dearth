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

/** Wind streak particles — direction & speed from observation. */
export function WindEffect({ count }: { count: number }) {
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const fx = useEarthStore((s) => s.weatherFx);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const weather = useEarthStore((s) => s.weather);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const pointsRef = useRef<Points>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    const mat = new PointsMaterial({
      size: 0.0035,
      color: new Color("#b8d4e8"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const intensity = fx.wind ? intensities.wind : 0;
    const show = intensity > 0.12 && altitudeM < 80_000 && !reducedMotion;
    material.opacity = show ? intensity * 0.45 : 0;
    if (pointsRef.current) pointsRef.current.visible = show;
    if (!show) return;

    const windDeg = weather?.windDirectionDeg ?? 0;
    const rad = (windDeg * Math.PI) / 180;
    const center = latLngToVector3(focusLat, focusLng, EARTH_RADIUS * 1.01);
    const up = center.clone().normalize();
    const east = new Vector3().crossVectors(new Vector3(0, 1, 0), up).normalize();
    if (east.lengthSq() < 0.1) east.set(1, 0, 0);
    const north = new Vector3().crossVectors(up, east).normalize();
    const windDir = east
      .clone()
      .multiplyScalar(Math.sin(rad))
      .addScaledVector(north, Math.cos(rad));

    const span = Math.min(0.12, Math.max(0.02, (altitudeM / EARTH_RADIUS_M) * 5));
    const speed = 0.03 + intensity * 0.05;
    const pos = geometry.getAttribute("position") as BufferAttribute;
    const active = Math.floor(count * Math.min(1, intensity));

    for (let i = 0; i < count; i++) {
      if (i >= active) {
        pos.setXYZ(i, 0, 0, 0);
        continue;
      }
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      if (x === 0 && y === 0 && z === 0) {
        const p = center
          .clone()
          .addScaledVector(east, (Math.random() - 0.5) * span)
          .addScaledVector(north, (Math.random() - 0.5) * span)
          .addScaledVector(up, 0.004 + Math.random() * span * 0.3);
        pos.setXYZ(i, p.x, p.y, p.z);
        continue;
      }
      const cur = new Vector3(x, y, z);
      cur.addScaledVector(windDir, delta * speed);
      const offset = cur.clone().sub(center);
      if (offset.length() > span * 0.7) {
        const p = center
          .clone()
          .addScaledVector(east, (Math.random() - 0.5) * span)
          .addScaledVector(north, (Math.random() - 0.5) * span)
          .addScaledVector(up, 0.005 + Math.random() * span * 0.25);
        pos.setXYZ(i, p.x, p.y, p.z);
      } else {
        pos.setXYZ(i, cur.x, cur.y, cur.z);
      }
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
