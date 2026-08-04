import { Vector3D, WindData } from '../types/AircraftTypes';
import { Logger } from '../../../core/Logger';

export interface WeatherLayer {
  altitude: number;
  windSpeed: number;
  windDirection: number; // degrees
  turbulence: number;
  temperature: number;
  pressure: number;
}

export interface TurbulenceConfig {
  lightMin: number;
  lightMax: number;
  moderateMin: number;
  moderateMax: number;
  severeMin: number;
  severeMax: number;
  extremeMin: number;
  extremeMax: number;
}

export class WindSystem {
  private weatherLayers: WeatherLayer[] = [];
  private turbulenceConfig: TurbulenceConfig;
  private logger = Logger.getInstance();
  private time = 0;
  private turbulenceSeeds: number[] = [];

  constructor() {
    this.turbulenceConfig = {
      lightMin: 0.1,
      lightMax: 0.3,
      moderateMin: 0.3,
      moderateMax: 0.6,
      severeMin: 0.6,
      severeMax: 1.0,
      extremeMin: 1.0,
      extremeMax: 2.0
    };

    // Initialize with default weather layers
    this.initializeDefaultWeather();
    
    // Initialize turbulence seeds for reproducible noise
    for (let i = 0; i < 10; i++) {
      this.turbulenceSeeds.push(Math.random() * 1000);
    }
  }

  private initializeDefaultWeather(): void {
    this.weatherLayers = [
      { altitude: 0, windSpeed: 5, windDirection: 270, turbulence: 0.2, temperature: 15, pressure: 1013.25 },
      { altitude: 1000, windSpeed: 8, windDirection: 280, turbulence: 0.15, temperature: 8, pressure: 898.76 },
      { altitude: 3000, windSpeed: 15, windDirection: 290, turbulence: 0.1, temperature: -4, pressure: 701.08 },
      { altitude: 6000, windSpeed: 25, windDirection: 300, turbulence: 0.3, temperature: -21, pressure: 471.81 },
      { altitude: 9000, windSpeed: 35, windDirection: 310, turbulence: 0.4, temperature: -38, pressure: 307.42 },
      { altitude: 12000, windSpeed: 45, windDirection: 320, turbulence: 0.2, temperature: -55, pressure: 193.99 }
    ];
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update weather patterns (simplified)
    this.updateWeatherPatterns(deltaTime);
  }

  private updateWeatherPatterns(deltaTime: number): void {
    const windShift = Math.sin(this.time * 0.001) * 5; // Slow wind direction changes
    const speedVariation = Math.sin(this.time * 0.002) * 0.1 + 1; // Wind speed variations
    
    for (const layer of this.weatherLayers) {
      layer.windDirection += windShift * deltaTime;
      layer.windSpeed *= speedVariation;
      
      // Keep values in reasonable ranges
      if (layer.windDirection > 360) layer.windDirection -= 360;
      if (layer.windDirection < 0) layer.windDirection += 360;
      layer.windSpeed = Math.max(0, Math.min(100, layer.windSpeed));
    }
  }

  public getWindAtPosition(position: Vector3D): WindData {
    const altitude = position.z;
    
    // Find the two layers to interpolate between
    let lowerLayer = this.weatherLayers[0];
    let upperLayer = this.weatherLayers[this.weatherLayers.length - 1];
    
    for (let i = 0; i < this.weatherLayers.length - 1; i++) {
      if (altitude >= this.weatherLayers[i].altitude && altitude <= this.weatherLayers[i + 1].altitude) {
        lowerLayer = this.weatherLayers[i];
        upperLayer = this.weatherLayers[i + 1];
        break;
      }
    }
    
    // Interpolate between layers
    const factor = upperLayer.altitude !== lowerLayer.altitude 
      ? (altitude - lowerLayer.altitude) / (upperLayer.altitude - lowerLayer.altitude)
      : 0;
    
    const windSpeed = this.interpolate(lowerLayer.windSpeed, upperLayer.windSpeed, factor);
    const windDirection = this.interpolateAngle(lowerLayer.windDirection, upperLayer.windDirection, factor);
    const turbulenceIntensity = this.interpolate(lowerLayer.turbulence, upperLayer.turbulence, factor);
    
    // Convert wind direction and speed to velocity vector
    const windRadians = (windDirection * Math.PI) / 180;
    const windVelocity: Vector3D = {
      x: windSpeed * Math.cos(windRadians),
      y: windSpeed * Math.sin(windRadians),
      z: this.getVerticalWind(position)
    };
    
    // Add turbulence
    const turbulence = this.calculateTurbulence(position, turbulenceIntensity);
    windVelocity.x += turbulence.x;
    windVelocity.y += turbulence.y;
    windVelocity.z += turbulence.z;
    
    return {
      velocity: windVelocity,
      turbulence: {
        intensity: turbulenceIntensity,
        scale: 1000
      }
    };
  }

  private getVerticalWind(position: Vector3D): number {
    // Simplified vertical wind calculation
    // In reality, this would be based on terrain, thermal activity, etc.
    const thermalNoise = this.noise3D(position.x * 0.0001, position.y * 0.0001, this.time * 0.1);
    const orographicLift = this.calculateOrographicLift(position);
    
    return thermalNoise * 2 + orographicLift;
  }

  private calculateOrographicLift(position: Vector3D): number {
    // Simplified orographic lift calculation
    // Would normally use terrain gradient and wind direction
    return Math.sin(position.x * 0.0001) * Math.cos(position.y * 0.0001) * 1.5;
  }

