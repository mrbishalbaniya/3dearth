import { Vector3D, TurbulenceData, WeatherConditions } from '../types/AircraftTypes';

export interface TurbulenceConfig {
  baseIntensity: number;
  altitudeEffect: boolean;
  weatherEffect: boolean;
  terrainEffect: boolean;
}

export class TurbulenceSystem {
  private config: TurbulenceConfig;
  private noiseOffset = 0;
  private time = 0;

  constructor(config: TurbulenceConfig) {
    this.config = config;
  }

  public update(
    deltaTime: number,
    position: Vector3D,
    velocity: Vector3D,
    weather: WeatherConditions
  ): Vector3D {
    this.time += deltaTime;
    
    // Calculate base turbulence intensity
    let intensity = this.config.baseIntensity;
    
    // Altitude effect (more turbulence at lower altitudes due to terrain)
    if (this.config.altitudeEffect) {
      const altitudeFactor = Math.exp(-position.z / 3000); // Exponential decay with altitude
      intensity *= (1 + altitudeFactor * 2);
    }
    
    // Weather effect
    if (this.config.weatherEffect) {
      intensity *= (1 + weather.turbulence.intensity);
      intensity *= (1 + weather.wind.velocity.x * weather.wind.velocity.x / 10000);
    }
    
    // Speed effect (more turbulence at higher speeds)
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    const speedFactor = Math.min(2, speed / 50);
    intensity *= (1 + speedFactor * 0.5);
    
    // Generate turbulent forces using Perlin-like noise
    const turbulence: Vector3D = {
      x: this.generateNoise(position.x * 0.001 + this.time * 0.1, 0) * intensity,
      y: this.generateNoise(position.y * 0.001 + this.time * 0.1, 100) * intensity,
      z: this.generateNoise(position.z * 0.001 + this.time * 0.1, 200) * intensity * 0.5
    };
    
    // Apply frequency modulation for realistic turbulence
    const highFreq = this.time * 2;
    turbulence.x += this.generateNoise(highFreq, 300) * intensity * 0.3;
    turbulence.y += this.generateNoise(highFreq, 400) * intensity * 0.3;
    turbulence.z += this.generateNoise(highFreq, 500) * intensity * 0.2;
    
    return turbulence;
  }

  public updateWeatherTurbulence(weather: WeatherConditions): TurbulenceData {
    // Update weather-based turbulence parameters
    const windSpeed = Math.sqrt(
      weather.wind.velocity.x * weather.wind.velocity.x +
      weather.wind.velocity.y * weather.wind.velocity.y +
      weather.wind.velocity.z * weather.wind.velocity.z
    );
    
    const intensity = Math.min(1, windSpeed / 20) * weather.turbulence.intensity;
    
    return {
      intensity,
      scale: weather.turbulence.scale,
      direction: { ...weather.wind.velocity },
      frequency: 0.1 + intensity * 0.9
    };
  }

  private generateNoise(x: number, seed: number): number {
    // Simple pseudo-random noise generation
    const a = Math.sin(x + seed) * 43758.5453;
    return (a - Math.floor(a)) * 2 - 1;
  }

  public setIntensity(intensity: number): void {
    this.config.baseIntensity = Math.max(0, Math.min(1, intensity));
  }

  public getIntensity(): number {
    return this.config.baseIntensity;
  }
}