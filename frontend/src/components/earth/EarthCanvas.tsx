"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { ACESFilmicToneMapping, Color, SRGBColorSpace } from "three";
import { EarthScene } from "./EarthScene";
import { useGpuTier, useReducedMotion, useWebGLSupport } from "./hooks/usePerformance";
import { useIdleRotationController } from "./hooks/useIdleRotation";
import { useEarthStore } from "./store/earthStore";
import { EarthControls } from "./ui/EarthControls";
import { LoadingScreen } from "./ui/LoadingScreen";
import { CAMERA_DEFAULT_DISTANCE } from "./utils/constants";
import { EarthEngineProvider } from "./engine/hooks/useEarthEngine";
import { DebugOverlay } from "./engine/debug/DebugOverlay";
import { EarthEngine } from "./engine/core/EarthEngine";
import { EarthAppModeProvider, type EarthAppMode } from "./appMode";
import { useGameStore } from "../game/store/gameStore";
import { useSimUiStore } from "../sim";

class EarthErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Earth]", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function FpsTracker() {
  const setFps = useEarthStore((s) => s.setFps);
  const setQualityId = useEarthStore((s) => s.setQualityId);
  const qualityId = useEarthStore((s) => s.qualityId);
  const frames = useRef(0);
  const last = useRef(performance.now());
  const lowStreak = useRef(0);

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - last.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - last.current));
      setFps(fps);
      frames.current = 0;
      last.current = now;

      // Adaptive quality: drop tier if sustained low FPS
      if (fps < 38) {
        lowStreak.current += 1;
        if (lowStreak.current >= 4) {
          const order = ["ultra", "high", "medium", "low"] as const;
          const idx = order.indexOf(qualityId);
          if (idx < order.length - 1) {
            setQualityId(order[idx + 1]);
          }
          lowStreak.current = 0;
        }
      } else {
        lowStreak.current = 0;
      }
    }
  });

  return null;
}

function ExposureSync() {
  const exposure = useEarthStore((s) => s.exposure);
  useFrame(({ gl }) => {
    gl.toneMappingExposure = exposure;
  });
  return null;
}

function WebGLFallback() {
  return (
    <div className="earth-fallback">
      <div className="earth-fallback__content">
        <h2>3D Earth unavailable</h2>
        <p>
          This device does not support WebGL. Try a modern browser or enable
          hardware acceleration.
        </p>
      </div>
    </div>
  );
}

interface EarthCanvasProps {
  mode?: EarthAppMode;
}

export function EarthCanvas({ mode = "observatory" }: EarthCanvasProps) {
  const quality = useGpuTier();
  const webgl = useWebGLSupport();
  useReducedMotion();
  useIdleRotationController();

  const containerRef = useRef<HTMLDivElement>(null);
  const isFullscreen = useEarthStore((s) => s.isFullscreen);
  const setFullscreen = useEarthStore((s) => s.setFullscreen);
  const isReady = useEarthStore((s) => s.isReady);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [setFullscreen]);

  useEffect(() => {
    EarthEngine.shared.init();
    const onKey = (e: KeyboardEvent) => {
      const store = useEarthStore.getState();
      if (e.key === "+" || e.key === "=") store.requestZoom(0.35);
      if (e.key === "-" || e.key === "_") store.requestZoom(-0.35);
      if (e.key === "r" || e.key === "R") store.requestResetCamera();
      if (e.key === "`" || (e.key === "d" && e.ctrlKey)) {
        e.preventDefault();
        store.toggleDebugMode();
      }
      if (e.key === "f" || e.key === "F") {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) void el.requestFullscreen();
        else void document.exitFullscreen();
      }
      if (e.key === "1") store.toggleLayer("atmosphere");
      if (e.key === "2") store.toggleLayer("clouds");
      if (e.key === "3") store.toggleLayer("borders");
      if (e.key === "4") store.toggleLayer("stars");
      if (e.key === "5") store.toggleLayer("dayNight");
      if (e.key === "n" || e.key === "N") store.toggleNorthLock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!webgl) return <WebGLFallback />;

  return (
    <EarthAppModeProvider mode={mode}>
      <div
        ref={containerRef}
        className={`earth-viewport ${isFullscreen ? "earth-viewport--fs" : ""} earth-viewport--${mode}`}
        role="application"
        aria-label={mode === "game" ? "Flight Simulator" : "Interactive 3D Earth"}
      >
        {!isReady && <LoadingScreen />}

        <EarthErrorBoundary fallback={<WebGLFallback />}>
          <EarthEngineProvider>
            <Canvas
              className="earth-canvas"
              dpr={quality.dpr}
              gl={{
                antialias: false,
                alpha: false,
                powerPreference: "default",
                stencil: false,
                depth: true,
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: false,
              }}
              camera={{
                position: [0, 0.55, CAMERA_DEFAULT_DISTANCE],
                fov: 45,
                near: 0.01,
                far: 200,
              }}
              onCreated={({ gl }) => {
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.05;
                gl.outputColorSpace = SRGBColorSpace;
                gl.setClearColor(new Color("#03050c"));
                // Cap GPU work — high-DPR + AA was killing tabs (STATUS_BREAKPOINT)
                const canvas = gl.domElement;
                const onLost = (e: Event) => {
                  e.preventDefault();
                  console.warn("[Earth] WebGL context lost");
                };
                canvas.addEventListener("webglcontextlost", onLost, false);
              }}
              frameloop="always"
            >
              <FpsTracker />
              <ExposureSync />
              <EarthScene quality={quality} />
            </Canvas>
            <DebugOverlay />
          </EarthEngineProvider>
        </EarthErrorBoundary>

        <EarthControls containerRef={containerRef} />
      </div>
    </EarthAppModeProvider>
  );
}
