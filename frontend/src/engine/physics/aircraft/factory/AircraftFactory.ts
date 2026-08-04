import { Entity } from '../../../ecs/Entity';
import { TransformComponent } from '../../../ecs/Component';
import { AircraftComponent } from '../components/AircraftComponent';
import { CockpitCameraComponent } from '../components/CockpitCameraComponent';
import { AircraftPhysicsConfig, Vector3D } from '../types/AircraftTypes';

export interface CreateAircraftOptions {
  name?: string;
  config: AircraftPhysicsConfig;
  position?: Vector3D;
  orientation?: { x: number; y: number; z: number };
  withCockpitCamera?: boolean;
}

export class AircraftFactory {
  public static createAircraft(options: CreateAircraftOptions): Entity {
    const {
      name = 'Aircraft',
      config,
      position = { x: 0, y: 0, z: 1000 },
      orientation = { x: 0, y: 0, z: 0 },
      withCockpitCamera = true
    } = options;

    // Create entity
    const aircraft = new Entity(name);
    aircraft.setTag('aircraft');

    // Add transform component
    const transform = new TransformComponent();
    transform.setPosition(position.x, position.y, position.z);
    transform.setRotation(orientation.x, orientation.y, orientation.z);
    aircraft.addComponent(transform);

    // Add aircraft physics component
    const aircraftComponent = new AircraftComponent(config);
    aircraft.addComponent(aircraftComponent);

    // Add cockpit camera if requested
    if (withCockpitCamera) {
      const cockpitCamera = new CockpitCameraComponent();
      aircraft.addComponent(cockpitCamera);
    }

    return aircraft;
  }

  public static createCessna172(options?: Partial<CreateAircraftOptions>): Entity {
    const config: AircraftPhysicsConfig = {
      mass: 1100,
      wingArea: 16.2,
      aspectRatio: 7.32,
      oswaldsEfficiency: 0.75,
      liftCurveSlope: 5.7,
      zeroLiftAngle: -0.05,
      stallAngle: 0.28,
      maxLiftCoefficient: 1.4,
      dragCoefficient0: 0.025,
      maxThrust: 1200,
      thrustResponseTime: 2.0,
      momentOfInertia: { x: 1500, y: 3000, z: 4000 },
      fuelCapacity: 212,
      fuelConsumptionRate: 35,
      maxBrakingForce: 5000,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      centerOfLift: { x: -0.2, y: 0, z: 0 },
      centerOfThrust: { x: -2, y: 0, z: 0 }
    };

    return this.createAircraft({
      name: 'Cessna 172',
      config,
      ...options
    });
  }

  public static createBoeing737(options?: Partial<CreateAircraftOptions>): Entity {
    const config: AircraftPhysicsConfig = {
      mass: 70000,
      wingArea: 125,
      aspectRatio: 9.5,
      oswaldsEfficiency: 0.85,
      liftCurveSlope: 6.2,
      zeroLiftAngle: -0.02,
      stallAngle: 0.24,
      maxLiftCoefficient: 1.6,
      dragCoefficient0: 0.018,
      maxThrust: 120000,
      thrustResponseTime: 5.0,
      momentOfInertia: { x: 500000, y: 1200000, z: 1600000 },
      fuelCapacity: 20000,
      fuelConsumptionRate: 2500,
      maxBrakingForce: 200000,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      centerOfLift: { x: 0, y: 0, z: 0 },
      centerOfThrust: { x: 0, y: -3, z: -1 }
    };

    return this.createAircraft({
      name: 'Boeing 737',
      config,
      ...options
    });
  }

  public static createF16(options?: Partial<CreateAircraftOptions>): Entity {
    const config: AircraftPhysicsConfig = {
      mass: 12000,
      wingArea: 27.9,
      aspectRatio: 3.2,
      oswaldsEfficiency: 0.65,
      liftCurveSlope: 4.8,
      zeroLiftAngle: 0.02,
      stallAngle: 0.35,
      maxLiftCoefficient: 1.8,
      dragCoefficient0: 0.022,
      maxThrust: 120000,
      thrustResponseTime: 1.0,
      momentOfInertia: { x: 15000, y: 80000, z: 95000 },
      fuelCapacity: 3200,
      fuelConsumptionRate: 1500,
      maxBrakingForce: 80000,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      centerOfLift: { x: 0.5, y: 0, z: 0 },
      centerOfThrust: { x: -4, y: 0, z: 0 }
    };

    return this.createAircraft({
      name: 'F-16 Fighting Falcon',
      config,
      ...options
    });
  }
}