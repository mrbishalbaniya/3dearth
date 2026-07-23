"use client";

import { useEffect, useMemo, useState } from "react";
import { DoubleSide } from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { bboxAround, fetchForests, quantizeFocus } from "../overpass";
import { polygonToSphereGeometry } from "../geoProject";
import type { OsmPolygonFeature } from "../types";

export function ForestLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.forest);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const [features, setFeatures] = useState<OsmPolygonFeature[]>([]);
  const q = quantizeFocus(focusLat, focusLng, 0.03);

  useEffect(() => {
    if (!enabled || altitudeM > 150_000 || zoomLevel < 5) {
      setFeatures([]);
      return;
    }
    const ctrl = new AbortController();
    fetchForests(bboxAround(q.lat, q.lng, altitudeM > 30_000 ? 0.2 : 0.08), ctrl.signal)
      .then((res) => setFeatures(res.slice(0, 300)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [enabled, q.lat, q.lng, altitudeM, zoomLevel]);

  const meshes = useMemo(
    () =>
      features.map((f) => ({
        id: f.id,
        geo: polygonToSphereGeometry(f.rings[0], EARTH_RADIUS * 1.002),
      })),
    [features],
  );

  useEffect(() => {
    return () => {
      for (const m of meshes) m.geo.dispose();
    };
  }, [meshes]);

  if (!enabled || !meshes.length) return null;

  return (
    <group>
      {meshes.map(({ id, geo }) => (
        <mesh key={id} geometry={geo} renderOrder={4} frustumCulled>
          <meshStandardMaterial
            color="#145a32"
            transparent
            opacity={0.55}
            roughness={0.95}
            metalness={0}
            depthWrite={false}
            side={DoubleSide}
            emissive="#0a3018"
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}
