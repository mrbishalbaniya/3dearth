import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Logger } from '../../core/Logger';
import { Material, MaterialType } from '../../types/Core';

export class MaterialSystem {
  private scene: Scene;
  private logger: Logger;
  private materials: Map<string, StandardMaterial | PBRMaterial>;
  private textures: Map<string, Texture>;
  private quality: 'low' | 'medium' | 'high' | 'ultra' = 'medium';

  constructor(scene: Scene) {
    this.scene = scene;
    this.logger = Logger.getInstance();
    this.materials = new Map();
    this.textures = new Map();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Material System', 'Materials');
    
    this.createDefaultMaterials();
    
    this.logger.info('Material System initialized', 'Materials');
  }

  private createDefaultMaterials(): void {
    // Create default standard material
    const defaultStandard = new StandardMaterial('default_standard', this.scene);
    defaultStandard.diffuseColor = new Color3(0.8, 0.8, 0.8);
    defaultStandard.specularColor = new Color3(0.1, 0.1, 0.1);
    this.materials.set('default_standard', defaultStandard);

    // Create default PBR material
    const defaultPBR = new PBRMaterial('default_pbr', this.scene);
    defaultPBR.baseColor = new Color3(0.8, 0.8, 0.8);
    defaultPBR.metallicFactor = 0.0;
    defaultPBR.roughnessFactor = 0.8;
    this.materials.set('default_pbr', defaultPBR);
  }

  public createMaterial(materialData: Material): StandardMaterial | PBRMaterial {
    let material: StandardMaterial | PBRMaterial;

    switch (materialData.type) {
      case MaterialType.Standard:
        material = this.createStandardMaterial(materialData);
        break;
      case MaterialType.PBR:
        material = this.createPBRMaterial(materialData);
        break;
      case MaterialType.Terrain:
        material = this.createTerrainMaterial(materialData);
        break;
      case MaterialType.Water:
        material = this.createWaterMaterial(materialData);
        break;
      case MaterialType.Sky:
        material = this.createSkyMaterial(materialData);
        break;
      case MaterialType.Unlit:
        material = this.createUnlitMaterial(materialData);
        break;
      default:
        material = this.createStandardMaterial(materialData);
        break;
    }

    this.materials.set(materialData.id, material);
    this.logger.debug(`Created ${materialData.type} material: ${materialData.id}`, 'Materials');
    
    return material;
  }

  private createStandardMaterial(materialData: Material): StandardMaterial {
    const material = new StandardMaterial(materialData.id, this.scene);
    
    // Apply properties
    if (materialData.properties.diffuseColor) {
      const color = materialData.properties.diffuseColor;
      material.diffuseColor = new Color3(color.r, color.g, color.b);
    }
    
    if (materialData.properties.specularColor) {
      const color = materialData.properties.specularColor;
      material.specularColor = new Color3(color.r, color.g, color.b);
    }
    
    if (materialData.properties.emissiveColor) {
      const color = materialData.properties.emissiveColor;
      material.emissiveColor = new Color3(color.r, color.g, color.b);
    }
    
    if (materialData.properties.diffuseTexture) {
      material.diffuseTexture = this.loadTexture(materialData.properties.diffuseTexture);
    }
    
    if (materialData.properties.normalTexture) {
      material.bumpTexture = this.loadTexture(materialData.properties.normalTexture);
    }
    
    if (materialData.properties.specularTexture) {
      material.specularTexture = this.loadTexture(materialData.properties.specularTexture);
    }

    return material;
  }

  private createPBRMaterial(materialData: Material): PBRMaterial {
    const material = new PBRMaterial(materialData.id, this.scene);
    
    // Apply properties
    if (materialData.properties.baseColor) {
      const color = materialData.properties.baseColor;
      material.baseColor = new Color3(color.r, color.g, color.b);
    }
    
    if (materialData.properties.metallicFactor !== undefined) {
      material.metallicFactor = materialData.properties.metallicFactor;
    }
    
    if (materialData.properties.roughnessFactor !== undefined) {
      material.roughnessFactor = materialData.properties.roughnessFactor;
    }
    
    if (materialData.properties.baseColorTexture) {
      material.baseTexture = this.loadTexture(materialData.properties.baseColorTexture);
    }
    
    if (materialData.properties.normalTexture) {
      material.bumpTexture = this.loadTexture(materialData.properties.normalTexture);
    }
    
    if (materialData.properties.metallicRoughnessTexture) {
      material.metallicTexture = this.loadTexture(materialData.properties.metallicRoughnessTexture);
    }
    
    if (materialData.properties.occlusionTexture) {
      material.ambientTexture = this.loadTexture(materialData.properties.occlusionTexture);
    }
    
    if (materialData.properties.emissiveTexture) {
      material.emissiveTexture = this.loadTexture(materialData.properties.emissiveTexture);
    }

    // Enable IBL for realistic lighting
    material.useRadianceOverAlpha = false;
    material.useSpecularOverAlpha = false;
    
    return material;
  }

