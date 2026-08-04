import { Vector3D, WindData, WeatherConditions } from '../types/AircraftTypes';

export interface WindConfig {
  layers: WindLayer[];
  gustIntensity: number;
  gustFrequency: number;
  shearIntensity: number;
}

export interface WindLayer {
  altitudeMin: number;
  altitudeMax: number;
  direction: number; // degrees
  speed: number;     // m/s
  turbulence: number;
}

export class WindSystem {
  private config: WindConfig;
  private gustTimer = 0;
  private gustDirection = 0;
  private gustMagnitude = 0;
  private time = 0;

  constructor(config: WindConfig) {
    this.config = config;
    this.generateGust();
  }

  public update(deltaTime: number, position: Vector3D): WindData {
    this.time += deltaTime;
    this.gustTimer += deltaTime;

    // Get base wind for current altitude
    const baseWind = this.getWindAtAltitude(position.z);
    
    // Update gusts
    if (this.gustTimer >= 1 / this.config.gustFrequency) {
      this.generateGust();
      this.gustTimer = 0;
    }
    
    // Apply gust with smooth transition
    const gustFactor = Math.sin(this.gustTimer * Math.PI * this.config.gustFrequency) * this.config.gustIntensity;
    const gustX = Math.cos(this.gustDirection) * this.gustMagnitude * gustFactor;
    const gustY = Math.sin(this.gustDirection) * this.gustMagnitude * gustFactor;
    
    // Wind shear effect (change in wind with altitude)
    const shear = this.calculateWindShear(position.z);
    
    // Terrain effect (simplified)
    const terrainEffect = this.calculateTerrainEffect(position);
    
    const totalWind: Vector3D = {
      x: baseWind.x + gustX + shear.x + terrainEffect.x,
      y: baseWind.y + gustY + shear.y + terrainEffect.y,
      z: baseWind.z + terrainEffect.z
    };
    
    // Get turbulence for current conditions
    const turbulence = this.calculateTurbulence(position, totalWind);
    
    return {
      velocity: totalWind,
      turbulence
    };
  }

  private getWindAtAltitude(altitude: number): Vector3D {
    // Find appropriate wind layer
    let lowerLayer: WindLayer | null = null;
    let upperLayer: WindLayer | null = null;
    
    for (const layer of this.config.layers) {
      if (altitude >= layer.altitudeMin && altitude <= layer.altitudeMax) {
        // Direct hit
        return this.layerToVector(layer);
      }
      
      if (altitude > layer.altitudeMax && (!lowerLayer || layer.altitudeMax > lowerLayer.altitudeMax)) {
        lowerLayer = layer;
      }
      
      if (altitude < layer.altitudeMin && (!upperLayer || layer.altitudeMin < upperLayer.altitudeMin)) {
        upperLayer = layer;
      }
    }
    
    // Interpolate between layers if needed
    if (lowerLayer && upperLayer) {
      const t = (altitude - lowerLayer.altitudeMax) / (upperLayer.altitudeMin - lowerLayer.altitudeMax);
      return this.interpolateWind(lowerLayer, upperLayer, t);
    }
    
    // Use closest layer
    const closestLayer = lowerLayer || upperLayer;
    if (closestLayer) {
      return this.layerToVector(closestLayer);
    }
    
    // No wind if no layers defined
    return { x: 0, y: 0, z: 0 };
  }

  private layerToVector(layer: WindLayer): Vector3D {
    const radians = (layer.direction * Math.PI) / 180;
    return {
      x: Math.cos(radians) * layer.speed,
      y: Math.sin(radians) * layer.speed,
      z: 0
    };
  }

  private interpolateWind(lower: WindLayer, upper: WindLayer, t: number): Vector3D {
    const lowerWind = this.layerToVector(lower);
    const upperWind = this.layerToVector(upper);
    
    return {
      x: lowerWind.x + (upperWind.x - lowerWind.x) * t,
      y: lowerWind.y + (upperWind.y - lowerWind.y) * t,
      z: lowerWind.z + (upperWind.z - lowerWind.z) * t
    };
  }

  private calculateWindShear(altitude: number): Vector3D {
    // Simplified wind shear calculation
    const shearRate = this.config.shearIntensity;
    const shearX = Math.sin(altitude * 0.001) * shearRate;
    const shearY = Math.cos(altitude * 0.001) * shearRate;
    
    return { x: shearX, y: shearY, z: 0 };
  }

  private calculateTerrainEffect(position: Vector3D): Vector3D {
    // Simplified terrain effect - upward wind over hills, downward in valleys
    const terrainHeight = Math.sin(position.x * 0.0001) * Math.cos(position.y * 0.0001) * 100;
    const heightEffect = Math.exp(-position.z / 500); // Stronger effect at lower altitudes
    
    return {
      x: 0,
      y: 0,
      z: terrainHeight * heightEffect * 0.1
    };
  }

  private calculateTurbulence(position: Vector3D, wind: Vector3D): { intensity: number; scale: number } {
    const windSpeed = Math.sqrt(wind.x * wind.x + wind.y * wind.y + wind.z * wind.z);
    const altitudeFactor = Math.exp(-position.z / 2000);
    
    return {
      intensity: Math.min(1, windSpeed / 20) * altitudeFactor,
      scale: 100 + windSpeed * 10
    };
  }

  private generateGust(): void {
    this.gustDirection = Math.random() * 2 * Math.PI;
    this.gustMagnitude = (Math.random() - 0.5) * 2; // -1 to 1
  }

  public addWindLayer(layer: WindLayer): void {
    this.config.layers.push(layer);
    // Sort layers by altitude
    this.config.layers.sort((a, b) => a.altitudeMin - b.altitudeMin);
  }

  public removeWindLayer(index: number): void {
    if (index >= 0 && index < this.config.layers.length) {
      this.config.layers.splice(index, 1);
    }
  }

  public setGustIntensity(intensity: number): void {
    this.config.gustIntensity = Math.max(0, Math.min(1, intensity));
  }

  public setGustFrequency(frequency: number): void {
    this.config.gustFrequency = Math.max(0.1, Math.min(10, frequency));
  }

  public getWindLayers(): WindLayer[] {
    return [...this.config.layers];
  }
}