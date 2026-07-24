"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  Vector3,
} from "three";
import { useEarthStore } from "./store/earthStore";
import {
  BORDER_COLOR,
  BORDER_OPACITY,
  EARTH_RADIUS,
  GEOJSON_URL,
} from "./utils/constants";
import { latLngToVector3 } from "./utils/geo";
import type { GeoJsonCollection, GeoJsonFeature } from "./types";

const tmp = new Vector3();

function densifyRing(
  ring: number[][],
  maxStepDeg = 1.25,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    out.push([lng1, lat1]);

    const dLat = lat2 - lat1;
    const dLng = ((lng2 - lng1 + 540) % 360) - 180;
    const steps = Math.max(
      1,
      Math.ceil(Math.sqrt(dLat * dLat + dLng * dLng) / maxStepDeg),
    );

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      out.push([lng1 + dLng * t, lat1 + dLat * t]);
    }
  }
  return out;
}

function featureToPositions(feature: GeoJsonFeature): Float32Array {
  const positions: number[] = [];
  const pushSegment = (lng1: number, lat1: number, lng2: number, lat2: number) => {
    latLngToVector3(lat1, lng1, EARTH_RADIUS * 1.0015, tmp);
    positions.push(tmp.x, tmp.y, tmp.z);
    latLngToVector3(lat2, lng2, EARTH_RADIUS * 1.0015, tmp);
    positions.push(tmp.x, tmp.y, tmp.z);
  };

  const processRing = (ring: number[][]) => {
    const dense = densifyRing(ring);
    for (let i = 0; i < dense.length - 1; i++) {
      pushSegment(dense[i][0], dense[i][1], dense[i + 1][0], dense[i + 1][1]);
    }
  };

  if (feature.geometry.type === "Polygon") {
    for (const ring of feature.geometry.coordinates) processRing(ring);
  } else if (feature.geometry.type === "MultiPolygon") {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) processRing(ring);
    }
  }

  return new Float32Array(positions);
}

export function CountryBorders() {
  const visible = useEarthStore((s) => s.layers.borders);
  const selectedCountry = useEarthStore((s) => s.selectedCountry);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const earthRotationY = useRef(0);
  const groupRef = useRef<Group>(null);
  const [geo, setGeo] = useState<GeoJsonCollection | null>(null);
  const appearRef = useRef(0);

  // Sync with Earth rotation via store subscription pattern:
  // borders live in the same parent group in EarthScene.

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(GEOJSON_URL);
        if (!res.ok) throw new Error("GeoJSON missing");
        const data = (await res.json()) as GeoJsonCollection;
        if (!cancelled) setGeo(data);
      } catch {
        // Minimal fallback outline (simplified continents bounding boxes as arcs)
        if (!cancelled) {
          setGeo({
            type: "FeatureCollection",
            features: FALLBACK_FEATURES,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { geometry, material } = useMemo(() => {
    const geom = new BufferGeometry();
    const mat = new LineBasicMaterial({
      color: new Color(BORDER_COLOR),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    if (geo) {
      const chunks: number[] = [];
      for (const feature of geo.features) {
        const positions = featureToPositions(feature);
        for (let i = 0; i < positions.length; i++) chunks.push(positions[i]);
      }
      geom.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(chunks), 3),
      );
    }

    return { geometry: geom, material: mat };
  }, [geo]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const zoomShow = zoomLevel >= 1 && zoomLevel <= 4;
    const shouldShow = visible && zoomShow;
    groupRef.current.visible = appearRef.current > 0.02;

    if (shouldShow) {
      appearRef.current = Math.min(1, appearRef.current + delta * 0.6);
    } else {
      appearRef.current = Math.max(0, appearRef.current - delta * 1.2);
    }

    const levelOpacity =
      zoomLevel === 1 ? 0.45 : zoomLevel === 2 ? 0.65 : zoomLevel === 3 ? 0.75 : 0.4;
    material.opacity = BORDER_OPACITY * appearRef.current * levelOpacity;
    if (selectedCountry) {
      material.color.set("#ffffff");
      material.opacity = Math.min(0.9, material.opacity + 0.15);
    } else {
      material.color.set(BORDER_COLOR);
    }
  });

  if (!geo) return null;

  return (
    <group ref={groupRef} userData={{ earthRotationY }}>
      <lineSegments geometry={geometry} material={material} renderOrder={4} />
    </group>
  );
}

/** Tiny fallback so borders still appear without the GeoJSON file. */
const FALLBACK_FEATURES: GeoJsonFeature[] = [
  {
    type: "Feature",
    properties: { name: "Outline" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-130, 50],
            [-60, 50],
            [-60, 15],
            [-130, 15],
            [-130, 50],
          ],
        ],
        [
          [
            [-10, 60],
            [40, 60],
            [40, 35],
            [-10, 35],
            [-10, 60],
          ],
        ],
        [
          [
            [70, 55],
            [145, 55],
            [145, 10],
            [70, 10],
            [70, 55],
          ],
        ],
        [
          [
            [110, -10],
            [155, -10],
            [155, -40],
            [110, -40],
            [110, -10],
          ],
        ],
        [
          [
            [-80, 10],
            [-35, 10],
            [-35, -55],
            [-80, -55],
            [-80, 10],
          ],
        ],
        [
          [
            [-20, 35],
            [50, 35],
            [50, -35],
            [-20, -35],
            [-20, 35],
          ],
        ],
      ],
    },
  },
];
