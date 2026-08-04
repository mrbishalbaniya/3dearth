import { Component } from '@/engine/ecs/Component';
import { ComponentTypeEnum } from '@/engine/types/Core';
import { 
  AircraftState, 
  AircraftPhysicsConfig, 
  ControlSurfaces, 
  FlightData, 
  EngineParameters,
  LandingGearState,
  BrakeSystemState,
  AircraftForces,
  FlapsState
} from '../types/AircraftTypes';

export class AircraftPhysicsComponent extends Component {
  public config: AircraftPhysicsConfig;
  public state: AircraftState;
  public controls: ControlSurfaces;
  public flightData: FlightData;
  public engine: EngineParameters;
  public landingGear: LandingGearState;
  public brakeSystem: BrakeSystemState;
  public flaps: FlapsState;
  public forces: AircraftForces;

  constructor(config: AircraftPhysicsConfig) {
    super(ComponentTypeEnum.PHYSICS);
    this.config = config;
    
    this.state = {
      position: { x: 0, y: 0, z: 1000 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      angularAcceleration: { x: 0, y: 0, z: 0 }
    };

    this.controls = {
      throttle: 0,
      elevator: 0,
      ailerons: 0,
      rudder: 0,
      flaps: 0,
      brakes: 0,
      leftBrake: 0,
      rightBrake: 0,
      landingGear: false,
      parkingBrake: false
    };

    this.flightData = {
      airspeed: 0,
      groundSpeed: 0,
      altitude: 1000,
      verticalSpeed: 0,
      angleOfAttack: 0,
      sideslipAngle: 0,
      heading: 0,
      pitch: 0,
      roll: 0,
      gForce: 1,
      fuelRemaining: config.fuelCapacity,
      stallWarning: false,
      overspeedWarning: false,
      groundContact: false,
      taxiSpeed: 0
    };

    this.engine = {
      thrust: 0,
      rpm: 800,
      fuelFlow: 0,
      temperature: 85,
      pressure: 29.92,
      torque: 0
    };

    this.landingGear = {
      deployed: true,
      position: 1,
      locked: true,
      onGround: false,
      compressionRatio: 0
    };

    this.brakeSystem = {
      leftBrake: 0,
      rightBrake: 0,
      parkingBrake: false,
      antiskid: true,
      brakePressure: 0,
      brakeTemperature: 25,
      locked: false
    };

    this.flaps = {
      position: 0,
      angle: 0,
      liftBonus: 0,
      dragPenalty: 0
    };

    this.forces = {
      lift: { x: 0, y: 0, z: 0 },
      drag: { x: 0, y: 0, z: 0 },
      thrust: { x: 0, y: 0, z: 0 },
      weight: { x: 0, y: 0, z: -config.mass * 9.81 },
      ground: { x: 0, y: 0, z: 0 },
      brake: { x: 0, y: 0, z: 0 },
      total: { x: 0, y: 0, z: 0 }
    };
  }
}