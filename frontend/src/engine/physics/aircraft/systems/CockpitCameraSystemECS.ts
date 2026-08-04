import { System } from '../../../ecs/System';
import { ComponentTypeEnum } from '../../../types/Core';
import { Entity } from '../../../ecs/Entity';
import { CockpitCameraComponent } from '../components/CockpitCameraComponent';
import { AircraftPhysicsComponent } from '../components/AircraftPhysicsComponent';
import { TransformComponent } from '../../../ecs/Component';
import { CockpitCameraSystem } from './CockpitCameraSystem';
import { Logger } from '../../../core/Logger';

export class CockpitCameraSystemECS extends System {
  private cockpitSystems: Map<string, CockpitCameraSystem> = new Map();
  private logger: Logger;

  constructor() {
    super('CockpitCameraSystem');
    this.requiredComponents = [ComponentTypeEnum.COCKPIT_CAMERA, ComponentTypeEnum.TRANSFORM];
    this.priority = 90; // Run after physics but before rendering
    this.logger = Logger.getInstance();
  }

  public initialize(): void {
    this.logger.info('Cockpit Camera System initialized', 'CockpitCamera');
  }

  public update(deltaTime: number): void {
    if (!this.enabled) return;

    for (const entity of this.entities) {
      if (!entity.isActive()) continue;

      const cameraComponent = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;
      const transformComponent = entity.getComponent(ComponentTypeEnum.TRANSFORM) as TransformComponent;
      
      if (!cameraComponent || !transformComponent) continue;

      // Try to get the aircraft physics component from the same entity or parent
      const physicsComponent = this.findAircraftPhysicsComponent(entity);
      if (!physicsComponent) continue;

      // Get or create cockpit camera system instance
      let cameraSystem = this.cockpitSystems.get(entity.id);
      if (!cameraSystem) {
        cameraSystem = new CockpitCameraSystem(cameraComponent.config);
        this.cockpitSystems.set(entity.id, cameraSystem);
      }

      // Extract necessary data from physics component
      const aircraftPos = {
        x: transformComponent.position.x,
        y: transformComponent.position.y,
        z: transformComponent.position.z
      };

      const aircraftOrientation = physicsComponent.state.orientation;
      const aircraftVelocity = physicsComponent.state.velocity;
      const gForce = {
        x: physicsComponent.state.acceleration.x / 9.81,
        y: physicsComponent.state.acceleration.y / 9.81,
        z: physicsComponent.state.acceleration.z / 9.81
      };

      // Get additional data for camera effects
      const engineRpm = physicsComponent.engine.rpm;
      const turbulenceIntensity = this.estimateTurbulenceIntensity(physicsComponent);
      const groundHeight = this.estimateGroundHeight(aircraftPos);

      // Update camera system
      const newCameraState = cameraSystem.update(
        deltaTime,
        aircraftPos,
        aircraftOrientation,
        aircraftVelocity,
        gForce,
        engineRpm,
        turbulenceIntensity,
        groundHeight
      );

      // Update component state
      cameraComponent.updateState(newCameraState);

      // Update transform component with camera position
      transformComponent.setPosition(
        newCameraState.position.x,
        newCameraState.position.y,
        newCameraState.position.z
      );

      // Calculate look-at rotation (simplified)
      const lookDirection = {
        x: newCameraState.target.x - newCameraState.position.x,
        y: newCameraState.target.y - newCameraState.position.y,
        z: newCameraState.target.z - newCameraState.position.z
      };

      const pitch = Math.atan2(-lookDirection.z, Math.sqrt(lookDirection.x * lookDirection.x + lookDirection.y * lookDirection.y));
      const yaw = Math.atan2(lookDirection.y, lookDirection.x);

      transformComponent.setRotation(pitch, yaw, 0);
    }
  }

  private findAircraftPhysicsComponent(entity: Entity): AircraftPhysicsComponent | null {
    // First try the same entity
    const physicsComponent = entity.getComponent(ComponentTypeEnum.PHYSICS) as AircraftPhysicsComponent;
    if (physicsComponent) {
      return physicsComponent;
    }

    // If not found, try parent entity (camera might be child of aircraft)
    const transformComponent = entity.getComponent(ComponentTypeEnum.TRANSFORM) as TransformComponent;
    if (transformComponent && transformComponent.parent) {
      // Find the entity that owns this parent transform
      // This is a simplified approach - in a real system you'd have proper entity hierarchy
      for (const otherEntity of this.entities) {
        const otherTransform = otherEntity.getComponent(ComponentTypeEnum.TRANSFORM) as TransformComponent;
        if (otherTransform === transformComponent.parent) {
          const parentPhysics = otherEntity.getComponent(ComponentTypeEnum.PHYSICS) as AircraftPhysicsComponent;
          if (parentPhysics) {
            return parentPhysics;
          }
        }
      }
    }

    return null;
  }

  private estimateTurbulenceIntensity(physicsComponent: AircraftPhysicsComponent): number {
    // Estimate turbulence based on aircraft motion irregularities
    const acceleration = physicsComponent.state.acceleration;
    const accelerationMagnitude = Math.sqrt(
      acceleration.x * acceleration.x + 
      acceleration.y * acceleration.y + 
      acceleration.z * acceleration.z
    );
    
    // Normalize to 0-1 range (rough estimate)
    return Math.min(1, accelerationMagnitude / 20);
  }

  private estimateGroundHeight(position: { x: number; y: number; z: number }): number {
    // Simplified ground height estimation
    // In a real implementation, this would query terrain data
    return 0; // Assume flat ground at sea level
  }

  public onEntityAdded(entity: Entity): void {
    const cameraComponent = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;
    if (cameraComponent) {
      const cameraSystem = new CockpitCameraSystem(cameraComponent.config);
      this.cockpitSystems.set(entity.id, cameraSystem);
      this.logger.debug(`Added cockpit camera system for entity: ${entity.name}`, 'CockpitCamera');
    }
  }

  public onEntityRemoved(entity: Entity): void {
    this.cockpitSystems.delete(entity.id);
    this.logger.debug(`Removed cockpit camera system for entity: ${entity.name}`, 'CockpitCamera');
  }

  public getCameraSystem(entityId: string): CockpitCameraSystem | undefined {
    return this.cockpitSystems.get(entityId);
  }

  public setViewMode(entityId: string, viewMode: string): boolean {
    const cameraSystem = this.cockpitSystems.get(entityId);
    if (cameraSystem) {
      return cameraSystem.setViewMode(viewMode);
    }
    return false;
  }

  public setHeadTracking(entityId: string, enabled: boolean): void {
    const cameraSystem = this.cockpitSystems.get(entityId);
    const entity = Array.from(this.entities).find(e => e.id === entityId);
    
    if (cameraSystem && entity) {
      cameraSystem.setHeadTracking(enabled);
      
      const cameraComponent = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;
      if (cameraComponent) {
        cameraComponent.setHeadTracking(enabled);
      }
    }
  }

  public shutdown(): void {
    this.cockpitSystems.clear();
    this.logger.info('Cockpit Camera System shutdown', 'CockpitCamera');
  }
}