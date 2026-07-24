"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Raycaster, Vector2, Vector3 } from "three";
import { useEarthStore } from "./store/earthStore";
import { GEOJSON_URL } from "./utils/constants";
import { vector3ToLatLng } from "./utils/geo";
import type { GeoJsonCollection, GeoJsonFeature } from "./types";

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function featureContains(feature: GeoJsonFeature, lng: number, lat: number): boolean {
  const testPolygon = (coords: number[][][]) => {
    if (!coords[0] || !pointInRing(lng, lat, coords[0])) return false;
    for (let h = 1; h < coords.length; h++) {
      if (pointInRing(lng, lat, coords[h])) return false;
    }
    return true;
  };

  if (feature.geometry.type === "Polygon") {
    return testPolygon(feature.geometry.coordinates);
  }
  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.some(testPolygon);
  }
  return false;
}

function featureName(feature: GeoJsonFeature): string {
  return (
    feature.properties.NAME ||
    feature.properties.ADMIN ||
    feature.properties.name ||
    "Unknown"
  );
}

/**
 * Raycast Earth surface → lat/lng → GeoJSON country lookup.
 * Accounts for idle Earth Y-rotation so geography stays correct.
 */
export function CountryInteraction({
  earthRotationY,
}: {
  earthRotationY: React.MutableRefObject<number>;
}) {
  const { camera, gl } = useThree();
  const geoRef = useRef<GeoJsonCollection | null>(null);
  const setHoveredCountry = useEarthStore((s) => s.setHoveredCountry);
  const selectCountry = useEarthStore((s) => s.selectCountry);
  const raycaster = useRef(new Raycaster());
  const pointer = useRef(new Vector2());
  const hit = useRef(new Vector3());
  const localHit = useRef(new Vector3());

  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((data: GeoJsonCollection) => {
        if (!cancelled) geoRef.current = data;
      })
      .catch(() => {
        /* borders component handles fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = gl.domElement;

    const resolveCountry = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const origin = raycaster.current.ray.origin;
      const dir = raycaster.current.ray.direction;
      const a = dir.dot(dir);
      const b = 2 * origin.dot(dir);
      const c = origin.dot(origin) - 1;
      const disc = b * b - 4 * a * c;
      if (disc < 0 || !geoRef.current) return null;

      const t = (-b - Math.sqrt(disc)) / (2 * a);
      hit.current.copy(origin).addScaledVector(dir, t);

      // Inverse Earth Y rotation → geographic local frame
      const cos = Math.cos(-earthRotationY.current);
      const sin = Math.sin(-earthRotationY.current);
      localHit.current.set(
        hit.current.x * cos - hit.current.z * sin,
        hit.current.y,
        hit.current.x * sin + hit.current.z * cos,
      );

      const { lat, lng } = vector3ToLatLng(localHit.current);

      for (const feature of geoRef.current.features) {
        if (featureContains(feature, lng, lat)) {
          return { name: featureName(feature), lat, lng };
        }
      }
      return { name: null as string | null, lat, lng };
    };

    let hoverRaf = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(hoverRaf);
      hoverRaf = requestAnimationFrame(() => {
        const result = resolveCountry(event.clientX, event.clientY);
        setHoveredCountry(result?.name ?? null);
      });
    };

    const onClick = (event: MouseEvent) => {
      if (event.detail === 0) return;
      const result = resolveCountry(event.clientX, event.clientY);
      // Select only — do not auto-zoom on click (use search / dig sticks to navigate)
      selectCountry(result?.name ?? null);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(hoverRaf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("click", onClick);
    };
  }, [
    camera,
    gl,
    earthRotationY,
    setHoveredCountry,
    selectCountry,
  ]);

  return null;
}
