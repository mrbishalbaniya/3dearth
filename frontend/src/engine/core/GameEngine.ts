import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { EngineConfig, RenderStats } from '../types/Core';
import { EventBus } from './EventBus';
import { Time } from './Time';
import { Logger } from './Logger';
import { RenderEngine } from '../rendering/RenderEngine';
import { AssetManager } from '../assets/AssetManager';
import { InputManager } from '../input/InputManager';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { AudioEngine } from '../audio/AudioEngine';

export class GameEngine {
  private static instance: GameEngine;
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: EngineConfig | null = null;
  private running: boolean = false;
  private eventBus: EventBus;
  private time: Time;
  private logger: Logger;
  private renderEngine: RenderEngine | null = null;
  private assetManager: AssetManager | null = null;
  private inputManager: InputManager | null = null;
  private physicsEngine: PhysicsEngine | null = null;
  private audioEngine: AudioEngine | null = null;
  private stats: RenderStats;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.time = Time.getInstance();
    this.logger = Logger.getInstance();
    this.stats = {
      frameTime: 0,
      fps: 0,
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      memoryUsed: 0
    };
  }

  public static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  public async initialize(config: EngineConfig): Promise<void> {
    try {
      this.config = config;
      this.canvas = config.canvas;
      
      this.logger.info('Initializing Game Engine', 'Engine');

      await this.initializeBabylon();
      await this.initializeSubsystems();

      this.setupEventListeners();
      this.logger.info('Game Engine initialized successfully', 'Engine');
    } catch (error) {
      this.logger.error('Failed to initialize Game Engine', 'Engine', error);
      throw error;
    }
  }

  private async initializeBabylon(): Promise<void> {
    if (!this.canvas || !this.config) {
      throw new Error('Canvas or config not set');
    }

    this.engine = new Engine(this.canvas, this.config.antialiasing, {
      stencil: this.config.stencil,
      preserveDrawingBuffer: this.config.preserveDrawingBuffer,
      powerPreference: this.config.powerPreference,
      failIfMajorPerformanceCaveat: this.config.failIfMajorPerformanceCaveat,
      doNotHandleContextLost: true
    });

    this.scene = new Scene(this.engine);
    
    if (this.config.webgpuEnabled) {
      try {
        await this.engine.initWebGPU();
        this.logger.info('WebGPU enabled', 'Engine');
      } catch (error) {
        this.logger.warning('WebGPU not available, using WebGL', 'Engine', error);
      }
    }
  }

  private async initializeSubsystems(): Promise<void> {
    if (!this.engine || !this.scene || !this.canvas || !this.config) {
      throw new Error('Babylon.js not initialized');
    }

    this.renderEngine = new RenderEngine(this.engine, this.scene);
    await this.renderEngine.initialize();

    this.assetManager = new AssetManager();
    await this.assetManager.initialize();

    this.inputManager = new InputManager(this.canvas);
    this.inputManager.initialize();

    if (this.config.physicsEnabled) {
      this.physicsEngine = new PhysicsEngine();
      await this.physicsEngine.initialize(this.scene);
    }

    if (this.config.audioEnabled) {
      this.audioEngine = new AudioEngine();
      await this.audioEngine.initialize();
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('beforeunload', this.shutdown.bind(this));
    
    if (this.engine) {
      this.engine.onContextLostObservable.add(() => {
        this.logger.warning('WebGL context lost', 'Engine');
        this.handleContextLoss();
      });

      this.engine.onContextRestoredObservable.add(() => {
        this.logger.info('WebGL context restored', 'Engine');
        this.handleContextRestore();
      });
    }
  }

  public start(): void {
    if (this.running || !this.engine || !this.scene) {
      return;
    }

    this.running = true;
    this.logger.info('Starting Game Engine', 'Engine');

    this.engine.runRenderLoop(() => {
      this.update();
      this.render();
    });

    this.eventBus.emit('frame', {
      type: 'frame',
      timestamp: Date.now(),
      deltaTime: 0,
      totalTime: 0
    });
  }

  public pause(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.time.pause();
    this.logger.info('Game Engine paused', 'Engine');
  }

  public resume(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.time.resume();
    this.logger.info('Game Engine resumed', 'Engine');
  }

  private update(): void {
    if (!this.running) {
      return;
    }

    this.time.update();
    const deltaTime = this.time.deltaTime;

    this.inputManager?.update(deltaTime);
    this.physicsEngine?.update(deltaTime);
    this.audioEngine?.update(deltaTime);
    this.renderEngine?.update(deltaTime);

    this.updateStats();

    this.eventBus.emit('frame', {
      type: 'frame',
      timestamp: Date.now(),
      deltaTime,
      totalTime: this.time.totalTime
    });
  }

  private render(): void {
    if (!this.scene || !this.engine) {
      return;
    }

    this.scene.render();
  }

  private updateStats(): void {
    if (!this.engine || !this.scene) {
      return;
    }

    this.stats.frameTime = this.time.deltaTime * 1000;
    this.stats.fps = this.time.fps;
    this.stats.drawCalls = this.engine.drawCalls;
    
    const info = this.scene.getEngine().getInfo();
    this.stats.memoryUsed = info.memory.geometries + info.memory.textures;
  }

  private handleResize(): void {
    if (!this.engine || !this.canvas) {
      return;
    }

    this.engine.resize();
    
    this.eventBus.emit('resize', {
      type: 'resize',
      timestamp: Date.now(),
      width: this.canvas.width,
      height: this.canvas.height
    });
  }

  private handleContextLoss(): void {
    this.pause();
  }

  private handleContextRestore(): void {
    this.resume();
  }

  public shutdown(): void {
    this.logger.info('Shutting down Game Engine', 'Engine');
    
    this.running = false;
    
    this.audioEngine?.dispose();
    this.physicsEngine?.dispose();
    this.inputManager?.dispose();
    this.assetManager?.dispose();
    this.renderEngine?.dispose();
    
    this.scene?.dispose();
    this.engine?.dispose();
    
    this.eventBus.clear();
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('beforeunload', this.shutdown.bind(this));
  }

  public getEngine(): Engine | null {
    return this.engine;
  }

  public getScene(): Scene | null {
    return this.scene;
  }

  public getRenderStats(): RenderStats {
    return { ...this.stats };
  }

  public isRunning(): boolean {
    return this.running;
  }
}