"use client";

/**
 * Natural Earth parks & protected areas (free GeoJSON).
 */
import { useEffect, useMemo, useState } from "react";
import { DoubleSide } from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import {
  applyVertexColor,
  lineStringToSpherePositions,
  createLineGeometry,
  polygonToSphereGeometry,
} from "../geoProject";

interface ParkPoly {
  id: string;
  name: string;
  ring: Array<[number, number]>;
}

export function ParksLayer() {
  const enabled = useEarthStore((s) => s.gisLayers.parks);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const [parks, setParks] = useState<ParkPoly[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/data/parks.geojson")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const out: ParkPoly[] = [];
        for (const f of data.features || []) {
          const name =
            f.properties?.name ||
            f.properties?.NAME ||
            f.properties?.unit_name ||
            "Protected area";
          const g = f.geometry;
          if (!g) continue;
          const rings: number[][][] =
            g.type === "Polygon"
              ? [g.coordinates[0]]
              : g.type === "MultiPolygon"
                ? g.coordinates.map((p: number[][][]) => p[0])
                : [];
          for (let i = 0; i < rings.length; i++) {
            const ring = rings[i].map(
              (c: number[]) => [c[0], c[1]] as [number, number],
            );
            out.push({ id: `${name}-${i}-${out.length}`, name, ring });
          }
        }
        setParks(out);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const nearby = useMemo(() => {
    if (!enabled || zoomLevel < 2) return [];
    const maxDist = zoomLevel <= 3 ? 80 : zoomLevel <= 5 ? 25 : 8;
    return parks
      .filter((p) => {
        const [lng, lat] = p.ring[0] || [0, 0];
        const dLat = lat - focusLat;
        const dLng = lng - focusLng;
        return dLat * dLat + dLng * dLng < maxDist * maxDist;
      })
      .slice(0, zoomLevel <= 3 ? 40 : 80);
  }, [parks, enabled, zoomLevel, focusLat, focusLng]);

  const meshes = useMemo(
    () =>
      nearby.map((p) => {
        const geo = polygonToSphereGeometry(p.ring, EARTH_RADIUS * 1.0017);
        applyVertexColor(geo, "#1a6b3c");
        return { id: p.id, geo };
      }),
    [nearby],
  );

  const outlines = useMemo(() => {
    if (!nearby.length) return null;
    const segs = nearby.map((p) =>
      lineStringToSpherePositions(p.ring, EARTH_RADIUS * 1.0019, 0.4),
    );
    return createLineGeometry(segs);
  }, [nearby]);

  useEffect(() => {
    return () => {
      for (const m of meshes) m.geo.dispose();
      outlines?.dispose();
    };
  }, [meshes, outlines]);

  if (!enabled || !nearby.length) return null;

  return (
    <group>
      {meshes.map(({ id, geo }) => (
        <mesh key={id} geometry={geo} renderOrder={3} frustumCulled>
          <meshBasicMaterial
            color="#1a6b3c"
            transparent
            opacity={0.28}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
      {outlines && (
        <lineSegments geometry={outlines} renderOrder={6}>
          <lineBasicMaterial
            color="#4ade80"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
}
