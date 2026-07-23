"use client";

import { useEffect, useMemo, useState } from "react";
import { Color, DoubleSide, Quaternion, Vector3 } from "three";
import { useEarthStore } from "./store/earthStore";
import { EARTH_RADIUS } from "./utils/constants";
import { latLngToVector3 } from "./utils/geo";
import { altitudeToZoomLevel, EARTH_RADIUS_M } from "./utils/zoomLevels";
import type { BuildingFeature, EarthQualityProfile } from "./types";

function synthesizeBuildings(
  lat: number,
  lng: number,
  count: number,
): BuildingFeature[] {
  const out: BuildingFeature[] = [];
  let seed = Math.abs(Math.floor(lat * 1000) ^ Math.floor(lng * 1000));
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    const dLat = (rand() - 0.5) * 0.012;
    const dLng = (rand() - 0.5) * 0.012;
    const height = 8 + rand() * (rand() > 0.85 ? 120 : 35);
    const tone = 0.35 + rand() * 0.45;
    out.push({
      id: `b-${i}`,
      lat: lat + dLat,
      lng: lng + dLng,
      height,
      width: 12 + rand() * 28,
      depth: 12 + rand() * 28,
      color: new Color(tone, tone * 0.95, tone * 0.85).getStyle(),
    });
  }
  return out;
}

async function fetchOsmBuildings(
  lat: number,
  lng: number,
  maxCount: number,
): Promise<BuildingFeature[] | null> {
  const delta = 0.008;
  const query = `
    [out:json][timeout:12];
    (
      way["building"](${lat - delta},${lng - delta},${lat + delta},${lng + delta});
    );
    out center tags;
  `;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      elements: Array<{
        id: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };
    return data.elements
      .filter((e) => e.center)
      .slice(0, maxCount)
      .map((e, i) => {
        const levels = Number(e.tags?.["building:levels"] || 0);
        const heightTag = Number(e.tags?.height || 0);
        const height =
          heightTag || (levels ? levels * 3.2 : 10 + (i % 17) * 2.5);
        return {
          id: `osm-${e.id}`,
          lat: e.center!.lat,
          lng: e.center!.lon,
          height: Math.min(height, 280),
          width: 14 + (i % 5) * 4,
          depth: 12 + (i % 7) * 3,
          color: e.tags?.building === "commercial" ? "#6a7a8c" : "#8a9098",
          name: e.tags?.name,
        } satisfies BuildingFeature;
      });
  } catch {
    return null;
  }
}

function BuildingMesh({ building }: { building: BuildingFeature }) {
  const { center, quat, widthUnits, heightUnits, depthUnits } = useMemo(() => {
    const base = latLngToVector3(
      building.lat,
      building.lng,
      EARTH_RADIUS * 1.0015,
    );
    const up = base.clone().normalize();
    const h = building.height / EARTH_RADIUS_M;
    const w = building.width / EARTH_RADIUS_M;
    const d = building.depth / EARTH_RADIUS_M;
    const c = base.clone().addScaledVector(up, h * 0.5);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), up);
    return {
      center: c,
      quat: q,
      widthUnits: w,
      heightUnits: h,
      depthUnits: d,
    };
  }, [building]);

  return (
    <mesh position={center} quaternion={quat} frustumCulled>
      <boxGeometry args={[widthUnits, heightUnits, depthUnits]} />
      <meshStandardMaterial
        color={building.color}
        roughness={0.55}
        metalness={0.28}
        emissive={building.color}
        emissiveIntensity={0.05}
        side={DoubleSide}
      />
    </mesh>
  );
}

interface BuildingsProps {
  quality: EarthQualityProfile;
}

export function Buildings({ quality }: BuildingsProps) {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.layers.buildings);
  const level = altitudeToZoomLevel(altitudeM);
  const [buildings, setBuildings] = useState<BuildingFeature[]>([]);

  const show = enabled && level.showBuildings;
  const focusKey = `${Math.round(focusLat * 200) / 200},${Math.round(focusLng * 200) / 200}`;

  useEffect(() => {
    if (!show) {
      setBuildings([]);
      return;
    }

    let cancelled = false;
    const [latS, lngS] = focusKey.split(",").map(Number);

    fetchOsmBuildings(latS, lngS, quality.maxBuildings).then((result) => {
      if (cancelled) return;
      const list =
        result && result.length > 0
          ? result
          : synthesizeBuildings(
              latS,
              lngS,
              Math.min(220, quality.maxBuildings),
            );
      setBuildings(list);
    });

    return () => {
      cancelled = true;
    };
  }, [show, focusKey, quality.maxBuildings]);

  if (!show || buildings.length === 0) return null;

  return (
    <group>
      {buildings.map((b) => (
        <BuildingMesh key={b.id} building={b} />
      ))}
    </group>
  );
}
