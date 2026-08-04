import { EventBus } from '../core/EventBus';
import { EngineEvent } from '../types/Events';
import { Logger } from '../core/Logger';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  gpuTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  textureMemory: number;
  bufferMemory: number;
  cpuUsage: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  minFps: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
  maxTriangles: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  
  private eventBus = EventBus.getInstance();
  private logger = Logger.getInstance();
  
  private enabled = false;
  private recording = false;
  private metrics: PerformanceMetrics[] = [];
  private currentMetrics: Partial<PerformanceMetrics> = {};
  private thresholds: PerformanceThresholds;
  
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimeAccumulator = 0;
  private fpsUpdateInterval = 1000;
  private lastFpsUpdate = 0;
  
  private memoryCheckInterval = 5000;
  private lastMemoryCheck = 0;
  
  private maxHistorySize = 1000;
  private performanceObserver: PerformanceObserver | null = null;

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.thresholds = {
      minFps: 30,
      maxFrameTime: 33.33,
      maxMemoryUsage: 512 * 1024 * 1024,
      maxDrawCalls: 1000,
      maxTriangles: 100000
    };

    this.setupPerformanceObserver();
  }

  public initialize(): void {
    this.enabled = true;
    this.lastFrameTime = performance.now();
    this.lastFpsUpdate = this.lastFrameTime;
    this.lastMemoryCheck = this.lastFrameTime;
    
    this.logger.info('PerformanceMonitor initialized');
  }

  public shutdown(): void {
    this.enabled = false;
    this.recording = false;
    this.metrics = [];
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    this.logger.info('PerformanceMonitor shutdown');
  }

  public startRecording(): void {
    this.recording = true;
    this.metrics = [];
    this.logger.info('Performance recording started');
  }

  public stopRecording(): PerformanceMetrics[] {
    this.recording = false;
    const recordedMetrics = [...this.metrics];
    this.logger.info(`Performance recording stopped. Recorded ${recordedMetrics.length} samples`);
    return recordedMetrics;
  }

  public update(engine?: any): void {
    if (!this.enabled) {
      return;
    }

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    this.frameCount++;
    this.frameTimeAccumulator += deltaTime;
    
    this.currentMetrics.frameTime = deltaTime;
    this.currentMetrics.timestamp = now;

    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.updateFpsMetrics(now);
    }

    if (now - this.lastMemoryCheck >= this.memoryCheckInterval) {
      this.updateMemoryMetrics();
      this.lastMemoryCheck = now;
    }

    if (engine) {
      this.updateEngineMetrics(engine);
    }

    this.checkThresholds();
    
    if (this.recording && this.isMetricsComplete()) {
      this.recordMetrics();
    }

    this.lastFrameTime = now;
  }

  private updateFpsMetrics(now: number): void {
    const elapsed = now - this.lastFpsUpdate;
    this.currentMetrics.fps = (this.frameCount * 1000) / elapsed;
    
    this.frameCount = 0;
    this.frameTimeAccumulator = 0;
    this.lastFpsUpdate = now;
  }

  private updateMemoryMetrics(): void {
    if (performance.memory) {
      this.currentMetrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
  }

  private updateEngineMetrics(engine: any): void {
    if (engine.getSceneInstrumentation) {
      const instrumentation = engine.getSceneInstrumentation();
      
      this.currentMetrics.renderTime = instrumentation.renderTimeCounter?.current || 0;
      this.currentMetrics.gpuTime = instrumentation.gpuFrameTimeCounter?.current || 0;
    }

    if (engine.getInfo) {
      const info = engine.getInfo();
      this.currentMetrics.drawCalls = info.render.drawCalls || 0;
      this.currentMetrics.triangles = info.render.triangles || 0;
    }
  }

  private checkThresholds(): void {
    if (!this.isMetricsComplete()) {
      return;
    }

    const metrics = this.currentMetrics as PerformanceMetrics;

    if (metrics.fps < this.thresholds.minFps) {
      this.eventBus.emit(EngineEvent.PERFORMANCE_WARNING, {
        type: 'low_fps',
        value: metrics.fps,
        threshold: this.thresholds.minFps,
        metrics
      });
    }

    if (metrics.frameTime > this.thresholds.maxFrameTime) {
      this.eventBus.emit(EngineEvent.PERFORMANCE_WARNING, {
        type: 'high_frame_time',
        value: metrics.frameTime,
        threshold: this.thresholds.maxFrameTime,
        metrics
      });
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.eventBus.emit(EngineEvent.PERFORMANCE_WARNING, {
        type: 'high_memory_usage',
        value: metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        metrics
      });
    }

    if (metrics.drawCalls > this.thresholds.maxDrawCalls) {
      this.eventBus.emit(EngineEvent.PERFORMANCE_WARNING, {
        type: 'high_draw_calls',
        value: metrics.drawCalls,
        threshold: this.thresholds.maxDrawCalls,
        metrics
      });
    }
  }

  private recordMetrics(): void {
    const metrics = { ...this.currentMetrics } as PerformanceMetrics;
    
    this.metrics.push(metrics);
    
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    this.eventBus.emit(EngineEvent.PERFORMANCE_UPDATED, { metrics });
  }

  private isMetricsComplete(): boolean {
    return !!(
      this.currentMetrics.fps !== undefined &&
      this.currentMetrics.frameTime !== undefined &&
      this.currentMetrics.memoryUsage !== undefined
    );
  }

  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.isMetricsComplete() ? { ...this.currentMetrics } as PerformanceMetrics : null;
  }

  public getAverageMetrics(samples: number = 60): PerformanceMetrics | null {
    if (this.metrics.length === 0) {
      return null;
    }

    const recentMetrics = this.metrics.slice(-samples);
    const count = recentMetrics.length;

    const averages: PerformanceMetrics = {
      fps: 0,
      frameTime: 0,
      renderTime: 0,
      gpuTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      triangles: 0,
      textureMemory: 0,
      bufferMemory: 0,
      cpuUsage: 0,
      timestamp: recentMetrics[recentMetrics.length - 1].timestamp
    };

    for (const metrics of recentMetrics) {
      averages.fps += metrics.fps;
      averages.frameTime += metrics.frameTime;
      averages.renderTime += metrics.renderTime;
      averages.gpuTime += metrics.gpuTime;
      averages.memoryUsage += metrics.memoryUsage;
      averages.drawCalls += metrics.drawCalls;
      averages.triangles += metrics.triangles;
      averages.textureMemory += metrics.textureMemory;
      averages.bufferMemory += metrics.bufferMemory;
      averages.cpuUsage += metrics.cpuUsage;
    }

    averages.fps /= count;
    averages.frameTime /= count;
    averages.renderTime /= count;
    averages.gpuTime /= count;
    averages.memoryUsage /= count;
    averages.drawCalls /= count;
    averages.triangles /= count;
    averages.textureMemory /= count;
    averages.bufferMemory /= count;
    averages.cpuUsage /= count;

    return averages;
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    this.logger.info('Performance thresholds updated', this.thresholds);
  }

  public getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  public clearHistory(): void {
    this.metrics = [];
    this.logger.info('Performance metrics history cleared');
  }

  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    return JSON.stringify(this.metrics, null, 2);
  }

  private exportAsCSV(): string {
    if (this.metrics.length === 0) {
      return '';
    }

    const headers = Object.keys(this.metrics[0]).join(',');
    const rows = this.metrics.map(metrics => 
      Object.values(metrics).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  private setupPerformanceObserver(): void {
    if (!window.PerformanceObserver) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        for (const entry of entries) {
          if (entry.entryType === 'measure') {
            this.handlePerformanceMeasure(entry);
          } else if (entry.entryType === 'navigation') {
            this.handleNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation'] 
      });
    } catch (error) {
      this.logger.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  private handlePerformanceMeasure(entry: PerformanceEntry): void {
    if (entry.name.startsWith('render')) {
      this.currentMetrics.renderTime = entry.duration;
    }
  }

  private handleNavigationTiming(entry: PerformanceNavigationTiming): void {
    // Handle navigation timing for initial load performance
  }

  public markPerformanceMeasure(name: string, startMark?: string): void {
    try {
      if (startMark) {
        performance.measure(name, startMark);
      } else {
        performance.mark(name);
      }
    } catch (error) {
      this.logger.warn('Failed to create performance measure:', error);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isRecording(): boolean {
    return this.recording;
  }
}