  private calculateTurbulence(position: Vector3D, intensity: number): Vector3D {
    const scale = 100; // Turbulence scale in meters
    const frequency = 0.01; // Turbulence frequency
    
    const noiseX = this.noise3D(
      position.x / scale + this.time * frequency,
      position.y / scale,
      position.z / scale
    );
    
    const noiseY = this.noise3D(
      position.x / scale,
      position.y / scale + this.time * frequency,
      position.z / scale + 100
    );
    
    const noiseZ = this.noise3D(
      position.x / scale,
      position.y / scale,
      position.z / scale + this.time * frequency + 200
    );
    
    const turbulenceStrength = this.getTurbulenceStrength(intensity);
    
    return {
      x: noiseX * turbulenceStrength,
      y: noiseY * turbulenceStrength,
      z: noiseZ * turbulenceStrength * 0.5 // Less vertical turbulence
    };
  }

  private getTurbulenceStrength(intensity: number): number {
    if (intensity <= this.turbulenceConfig.lightMax) {
      return intensity * 5; // Light turbulence: 0-1.5 m/s
    } else if (intensity <= this.turbulenceConfig.moderateMax) {
      return intensity * 8; // Moderate turbulence: 2.4-4.8 m/s
    } else if (intensity <= this.turbulenceConfig.severeMax) {
      return intensity * 12; // Severe turbulence: 7.2-12 m/s
    } else {
      return intensity * 20; // Extreme turbulence: 20+ m/s
    }
  }

  private noise3D(x: number, y: number, z: number): number {
    // Simplified 3D Perlin-like noise
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    
    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);
    
    const aaa = this.hash3D(xi, yi, zi);
    const aba = this.hash3D(xi, yi + 1, zi);
    const aab = this.hash3D(xi, yi, zi + 1);
    const abb = this.hash3D(xi, yi + 1, zi + 1);
    const baa = this.hash3D(xi + 1, yi, zi);
    const bba = this.hash3D(xi + 1, yi + 1, zi);
    const bab = this.hash3D(xi + 1, yi, zi + 1);
    const bbb = this.hash3D(xi + 1, yi + 1, zi + 1);
    
    const x1 = this.lerp(this.grad3D(aaa, xf, yf, zf), this.grad3D(baa, xf - 1, yf, zf), u);
    const x2 = this.lerp(this.grad3D(aba, xf, yf - 1, zf), this.grad3D(bba, xf - 1, yf - 1, zf), u);
    const y1 = this.lerp(x1, x2, v);
    
    const x3 = this.lerp(this.grad3D(aab, xf, yf, zf - 1), this.grad3D(bab, xf - 1, yf, zf - 1), u);
    const x4 = this.lerp(this.grad3D(abb, xf, yf - 1, zf - 1), this.grad3D(bbb, xf - 1, yf - 1, zf - 1), u);
    const y2 = this.lerp(x3, x4, v);
    
    return this.lerp(y1, y2, w);
  }

  private hash3D(x: number, y: number, z: number): number {
    return ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 0xFF;
  }

  private grad3D(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private interpolate(a: number, b: number, factor: number): number {
    return a + (b - a) * factor;
  }

  private interpolateAngle(a: number, b: number, factor: number): number {
    // Handle angle wrapping
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    let result = a + diff * factor;
    if (result > 360) result -= 360;
    if (result < 0) result += 360;
    
    return result;
  }

  // Public methods for weather management
  public setWeatherLayer(altitude: number, layer: Partial<WeatherLayer>): void {
    const existingIndex = this.weatherLayers.findIndex(l => Math.abs(l.altitude - altitude) < 10);
    
    if (existingIndex >= 0) {
      this.weatherLayers[existingIndex] = { ...this.weatherLayers[existingIndex], ...layer, altitude };
    } else {
      const newLayer: WeatherLayer = {
        altitude,
        windSpeed: layer.windSpeed || 0,
        windDirection: layer.windDirection || 0,
        turbulence: layer.turbulence || 0,
        temperature: layer.temperature || 15,
        pressure: layer.pressure || 1013.25
      };
      
      this.weatherLayers.push(newLayer);
      this.weatherLayers.sort((a, b) => a.altitude - b.altitude);
    }
  }

  public setTurbulenceIntensity(intensity: 'calm' | 'light' | 'moderate' | 'severe' | 'extreme'): void {
    const intensityMap = {
      calm: 0,
      light: 0.2,
      moderate: 0.45,
      severe: 0.8,
      extreme: 1.5
    };
    
    const targetIntensity = intensityMap[intensity];
    
    for (const layer of this.weatherLayers) {
      layer.turbulence = targetIntensity;
    }
  }

  public addWindShear(altitude: number, intensity: number): void {
    // Add wind shear at specific altitude
    const shearLayer: WeatherLayer = {
      altitude: altitude - 50,
      windSpeed: 10,
      windDirection: 90,
      turbulence: 0.1,
      temperature: 15,
      pressure: 1013.25
    };
    
    const shearLayer2: WeatherLayer = {
      altitude: altitude + 50,
      windSpeed: 30,
      windDirection: 270,
      turbulence: intensity,
      temperature: 15,
      pressure: 1013.25
    };
    
    this.weatherLayers.push(shearLayer, shearLayer2);
    this.weatherLayers.sort((a, b) => a.altitude - b.altitude);
  }

  public getWeatherLayers(): WeatherLayer[] {
    return [...this.weatherLayers];
  }

  public clearWeather(): void {
    this.weatherLayers = [];
    this.initializeDefaultWeather();
  }
}