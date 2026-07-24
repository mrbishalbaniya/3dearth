"use client";

/**
 * OSM buildings — real footprints for footprint size, GPU instancing, LOD caps.
 */
import { Instances, Instance } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { Color, Quaternion, Vector3 } from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import {
  bboxAround,
  fetchBuildingsDetailed,
  quantizeFocus,
} from "../overpass";
import { peekElevation, vectorScheduler } from "../../streaming";
import { useGameStore } from "../../../game/store/gameStore";

interface Bld {
  id: string;
  lat: number;
  lng: number;
  height: number;
  building: string;
  color: string;
  width: number;
  depth: number;
  glass: boolean;
}

function buildingColor(type: string): string {
  if (type === "commercial" || type === "office" || type === "retail")
    return "#6a7a8c";
  if (type === "industrial" || type === "warehouse") return "#7a7068";
  if (type === "church" || type === "cathedral" || type === "temple" || type === "mosque")
    return "#c4b59a";
  if (type === "stadium") return "#5a8a6a";
  if (type === "apartments" || type === "residential") return "#8a8680";
  if (type === "hotel") return "#9a8a7a";
  return "#8a9098";
}

function footprintSize(
  footprint?: Array<[number, number]>,
): { w: number; d: number } {
  if (!footprint || footprint.length < 3) return { w: 14, d: 12 };
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of footprint) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const midLat = (minLat + maxLat) / 2;
  const w = (maxLng - minLng) * 111_320 * Math.cos((midLat * Math.PI) / 180);
  const d = (maxLat - minLat) * 110_540;
  return {
    w: Math.max(5, Math.min(90, w || 14)),
    d: Math.max(5, Math.min(90, d || 12)),
  };
}

export function BuildingLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.buildings);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const qualityId = useEarthStore((s) => s.qualityId);
  const snowCover = useEarthStore((s) => s.weatherIntensities.snowCover);
  const wetness = useEarthStore((s) => s.weatherIntensities.wetness);
  const flightMode = useGameStore((s) => s.mode === "flight");

  const [buildings, setBuildings] = useState<Bld[]>([]);
  const q = quantizeFocus(focusLat, focusLng, 0.012);

  // LOD: fewer / simpler farther out
  const max =
    altitudeM > 12_000
      ? qualityId === "low"
        ? 80
        : 200
      : qualityId === "ultra"
        ? 1400
        : qualityId === "high"
          ? 900
          : qualityId === "medium"
            ? 450
            : 180;

  useEffect(() => {
    if (!enabled || flightMode || zoomLevel < 5 || altitudeM > 30_000) {
      setBuildings([]);
      return;
    }
    const ctrl = new AbortController();
    const gen = vectorScheduler.beginGeneration();
    const delta = altitudeM > 10_000 ? 0.04 : altitudeM > 4_000 ? 0.025 : 0.015;
    const key = `bld:${q.lat.toFixed(3)},${q.lng.toFixed(3)}`;

    vectorScheduler
      .enqueue(
        key,
        80,
        (signal) =>
          fetchBuildingsDetailed(
            bboxAround(q.lat, q.lng, delta),
            signal ?? ctrl.signal,
          ),
        gen,
      )
      .then((res) => {
        setBuildings(
          res.slice(0, max).map((b) => {
            const size = footprintSize(b.footprint);
            const type = b.building;
            return {
              id: b.id,
              lat: b.lat,
              lng: b.lng,
              height: b.height,
              building: type,
              color: buildingColor(type),
              width: size.w,
              depth: size.d,
              glass:
                type === "commercial" ||
                type === "office" ||
                type === "retail" ||
                type === "yes",
            };
          }),
        );
      })
      .catch(() => undefined);

    return () => {
      ctrl.abort();
    };
  }, [enabled, flightMode, q.lat, q.lng, altitudeM, zoomLevel, max]);

  const instances = useMemo(() => {
    const up = new Vector3();
    const yAxis = new Vector3(0, 1, 0);
    const quat = new Quaternion();
    return buildings.map((b) => {
      const elevM = peekElevation(b.lat, b.lng) ?? 0;
      const baseR = EARTH_RADIUS * (1 + (elevM + 2) / EARTH_RADIUS_M);
      const base = latLngToVector3(b.lat, b.lng, baseR);
      up.copy(base).normalize();
      const h = b.height / EARTH_RADIUS_M;
      const w = b.width / EARTH_RADIUS_M;
      const d = b.depth / EARTH_RADIUS_M;
      const center = base.clone().addScaledVector(up, h * 0.5);
      quat.setFromUnitVectors(yAxis, up);
      // Snow roofs / wet darkening
      const c = new Color(b.color);
      if (snowCover > 0.3) c.lerp(new Color("#e8eef5"), snowCover * 0.45);
      if (wetness > 0.3) c.multiplyScalar(1 - wetness * 0.25);
      return {
        id: b.id,
        position: center,
        quaternion: quat.clone(),
        scale: new Vector3(w, h, d),
        color: c,
        glass: b.glass,
      };
    });
  }, [buildings, snowCover, wetness]);

  if (!enabled || flightMode || !instances.length) return null;

  // Two instance batches: glass vs matte for material LOD
  const glass = instances.filter((i) => i.glass);
  const matte = instances.filter((i) => !i.glass);

  return (
    <group>
      {matte.length > 0 && (
        <Instances limit={matte.length} range={matte.length} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.7} metalness={0.12} />
          {matte.map((b) => (
            <Instance
              key={b.id}
              position={b.position}
              quaternion={b.quaternion}
              scale={b.scale}
              color={b.color}
            />
          ))}
        </Instances>
      )}
      {glass.length > 0 && (
        <Instances limit={glass.length} range={glass.length} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            roughness={0.22}
            metalness={0.55}
            envMapIntensity={0.8}
          />
          {glass.map((b) => (
            <Instance
              key={b.id}
              position={b.position}
              quaternion={b.quaternion}
              scale={b.scale}
              color={b.color}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
