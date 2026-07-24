"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Vector3 } from "three";
import { useEarthStore } from "../../store/earthStore";
import { MAP_LABELS } from "../../utils/labels";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS } from "../../utils/constants";
import { altitudeToZoomLevel } from "../../utils/zoomLevels";

function dist2(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

/** Max label span from focus (degrees²) — tighter when low so far-side cities vanish. */
function maxFocusSpanDeg2(altitudeM: number, zoomLevel: number): number {
  if (zoomLevel <= 1) return 180 * 180;
  if (altitudeM > 2_000_000) return 90 * 90;
  if (altitudeM > 500_000) return 45 * 45;
  if (altitudeM > 100_000) return 22 * 22;
  if (altitudeM > 30_000) return 10 * 10;
  if (altitudeM > 8_000) return 4 * 4;
  return 1.5 * 1.5;
}

interface DynamicLabel {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
  priority?: number;
}

const _world = new Vector3();
const _camPos = new Vector3();
const _camDir = new Vector3();

/**
 * One label — hidden when on the far side of the globe (behind the limb).
 */
function GlobeLabel({
  label,
  sizeClass,
}: {
  label: DynamicLabel;
  sizeClass: string;
}) {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();
  const [front, setFront] = useState(true);
  const pos = useMemo(
    () => latLngToVector3(label.lat, label.lng, EARTH_RADIUS * 1.0045),
    [label.lat, label.lng],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.getWorldPosition(_world);
    const len = _world.length() || 1;
    _world.multiplyScalar(1 / len);

    _camPos.copy(camera.position);
    const camLen = _camPos.length();

    let next: boolean;
    if (camLen < 1.02) {
      // Camera inside / extremely close — only labels ahead of the view
      camera.getWorldDirection(_camDir);
      next = _world.dot(_camDir) > 0.2;
    } else {
      // Horizon / limb cull — hide the back of the globe
      _camPos.multiplyScalar(1 / camLen);
      const limb = Math.min(0.98, 1 / camLen + 0.04);
      next = _world.dot(_camPos) > limb;
    }
    if (next !== front) setFront(next);
  });

  if (!front) return <group ref={groupRef} position={pos} />;

  return (
    <group ref={groupRef} position={pos}>
      <Html
        center
        style={{ pointerEvents: "none" }}
        zIndexRange={[12, 0]}
        occlude={false}
      >
        <div className={`earth-label ${sizeClass}`}>{label.name}</div>
      </Html>
    </group>
  );
}

/**
 * Progressive labels: continents → countries → cities → streets / rivers / peaks.
 * Never shows the far side of the globe.
 */
export function LabelLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.labels);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const level = altitudeToZoomLevel(altitudeM);

  const [riverLabels, setRiverLabels] = useState<DynamicLabel[]>([]);

  useEffect(() => {
    if (!enabled || zoomLevel < 3) {
      setRiverLabels([]);
      return;
    }
    let cancelled = false;
    fetch("/data/rivers.geojson")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const labels: DynamicLabel[] = [];
        for (const f of data.features || []) {
          const name = f.properties?.name || f.properties?.NAME;
          if (!name) continue;
          const g = f.geometry;
          let coords: number[][] | null = null;
          if (g?.type === "LineString") coords = g.coordinates;
          else if (g?.type === "MultiLineString") coords = g.coordinates[0];
          if (!coords?.length) continue;
          const mid = coords[Math.floor(coords.length / 2)];
          labels.push({
            id: `river-${name}-${mid[0]}`,
            name,
            lng: mid[0],
            lat: mid[1],
            kind: "river",
          });
        }
        setRiverLabels(labels);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, zoomLevel]);

  const visible = useMemo(() => {
    if (!enabled || !level.showLabels) return [];

    const kinds = new Set(level.labelKinds);
    const span = maxFocusSpanDeg2(altitudeM, zoomLevel);

    const curated = MAP_LABELS.filter((l) => {
      if (!kinds.has(l.kind)) return false;
      if (zoomLevel < l.minLevel || zoomLevel > l.maxLevel) return false;
      if (dist2(focusLat, focusLng, l.lat, l.lng) > span) return false;
      if (l.kind === "street" || l.kind === "building") {
        return dist2(focusLat, focusLng, l.lat, l.lng) < 0.08 * 0.08;
      }
      return true;
    });

    const extras: DynamicLabel[] = [];

    if (zoomLevel >= 3 && zoomLevel <= 5) {
      for (const r of riverLabels) {
        if (dist2(focusLat, focusLng, r.lat, r.lng) < span) {
          extras.push({ ...r, priority: 4 });
        }
      }
    }

    const all = [...curated, ...extras].sort((a, b) => {
      const da = dist2(focusLat, focusLng, a.lat, a.lng);
      const db = dist2(focusLat, focusLng, b.lat, b.lng);
      if (zoomLevel >= 3 && Math.abs(da - db) > 0.5) return da - db;
      return (b.priority || 0) - (a.priority || 0);
    });

    const max =
      zoomLevel <= 1 ? 6 : zoomLevel <= 3 ? 14 : zoomLevel <= 5 ? 20 : 28;
    const minSep =
      zoomLevel <= 2 ? 16 : zoomLevel <= 4 ? 3 : zoomLevel <= 6 ? 0.4 : 0.1;
    const accepted: DynamicLabel[] = [];
    for (const label of all) {
      if (accepted.length >= max) break;
      if (
        accepted.some(
          (o) => dist2(label.lat, label.lng, o.lat, o.lng) < minSep * minSep,
        )
      )
        continue;
      accepted.push(label);
    }
    return accepted;
  }, [
    enabled,
    level,
    zoomLevel,
    altitudeM,
    focusLat,
    focusLng,
    riverLabels,
  ]);

  if (!visible.length) return null;

  return (
    <group>
      {visible.map((label) => {
        const sizeClass =
          label.kind === "continent"
            ? "earth-label--continent"
            : label.kind === "country"
              ? "earth-label--country"
              : label.kind === "city"
                ? "earth-label--city"
                : "earth-label--street";

        return (
          <GlobeLabel key={label.id} label={label} sizeClass={sizeClass} />
        );
      })}
    </group>
  );
}
