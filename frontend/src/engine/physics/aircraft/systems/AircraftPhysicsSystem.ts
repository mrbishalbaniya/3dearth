import { System } from '../../../ecs/System';
import { Entity } from '../../../ecs/Entity';
import { ComponentTypeEnum } from '../../../types/Core';
import { TransformComponent } from '../../../ecs/Component';
import { AircraftComponent } from '../components/AircraftComponent';
import { CockpitCameraComponent } from '../components/CockpitCameraComponent';
import { AircraftPhysics } from '../core/AircraftPhysics';

export class AircraftPhysicsSystem extends System {
  private aircraftPhysics = new Map<string, AircraftPhysics>();

  constructor() {
    super('AircraftPhysicsSystem');
    this.requiredComponents = [ComponentTypeEnum.TRANSFORM, ComponentTypeEnum.AIRCRAFT];
    this.priority = 20;
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      return;
    }

    for (const entity of this.entities) {
      if (!entity.isActive()) {
        continue;
      }

      const transform = entity.getComponent(ComponentTypeEnum.TRANSFORM) as TransformComponent;
      const aircraft = entity.getComponent(ComponentTypeEnum.AIRCRAFT) as AircraftComponent;
      const cockpitCamera = entity.getComponent(ComponentTypeEnum.COCKPIT_CAMERA) as CockpitCameraComponent;

      if (transform && aircraft && transform.enabled && aircraft.enabled) {
        this.updateAircraftPhysics(entity.id, transform, aircraft, cockpitCamera, deltaTime);
      }
    }
  }

  private updateAircraftPhysics(
    entityId: string,
    transform: TransformComponent,
    aircraft: AircraftComponent,
    cockpitCamera: CockpitCameraComponent | null,
    deltaTime: number
  ): void {
    // Get or create physics instance
    let physics = this.aircraftPhysics.get(entityId);
    if (!physics) {
      physics = new AircraftPhysics(aircraft.config);
      this.aircraftPhysics.set(entityId, physics);
    }

    // Set aircraft state from transform
    physics.setPosition(transform.position);
    physics.setOrientation({
      x: transform.rotation.x,
      y: transform.rotation.y,
      z: transform.rotation.z,
      w: 1 // Will be calculated properly
    });

    // Set controls
    physics.setControls(aircraft.controls);

    // Set weather
    physics.setWeather(aircraft.weather);

    // Update physics
    physics.update(deltaTime);

    // Get updated state
    const state = physics.getState();
    const flightData = physics.getFlightData();
    const engine = physics.getEngine();
    const landingGear = physics.getLandingGear();
    const flaps = physics.getFlaps();

    // Update transform from physics
    transform.setPosition(state.position.x, state.position.y, state.position.z);
    transform.setRotation(state.orientation.x, state.orientation.y, state.orientation.z);

    // Update aircraft component
    aircraft.flightData = flightData;
    aircraft.engine = engine;
    aircraft.landingGear = landingGear;
    aircraft.flaps = flaps;

    // Update cockpit camera if present
    if (cockpitCamera) {
      cockpitCamera.updateShake(
        flightData.gForce,
        aircraft.weather.turbulence.intensity,
        engine.rpm / 2500
      );
    }

    aircraft.markDirty();
    transform.markDirty();
    if (cockpitCamera) cockpitCamera.markDirty();
  }

  public onEntityRemoved(entity: Entity): void {
    super.onEntityRemoved(entity);
    // Clean up physics instance
    if (this.aircraftPhysics.has(entity.id)) {
      this.aircraftPhysics.delete(entity.id);
    }
  }

  public getAircraftPhysics(entityId: string): AircraftPhysics | undefined {
    return this.aircraftPhysics.get(entityId);
  }

  public shutdown(): void {
    this.aircraftPhysics.clear();
  }
}