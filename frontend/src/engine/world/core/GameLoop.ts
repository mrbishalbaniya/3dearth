import type { Engine } from '@babylonjs/core/Engines/engine';

interface GameLoopCallbacks {
  fixedUpdate: (fixedDeltaTime: number) => void;
  update: (deltaTime: number) => void;
  render: () => void;
}

export class GameLoop {
  private readonly engine: Engine;
  private readonly callbacks: GameLoopCallbacks;
  private readonly fixedDeltaTime: number;
  private readonly maxSubSteps: number;
  private readonly maxFps: number;
  private readonly minFrameTime: number;

  private running = false;
  private accumulator = 0;
  private previousTime = 0;
  private lastRenderTime = 0;

  constructor(
    engine: Engine,
    callbacks: GameLoopCallbacks,
    fixedDeltaTime: number,
    maxSubSteps: number,
    maxFps: number,
    minFrameTime: number
  ) {
    this.engine = engine;
    this.callbacks = callbacks;
    this.fixedDeltaTime = fixedDeltaTime;
    this.maxSubSteps = maxSubSteps;
    this.maxFps = maxFps;
    this.minFrameTime = minFrameTime;
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.previousTime = performance.now() * 0.001;
    this.lastRenderTime = this.previousTime;

    this.engine.runRenderLoop(() => {
      if (!this.running) {
        return;
      }

      const now = performance.now() * 0.001;
      let frameDelta = now - this.previousTime;
      this.previousTime = now;

      if (frameDelta < this.minFrameTime) {
        return;
      }

      const maxFrameDelta = this.fixedDeltaTime * this.maxSubSteps;
      if (frameDelta > maxFrameDelta) {
        frameDelta = maxFrameDelta;
      }

      this.accumulator += frameDelta;
      let subSteps = 0;

      while (this.accumulator >= this.fixedDeltaTime && subSteps < this.maxSubSteps) {
        this.callbacks.fixedUpdate(this.fixedDeltaTime);
        this.accumulator -= this.fixedDeltaTime;
        subSteps += 1;
      }

      this.callbacks.update(frameDelta);

      const renderInterval = 1 / this.maxFps;
      if (now - this.lastRenderTime >= renderInterval) {
        this.callbacks.render();
        this.lastRenderTime = now;
      }
    });
  }

  public stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.engine.stopRenderLoop();
    this.accumulator = 0;
  }

  public isRunning(): boolean {
    return this.running;
  }
}
