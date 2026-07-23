"use client";

import { useEffect, useState } from "react";
import { QUALITY_PROFILES } from "../utils/constants";
import type { EarthQualityProfile } from "../types";
import { useEarthStore } from "../store/earthStore";

function detectGpuTier(): EarthQualityProfile["id"] {
  if (typeof window === "undefined") return "medium";

  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");

  if (!gl || !(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
    return "low";
  }

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)).toLowerCase()
    : "";

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  if (
    renderer.includes("intel") &&
    !renderer.includes("arc") &&
    !renderer.includes("iris xe")
  ) {
    return isMobile ? "low" : "medium";
  }

  if (isMobile || cores <= 4 || memory <= 4) {
    return memory <= 2 || cores <= 2 ? "low" : "medium";
  }
  if (
    renderer.includes("rtx") ||
    renderer.includes("radeon rx") ||
    renderer.includes("apple m") ||
    memory >= 8
  ) {
    return "ultra";
  }
  return "high";
}

export function useGpuTier(): EarthQualityProfile {
  const qualityId = useEarthStore((s) => s.qualityId);
  const setQualityId = useEarthStore((s) => s.setQualityId);
  const [profile, setProfile] = useState<EarthQualityProfile>(
    QUALITY_PROFILES.high,
  );

  useEffect(() => {
    const detected = detectGpuTier();
    setQualityId(detected);
  }, [setQualityId]);

  useEffect(() => {
    setProfile(QUALITY_PROFILES[qualityId]);
  }, [qualityId]);

  return profile;
}

export function useReducedMotion(): boolean {
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const setReducedMotion = useEarthStore((s) => s.setReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [setReducedMotion]);

  return reducedMotion;
}

export function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ok = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
      setSupported(ok);
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}
