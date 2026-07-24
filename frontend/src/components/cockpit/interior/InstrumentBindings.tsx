"use client";

import { createPortal } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useState } from "react";
import type { Object3D } from "three";
import { CockpitDisplayScreen, type DisplayKind } from "./CockpitDisplayScreen";
import { COCKPIT_NODES } from "../models/nodeContract";

const BINDINGS: { kind: DisplayKind; node: string; size: [number, number] }[] = [
  { kind: "pfd", node: COCKPIT_NODES.socketPfd, size: [0.28, 0.24] },
  { kind: "nd", node: COCKPIT_NODES.socketNd, size: [0.28, 0.24] },
  { kind: "eicas", node: COCKPIT_NODES.socketEicas, size: [0.24, 0.24] },
];

export function InstrumentBindings({
  nodeIndex,
}: {
  nodeIndex: Map<string, Object3D> | null;
}) {
  if (!nodeIndex) return null;
  return (
    <>
      {BINDINGS.map((b) => (
        <BoundDisplay
          key={b.kind}
          kind={b.kind}
          target={nodeIndex.get(b.node) ?? null}
          size={b.size}
        />
      ))}
    </>
  );
}

function BoundDisplay({
  kind,
  target,
  size,
}: {
  kind: DisplayKind;
  target: Object3D | null;
  size: [number, number];
}) {
  const [host, setHost] = useState<Object3D | null>(null);

  useLayoutEffect(() => {
    setHost(target);
  }, [target]);

  const content = useMemo(
    () => (
      <CockpitDisplayScreen
        kind={kind}
        position={[0, 0, 0.002]}
        rotation={[0, 0, 0]}
        size={size}
      />
    ),
    [kind, size],
  );

  if (!host) return null;
  return <>{createPortal(content, host)}</>;
}
