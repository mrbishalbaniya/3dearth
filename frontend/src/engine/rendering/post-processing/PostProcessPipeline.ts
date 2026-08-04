import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { HDRRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/hdrRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { Logger } from '../../core/Logger';

export class PostProcessPipeline {
  private scene: Scene;
  private logger: Logger;
  private hdrPipeline: HDRRenderingPipeline | null = null;
  private ssaoPipeline: SSAO2RenderingPipeline | null = null;
  private defaultPipeline: DefaultRenderingPipeline | null = null;
  private enabled: boolean = true;
  private quality: 'low' | 'medium' | 'high' | 'ultra' = 'medium';

  constructor(scene: Scene) {
    this.scene = scene;
    this.logger = Logger.getInstance();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Post Process Pipeline', 'PostProcess');
    
    this.setupDefaultPipeline();
    this.setupHDRPipeline();
    this.setupSSAO();
    
    this.logger.info('Post Process Pipeline initialized', 'PostProcess');
  }

  private setupDefaultPipeline(): void {
    this.defaultPipeline = new DefaultRenderingPipeline('defaultPipeline', true, this.scene, this.scene.cameras);
    
    // Configure based on quality
    this.configureDefaultPipeline();
  }

  private configureDefaultPipeline(): void {
    if (!this.defaultPipeline) return;

    // Tone mapping
    this.defaultPipeline.imageProcessingEnabled = true;
    this.defaultPipeline.imageProcessing.toneMappingEnabled = true;
    this.defaultPipeline.imageProcessing.toneMappingType = 1; // ACES
    this.defaultPipeline.imageProcessing.exposure = 1.0;
    this.defaultPipeline.imageProcessing.contrast = 1.0;

    // Bloom
    this.defaultPipeline.bloomEnabled = this.quality !== 'low';
    if (this.defaultPipeline.bloomEnabled) {
      this.defaultPipeline.bloomThreshold = 0.8;
      this.defaultPipeline.bloomWeight = 0.15;
      this.defaultPipeline.bloomKernel = this.getBloomKernel();
      this.defaultPipeline.bloomScale = 0.5;
    }

    // FXAA
    this.defaultPipeline.fxaaEnabled = true;

    // Chromatic aberration
    this.defaultPipeline.chromaticAberrationEnabled = this.quality === 'ultra';
    if (this.defaultPipeline.chromaticAberrationEnabled) {
      this.defaultPipeline.chromaticAberration.aberrationAmount = 10;
    }

    // Grain
    this.defaultPipeline.grainEnabled = this.quality === 'high' || this.quality === 'ultra';
    if (this.defaultPipeline.grainEnabled) {
      this.defaultPipeline.grain.intensity = 5;
      this.defaultPipeline.grain.animated = true;
    }

    // Sharpen
    this.defaultPipeline.sharpenEnabled = this.quality === 'ultra';
    if (this.defaultPipeline.sharpenEnabled) {
      this.defaultPipeline.sharpen.edgeAmount = 0.3;
      this.defaultPipeline.sharpen.colorAmount = 1;
    }
  }

  private setupHDRPipeline(): void {
    if (this.quality === 'low') return;

    this.hdrPipeline = new HDRRenderingPipeline('hdrPipeline', this.scene, 1.0, null, this.scene.cameras);
    
    // Configure HDR settings
    this.hdrPipeline.exposure = 1.0;
    this.hdrPipeline.minimumLuminance = 1.0;
    this.hdrPipeline.maximumLuminance = 1e20;
    this.hdrPipeline.luminanceIncreaserate = 0.5;
    this.hdrPipeline.luminanceDecreaseRate = 0.5;
  }

  private setupSSAO(): void {
    if (this.quality === 'low' || this.quality === 'medium') return;

    this.ssaoPipeline = new SSAO2RenderingPipeline('ssaoPipeline', this.scene, {
      ssaoRatio: this.getSSAORatio(),
      blurRatio: this.getSSAOBlurRatio()
    });

    // Configure SSAO settings
    this.ssaoPipeline.fallOff = 0.000001;
    this.ssaoPipeline.area = 0.0075;
    this.ssaoPipeline.radius = 0.0001;
    this.ssaoPipeline.totalStrength = 1.0;
    this.ssaoPipeline.base = 0.5;

    // Attach to cameras
    this.scene.cameras.forEach(camera => {
      this.ssaoPipeline?.attach(camera);
    });
  }

  private getBloomKernel(): number {
    switch (this.quality) {
      case 'low': return 32;
      case 'medium': return 64;
      case 'high': return 128;
      case 'ultra': return 256;
      default: return 64;
    }
  }

  private getSSAORatio(): number {
    switch (this.quality) {
      case 'high': return 0.5;
      case 'ultra': return 1.0;
      default: return 0.5;
    }
  }

  private getSSAOBlurRatio(): number {
    switch (this.quality) {
      case 'high': return 0.25;
      case 'ultra': return 0.5;
      default: return 0.25;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (this.defaultPipeline) {
      this.defaultPipeline.setEnabled(enabled);
    }
    
    if (this.hdrPipeline) {
      this.hdrPipeline.setEnabled(enabled);
    }
    
    if (this.ssaoPipeline) {
      this.ssaoPipeline.setEnabled(enabled);
    }
  }

  public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.quality = quality;
    
    // Dispose existing pipelines
    this.dispose();
    
    // Recreate with new quality settings
    this.setupDefaultPipeline();
    this.setupHDRPipeline();
    this.setupSSAO();
    
    this.logger.info(`Post process quality set to: ${quality}`, 'PostProcess');
  }

  public setExposure(exposure: number): void {
    if (this.defaultPipeline?.imageProcessing) {
      this.defaultPipeline.imageProcessing.exposure = exposure;
    }
    
    if (this.hdrPipeline) {
      this.hdrPipeline.exposure = exposure;
    }
  }

  public setContrast(contrast: number): void {
    if (this.defaultPipeline?.imageProcessing) {
      this.defaultPipeline.imageProcessing.contrast = contrast;
    }
  }

  public setBloomIntensity(intensity: number): void {
    if (this.defaultPipeline && this.defaultPipeline.bloomEnabled) {
      this.defaultPipeline.bloomWeight = intensity;
    }
  }

  public enableFeature(feature: string, enabled: boolean): void {
    if (!this.defaultPipeline) return;

    switch (feature) {
      case 'bloom':
        this.defaultPipeline.bloomEnabled = enabled && this.quality !== 'low';
        break;
      case 'fxaa':
        this.defaultPipeline.fxaaEnabled = enabled;
        break;
      case 'grain':
        this.defaultPipeline.grainEnabled = enabled && (this.quality === 'high' || this.quality === 'ultra');
        break;
      case 'chromaticAberration':
        this.defaultPipeline.chromaticAberrationEnabled = enabled && this.quality === 'ultra';
        break;
      case 'sharpen':
        this.defaultPipeline.sharpenEnabled = enabled && this.quality === 'ultra';
        break;
      default:
        this.logger.warning(`Unknown post process feature: ${feature}`, 'PostProcess');
        break;
    }
  }

  public process(): void {
    if (!this.enabled) return;
    
    // Post processing happens automatically in Babylon.js render loop
    // This method can be used for custom post process effects
  }

  public resize(width: number, height: number): void {
    // Babylon.js handles automatic resizing of post process effects
    this.logger.debug(`Post process pipeline resized to ${width}x${height}`, 'PostProcess');
  }

  public getDefaultPipeline(): DefaultRenderingPipeline | null {
    return this.defaultPipeline;
  }

  public getHDRPipeline(): HDRRenderingPipeline | null {
    return this.hdrPipeline;
  }

  public getSSAOPipeline(): SSAO2RenderingPipeline | null {
    return this.ssaoPipeline;
  }

  public dispose(): void {
    this.logger.info('Disposing Post Process Pipeline', 'PostProcess');
    
    if (this.ssaoPipeline) {
      this.ssaoPipeline.dispose();
      this.ssaoPipeline = null;
    }
    
    if (this.hdrPipeline) {
      this.hdrPipeline.dispose();
      this.hdrPipeline = null;
    }
    
    if (this.defaultPipeline) {
      this.defaultPipeline.dispose();
      this.defaultPipeline = null;
    }
  }
}