  private createTerrainMaterial(materialData: Material): PBRMaterial {
    const material = new PBRMaterial(materialData.id, this.scene);
    
    // Terrain-specific settings
    material.baseColor = new Color3(0.3, 0.5, 0.2); // Default terrain green
    material.metallicFactor = 0.0;
    material.roughnessFactor = 0.9;
    
    // Apply terrain-specific textures
    if (materialData.properties.splatMap) {
      // Handle texture splatting for terrain
      material.baseTexture = this.loadTexture(materialData.properties.splatMap);
    }
    
    if (materialData.properties.heightMap) {
      material.bumpTexture = this.loadTexture(materialData.properties.heightMap);
    }
    
    return material;
  }

  private createWaterMaterial(materialData: Material): PBRMaterial {
    const material = new PBRMaterial(materialData.id, this.scene);
    
    // Water-specific settings
    material.baseColor = new Color3(0.0, 0.3, 0.8);
    material.metallicFactor = 0.0;
    material.roughnessFactor = 0.1;
    material.alpha = 0.8;
    
    // Enable transparency
    material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    
    return material;
  }

  private createSkyMaterial(materialData: Material): StandardMaterial {
    const material = new StandardMaterial(materialData.id, this.scene);
    
    // Sky-specific settings
    material.diffuseColor = new Color3(0.5, 0.7, 1.0);
    material.disableLighting = true;
    material.backFaceCulling = false;
    
    if (materialData.properties.skyTexture) {
      material.diffuseTexture = this.loadTexture(materialData.properties.skyTexture);
    }
    
    return material;
  }

  private createUnlitMaterial(materialData: Material): StandardMaterial {
    const material = new StandardMaterial(materialData.id, this.scene);
    
    material.disableLighting = true;
    
    if (materialData.properties.diffuseColor) {
      const color = materialData.properties.diffuseColor;
      material.diffuseColor = new Color3(color.r, color.g, color.b);
    }
    
    if (materialData.properties.diffuseTexture) {
      material.diffuseTexture = this.loadTexture(materialData.properties.diffuseTexture);
    }
    
    return material;
  }

  private loadTexture(textureUrl: string): Texture {
    // Check if texture is already loaded
    if (this.textures.has(textureUrl)) {
      return this.textures.get(textureUrl)!;
    }
    
    const texture = new Texture(textureUrl, this.scene);
    
    // Apply quality settings
    texture.samplingMode = this.getTextureSamplingMode();
    texture.generateMipMaps = this.quality !== 'low';
    
    this.textures.set(textureUrl, texture);
    
    return texture;
  }

  private getTextureSamplingMode(): number {
    switch (this.quality) {
      case 'low':
        return Texture.NEAREST_SAMPLINGMODE;
      case 'medium':
        return Texture.BILINEAR_SAMPLINGMODE;
      case 'high':
      case 'ultra':
        return Texture.TRILINEAR_SAMPLINGMODE;
      default:
        return Texture.BILINEAR_SAMPLINGMODE;
    }
  }

  public getMaterial(materialId: string): StandardMaterial | PBRMaterial | undefined {
    return this.materials.get(materialId);
  }

  public removeMaterial(materialId: string): void {
    const material = this.materials.get(materialId);
    if (material) {
      material.dispose();
      this.materials.delete(materialId);
      this.logger.debug(`Removed material: ${materialId}`, 'Materials');
    }
  }

  public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.quality = quality;
    
    // Update existing textures
    for (const texture of this.textures.values()) {
      texture.samplingMode = this.getTextureSamplingMode();
      texture.generateMipMaps = quality !== 'low';
    }
    
    this.logger.info(`Material quality set to: ${quality}`, 'Materials');
  }

  public update(deltaTime: number): void {
    // Update animated materials if needed
    for (const material of this.materials.values()) {
      if (material instanceof PBRMaterial) {
        // Update PBR material animations
        this.updatePBRMaterialAnimation(material, deltaTime);
      }
    }
  }

  private updatePBRMaterialAnimation(material: PBRMaterial, deltaTime: number): void {
    // Implement material animations like water waves, etc.
    if (material.name.includes('water')) {
      // Animate water normal texture offset
      if (material.bumpTexture) {
        material.bumpTexture.uOffset += deltaTime * 0.1;
        material.bumpTexture.vOffset += deltaTime * 0.05;
      }
    }
  }

  public getAllMaterials(): (StandardMaterial | PBRMaterial)[] {
    return Array.from(this.materials.values());
  }

  public getMemoryUsage(): number {
    let totalMemory = 0;
    
    for (const texture of this.textures.values()) {
      // Estimate texture memory usage
      const size = texture.getSize();
      totalMemory += size.width * size.height * 4; // Assume 32-bit textures
    }
    
    return totalMemory;
  }

  public dispose(): void {
    this.logger.info('Disposing Material System', 'Materials');
    
    for (const material of this.materials.values()) {
      material.dispose();
    }
    
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    
    this.materials.clear();
    this.textures.clear();
  }
}