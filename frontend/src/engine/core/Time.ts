export class Time {
  private static instance: Time;
  private startTime: number;
  private lastFrameTime: number;
  private currentTime: number;
  private _deltaTime: number;
  private _totalTime: number;
  private _fps: number;
  private frameCount: number;
  private fpsUpdateTime: number;
  private timeScale: number;

  private constructor() {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.currentTime = this.startTime;
    this._deltaTime = 0;
    this._totalTime = 0;
    this._fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = this.startTime;
    this.timeScale = 1.0;
  }

  public static getInstance(): Time {
    if (!Time.instance) {
      Time.instance = new Time();
    }
    return Time.instance;
  }

  public update(): void {
    this.currentTime = performance.now();
    this._deltaTime = (this.currentTime - this.lastFrameTime) / 1000 * this.timeScale;
    this._totalTime = (this.currentTime - this.startTime) / 1000;
    this.lastFrameTime = this.currentTime;

    this.frameCount++;
    if (this.currentTime - this.fpsUpdateTime >= 1000) {
      this._fps = this.frameCount / ((this.currentTime - this.fpsUpdateTime) / 1000);
      this.frameCount = 0;
      this.fpsUpdateTime = this.currentTime;
    }
  }

  public get deltaTime(): number {
    return this._deltaTime;
  }

  public get totalTime(): number {
    return this._totalTime;
  }

  public get fps(): number {
    return this._fps;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public reset(): void {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.currentTime = this.startTime;
    this._deltaTime = 0;
    this._totalTime = 0;
    this._fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = this.startTime;
  }

  public pause(): void {
    this.timeScale = 0;
  }

  public resume(): void {
    this.timeScale = 1.0;
    this.lastFrameTime = performance.now();
  }
}