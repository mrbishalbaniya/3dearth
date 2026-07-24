"use client";

/**
 * Modular cockpit framework — loads external GLB cabins only.
 * Never builds dashboard / fuselage / seats from BoxGeometry.
 *
 * Flow:
 * 1. Resolve model URL from aircraft registry
 * 2. GLTFLoader → scene graph (or missing)
 * 3. Merge named nodes + placeholder empties for absent sockets
 * 4. Portal instruments / raycast controls onto named nodes
 */
import { useCallback, useMemo, useState } from "react";
import type { Object3D } from "three";
import { getCockpitModelDef } from "../models/registry";
import { indexNamedNodes, useCockpitGltf } from "../models/useCockpitGltf";
import {
  COCKPIT_NODES,
  PLACEHOLDER_SOCKET_TRANSFORMS,
} from "../models/nodeContract";
import { PlaceholderAttachmentRig } from "./PlaceholderAttachmentRig";
import { InstrumentBindings } from "./InstrumentBindings";
import { NamedControlRaycast } from "./NamedControlRaycast";
import { createPortal } from "@react-three/fiber";
import { useCockpitStore } from "../stores/cockpitStore";

export function CockpitInterior({
  aircraftId,
  visualScale = 1,
}: {
  aircraftId: string;
  visualScale?: number;
}) {
  const def = useMemo(() => getCockpitModelDef(aircraftId), [aircraftId]);
  const { scene, status } = useCockpitGltf(def.url);
  const [placeholderNodes, setPlaceholderNodes] = useState<Map<
    string,
    Object3D
  > | null>(null);
  const emergency = useCockpitStore((s) => s.emergencyRed);

  const onPlaceholderReady = useCallback((nodes: Map<string, Object3D>) => {
    setPlaceholderNodes(nodes);
  }, []);

  const glbNodes = useMemo(
    () => (scene ? indexNamedNodes(scene) : null),
    [scene],
  );

  /** Prefer GLB nodes; fill gaps with placeholder empties */
  const nodeIndex = useMemo(() => {
    const map = new Map<string, Object3D>();
    if (placeholderNodes) {
      for (const [k, v] of placeholderNodes) map.set(k, v);
    }
    if (glbNodes) {
      for (const [k, v] of glbNodes) map.set(k, v);
    }
    return map;
  }, [glbNodes, placeholderNodes]);

  const cabinLightTarget =
    nodeIndex.get(COCKPIT_NODES.lightCabin) ??
    nodeIndex.get(COCKPIT_NODES.seatCaptain) ??
    null;

  return (
    <group
      name={`cockpit-framework-${aircraftId}`}
      scale={visualScale * def.scale}
      position={[0, def.offsetY, 0]}
    >
      {/* Imported cabin — only when GLB loads successfully */}
      {scene && (
        <primitive object={scene} dispose={null} />
      )}

      {/* Always register empty sockets for missing nodes (no meshes) */}
      <PlaceholderAttachmentRig onReady={onPlaceholderReady} />

      {/* Soft fill parented to named light empty — not cabin geometry */}
      {cabinLightTarget &&
        createPortal(
          <pointLight
            intensity={emergency ? 0.35 : 0.55}
            color={emergency ? "#ff4422" : "#c8d8f0"}
            distance={5}
            decay={2}
          />,
          cabinLightTarget,
        )}

      <InstrumentBindings nodeIndex={nodeIndex} />
      <NamedControlRaycast nodeIndex={nodeIndex} root={scene} />

      {status === "missing" || status === "idle" ? (
        <ModelMissingMarker />
      ) : null}
    </group>
  );
}

/**
 * Zero-geometry debug flag via userData on an empty — no visible primitives.
 * Artists: if you see instruments floating with no cabin, drop the GLB in place.
 */
function ModelMissingMarker() {
  // Intentionally renders nothing — placeholders + instruments only.
  // Console already warns from useCockpitGltf.
  void PLACEHOLDER_SOCKET_TRANSFORMS;
  return null;
}
