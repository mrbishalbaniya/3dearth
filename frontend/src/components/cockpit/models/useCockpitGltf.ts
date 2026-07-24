"use client";

/**
 * Loads a cockpit GLB via GLTFLoader. Never fabricates cabin geometry.
 * On missing/failed asset → null scene (caller uses empty attachment sockets).
 */
import { useEffect, useState } from "react";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Object3D } from "three";

const cache = new Map<string, Promise<GLTF | null>>();

function loadGltf(url: string): Promise<GLTF | null> {
  const hit = cache.get(url);
  if (hit) return hit;

  const promise = new Promise<GLTF | null>((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      () => {
        console.warn(`[cockpit] GLB not found or failed: ${url}`);
        resolve(null);
      },
    );
  });
  cache.set(url, promise);
  return promise;
}

export function useCockpitGltf(url: string | null): {
  scene: Object3D | null;
  status: "idle" | "loading" | "ready" | "missing";
} {
  const [scene, setScene] = useState<Object3D | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "missing">(
    url ? "loading" : "idle",
  );

  useEffect(() => {
    if (!url) {
      setScene(null);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setScene(null);
    void loadGltf(url).then((gltf) => {
      if (cancelled) return;
      if (!gltf) {
        setScene(null);
        setStatus("missing");
        return;
      }
      // Clone so multiple aircraft instances don't share one scene graph
      const cloned = gltf.scene.clone(true);
      setScene(cloned);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { scene, status };
}

/** Index all named Object3Ds under a root (first wins on duplicate names). */
export function indexNamedNodes(root: Object3D): Map<string, Object3D> {
  const map = new Map<string, Object3D>();
  root.traverse((obj) => {
    if (obj.name && !map.has(obj.name)) map.set(obj.name, obj);
  });
  return map;
}

export function clearCockpitGltfCache() {
  cache.clear();
}
