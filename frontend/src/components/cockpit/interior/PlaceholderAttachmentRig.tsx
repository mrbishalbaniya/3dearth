"use client";

/**
 * Invisible Object3D attachment sockets — no BoxGeometry / PlaneGeometry cabin.
 * Used until a GLB provides the same named nodes.
 */
import { useLayoutEffect, useRef } from "react";
import { Group, Object3D } from "three";
import {
  COCKPIT_NODES,
  PLACEHOLDER_SOCKET_TRANSFORMS,
} from "../models/nodeContract";

const SOCKET_NAMES = Object.values(COCKPIT_NODES);

export function PlaceholderAttachmentRig({
  onReady,
}: {
  onReady?: (nodes: Map<string, Object3D>) => void;
}) {
  const root = useRef<Group>(null);

  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;

    // Clear previous empties
    while (group.children.length) {
      group.remove(group.children[0]);
    }

    const nodes = new Map<string, Object3D>();
    for (const name of SOCKET_NAMES) {
      const empty = new Object3D();
      empty.name = name;
      const t = PLACEHOLDER_SOCKET_TRANSFORMS[name];
      if (t) {
        empty.position.set(...t.position);
        empty.rotation.set(...t.rotation);
      }
      group.add(empty);
      nodes.set(name, empty);
    }
    onReady?.(nodes);
  }, [onReady]);

  return <group ref={root} name="cockpit-attachment-rig" />;
}
