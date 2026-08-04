import { Component } from '../../../ecs/Component';
import { ComponentTypeEnum } from '../../../types/Core';
import { 
  AircraftPhysicsConfig, 
  ControlSurfaces, 
  FlightData, 
  EngineParameters,
  LandingGearState,
  FlapsState,
  WeatherConditions
} from '../types/AircraftTypes';

export class AircraftComponent extends Component {
  public config: AircraftPhysicsConfig;
  public controls: ControlSurfaces;
  public flightData: FlightData;
  public engine: EngineParameters;
  public landingGear: LandingGearState;
  public flaps: FlapsState;
  public weather: WeatherConditions;
  public autopilot: boolean = false;

  constructor(config: AircraftPhysicsConfig) {
    super(ComponentTypeEnum.AIRCRAFT);
    
    this.config = config;
    
    this.controls = {
      elevator: 0,
      rudder: 0,
      ailerons: 0,
      flaps: 0,
      throttle: 0,
      brakes: 0,
      landingGear: false
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

    this.flaps = {
      position: 0,
      angle: 0,
      liftBonus: 0,
      dragPenalty: 0
    };

    this.weather = {
      wind: { velocity: { x: 0, y: 0, z: 0 }, turbulence: { intensity: 0, scale: 1000 } },
      turbulence: { intensity: 0.1, scale: 1000, direction: { x: 0, y: 0, z: 0 }, frequency: 0.1 },
      visibility: 10000,
      precipitation: 0,
      temperature: 15,
      pressure: 1013.25,
      humidity: 0.6
    };
  }

  public serialize(): Record<string, any> {
    return {
      config: this.config,
      controls: this.controls,
      flightData: this.flightData,
      engine: this.engine,
      landingGear: this.landingGear,
      flaps: this.flaps,
      weather: this.weather,
      autopilot: this.autopilot
    };
  }

  public deserialize(data: Record<string, any>): void {
    if (data.config) this.config = data.config;
    if (data.controls) this.controls = data.controls;
    if (data.flightData) this.flightData = data.flightData;
    if (data.engine) this.engine = data.engine;
    if (data.landingGear) this.landingGear = data.landingGear;
    if (data.flaps) this.flaps = data.flaps;
    if (data.weather) this.weather = data.weather;
    if (data.autopilot !== undefined) this.autopilot = data.autopilot;
    this.markDirty();
  }

  public clone(): AircraftComponent {
    const clone = new AircraftComponent(this.config);
    clone.controls = { ...this.controls };
    clone.flightData = { ...this.flightData };
    clone.engine = { ...this.engine };
    clone.landingGear = { ...this.landingGear };
    clone.flaps = { ...this.flaps };
    clone.weather = { ...this.weather };
    clone.autopilot = this.autopilot;
    return clone;
  }
}