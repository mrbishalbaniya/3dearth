"use client";

/**
 * Cinematic post stack — Bloom, subtle DOF in deep space, ACES, vignette.
 */
import {
  EffectComposer,
  Bloom,
  ToneMapping,
  Vignette,
  DepthOfField,
} from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction } from "postprocessing";
import { useEarthStore } from "./store/earthStore";
import type { EarthQualityProfile } from "./types";

interface PostFXProps {
  quality: EarthQualityProfile;
}

export function PostFX({ quality }: PostFXProps) {
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);

  // Bloom only in deep space — at continent+ it amplifies z-fighting into white bands
  if (!quality.enableBloom || zoomLevel >= 2) return null;

  const bloomIntensity =
    zoomLevel === 0 ? 0.55 : zoomLevel === 1 ? 0.4 : zoomLevel === 2 ? 0.28 : 0.15;

  const enableDof = zoomLevel <= 1 && !reducedMotion && quality.id !== "low";
  const bokeh = enableDof ? (zoomLevel === 0 ? 1.5 : 1.0) : 0;

  return (
    <EffectComposer
      multisampling={quality.id === "ultra" ? 2 : 0}
      enableNormalPass={false}
    >
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.35}
        mipmapBlur
        radius={0.65}
      />
      <DepthOfField
        focusDistance={0.012}
        focalLength={0.028}
        bokehScale={bokeh}
        height={480}
      />
      <Vignette
        offset={0.22}
        darkness={zoomLevel <= 1 ? 0.42 : 0.25}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
