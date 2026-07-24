"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
} from "three";
import { useFrame } from "@react-three/fiber";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import type { GeoJsonCollection, GeoJsonFeature } from "../../types";

const tmpPositions: number[] = [];

function densifyAndProject(
  ring: number[][],
  radius: number,
  maxStep = 1.0,
): void {
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const dLat = lat2 - lat1;
    const dLng = ((lng2 - lng1 + 540) % 360) - 180;
    const steps = Math.max(
      1,
      Math.ceil(Math.sqrt(dLat * dLat + dLng * dLng) / maxStep),
    );
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const a = latLngToVector3(lat1 + dLat * t0, lng1 + dLng * t0, radius);
      const b = latLngToVector3(lat1 + dLat * t1, lng1 + dLng * t1, radius);
      tmpPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
}

function featureToPositions(feature: GeoJsonFeature, radius: number, step: number) {
  tmpPositions.length = 0;
  const g = feature.geometry;
  if (g.type === "Polygon") {
    for (const ring of g.coordinates) densifyAndProject(ring, radius, step);
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates)
      for (const ring of poly) densifyAndProject(ring, radius, step);
  } else if ((g as { type: string }).type === "LineString") {
    densifyAndProject(
      (g as unknown as { coordinates: number[][] }).coordinates,
      radius,
      step,
    );
  } else if ((g as { type: string }).type === "MultiLineString") {
    for (const line of (g as unknown as { coordinates: number[][][] }).coordinates) {
      densifyAndProject(line, radius, step);
    }
  }
  return new Float32Array(tmpPositions);
}

function BorderLines({
  url,
  color,
  opacity,
  radius,
  step,
  visible,
}: {
  url: string;
  color: string;
  opacity: number;
  radius: number;
  step: number;
  visible: boolean;
}) {
  const [geo, setGeo] = useState<BufferGeometry | null>(null);
  const matRef = useRef<LineBasicMaterial>(null);
  const appear = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((data: GeoJsonCollection) => {
        if (cancelled) return;
        const chunks: number[] = [];
        for (const f of data.features) {
          const arr = featureToPositions(f, radius, step);
          for (let i = 0; i < arr.length; i++) chunks.push(arr[i]);
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute(
          "position",
          new Float32BufferAttribute(new Float32Array(chunks), 3),
        );
        setGeo((prev) => {
          prev?.dispose();
          return geometry;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url, radius, step]);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    appear.current = visible
      ? Math.min(1, appear.current + delta * 0.8)
      : Math.max(0, appear.current - delta * 1.5);
    matRef.current.opacity = opacity * appear.current;
  });

  useEffect(() => () => geo?.dispose(), [geo]);

  if (!geo) return null;

  return (
    <lineSegments geometry={geo} renderOrder={6}>
      <lineBasicMaterial
        ref={matRef}
        color={new Color(color)}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export function BorderLayer() {
  const enabled = useEarthStore((s) => s.gisLayers.borders);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const groupRef = useRef<Group>(null);

  const showCountries = enabled && zoomLevel >= 1 && zoomLevel <= 4;
  const showStates = enabled && zoomLevel >= 3 && zoomLevel <= 5;

  return (
    <group ref={groupRef}>
      <BorderLines
        url="/data/countries.geojson"
        color="#e8f4ff"
        opacity={0.55}
        radius={EARTH_RADIUS * 1.0015}
        step={1.2}
        visible={showCountries}
      />
      <BorderLines
        url="/data/admin1_lines.geojson"
        color="#b8d4f0"
        opacity={0.4}
        radius={EARTH_RADIUS * 1.0018}
        step={0.8}
        visible={showStates}
      />
    </group>
  );
}
