import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { WorldEngineConfig } from './WorldConfig';

export const createDefaultWorldConfig = (
  canvas: HTMLCanvasElement,
  hdrUrl = '/textures/earth/environment.env'
): WorldEngineConfig => ({
  canvas,
  antialias: true,
  adaptToDeviceRatio: true,
  powerPreference: 'high-performance',
  webgpu: {
    enabled: true,
  },
  camera: {
    fov: 0.8,
    near: 0.1,
    far: 50000,
    speed: 1.0,
    angularSensitivity: 2000,
    initialPosition: new Vector3(0, 250, -500),
    initialTarget: new Vector3(0, 0, 0),
  },
  lighting: {
    sunIntensity: 2.5,
    ambientIntensity: 0.35,
  },
  environment: {
    hdrUrl,
    exposure: 1.0,
    contrast: 1.1,
  },
  sky: {
    turbidity: 8,
    luminance: 1,
    inclination: 0.49,
    azimuth: 0.25,
    rayleigh: 2,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
  },
  fog: {
    enabled: true,
    mode: 'exp2',
    color: { r: 0.68, g: 0.82, b: 0.96 },
    density: 0.00012,
    start: 500,
    end: 12000,
  },
  loop: {
    fixedDeltaTime: 1 / 60,
    maxSubSteps: 5,
    maxFps: 120,
    minFrameTime: 1 / 240,
  },
  terrain: {
    chunkSize: 256,
    chunkResolution: 32,
    viewDistance: 5,
    maxHeight: 180,
  },
  physics: {
    gravity: new Vector3(0, -9.81, 0),
    drag: 0.012,
  },
  weather: {
    windSpeed: 5,
    windDirectionDegrees: 35,
    turbulence: 0.2,
  },
  debug: {
    enabled: true,
    updateIntervalMs: 250,
  },
});
