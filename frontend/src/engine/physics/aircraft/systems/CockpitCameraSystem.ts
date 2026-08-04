import { System } from '../../../ecs/System';
import { Entity } from '../../../ecs/Entity';
import { ComponentTypeEnum } from '../../../types/Core';
import { TransformComponent } from '../../../ecs/Component';
import { CockpitCameraComponent } from '../components/CockpitCameraComponent';
import { AircraftComponent } from '../components/AircraftComponent';
import { Vector3D } from '../types/AircraftTypes';

export class CockpitCameraSystem extends System {
  private cameraShakeTime = 0;

  constructor() {
    super('CockpitCameraSystem');
    this.requiredComponents = [ComponentTypeEnum.COCKPIT_CAMERA, ComponentTypeEnum.TRANSFORM];
    this.priority = 90; // Run after physics
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    this.cameraShakeTime += deltaTime;

    for (const entity of this.entities) {
      if (!entity.isActive()) {
        continue;
      }

      const transform = entity.getComponent(ComponentTypeEnum.TRANSFORM) as TransformComponent;
      const cockpitCamera = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;
      const aircraft = entity.getComponent(ComponentTypeEnum.AIRCRAFT) as AircraftComponent;

      if (transform && cockpitCamera && transform.enabled && cockpitCamera.enabled) {
        this.updateCockpitCamera(transform, cockpitCamera, aircraft, deltaTime);
      }
    }
  }

  private updateCockpitCamera(
    transform: TransformComponent,
    cockpitCamera: CockpitCameraComponent,
    aircraft: AircraftComponent | null,
    deltaTime: number
  ): void {
    // Get base camera position relative to aircraft
    let basePosition = { ...cockpitCamera.camera.position };
    
    // Apply aircraft rotation to camera position
    const aircraftPos = transform.position;
    const aircraftRot = transform.rotation;
    
    // Transform camera position from local to world space
    const worldPosition = this.transformPosition(basePosition, aircraftPos, aircraftRot);
    
    // Apply camera shake if present
    if (cockpitCamera.camera.shake.intensity > 0) {
      const shake = this.calculateShake(cockpitCamera.camera.shake, this.cameraShakeTime);
      worldPosition.x += shake.x;
      worldPosition.y += shake.y;
      worldPosition.z += shake.z;
    }
    
    // Update camera target based on view mode
    let targetPosition = { ...cockpitCamera.camera.target };
    
    if (cockpitCamera.viewMode !== 'external') {
      // For cockpit views, target is relative to aircraft
      targetPosition = this.transformPosition(targetPosition, aircraftPos, aircraftRot);
    } else {
      // For external view, target is the aircraft itself
      targetPosition = { ...aircraftPos };
    }
    
    // Smooth camera movement if enabled
    if (cockpitCamera.smooth) {
      const smoothFactor = Math.min(1, deltaTime * 5);
      
      cockpitCamera.camera.position.x += (worldPosition.x - cockpitCamera.camera.position.x) * smoothFactor;
      cockpitCamera.camera.position.y += (worldPosition.y - cockpitCamera.camera.position.y) * smoothFactor;
      cockpitCamera.camera.position.z += (worldPosition.z - cockpitCamera.camera.position.z) * smoothFactor;
      
      cockpitCamera.camera.target.x += (targetPosition.x - cockpitCamera.camera.target.x) * smoothFactor;
      cockpitCamera.camera.target.y += (targetPosition.y - cockpitCamera.camera.target.y) * smoothFactor;
      cockpitCamera.camera.target.z += (targetPosition.z - cockpitCamera.camera.target.z) * smoothFactor;
    } else {
      cockpitCamera.camera.position = worldPosition;
      cockpitCamera.camera.target = targetPosition;
    }
    
    // Update head tracking if enabled and aircraft data available
    if (cockpitCamera.camera.headTracking && aircraft) {
      this.applyHeadTracking(cockpitCamera, aircraft, deltaTime);
    }
    
    cockpitCamera.markDirty();
  }

  private transformPosition(localPos: Vector3D, worldPos: Vector3D, rotation: Vector3D): Vector3D {
    // Simplified rotation transformation (assumes Euler angles)
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosZ = Math.cos(rotation.z);
    const sinZ = Math.sin(rotation.z);
    
    // Apply rotation matrix
    const rotatedX = localPos.x * (cosY * cosZ) + localPos.y * (cosY * sinZ) + localPos.z * (-sinY);
    const rotatedY = localPos.x * (sinX * sinY * cosZ - cosX * sinZ) + localPos.y * (sinX * sinY * sinZ + cosX * cosZ) + localPos.z * (sinX * cosY);
    const rotatedZ = localPos.x * (cosX * sinY * cosZ + sinX * sinZ) + localPos.y * (cosX * sinY * sinZ - sinX * cosZ) + localPos.z * (cosX * cosY);
    
    return {
      x: worldPos.x + rotatedX,
      y: worldPos.y + rotatedY,
      z: worldPos.z + rotatedZ
    };
  }

  private calculateShake(shake: { intensity: number; frequency: number }, time: number): Vector3D {
    const shakeX = Math.sin(time * shake.frequency * 2.1) * shake.intensity;
    const shakeY = Math.sin(time * shake.frequency * 1.7) * shake.intensity;
    const shakeZ = Math.sin(time * shake.frequency * 2.3) * shake.intensity * 0.5;
    
    return { x: shakeX, y: shakeY, z: shakeZ };
  }

  private applyHeadTracking(
    cockpitCamera: CockpitCameraComponent,
    aircraft: AircraftComponent,
    deltaTime: number
  ): void {
    // Simple head tracking simulation based on G-forces
    const gForce = aircraft.flightData.gForce;
    const roll = aircraft.flightData.roll * Math.PI / 180;
    const pitch = aircraft.flightData.pitch * Math.PI / 180;
    
    // Head movement due to G-forces
    const headTilt = Math.max(-0.1, Math.min(0.1, (gForce - 1) * 0.05));
    const headRoll = Math.max(-0.05, Math.min(0.05, roll * 0.3));
    
    // Adjust camera target based on head movement
    const headOffset = {
      x: Math.sin(headRoll) * 0.1,
      y: headTilt,
      z: Math.sin(pitch) * 0.05
    };
    
    // Apply head tracking offset smoothly
    const trackingSpeed = 2.0;
    const factor = Math.min(1, deltaTime * trackingSpeed);
    
    cockpitCamera.camera.target.x += headOffset.x * factor;
    cockpitCamera.camera.target.y += headOffset.y * factor;
    cockpitCamera.camera.target.z += headOffset.z * factor;
  }

  public switchCameraView(entityId: string, viewMode: 'pilot' | 'copilot' | 'overhead' | 'external'): void {
    for (const entity of this.entities) {
      if (entity.id === entityId) {
        const cockpitCamera = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;
        if (cockpitCamera) {
          cockpitCamera.setViewMode(viewMode);
        }
        break;
      }
    }
  }

  public setCameraShakeIntensity(entityId: string, intensity: number): void {
    for (const entity of this.entities) {
      if (entity.id === entityId) {
        const cockpitCamera = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;
        if (cockpitCamera) {
          cockpitCamera.setBobIntensity(intensity);
        }
        break;
      }
    }
  }
}