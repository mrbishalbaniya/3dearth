"use client";

/**
 * Procedural vegetation — instanced trees densified from OSM forest polygons.
 * Density fades with altitude; pine vs broadleaf by latitude.
 */
import { Instances, Instance } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { Color, Quaternion, Vector3 } from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import { bboxAround, fetchForests, quantizeFocus } from "../overpass";
import type { OsmPolygonFeature } from "../types";

interface TreeInstance {
  id: string;
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  color: string;
}

function pointInRing(
  lng: number,
  lat: number,
  ring: Array<[number, number]>,
): boolean {
  // Ray cast
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function sampleTreesInPolygon(
  feature: OsmPolygonFeature,
  count: number,
  pine: boolean,
): TreeInstance[] {
  const ring = feature.rings[0];
  if (!ring || ring.length < 3) return [];
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  const out: TreeInstance[] = [];
  const up = new Vector3();
  const yAxis = new Vector3(0, 1, 0);
  let attempts = 0;
  while (out.length < count && attempts < count * 8) {
    attempts += 1;
    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);
    if (!pointInRing(lng, lat, ring)) continue;
    const base = latLngToVector3(lat, lng, EARTH_RADIUS * 1.0022);
    up.copy(base).normalize();
    const h = (pine ? 14 + Math.random() * 18 : 8 + Math.random() * 14) / EARTH_RADIUS_M;
    const w = (pine ? 3 + Math.random() * 3 : 4 + Math.random() * 5) / EARTH_RADIUS_M;
    const center = base.clone().addScaledVector(up, h * 0.45);
    const quat = new Quaternion().setFromUnitVectors(yAxis, up);
    out.push({
      id: `${feature.id}-${out.length}`,
      position: center,
      quaternion: quat,
      scale: new Vector3(w, h, w),
      color: pine ? "#1a4a2e" : "#1f6b3a",
    });
  }
  return out;
}

export function VegetationLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.forest);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const qualityId = useEarthStore((s) => s.qualityId);
  const season = useEarthStore((s) => s.season);

  const [features, setFeatures] = useState<OsmPolygonFeature[]>([]);
  const q = quantizeFocus(focusLat, focusLng, 0.03);

  useEffect(() => {
    // Trees only at city-ish zoom; canopy polygons handled by ForestLayer
    if (!enabled || altitudeM > 25_000 || zoomLevel < 5) {
      setFeatures([]);
      return;
    }
    const ctrl = new AbortController();
    // Same bbox rule as ForestLayer so overpass cache/coalesce hits
    const delta = altitudeM > 30_000 ? 0.2 : 0.08;
    fetchForests(bboxAround(q.lat, q.lng, delta), ctrl.signal)
      .then((res) => setFeatures(res.slice(0, 40)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [enabled, q.lat, q.lng, altitudeM, zoomLevel]);

  const trees = useMemo(() => {
    if (!features.length) return [] as TreeInstance[];
    const pine = Math.abs(focusLat) > 40 || season === "winter";
    const perPoly =
      qualityId === "ultra"
        ? 28
        : qualityId === "high"
          ? 18
          : qualityId === "medium"
            ? 10
            : 5;
    const fade = altitudeM > 15_000 ? 0.35 : altitudeM > 8_000 ? 0.65 : 1;
    const budget = Math.floor(perPoly * fade);
    const all: TreeInstance[] = [];
    for (const f of features) {
      all.push(...sampleTreesInPolygon(f, budget, pine));
      if (all.length > 2000) break;
    }
    // Autumn tint
    if (season === "autumn") {
      for (const t of all) {
        if (!pine) t.color = Math.random() > 0.5 ? "#b85a2a" : "#c4a035";
      }
    }
    return all;
  }, [features, focusLat, qualityId, altitudeM, season]);

  if (!enabled || !trees.length || altitudeM > 25_000) return null;

  const opacity = altitudeM > 12_000 ? 0.55 : 0.95;

  return (
    <group>
      <Instances limit={trees.length} range={trees.length} frustumCulled>
        {/* Simple cone-ish tree via scaled box / cone */}
        <coneGeometry args={[0.5, 1, 5]} />
        <meshStandardMaterial
          transparent
          opacity={opacity}
          roughness={0.9}
          metalness={0}
        />
        {trees.map((t) => (
          <Instance
            key={t.id}
            position={t.position}
            quaternion={t.quaternion}
            scale={t.scale}
            color={new Color(t.color)}
          />
        ))}
      </Instances>
    </group>
  );
}
