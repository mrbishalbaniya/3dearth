import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { Lifecycle, Updatable } from '../core/Lifecycle';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';

export interface WeatherState {
  preset: string;
  wind: Vector3;
  turbulence: number;
  cloudiness: number;
  humidity: number;
  temperatureC: number;
}

export class WeatherManager implements Lifecycle, Updatable {
  private readonly scene: Scene;
  private readonly events: EventSystem<WorldEventMap>;
  private state: WeatherState;
  private time = 0;

  constructor(scene: Scene, events: EventSystem<WorldEventMap>, initialWind: Vector3, turbulence: number) {
    this.scene = scene;
    this.events = events;
    this.state = {
      preset: 'clear',
      wind: initialWind.clone(),
      turbulence,
      cloudiness: 0.1,
      humidity: 0.35,
      temperatureC: 21,
    };
  }

  public async initialize(): Promise<void> {
    this.applyVisualAtmosphere();
  }

  public setPreset(preset: 'clear' | 'overcast' | 'storm' | 'sunset'): void {
    this.state.preset = preset;

    if (preset === 'clear') {
      this.state.cloudiness = 0.1;
      this.state.humidity = 0.35;
      this.state.turbulence = 0.18;
    } else if (preset === 'overcast') {
      this.state.cloudiness = 0.7;
      this.state.humidity = 0.75;
      this.state.turbulence = 0.3;
    } else if (preset === 'storm') {
      this.state.cloudiness = 1;
      this.state.humidity = 0.95;
      this.state.turbulence = 0.65;
    } else {
      this.state.cloudiness = 0.3;
      this.state.humidity = 0.45;
      this.state.turbulence = 0.22;
    }

    this.applyVisualAtmosphere();
    this.events.emit('weather:changed', { preset });
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    const gust = Math.sin(this.time * 0.2) * 0.75 + Math.cos(this.time * 0.11) * 0.25;
    this.state.wind.x += gust * this.state.turbulence * 0.03;
    this.state.wind.z += Math.cos(this.time * 0.16) * this.state.turbulence * 0.02;

    const maxWind = 60;
    this.state.wind.x = Math.max(-maxWind, Math.min(maxWind, this.state.wind.x));
    this.state.wind.z = Math.max(-maxWind, Math.min(maxWind, this.state.wind.z));

    this.applyVisualAtmosphere();
  }

  public getWind(): Vector3 {
    return this.state.wind.clone();
  }

  public getTurbulence(): number {
    return this.state.turbulence;
  }

  public getState(): WeatherState {
    return {
      ...this.state,
      wind: this.state.wind.clone(),
    };
  }

  private applyVisualAtmosphere(): void {
    const base = 0.86 - this.state.cloudiness * 0.35;
    this.scene.ambientColor = new Color3(base, base, base + 0.03);
    this.scene.imageProcessingConfiguration.contrast = 1.05 - this.state.cloudiness * 0.15;
    this.scene.imageProcessingConfiguration.exposure = 1.0 - this.state.cloudiness * 0.2;
  }

  public dispose(): void {
    // Managed resources are scene-level properties and remain owned by scene.
  }
}
