import { Vector3D, LandingGearState, GroundContact } from '../types/AircraftTypes';

export interface LandingGearConfig {
  retractTime: number;
  springConstant: number;
  dampingConstant?: number;
  wheelRadius: number;
  maxGroundForce: number;
  groundHeight?: number;
}

export interface LandingGearResult {
  groundForce: Vector3D;
  groundContact: GroundContact;
}

export class LandingGearSystem {
  private state: LandingGearState;
  private config: LandingGearConfig;
  private retractTimer = 0;
  private extending = false;
  private retracting = false;

  constructor(config: LandingGearConfig) {
    this.config = {
      dampingConstant: config.springConstant * 0.1,
      groundHeight: 0,
      ...config
    };

    this.state = {
      deployed: true,
      position: 1,
      locked: true,
      onGround: false,
      compressionRatio: 0
    };
  }

  public update(
    deltaTime: number,
    position: Vector3D,
    velocity: Vector3D,
    steeringInput: number,
    gearCommand: boolean
  ): LandingGearResult {
    // Update gear extension/retraction
    this.updateGearPosition(deltaTime, gearCommand);

    // Calculate ground interaction
    const groundResult = this.calculateGroundForces(position, velocity, steeringInput);

    return groundResult;
  }

  private updateGearPosition(deltaTime: number, gearCommand: boolean): void {
    const targetPosition = gearCommand ? 1 : 0;
    const positionRate = 1 / this.config.retractTime;

    if (Math.abs(this.state.position - targetPosition) > 0.01) {
      if (targetPosition > this.state.position) {
        // Extending
        this.extending = true;
        this.retracting = false;
        this.state.locked = false;
        this.state.position = Math.min(1, this.state.position + positionRate * deltaTime);
      } else {
        // Retracting
        this.retracting = true;
        this.extending = false;
        this.state.locked = false;
        this.state.position = Math.max(0, this.state.position - positionRate * deltaTime);
      }
    } else {
      // Position reached
      this.extending = false;
      this.retracting = false;
      this.state.locked = true;
      this.state.position = targetPosition;
    }

    this.state.deployed = this.state.position > 0.5;
  }

  private calculateGroundForces(
    position: Vector3D,
    velocity: Vector3D,
    steeringInput: number
  ): LandingGearResult {
    const result: LandingGearResult = {
      groundForce: { x: 0, y: 0, z: 0 },
      groundContact: {
        inContact: false,
        normal: { x: 0, y: 0, z: 1 },
        friction: 0.8,
        material: 'concrete'
      }
    };

    if (!this.state.deployed || this.state.position < 0.9) {
      this.state.onGround = false;
      this.state.compressionRatio = 0;
      return result;
    }

    // Calculate wheel contact point
    const wheelContactHeight = position.z - this.config.wheelRadius;
    const groundPenetration = this.config.groundHeight! - wheelContactHeight;

    if (groundPenetration > 0) {
      // On ground
      this.state.onGround = true;
      result.groundContact.inContact = true;
      
      // Calculate compression
      const maxCompression = this.config.wheelRadius * 0.5;
      this.state.compressionRatio = Math.min(1, groundPenetration / maxCompression);
      
      // Spring force (vertical)
      const springForce = this.config.springConstant * groundPenetration;
      
      // Damping force (vertical)
      const dampingForce = this.config.dampingConstant! * Math.min(0, velocity.z);
      
      // Total vertical force
      const totalVerticalForce = springForce + dampingForce;
      result.groundForce.z = Math.max(0, totalVerticalForce);
      
      // Friction forces (horizontal)
      const normalForce = totalVerticalForce;
      const maxFriction = normalForce * result.groundContact.friction;
      
      // Rolling resistance
      const rollingResistance = normalForce * 0.02;
      
      // Ground steering (simplified)
      const steeringForce = steeringInput * maxFriction * 0.3;
      
      // Apply horizontal forces
      const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (horizontalSpeed > 0.1) {
        const frictionForce = Math.min(maxFriction, horizontalSpeed * 100);
        result.groundForce.x = -(velocity.x / horizontalSpeed) * (frictionForce + rollingResistance);
        result.groundForce.y = -(velocity.y / horizontalSpeed) * (frictionForce + rollingResistance) + steeringForce;
      } else {
        result.groundForce.y = steeringForce;
      }
      
      // Limit forces to prevent unrealistic values
      result.groundForce.x = Math.max(-this.config.maxGroundForce, Math.min(this.config.maxGroundForce, result.groundForce.x));
      result.groundForce.y = Math.max(-this.config.maxGroundForce, Math.min(this.config.maxGroundForce, result.groundForce.y));
      result.groundForce.z = Math.min(this.config.maxGroundForce, result.groundForce.z);
      
    } else {
      // Not on ground
      this.state.onGround = false;
      this.state.compressionRatio = 0;
    }

    return result;
  }

  public getState(): LandingGearState {
    return { ...this.state };
  }

  public isExtending(): boolean {
    return this.extending;
  }

  public isRetracting(): boolean {
    return this.retracting;
  }

  public forcePosition(position: number): void {
    this.state.position = Math.max(0, Math.min(1, position));
    this.state.deployed = this.state.position > 0.5;
    this.state.locked = this.state.position === 0 || this.state.position === 1;
  }

  public setGroundHeight(height: number): void {
    this.config.groundHeight = height;
  }

  public getCompressionRatio(): number {
    return this.state.compressionRatio;
  }
}