import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Logger } from '../../core/Logger';
import { Light, LightType } from '../../types/Core';

export class LightingSystem {
  private scene: Scene;
  private logger: Logger;
  private lights: Map<string, DirectionalLight | PointLight | SpotLight>;
  private ambientIntensity: number;
  private sunLight: DirectionalLight | null = null;
  private timeOfDay: number = 12; // 0-24 hours

  constructor(scene: Scene) {
    this.scene = scene;
    this.logger = Logger.getInstance();
    this.lights = new Map();
    this.ambientIntensity = 0.3;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Lighting System', 'Lighting');
    
    this.setupAmbientLight();
    this.createSunLight();
    
    this.logger.info('Lighting System initialized', 'Lighting');
  }

  private setupAmbientLight(): void {
    this.scene.ambientColor = new Color3(0.2, 0.2, 0.3);
  }

  private createSunLight(): void {
    this.sunLight = new DirectionalLight('sun', new Vector3(-1, -1, -1), this.scene);
    this.sunLight.intensity = 1.0;
    this.sunLight.diffuse = new Color3(1.0, 0.9, 0.8);
    this.sunLight.specular = new Color3(1.0, 0.9, 0.8);
    
    this.lights.set('sun', this.sunLight);
    this.updateSunPosition();
  }

  public createLight(lightData: Light): DirectionalLight | PointLight | SpotLight {
    let light: DirectionalLight | PointLight | SpotLight;

    switch (lightData.type) {
      case LightType.Directional:
        light = new DirectionalLight(
          lightData.id,
          lightData.direction ? new Vector3(lightData.direction.x, lightData.direction.y, lightData.direction.z) : new Vector3(0, -1, 0),
          this.scene
        );
        break;
      
      case LightType.Point:
        light = new PointLight(
          lightData.id,
          lightData.position ? new Vector3(lightData.position.x, lightData.position.y, lightData.position.z) : Vector3.Zero(),
          this.scene
        );
        if (lightData.range) {
          (light as PointLight).range = lightData.range;
        }
        break;
      
      case LightType.Spot:
        light = new SpotLight(
          lightData.id,
          lightData.position ? new Vector3(lightData.position.x, lightData.position.y, lightData.position.z) : Vector3.Zero(),
          lightData.direction ? new Vector3(lightData.direction.x, lightData.direction.y, lightData.direction.z) : new Vector3(0, -1, 0),
          lightData.spotAngle || Math.PI / 3,
          2,
          this.scene
        );
        if (lightData.range) {
          (light as SpotLight).range = lightData.range;
        }
        break;
      
      default:
        throw new Error(`Unsupported light type: ${lightData.type}`);
    }

    light.intensity = lightData.intensity;
    light.diffuse = new Color3(lightData.color.r, lightData.color.g, lightData.color.b);
    light.specular = new Color3(lightData.color.r, lightData.color.g, lightData.color.b);

    this.lights.set(lightData.id, light);
    
    this.logger.debug(`Created ${lightData.type} light: ${lightData.id}`, 'Lighting');
    
    return light;
  }

  public removeLight(lightId: string): void {
    const light = this.lights.get(lightId);
    if (light) {
      light.dispose();
      this.lights.delete(lightId);
      this.logger.debug(`Removed light: ${lightId}`, 'Lighting');
    }
  }

  public getLight(lightId: string): DirectionalLight | PointLight | SpotLight | undefined {
    return this.lights.get(lightId);
  }

  public setTimeOfDay(hours: number): void {
    this.timeOfDay = Math.max(0, Math.min(24, hours));
    this.updateSunPosition();
    this.updateSunColor();
  }

  private updateSunPosition(): void {
    if (!this.sunLight) return;

    // Calculate sun position based on time of day
    const angle = (this.timeOfDay / 24) * Math.PI * 2 - Math.PI; // -PI to PI
    const elevation = Math.sin(angle);
    const azimuth = Math.cos(angle);

    this.sunLight.direction = new Vector3(azimuth, -Math.abs(elevation), 0.3);
    
    // Adjust intensity based on sun elevation
    const intensity = Math.max(0, elevation + 0.2);
    this.sunLight.intensity = intensity;
  }

  private updateSunColor(): void {
    if (!this.sunLight) return;

    let color: Color3;

    if (this.timeOfDay >= 6 && this.timeOfDay <= 18) {
      // Daytime
      if (this.timeOfDay >= 10 && this.timeOfDay <= 14) {
        // Midday - bright white
        color = new Color3(1.0, 0.95, 0.9);
      } else {
        // Morning/afternoon - warmer
        color = new Color3(1.0, 0.8, 0.6);
      }
    } else {
      // Nighttime/twilight
      if (this.timeOfDay >= 19 && this.timeOfDay <= 21 || this.timeOfDay >= 4 && this.timeOfDay <= 6) {
        // Twilight - orange/red
        color = new Color3(1.0, 0.4, 0.2);
      } else {
        // Night - blue moonlight
        color = new Color3(0.2, 0.3, 0.6);
      }
    }

    this.sunLight.diffuse = color;
    this.sunLight.specular = color;
  }

  public setAmbientIntensity(intensity: number): void {
    this.ambientIntensity = Math.max(0, Math.min(1, intensity));
    this.scene.ambientColor = this.scene.ambientColor.scale(this.ambientIntensity);
  }

  public updateLights(): void {
    // Update dynamic lights if needed
    for (const [id, light] of this.lights) {
      if (light instanceof PointLight || light instanceof SpotLight) {
        // Update light attenuation or other dynamic properties
        this.updateLightAttenuation(light);
      }
    }
  }

  private updateLightAttenuation(light: PointLight | SpotLight): void {
    // Realistic light attenuation
    const baseIntensity = light.intensity;
    const distance = light.range || 100;
    
    // Inverse square law approximation
    light.radius = distance;
  }

  public update(deltaTime: number): void {
    // Auto-advance time if needed
    // this.setTimeOfDay(this.timeOfDay + deltaTime / 3600); // 1 second = 1 hour
  }

  public getAllLights(): (DirectionalLight | PointLight | SpotLight)[] {
    return Array.from(this.lights.values());
  }

  public dispose(): void {
    this.logger.info('Disposing Lighting System', 'Lighting');
    
    for (const light of this.lights.values()) {
      light.dispose();
    }
    this.lights.clear();
    this.sunLight = null;
  }
}