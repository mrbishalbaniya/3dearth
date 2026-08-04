import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Lifecycle, Updatable } from '../core/Lifecycle';
import type { PhysicsManager } from './PhysicsManager';
import type { WeatherManager } from './WeatherManager';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';

interface Vehicle {
  id: string;
  thrust: number;
  maxThrust: number;
  liftCoefficient: number;
  dragCoefficient: number;
}

export class VehicleManager implements Lifecycle, Updatable {
  private readonly scene: Scene;
  private readonly physics: PhysicsManager;
  private readonly weather: WeatherManager;
  private readonly events: EventSystem<WorldEventMap>;
  private readonly vehicles = new Map<string, Vehicle>();

  constructor(
    scene: Scene,
    physics: PhysicsManager,
    weather: WeatherManager,
    events: EventSystem<WorldEventMap>
  ) {
    this.scene = scene;
    this.physics = physics;
    this.weather = weather;
    this.events = events;
  }

  public async initialize(): Promise<void> {
    const defaultVehicle = this.createVehicle('player_aircraft', new Vector3(0, 200, 0));
    this.setThrottle(defaultVehicle.id, 0.55);
  }

  public createVehicle(id: string, position: Vector3): Vehicle {
    if (this.vehicles.has(id)) {
      throw new Error(`Vehicle ${id} already exists`);
    }

    const mesh = MeshBuilder.CreateBox(`vehicle_${id}`, { width: 8, height: 2.5, depth: 12 }, this.scene);
    mesh.position.copyFrom(position);

    const material = new StandardMaterial(`vehicle_mat_${id}`, this.scene);
    material.diffuseColor = new Color3(0.95, 0.95, 1.0);
    material.emissiveColor = new Color3(0.08, 0.08, 0.12);
    mesh.material = material;

    this.physics.registerBody(id, mesh, 1200, 0.008, true);

    const vehicle: Vehicle = {
      id,
      thrust: 0,
      maxThrust: 42000,
      liftCoefficient: 0.024,
      dragCoefficient: 0.0018,
    };

    this.vehicles.set(id, vehicle);
    this.events.emit('vehicle:spawned', { id, mesh });
    return vehicle;
  }

  public setThrottle(id: string, normalizedThrottle: number): void {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      return;
    }
    vehicle.thrust = vehicle.maxThrust * Math.max(0, Math.min(1, normalizedThrottle));
  }

  public update(_deltaTime: number): void {
    const wind = this.weather.getWind();
    const turbulence = this.weather.getTurbulence();

    for (const vehicle of this.vehicles.values()) {
      const body = this.physics.getBody(vehicle.id);
      if (!body) {
        continue;
      }

      const velocity = body.velocity.clone().subtractInPlace(wind.scale(0.12));
      const speed = velocity.length();

      const forward = body.mesh.forward.normalizeToNew();
      const thrustForce = forward.scale(vehicle.thrust);
      this.physics.applyForce(vehicle.id, thrustForce);

      const liftMagnitude = speed * speed * vehicle.liftCoefficient;
      const liftForce = Vector3.Up().scale(liftMagnitude);
      this.physics.applyForce(vehicle.id, liftForce);

      const dragForce = velocity.scale(-speed * vehicle.dragCoefficient);
      this.physics.applyForce(vehicle.id, dragForce);

      const randomX = (Math.sin(performance.now() * 0.0009 + speed) - 0.5) * turbulence * 120;
      const randomY = (Math.cos(performance.now() * 0.0011 + speed * 0.2) - 0.5) * turbulence * 80;
      const randomZ = (Math.sin(performance.now() * 0.0007 + speed * 0.4) - 0.5) * turbulence * 120;
      this.physics.applyForce(vehicle.id, new Vector3(randomX, randomY, randomZ));

      if (speed > 0.01) {
        const targetForward = velocity.normalizeToNew();
        const yaw = Math.atan2(targetForward.x, targetForward.z);
        body.mesh.rotation.y = yaw;
        body.mesh.rotation.x = Math.max(-0.25, Math.min(0.25, -body.velocity.y * 0.01));
      }
    }
  }

  public removeVehicle(id: string): void {
    const body = this.physics.getBody(id);
    if (body) {
      body.mesh.material?.dispose(true, true);
      body.mesh.dispose(false, true);
      this.physics.unregisterBody(id);
    }
    this.vehicles.delete(id);
    this.events.emit('vehicle:removed', { id });
  }

  public getVehicleCount(): number {
    return this.vehicles.size;
  }

  public getPlayerVehiclePosition(): Vector3 | null {
    const body = this.physics.getBody('player_aircraft');
    return body ? body.mesh.position.clone() : null;
  }

  public dispose(): void {
    const ids = Array.from(this.vehicles.keys());
    for (const id of ids) {
      this.removeVehicle(id);
    }
  }
}
