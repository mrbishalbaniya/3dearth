"use client";

import { useEffect, useRef } from "react";
import { IDLE_RESUME_DELAY_MS } from "../utils/constants";
import { useEarthStore } from "../store/earthStore";

/**
 * Tracks user interaction and resumes idle Earth rotation after inactivity.
 */
export function useIdleRotationController(): void {
  const setInteracting = useEarthStore((s) => s.setInteracting);
  const setIdleRotation = useEarthStore((s) => s.setIdleRotation);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onInteract = () => {
      setInteracting(true);
      setIdleRotation(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setInteracting(false);
        setIdleRotation(true);
      }, IDLE_RESUME_DELAY_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "wheel",
      "touchstart",
      "keydown",
    ];

    for (const event of events) {
      window.addEventListener(event, onInteract, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, onInteract);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setIdleRotation, setInteracting]);
}
