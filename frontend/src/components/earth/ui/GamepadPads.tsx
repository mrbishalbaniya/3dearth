"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEarthStore } from "../store/earthStore";

type StickKind = "move" | "look";

function clampStick(x: number, y: number, dead = 0.12) {
  const len = Math.hypot(x, y);
  if (len < dead) return { x: 0, y: 0 };
  const n = Math.min(1, len);
  const s = (n - dead) / (1 - dead);
  return { x: (x / len) * s, y: (y / len) * s };
}

function VirtualStick({
  kind,
  label,
}: {
  kind: StickKind;
  label: string;
}) {
  const setGamepad = useEarthStore((s) => s.setGamepad);
  const setIdleRotation = useEarthStore((s) => s.setIdleRotation);
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);
  const pointerId = useRef<number | null>(null);

  const apply = useCallback(
    (nx: number, ny: number) => {
      const v = clampStick(nx, ny);
      setKnob(v);
      if (kind === "move") {
        setGamepad({ moveX: v.x, moveY: v.y });
      } else {
        setGamepad({ lookX: v.x, lookY: v.y });
      }
      if (v.x !== 0 || v.y !== 0) setIdleRotation(false);
    },
    [kind, setGamepad, setIdleRotation],
  );

  const reset = useCallback(() => {
    active.current = false;
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    if (kind === "move") setGamepad({ moveX: 0, moveY: 0 });
    else setGamepad({ lookX: 0, lookY: 0 });
  }, [kind, setGamepad]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    active.current = true;
    pointerId.current = e.pointerId;
    baseRef.current?.setPointerCapture(e.pointerId);
    const rect = baseRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width * 0.42;
    apply((e.clientX - cx) / r, (e.clientY - cy) / r);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active.current || e.pointerId !== pointerId.current) return;
    e.preventDefault();
    const rect = baseRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width * 0.42;
    apply((e.clientX - cx) / r, (e.clientY - cy) / r);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    reset();
  };

  useEffect(() => () => reset(), [reset]);

  const holdAxis = (x: number, y: number) => {
    setIdleRotation(false);
    if (kind === "move") setGamepad({ moveX: x, moveY: y });
    else setGamepad({ lookX: x, lookY: y });
    setKnob({ x, y });
  };

  return (
    <div className={`earth-pad earth-pad--${kind}`}>
      <div className="earth-pad__label">{label}</div>
      <div className="earth-pad__ring">
        <button
          type="button"
          className="earth-pad__dir earth-pad__dir--up"
          aria-label={`${label} up`}
          onPointerDown={(e) => {
            e.preventDefault();
            holdAxis(0, -1);
          }}
          onPointerUp={reset}
          onPointerLeave={reset}
        >
          ▲
        </button>
        <button
          type="button"
          className="earth-pad__dir earth-pad__dir--down"
          aria-label={`${label} down`}
          onPointerDown={(e) => {
            e.preventDefault();
            holdAxis(0, 1);
          }}
          onPointerUp={reset}
          onPointerLeave={reset}
        >
          ▼
        </button>
        <button
          type="button"
          className="earth-pad__dir earth-pad__dir--left"
          aria-label={`${label} left`}
          onPointerDown={(e) => {
            e.preventDefault();
            holdAxis(-1, 0);
          }}
          onPointerUp={reset}
          onPointerLeave={reset}
        >
          ◀
        </button>
        <button
          type="button"
          className="earth-pad__dir earth-pad__dir--right"
          aria-label={`${label} right`}
          onPointerDown={(e) => {
            e.preventDefault();
            holdAxis(1, 0);
          }}
          onPointerUp={reset}
          onPointerLeave={reset}
        >
          ▶
        </button>
        <div
          ref={baseRef}
          className="earth-pad__stick"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="application"
          aria-label={`${label} stick`}
        >
          <div
            className="earth-pad__knob"
            style={{
              transform: `translate(${knob.x * 28}px, ${knob.y * 28}px)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Twin-stick gamepad: left = move, right = look / 360° rotate. */
export function GamepadPads() {
  return (
    <>
      <div className="earth-hud earth-hud--pad-left" aria-label="Move controls">
        <VirtualStick kind="move" label="Move" />
      </div>
      <div className="earth-hud earth-hud--pad-right" aria-label="Look controls">
        <VirtualStick kind="look" label="Look" />
      </div>
    </>
  );
}
