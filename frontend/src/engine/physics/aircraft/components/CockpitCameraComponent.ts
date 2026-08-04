import { Component } from '../../../ecs/Component';
import { ComponentTypeEnum } from '../../../types/Core';
import {
  Vector3D,
  CockpitCamera,
  CockpitCameraConfig,
  AircraftState,
  FlightData
} from '../types/AircraftTypes';

export class CockpitCameraComponent extends Component {
  public isActive: boolean = true;
  public config: CockpitCameraConfig;
  public camera: CockpitCamera;
  public viewMode: 'pilot' | 'copilot' | 'overhead' | 'external' = 'pilot';
  public smooth: boolean = true;
  public bobIntensity: number = 1.0;
  public smoothedPosition: Vector3D;
  public smoothedTarget: Vector3D;
  
  // Pilot view positions
  public pilotPosition: Vector3D = { x: -0.5, y: 0, z: 1.2 };
  public copilotPosition: Vector3D = { x: 0.5, y: 0, z: 1.2 };
  public overheadPosition: Vector3D = { x: 0, y: 0, z: 1.8 };
  public externalPosition: Vector3D = { x: 0, y: -10, z: 2 };

  constructor(config?: Partial<CockpitCameraConfig>) {
    super(ComponentTypeEnum.COCKPIT_CAMERA);

    this.config = {
      fieldOfView: config?.fieldOfView ?? 75,
      nearClip: config?.nearClip ?? 0.1,
      farClip: config?.farClip ?? 50000,
      headTracking: config?.headTracking ?? false,
      smoothing: config?.smoothing ?? 6,
      bobIntensity: config?.bobIntensity ?? 1,
      gForceIntensity: config?.gForceIntensity ?? 1,
      position: config?.position,
      target: config?.target,
      eyePosition: config?.eyePosition,
      viewDirection: config?.viewDirection
    };
    
    this.camera = {
      position: { ...(this.config.position ?? this.pilotPosition) },
      target: { ...(this.config.target ?? { x: 5, y: 0, z: 1.2 }) },
      fov: this.config.fieldOfView,
      shake: {
        intensity: 0,
        frequency: 0
      },
      headTracking: this.config.headTracking
    };

    this.smoothedPosition = { ...this.camera.position };
    this.smoothedTarget = { ...this.camera.target };
  }

  public updateCamera(deltaTime: number, state: AircraftState, flightData: FlightData): void {
    const basePos = this.getBasePositionForMode();
    const forward = this.getForwardFromState(state);

    const gShake = Math.max(0, flightData.gForce - 1) * 0.03 * this.config.gForceIntensity;
    const t = performance.now() * 0.001;
    const shake = {
      x: Math.sin(t * 13.1) * this.camera.shake.intensity + Math.sin(t * 3.7) * gShake,
      y: Math.sin(t * 11.3) * this.camera.shake.intensity,
      z: Math.sin(t * 9.7) * this.camera.shake.intensity * 0.6
    };

    const targetPos = {
      x: state.position.x + basePos.x + shake.x,
      y: state.position.y + basePos.y + shake.y,
      z: state.position.z + basePos.z + shake.z
    };

    const lookDistance = this.viewMode === 'external' ? 0 : 10;
    const targetLook = this.viewMode === 'external'
      ? { x: state.position.x, y: state.position.y, z: state.position.z + 1 }
      : {
          x: targetPos.x + forward.x * lookDistance,
          y: targetPos.y + forward.y * lookDistance,
          z: targetPos.z + forward.z * lookDistance
        };

    if (this.smooth) {
      const alpha = Math.min(1, deltaTime * this.config.smoothing);
      this.smoothedPosition.x += (targetPos.x - this.smoothedPosition.x) * alpha;
      this.smoothedPosition.y += (targetPos.y - this.smoothedPosition.y) * alpha;
      this.smoothedPosition.z += (targetPos.z - this.smoothedPosition.z) * alpha;
      this.smoothedTarget.x += (targetLook.x - this.smoothedTarget.x) * alpha;
      this.smoothedTarget.y += (targetLook.y - this.smoothedTarget.y) * alpha;
      this.smoothedTarget.z += (targetLook.z - this.smoothedTarget.z) * alpha;
    } else {
      this.smoothedPosition = targetPos;
      this.smoothedTarget = targetLook;
    }

    this.camera.position = { ...this.smoothedPosition };
    this.camera.target = { ...this.smoothedTarget };
    this.markDirty();
  }

  private getBasePositionForMode(): Vector3D {
    if (this.viewMode === 'pilot') return this.pilotPosition;
    if (this.viewMode === 'copilot') return this.copilotPosition;
    if (this.viewMode === 'overhead') return this.overheadPosition;
    return this.externalPosition;
  }

