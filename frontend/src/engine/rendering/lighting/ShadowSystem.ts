import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Logger } from '../../core/Logger';

export class ShadowSystem {
  private scene: Scene;
  private logger: Logger;
  private shadowGenerators: Map<string, ShadowGenerator | CascadedShadowGenerator>;
  private shadowCasters: Set<AbstractMesh>;
  private shadowReceivers: Set<AbstractMesh>;
  private enabled: boolean = true;
  private quality: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
  private cascadedShadowsEnabled: boolean = true;

  constructor(scene: Scene) {
    this.scene = scene;
    this.logger = Logger.getInstance();
    this.shadowGenerators = new Map();
    this.shadowCasters = new Set();
    this.shadowReceivers = new Set();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Shadow System', 'Shadows');
    this.logger.info('Shadow System initialized', 'Shadows');
  }

  public createShadowGenerator(lightId: string, light: DirectionalLight | PointLight | SpotLight): ShadowGenerator | CascadedShadowGenerator {
    const mapSize = this.getShadowMapSize();
    
    let generator: ShadowGenerator | CascadedShadowGenerator;

    if (light instanceof DirectionalLight && this.cascadedShadowsEnabled) {
      generator = new CascadedShadowGenerator(mapSize, light);
      this.setupCascadedShadows(generator as CascadedShadowGenerator);
    } else {
      generator = new ShadowGenerator(mapSize, light);
      this.setupStandardShadows(generator as ShadowGenerator);
    }

    this.shadowGenerators.set(lightId, generator);
    this.logger.debug(`Created shadow generator for light: ${lightId}`, 'Shadows');
    
    return generator;
  }

  private setupCascadedShadows(generator: CascadedShadowGenerator): void {
    generator.numCascades = this.getNumCascades();
    generator.autoCalcDepthBounds = true;
    generator.stabilizeCascades = true;
    generator.lambda = 0.5;
    generator.cascadeBlendPercentage = 0.1;
    
    // Enable filtering
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = this.getFilterQuality();
    
    // Bias settings
    generator.bias = 0.00005;
    generator.normalBias = 0.0001;
  }

  private setupStandardShadows(generator: ShadowGenerator): void {
    // Enable filtering
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = this.getFilterQuality();
    
    // Bias settings
    generator.bias = 0.00005;
    generator.normalBias = 0.0001;
    
    // Soft shadows
    if (this.quality === 'high' || this.quality === 'ultra') {
      generator.usePoissonSampling = true;
    }
  }

  public removeShadowGenerator(lightId: string): void {
    const generator = this.shadowGenerators.get(lightId);
    if (generator) {
      generator.dispose();
      this.shadowGenerators.delete(lightId);
      this.logger.debug(`Removed shadow generator for light: ${lightId}`, 'Shadows');
    }
  }

  public addShadowCaster(mesh: AbstractMesh): void {
    this.shadowCasters.add(mesh);
    
    // Add to all existing shadow generators
    for (const generator of this.shadowGenerators.values()) {
      generator.getShadowMap()?.renderList?.push(mesh);
    }
  }

  public removeShadowCaster(mesh: AbstractMesh): void {
    this.shadowCasters.delete(mesh);
    
    // Remove from all shadow generators
    for (const generator of this.shadowGenerators.values()) {
      const renderList = generator.getShadowMap()?.renderList;
      if (renderList) {
        const index = renderList.indexOf(mesh);
        if (index !== -1) {
          renderList.splice(index, 1);
        }
      }
    }
  }

  public addShadowReceiver(mesh: AbstractMesh): void {
    this.shadowReceivers.add(mesh);
    mesh.receiveShadows = true;
  }

  public removeShadowReceiver(mesh: AbstractMesh): void {
    this.shadowReceivers.delete(mesh);
    mesh.receiveShadows = false;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    for (const mesh of this.shadowReceivers) {
      mesh.receiveShadows = enabled;
    }
    
    for (const generator of this.shadowGenerators.values()) {
      const shadowMap = generator.getShadowMap();
      if (shadowMap) {
        shadowMap.renderList = enabled ? Array.from(this.shadowCasters) : [];
      }
    }
  }

  public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.quality = quality;
    
    // Update all existing shadow generators
    for (const generator of this.shadowGenerators.values()) {
      const mapSize = this.getShadowMapSize();
      const shadowMap = generator.getShadowMap();
      if (shadowMap) {
        shadowMap.resize(mapSize);
      }
      
      if (generator instanceof ShadowGenerator) {
        generator.filteringQuality = this.getFilterQuality();
        generator.usePoissonSampling = quality === 'high' || quality === 'ultra';
      } else if (generator instanceof CascadedShadowGenerator) {
        generator.numCascades = this.getNumCascades();
        generator.filteringQuality = this.getFilterQuality();
      }
    }
  }

  private getShadowMapSize(): number {
    switch (this.quality) {
      case 'low': return 512;
      case 'medium': return 1024;
      case 'high': return 2048;
      case 'ultra': return 4096;
      default: return 1024;
    }
  }

  private getNumCascades(): number {
    switch (this.quality) {
      case 'low': return 2;
      case 'medium': return 3;
      case 'high': return 4;
      case 'ultra': return 4;
      default: return 3;
    }
  }

  private getFilterQuality(): number {
    switch (this.quality) {
      case 'low': return 0; // No filtering
      case 'medium': return 1; // Basic PCF
      case 'high': return 2; // Better PCF
      case 'ultra': return 3; // Best PCF
      default: return 1;
    }
  }

  public updateShadows(): void {
    if (!this.enabled) {
      return;
    }

    // Update shadow generators if needed
    for (const generator of this.shadowGenerators.values()) {
      if (generator instanceof CascadedShadowGenerator) {
        // Cascaded shadows automatically handle updates
        continue;
      }
      
      // Update standard shadow generator if needed
      const shadowMap = generator.getShadowMap();
      if (shadowMap && shadowMap.renderList) {
        // Ensure all current shadow casters are in the render list
        shadowMap.renderList = Array.from(this.shadowCasters);
      }
    }
  }

  public getShadowGenerator(lightId: string): ShadowGenerator | CascadedShadowGenerator | undefined {
    return this.shadowGenerators.get(lightId);
  }

  public getAllShadowGenerators(): (ShadowGenerator | CascadedShadowGenerator)[] {
    return Array.from(this.shadowGenerators.values());
  }

  public getMemoryUsage(): number {
    let totalMemory = 0;
    
    for (const generator of this.shadowGenerators.values()) {
      const shadowMap = generator.getShadowMap();
      if (shadowMap) {
        const mapSize = shadowMap.getSize();
        // Estimate memory usage: width * height * 4 bytes (32-bit depth)
        totalMemory += mapSize.width * mapSize.height * 4;
      }
    }
    
    return totalMemory;
  }

  public dispose(): void {
    this.logger.info('Disposing Shadow System', 'Shadows');
    
    for (const generator of this.shadowGenerators.values()) {
      generator.dispose();
    }
    
    this.shadowGenerators.clear();
    this.shadowCasters.clear();
    this.shadowReceivers.clear();
  }
}