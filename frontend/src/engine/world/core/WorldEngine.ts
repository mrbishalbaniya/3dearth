import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SkyMaterial } from '@babylonjs/materials/sky';
import { SceneOptimizer, SceneOptimizerOptions } from '@babylonjs/core/Misc/sceneOptimizer';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';

import type { WorldEngineConfig } from '../config/WorldConfig';
import { createDefaultWorldConfig } from '../config/DefaultWorldConfig';
import { ConfigSystem } from '../config/ConfigSystem';
import { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';
import { AssetManager } from '../managers/AssetManager';
import { ChunkManager } from '../managers/ChunkManager';
import { TerrainManager } from '../managers/TerrainManager';
import { WeatherManager } from '../managers/WeatherManager';
import { TimeManager } from '../managers/TimeManager';
import { InputManager } from '../managers/InputManager';
import { CameraManager } from '../managers/CameraManager';
import { PhysicsManager } from '../managers/PhysicsManager';
import { VehicleManager } from '../managers/VehicleManager';
import { GameLoop } from './GameLoop';
import { DebugOverlay } from '../debug/DebugOverlay';

export interface HotReloadAdapter {
  accept: () => void;
  dispose: (callback: () => void) => void;
}

export class WorldEngine {
  private readonly events = new EventSystem<WorldEventMap>();
  private readonly configSystem: ConfigSystem;

  private engine!: Engine;
  private scene!: Scene;
  private sunLight!: DirectionalLight;
  private ambientLight!: HemisphericLight;
  private shadowGenerator!: ShadowGenerator;
  private skyMesh!: Mesh;
  private gameLoop!: GameLoop;
  private debugOverlay!: DebugOverlay;

  private assetManager!: AssetManager;
  private chunkManager!: ChunkManager;
  private terrainManager!: TerrainManager;
  private weatherManager!: WeatherManager;
  private timeManager!: TimeManager;
  private inputManager!: InputManager;
  private cameraManager!: CameraManager;
  private physicsManager!: PhysicsManager;
  private vehicleManager!: VehicleManager;

  private initialized = false;

  constructor(config: Partial<Omit<WorldEngineConfig, 'canvas'>> & { canvas: HTMLCanvasElement }) {
    const defaultConfig = createDefaultWorldConfig(config.canvas);
    const mergedConfig: WorldEngineConfig = {
      ...defaultConfig,
      ...config,
      webgpu: { ...defaultConfig.webgpu, ...config.webgpu },
      camera: { ...defaultConfig.camera, ...config.camera },
      lighting: { ...defaultConfig.lighting, ...config.lighting },
      environment: { ...defaultConfig.environment, ...config.environment },
      sky: { ...defaultConfig.sky, ...config.sky },
      fog: { ...defaultConfig.fog, ...config.fog },
      loop: { ...defaultConfig.loop, ...config.loop },
      terrain: { ...defaultConfig.terrain, ...config.terrain },
      physics: { ...defaultConfig.physics, ...config.physics },
      weather: { ...defaultConfig.weather, ...config.weather },
      debug: { ...defaultConfig.debug, ...config.debug },
    };

    this.configSystem = new ConfigSystem(mergedConfig, this.events);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.initializeEngine();
    this.initializeScene();
    await this.initializeManagers();
    this.initializeLoop();
    this.initializeResizeHandling();
    this.initializeDebugOverlay();

    this.initialized = true;
    this.events.emit('engine:initialized', undefined);
  }

  private async initializeEngine(): Promise<void> {
    const config = this.configSystem.getAll();
    const engineOptions = {
      antialias: config.antialias,
      adaptToDeviceRatio: config.adaptToDeviceRatio,
      audioEngine: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: config.powerPreference,
    };

    if (config.webgpu.enabled && (await WebGPUEngine.IsSupportedAsync)) {
      const webgpu = new WebGPUEngine(config.canvas, engineOptions);
      await webgpu.initAsync({
        glslangOptions: config.webgpu.glslangUrl ? { jsPath: config.webgpu.glslangUrl } : undefined,
        twgslOptions: config.webgpu.twgslUrl ? { jsPath: config.webgpu.twgslUrl } : undefined,
      });
      this.engine = webgpu;
    } else {
      this.engine = new Engine(config.canvas, config.antialias, engineOptions, true);
    }

    this.engine.setHardwareScalingLevel(1 / Math.max(window.devicePixelRatio, 1));
  }

  private initializeScene(): void {
    const config = this.configSystem.getAll();
    this.scene = new Scene(this.engine);
    this.scene.autoClear = true;
    this.scene.clearColor = new Color4(0.61, 0.78, 0.95, 1);
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = config.environment.exposure;
    this.scene.imageProcessingConfiguration.contrast = config.environment.contrast;

    this.initializeLighting();
    this.initializeFog();
    this.initializeSky();

    SceneOptimizer.OptimizeAsync(this.scene, SceneOptimizerOptions.ModerateDegradationAllowed());
  }

  private initializeLighting(): void {
    const config = this.configSystem.getAll();

    this.sunLight = new DirectionalLight('sun_light', new Vector3(-0.25, -1, 0.2), this.scene);
    this.sunLight.intensity = config.lighting.sunIntensity;
    this.sunLight.position = new Vector3(3000, 5500, -2000);

    this.ambientLight = new HemisphericLight('ambient_light', new Vector3(0, 1, 0), this.scene);
    this.ambientLight.intensity = config.lighting.ambientIntensity;

    this.shadowGenerator = new ShadowGenerator(2048, this.sunLight);
    this.shadowGenerator.useExponentialShadowMap = true;
    this.shadowGenerator.darkness = 0.45;
  }

  private initializeFog(): void {
    const config = this.configSystem.getAll();
    if (!config.fog.enabled) {
      return;
    }

    if (config.fog.mode === 'linear') {
      this.scene.fogMode = Scene.FOGMODE_LINEAR;
    } else if (config.fog.mode === 'exp') {
      this.scene.fogMode = Scene.FOGMODE_EXP;
    } else {
      this.scene.fogMode = Scene.FOGMODE_EXP2;
    }

    this.scene.fogColor = new Color3(config.fog.color.r, config.fog.color.g, config.fog.color.b);
    this.scene.fogDensity = config.fog.density;
    this.scene.fogStart = config.fog.start;
    this.scene.fogEnd = config.fog.end;
  }

  private initializeSky(): void {
    const config = this.configSystem.getAll();
    this.skyMesh = MeshBuilder.CreateBox('world_sky', { size: 50000 }, this.scene);
    const skyMaterial = new SkyMaterial('world_sky_material', this.scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.turbidity = config.sky.turbidity;
    skyMaterial.luminance = config.sky.luminance;
    skyMaterial.inclination = config.sky.inclination;
    skyMaterial.azimuth = config.sky.azimuth;
    skyMaterial.rayleigh = config.sky.rayleigh;
    skyMaterial.mieCoefficient = config.sky.mieCoefficient;
    skyMaterial.mieDirectionalG = config.sky.mieDirectionalG;
    this.skyMesh.material = skyMaterial;
    this.skyMesh.isPickable = false;
    this.skyMesh.infiniteDistance = true;
  }

  private async initializeManagers(): Promise<void> {
    const config = this.configSystem.getAll();

    this.assetManager = new AssetManager(this.scene, this.events);
    await this.assetManager.initialize();

    const hdrUrl = config.environment.hdrUrl.trim();
    if (hdrUrl.length > 0) {
      try {
        const envTexture = await this.assetManager.loadEnvironment(hdrUrl);
        this.scene.environmentTexture = envTexture;
        this.scene.createDefaultSkybox(envTexture, true, 40000, 0.25, false);
      } catch {
        // Continue without prefiltered environment texture when asset is unavailable.
        // Lighting/sky still render and the engine remains usable.
        this.scene.environmentTexture = null;
      }
    } else {
      this.scene.environmentTexture = null;
    }

    this.inputManager = new InputManager(this.scene, this.events);
    await this.inputManager.initialize();

    this.cameraManager = new CameraManager(
      this.scene,
      this.inputManager,
      this.events,
      config.camera.initialPosition,
      config.camera.initialTarget,
      config.camera.fov,
      config.camera.near,
      config.camera.far,
      config.camera.speed,
      config.camera.angularSensitivity
    );
    await this.cameraManager.initialize();

    this.chunkManager = new ChunkManager(
      this.scene,
      this.events,
      config.terrain.chunkSize,
      config.terrain.chunkResolution,
      config.terrain.maxHeight
    );

    this.terrainManager = new TerrainManager(this.chunkManager, config.terrain.viewDistance);
    await this.terrainManager.initialize();

    this.timeManager = new TimeManager(this.events);
    await this.timeManager.initialize();

    const windDirection = (config.weather.windDirectionDegrees * Math.PI) / 180;
    const wind = new Vector3(
      Math.sin(windDirection) * config.weather.windSpeed,
      0,
      Math.cos(windDirection) * config.weather.windSpeed
    );

    this.weatherManager = new WeatherManager(this.scene, this.events, wind, config.weather.turbulence);
    await this.weatherManager.initialize();

    this.physicsManager = new PhysicsManager(config.physics.gravity, config.physics.drag);
    await this.physicsManager.initialize();

    this.vehicleManager = new VehicleManager(this.scene, this.physicsManager, this.weatherManager, this.events);
    await this.vehicleManager.initialize();
  }

  private initializeLoop(): void {
    const loop = this.configSystem.get('loop');

    this.gameLoop = new GameLoop(
      this.engine,
      {
        fixedUpdate: (fixedDeltaTime) => {
          this.physicsManager.fixedUpdate(fixedDeltaTime);
        },
        update: (deltaTime) => {
          this.timeManager.update(deltaTime);
          this.weatherManager.update(deltaTime);
          this.cameraManager.update(deltaTime);
          this.vehicleManager.update(deltaTime);

          this.terrainManager.update(this.cameraManager.getPosition());
          this.updateSunFromTime();
          this.debugOverlay.update();
        },
        render: () => {
          this.scene.render();
        },
      },
      loop.fixedDeltaTime,
      loop.maxSubSteps,
      loop.maxFps,
      loop.minFrameTime
    );
  }

  private initializeDebugOverlay(): void {
    const debug = this.configSystem.get('debug');
    this.debugOverlay = new DebugOverlay(
      this.engine,
      this.scene,
      {
        getLoadedChunks: () => this.terrainManager.getLoadedChunkCount(),
        getCameraPosition: () => this.cameraManager.getPosition(),
      },
      debug.updateIntervalMs
    );

    if (debug.enabled) {
      this.debugOverlay.mount();
    }
  }

  private updateSunFromTime(): void {
    const t = this.timeManager.getTimeOfDayNormalized();
    // Shift phase so default noon time (12:00) maps to a high sun position.
    const angle = t * Math.PI * 2 - Math.PI * 0.5;
    const x = Math.cos(angle) * 0.4;
    const y = Math.sin(angle);
    const z = Math.sin(angle * 0.5) * 0.3;

    this.sunLight.direction = new Vector3(-x, -Math.max(0.1, y), z).normalize();
    this.sunLight.intensity = Math.max(0.05, y * 2.2 + 0.2);

    const ambient = 0.1 + Math.max(0, y) * 0.35;
    this.ambientLight.intensity = ambient;
  }

  private initializeResizeHandling(): void {
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  private readonly handleResize = (): void => {
    this.engine.resize();
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    this.events.emit('engine:resized', { width, height });
  };

  public on<TKey extends keyof WorldEventMap>(
    event: TKey,
    handler: (payload: WorldEventMap[TKey]) => void
  ): () => void {
    return this.events.on(event, handler);
  }

  public start(): void {
    if (!this.initialized) {
      throw new Error('WorldEngine must be initialized before start');
    }
    this.gameLoop.start();
    this.events.emit('engine:started', undefined);
  }

  public stop(): void {
    if (!this.initialized) {
      return;
    }
    this.gameLoop.stop();
    this.events.emit('engine:stopped', undefined);
  }

  public applyConfigPatch(patch: Partial<WorldEngineConfig>): void {
    this.configSystem.patch(patch);
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getCameraPosition(): Vector3 {
    return this.cameraManager.getPosition();
  }

  public getLoadedChunkCount(): number {
    return this.terrainManager.getLoadedChunkCount();
  }

  public enableHotReload(hot: HotReloadAdapter): void {
    hot.accept();
    hot.dispose(() => {
      this.dispose();
    });
  }

  public dispose(): void {
    if (!this.initialized) {
      return;
    }

    this.stop();
    window.removeEventListener('resize', this.handleResize);

    this.debugOverlay.unmount();
    this.vehicleManager.dispose();
    this.physicsManager.dispose();
    this.weatherManager.dispose();
    this.timeManager.dispose();
    this.terrainManager.dispose();
    this.cameraManager.dispose();
    this.inputManager.dispose();
    this.assetManager.dispose();

    this.skyMesh.material?.dispose(true, true);
    this.skyMesh.dispose(false, true);
    this.shadowGenerator.dispose();
    this.sunLight.dispose();
    this.ambientLight.dispose();

    this.scene.dispose();
    this.engine.dispose();
    this.events.clear();

    this.initialized = false;
  }
}