  private getForwardFromState(state: AircraftState): Vector3D {
    const q = state.orientation;
    return {
      x: 1 - 2 * (q.y * q.y + q.z * q.z),
      y: 2 * (q.x * q.y + q.w * q.z),
      z: 2 * (q.x * q.z - q.w * q.y)
    };
  }

  public updateState(state: { position: Vector3D; target: Vector3D; shake?: { intensity: number; frequency: number } }): void {
    this.camera.position = { ...state.position };
    this.camera.target = { ...state.target };
    if (state.shake) {
      this.camera.shake = { ...state.shake };
    }
    this.smoothedPosition = { ...this.camera.position };
    this.smoothedTarget = { ...this.camera.target };
    this.markDirty();
  }

  public setViewMode(mode: 'pilot' | 'copilot' | 'overhead' | 'external'): void {
    this.viewMode = mode;
    
    switch (mode) {
      case 'pilot':
        this.camera.position = { ...this.pilotPosition };
        this.camera.target = { x: 5, y: 0, z: 1.2 };
        this.camera.fov = this.config.fieldOfView;
        break;
      case 'copilot':
        this.camera.position = { ...this.copilotPosition };
        this.camera.target = { x: 5, y: 0, z: 1.2 };
        this.camera.fov = this.config.fieldOfView;
        break;
      case 'overhead':
        this.camera.position = { ...this.overheadPosition };
        this.camera.target = { x: 5, y: 0, z: 0.8 };
        this.camera.fov = 90;
        break;
      case 'external':
        this.camera.position = { ...this.externalPosition };
        this.camera.target = { x: 0, y: 0, z: 1 };
        this.camera.fov = 60;
        break;
    }
    
    this.markDirty();
  }

  public updateShake(gForce: number, turbulence: number, engineVibration: number): void {
    // Calculate shake based on aircraft state
    const gShake = Math.max(0, Math.abs(gForce) - 1) * 0.02;
    const turbShake = turbulence * 0.01;
    const engShake = engineVibration * 0.005;
    
    this.camera.shake.intensity = gShake + turbShake + engShake;
    this.camera.shake.frequency = 10 + turbulence * 5 + engineVibration * 2;
    
    // Apply bob intensity modifier
    this.camera.shake.intensity *= this.bobIntensity;
    
    this.markDirty();
  }

  public setBobIntensity(intensity: number): void {
    this.bobIntensity = Math.max(0, Math.min(2, intensity));
  }

  public setHeadTracking(enabled: boolean): void {
    this.camera.headTracking = enabled;
    this.markDirty();
  }

  public serialize(): Record<string, any> {
    return {
      camera: this.camera,
      isActive: this.isActive,
      config: this.config,
      viewMode: this.viewMode,
      smooth: this.smooth,
      bobIntensity: this.bobIntensity,
      smoothedPosition: this.smoothedPosition,
      smoothedTarget: this.smoothedTarget,
      pilotPosition: this.pilotPosition,
      copilotPosition: this.copilotPosition,
      overheadPosition: this.overheadPosition,
      externalPosition: this.externalPosition
    };
  }

  public deserialize(data: Record<string, any>): void {
    if (data.camera) this.camera = data.camera;
    if (data.isActive !== undefined) this.isActive = data.isActive;
    if (data.config) this.config = data.config;
    if (data.viewMode) this.viewMode = data.viewMode;
    if (data.smooth !== undefined) this.smooth = data.smooth;
    if (data.bobIntensity !== undefined) this.bobIntensity = data.bobIntensity;
    if (data.smoothedPosition) this.smoothedPosition = data.smoothedPosition;
    if (data.smoothedTarget) this.smoothedTarget = data.smoothedTarget;
    if (data.pilotPosition) this.pilotPosition = data.pilotPosition;
    if (data.copilotPosition) this.copilotPosition = data.copilotPosition;
    if (data.overheadPosition) this.overheadPosition = data.overheadPosition;
    if (data.externalPosition) this.externalPosition = data.externalPosition;
    this.markDirty();
  }

  public clone(): CockpitCameraComponent {
    const clone = new CockpitCameraComponent();
    clone.camera = { ...this.camera };
    clone.isActive = this.isActive;
    clone.config = { ...this.config };
    clone.viewMode = this.viewMode;
    clone.smooth = this.smooth;
    clone.bobIntensity = this.bobIntensity;
    clone.smoothedPosition = { ...this.smoothedPosition };
    clone.smoothedTarget = { ...this.smoothedTarget };
    clone.pilotPosition = { ...this.pilotPosition };
    clone.copilotPosition = { ...this.copilotPosition };
    clone.overheadPosition = { ...this.overheadPosition };
    clone.externalPosition = { ...this.externalPosition };
    return clone;
  }
}