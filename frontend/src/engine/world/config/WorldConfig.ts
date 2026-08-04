import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface WorldEngineConfig {
  canvas: HTMLCanvasElement;
  antialias: boolean;
  adaptToDeviceRatio: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
  webgpu: {
    enabled: boolean;
    glslangUrl?: string;
    twgslUrl?: string;
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    speed: number;
    angularSensitivity: number;
    initialPosition: Vector3;
    initialTarget: Vector3;
  };
  lighting: {
    sunIntensity: number;
    ambientIntensity: number;
  };
  environment: {
    hdrUrl: string;
    exposure: number;
    contrast: number;
  };
  sky: {
    turbidity: number;
    luminance: number;
    inclination: number;
    azimuth: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
  };
  fog: {
    enabled: boolean;
    mode: 'linear' | 'exp' | 'exp2';
    color: { r: number; g: number; b: number };
    density: number;
    start: number;
    end: number;
  };
  loop: {
    fixedDeltaTime: number;
    maxSubSteps: number;
    maxFps: number;
    minFrameTime: number;
  };
  terrain: {
    chunkSize: number;
    chunkResolution: number;
    viewDistance: number;
    maxHeight: number;
  };
  physics: {
    gravity: Vector3;
    drag: number;
  };
  weather: {
    windSpeed: number;
    windDirectionDegrees: number;
    turbulence: number;
  };
  debug: {
    enabled: boolean;
    updateIntervalMs: number;
  };
}
