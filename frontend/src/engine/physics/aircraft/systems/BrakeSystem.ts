import { Vector3D, BrakeSystemState, LandingGearState } from '../types/AircraftTypes';

export interface BrakeConfig {
  maxBrakingForce: number;
  maxBrakePressure: number;
  antiskidThreshold?: number;
  brakeFadeRate?: number;
  coolingRate?: number;
  maxTemperature?: number;
}

export class BrakeSystem {
  private state: BrakeSystemState;
  private config: BrakeConfig;
  private antiskidActive = false;
  private wheelSpeed = 0;
  private lastGroundSpeed = 0;

  constructor(config: BrakeConfig) {
    this.config = {
      antiskidThreshold: 0.1,
      brakeFadeRate: 0.95,
      coolingRate: 0.98,
      maxTemperature: 400,
      ...config
    };

    this.state = {
      pressure: 0,
      temperature: 20,
      effectiveness: 1,
      antiskid: true,
      locked: false
    };
  }

  public update(
    deltaTime: number,
    landingGear: LandingGearState,
    groundSpeed: number,
    brakeInput: number
  ): Vector3D {
    if (!landingGear.onGround || !landingGear.deployed) {
      this.state.pressure = 0;
      this.coolDown(deltaTime);
      return { x: 0, y: 0, z: 0 };
    }

    // Update brake pressure
    const targetPressure = brakeInput * this.config.maxBrakePressure;
    const pressureRate = 500; // PSI/second
    const pressureDelta = (targetPressure - this.state.pressure) * pressureRate * deltaTime;
    this.state.pressure = Math.max(0, Math.min(this.config.maxBrakePressure, this.state.pressure + pressureDelta));

    // Calculate wheel speed and slip
    const acceleration = (groundSpeed - this.lastGroundSpeed) / deltaTime;
    this.wheelSpeed += acceleration * deltaTime * 0.9; // Wheel lag
    this.lastGroundSpeed = groundSpeed;

    const wheelSlip = Math.abs(groundSpeed - this.wheelSpeed) / Math.max(groundSpeed, 0.1);

    // Antiskid system
    if (this.state.antiskid && wheelSlip > this.config.antiskidThreshold!) {
      this.antiskidActive = true;
      this.state.pressure *= 0.5; // Reduce brake pressure
    } else {
      this.antiskidActive = false;
    }

    // Wheel lock detection
    this.state.locked = wheelSlip > 0.8 && this.state.pressure > this.config.maxBrakePressure * 0.5;

    // Heat generation
    const heatGeneration = this.state.pressure * groundSpeed * 0.01;
    this.state.temperature += heatGeneration * deltaTime;

    // Brake fade due to temperature
    const fadeTemperature = this.config.maxTemperature! * 0.7;
    if (this.state.temperature > fadeTemperature) {
      const fadeRatio = (this.state.temperature - fadeTemperature) / (this.config.maxTemperature! - fadeTemperature);
      this.state.effectiveness = Math.max(0.1, 1 - fadeRatio * 0.9);
    } else {
      this.state.effectiveness = Math.min(1, this.state.effectiveness + deltaTime * 0.5);
    }

    // Cool down
    this.coolDown(deltaTime);

    // Calculate braking force
    const maxForce = this.config.maxBrakingForce * this.state.effectiveness;
    const brakeForce = (this.state.pressure / this.config.maxBrakePressure) * maxForce;

    // Apply force opposite to motion
    const speed = Math.sqrt(groundSpeed * groundSpeed);
    if (speed > 0.1) {
      const forceDirection = -Math.sign(groundSpeed);
      return { x: forceDirection * brakeForce, y: 0, z: 0 };
    }

    return { x: 0, y: 0, z: 0 };
  }

  private coolDown(deltaTime: number): void {
    const ambientTemp = 20;
    const coolingFactor = Math.max(0.001, (this.state.temperature - ambientTemp) / this.state.temperature);
    this.state.temperature -= coolingFactor * this.config.coolingRate! * 50 * deltaTime;
    this.state.temperature = Math.max(ambientTemp, this.state.temperature);
  }

  public getState(): BrakeSystemState {
    return { ...this.state };
  }

  public setAntiskid(enabled: boolean): void {
    this.state.antiskid = enabled;
  }

  public isAntiskidActive(): boolean {
    return this.antiskidActive;
  }

  public getWheelSlip(): number {
    return Math.abs(this.lastGroundSpeed - this.wheelSpeed) / Math.max(this.lastGroundSpeed, 0.1);
  }
}