import { 
  AircraftState, 
  Vector3D, 
  Quaternion, 
  AircraftPhysicsConfig, 
  ControlSurfaces, 
  AircraftForces, 
  AircraftMoments, 
  WindData,
  FlightData,
  EngineParameters,
  LandingGearState,
  FlapsState,
  BrakeSystemState,
  WeatherConditions,
  FuelSystem as IFuelSystem
} from '../types/AircraftTypes';
import { BrakeSystem } from '../systems/BrakeSystem';
import { LandingGearSystem } from '../systems/LandingGearSystem';
import { WindSystem } from '../systems/WindSystem';
import { TurbulenceSystem } from '../systems/TurbulenceSystem';
import { FuelSystem } from '../systems/FuelSystem';

export class AircraftPhysics {
  private state: AircraftState;
  private config: AircraftPhysicsConfig;
  private controls: ControlSurfaces;
  private forces: AircraftForces;
  private moments: AircraftMoments;
  private wind: WindData;
  private flightData: FlightData;
  private engine: EngineParameters;
  private landingGear: LandingGearState;
  private flaps: FlapsState;
  private brakeSystem: BrakeSystem;
  private landingGearSystem: LandingGearSystem;
  private windSystem: WindSystem;
  private turbulenceSystem: TurbulenceSystem;
  private fuelSystem: FuelSystem;
  private weather: WeatherConditions;

  private readonly GRAVITY = 9.81; // m/s²
  private readonly AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
  private readonly TEMPERATURE_LAPSE_RATE = 0.0065; // K/m
  private readonly PRESSURE_LAPSE_RATE = 0.0000225; // /m

  constructor(config: AircraftPhysicsConfig) {
    this.config = config;
    
    this.state = {
      position: { x: 0, y: 1000, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      angularAcceleration: { x: 0, y: 0, z: 0 }
    };

    this.controls = {
      elevator: 0,
      rudder: 0,
      ailerons: 0,
      flaps: 0,
      throttle: 0,
      brakes: 0,
      landingGear: false
    };

    this.forces = {
      lift: { x: 0, y: 0, z: 0 },
      drag: { x: 0, y: 0, z: 0 },
      thrust: { x: 0, y: 0, z: 0 },
      weight: { x: 0, y: 0, z: -this.config.mass * this.GRAVITY },
      ground: { x: 0, y: 0, z: 0 },
      brake: { x: 0, y: 0, z: 0 },
      total: { x: 0, y: 0, z: 0 }
    };

    this.moments = {
      pitch: 0,
      roll: 0,
      yaw: 0
    };

    this.wind = {
      velocity: { x: 0, y: 0, z: 0 },
      turbulence: { intensity: 0, scale: 1000 }
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

    // Initialize subsystems
    this.brakeSystem = new BrakeSystem({
      maxBrakingForce: config.maxBrakingForce,
      maxBrakePressure: 200
    });

    this.landingGearSystem = new LandingGearSystem({
      retractTime: 8,
      springConstant: config.mass * 50,
      wheelRadius: 0.35,
      maxGroundForce: config.mass * 20
    });

    this.windSystem = new WindSystem({
      layers: [
        { altitudeMin: 0, altitudeMax: 1000, direction: 270, speed: 5, turbulence: 0.3 },
        { altitudeMin: 1000, altitudeMax: 3000, direction: 280, speed: 10, turbulence: 0.2 },
        { altitudeMin: 3000, altitudeMax: 10000, direction: 290, speed: 20, turbulence: 0.1 }
      ],
      gustIntensity: 0.5,
      gustFrequency: 0.1,
      shearIntensity: 0.2
    });

    this.turbulenceSystem = new TurbulenceSystem({
      baseIntensity: 0.1,
      altitudeEffect: true,
      weatherEffect: true,
      terrainEffect: true
    });

    this.fuelSystem = new FuelSystem({
      totalCapacity: config.fuelCapacity,
      consumptionRate: config.fuelConsumptionRate,
      lowFuelThreshold: config.fuelCapacity * 0.2,
      transferRate: 10,
      pumpPressure: 50
    });

    this.weather = {
      wind: this.wind,
      turbulence: { intensity: 0.1, scale: 1000, direction: { x: 0, y: 0, z: 0 }, frequency: 0.1 },
      visibility: 10000,
      precipitation: 0,
      temperature: 15,
      pressure: 1013.25,
      humidity: 0.6
    };
  }

  public update(deltaTime: number): void {
    // Update weather and wind systems
    this.weather.wind = this.windSystem.update(deltaTime, this.state.position);
    this.wind = this.weather.wind;
    
    // Update turbulence
    const turbulenceForce = this.turbulenceSystem.update(
      deltaTime,
      this.state.position,
      this.state.velocity,
      this.weather
    );
    
    // Update fuel system
    this.fuelSystem.update(
      deltaTime,
      this.controls.throttle,
      this.state.position.z,
      this.flightData.gForce
    );
    
    // Update flight data with fuel info
    const fuelState = this.fuelSystem.getFuelState();
    this.flightData.fuelRemaining = fuelState.remaining;
    
    // Update subsystems
    this.updateEngine(deltaTime);
    this.updateFlaps(deltaTime);
    
    // Update landing gear system
    const landingGearResult = this.landingGearSystem.update(
      deltaTime,
      this.state.position,
      this.state.velocity,
      this.controls.rudder,
      this.controls.landingGear
    );
    
    this.landingGear = this.landingGearSystem.getState();
    this.forces.ground = landingGearResult.groundForce;
    this.flightData.groundContact = landingGearResult.groundContact.inContact;
    
    // Update brake system
    if (this.landingGear.onGround) {
      this.forces.brake = this.brakeSystem.update(
        deltaTime,
        this.landingGear,
        this.flightData.groundSpeed,
        this.controls.brakes
      );
    } else {
      this.forces.brake = { x: 0, y: 0, z: 0 };
    }
    
    // Calculate aerodynamic forces
    this.calculateAerodynamicForces();
    
    // Calculate propulsion forces
    this.calculateThrustForces();
    
    // Calculate weight forces
    this.calculateWeightForces();
    
    // Add turbulence forces
    this.forces.total = {
      x: this.forces.lift.x + this.forces.drag.x + this.forces.thrust.x + this.forces.weight.x + this.forces.ground.x + this.forces.brake.x + turbulenceForce.x,
      y: this.forces.lift.y + this.forces.drag.y + this.forces.thrust.y + this.forces.weight.y + this.forces.ground.y + this.forces.brake.y + turbulenceForce.y,
      z: this.forces.lift.z + this.forces.drag.z + this.forces.thrust.z + this.forces.weight.z + this.forces.ground.z + this.forces.brake.z + turbulenceForce.z
    };
    
    // Calculate moments
    this.calculateMoments();
    
    // Integrate motion
    this.integrateMotion(deltaTime);
    
    // Update flight data
    this.updateFlightData();
    
    // Check warnings
    this.checkWarnings();
  }

  private updateEngine(deltaTime: number): void {
    const targetThrust = this.controls.throttle * this.config.maxThrust;
    const thrustDelta = (targetThrust - this.engine.thrust) / this.config.thrustResponseTime;
    this.engine.thrust += thrustDelta * deltaTime;
    
    // Update RPM based on throttle and airspeed
    const targetRpm = 800 + this.controls.throttle * 1700 + (this.flightData.airspeed / 100) * 200;
    this.engine.rpm += (targetRpm - this.engine.rpm) * deltaTime * 2;
    
    // Calculate fuel consumption
    const fuelConsumption = this.controls.throttle * this.config.fuelConsumptionRate * deltaTime;
    this.flightData.fuelRemaining = Math.max(0, this.flightData.fuelRemaining - fuelConsumption);
    this.engine.fuelFlow = fuelConsumption / deltaTime * 3600; // kg/hour
    
    // Engine temperature
    const targetTemp = 85 + this.controls.throttle * 65 + (this.flightData.airspeed < 50 ? 20 : 0);
    this.engine.temperature += (targetTemp - this.engine.temperature) * deltaTime * 0.5;
  }

  private updateFlaps(deltaTime: number): void {
    const flapSpeed = 0.2; // flaps/second
    const targetPosition = this.controls.flaps;
    
    if (Math.abs(this.flaps.position - targetPosition) > 0.01) {
      const direction = this.flaps.position < targetPosition ? 1 : -1;
      this.flaps.position += direction * flapSpeed * deltaTime;
      this.flaps.position = Math.max(0, Math.min(1, this.flaps.position));
    }
    
    this.flaps.angle = this.flaps.position * 35; // 0 to 35 degrees
    this.flaps.liftBonus = this.flaps.position * 0.4;
    this.flaps.dragPenalty = this.flaps.position * 0.15;
  }

  private updateLandingGear(deltaTime: number): void {
    // This method is now handled by LandingGearSystem
    // Keep for compatibility but delegate to the system
  }

  private calculateAerodynamicForces(): void {
    const airDensity = this.getAirDensity(this.state.position.z);
    const relativeVelocity = this.getRelativeAirVelocity();
    const airspeed = this.vectorMagnitude(relativeVelocity);
    
    if (airspeed < 0.1) {
      this.forces.lift = { x: 0, y: 0, z: 0 };
      this.forces.drag = { x: 0, y: 0, z: 0 };
      return;
    }

    const dynamicPressure = 0.5 * airDensity * airspeed * airspeed;
    
    // Calculate angle of attack
    const bodyVelocity = this.worldToBodyFrame(relativeVelocity);
    const angleOfAttack = Math.atan2(-bodyVelocity.z, bodyVelocity.x);
    const sideslipAngle = Math.atan2(bodyVelocity.y, bodyVelocity.x);
    
    // Store for flight data
    this.flightData.angleOfAttack = angleOfAttack * 180 / Math.PI;
    this.flightData.sideslipAngle = sideslipAngle * 180 / Math.PI;
    
    // Calculate lift coefficient
    let liftCoeff = this.calculateLiftCoefficient(angleOfAttack);
    liftCoeff += this.flaps.liftBonus;
    
    // Calculate drag coefficient
    let dragCoeff = this.calculateDragCoefficient(liftCoeff, angleOfAttack);
    dragCoeff += this.flaps.dragPenalty;
    
    // Landing gear drag
    if (this.landingGear.deployed) {
      dragCoeff += 0.02;
    }
    
    // Calculate forces in body frame
    const liftForce = dynamicPressure * this.config.wingArea * liftCoeff;
    const dragForce = dynamicPressure * this.config.wingArea * dragCoeff;
    
    // Lift is perpendicular to relative velocity
    const liftDirection = this.crossProduct(relativeVelocity, { x: 0, y: 1, z: 0 });
    this.normalizeVector(liftDirection);
    
    // Drag is opposite to relative velocity
    const dragDirection = this.scaleVector(this.normalizeVector({ ...relativeVelocity }), -1);
    
    this.forces.lift = this.scaleVector(liftDirection, liftForce);
    this.forces.drag = this.scaleVector(dragDirection, dragForce);
    
    // Add control surface effects
    this.addControlSurfaceEffects(dynamicPressure);
  }

  private calculateLiftCoefficient(angleOfAttack: number): number {
    const effectiveAoA = angleOfAttack - this.config.zeroLiftAngle;
    
    if (Math.abs(angleOfAttack) > this.config.stallAngle) {
      // Post-stall behavior
      const stallReduction = Math.cos(angleOfAttack - this.config.stallAngle);
      return this.config.maxLiftCoefficient * stallReduction;
    }
    
    return this.config.liftCurveSlope * effectiveAoA;
  }

  private calculateDragCoefficient(liftCoeff: number, angleOfAttack: number): number {
    // Parasitic drag + induced drag
    const inducedDrag = (liftCoeff * liftCoeff) / (Math.PI * this.config.aspectRatio * this.config.oswaldsEfficiency);
    
    let parasiticDrag = this.config.dragCoefficient0;
    
    // Increase drag significantly at high AoA (flow separation)
    if (Math.abs(angleOfAttack) > this.config.stallAngle) {
      parasiticDrag *= (1 + Math.abs(angleOfAttack - this.config.stallAngle) * 5);
    }
    
    return parasiticDrag + inducedDrag;
  }

  private addControlSurfaceEffects(dynamicPressure: number): void {
    // Simplified control surface aerodynamics
    const controlAuthority = dynamicPressure * this.config.wingArea * 0.1;
    
    // Elevator affects pitch moment and some lift
    const elevatorLift = this.controls.elevator * controlAuthority * 0.3;
    this.forces.lift.z += elevatorLift;
    
    // Rudder affects yaw moment and side force
    const rudderForce = this.controls.rudder * controlAuthority * 0.2;
    this.forces.drag.y += rudderForce;
  }

  private calculateThrustForces(): void {
    // Thrust acts along aircraft's longitudinal axis
    const thrustDirection = this.bodyToWorldFrame({ x: 1, y: 0, z: 0 });
    this.forces.thrust = this.scaleVector(thrustDirection, this.engine.thrust);
  }

  private calculateWeightForces(): void {
    this.forces.weight = { x: 0, y: 0, z: -this.config.mass * this.GRAVITY };
  }

  private sumForces(): void {
    this.forces.total = {
      x: this.forces.lift.x + this.forces.drag.x + this.forces.thrust.x + this.forces.weight.x,
      y: this.forces.lift.y + this.forces.drag.y + this.forces.thrust.y + this.forces.weight.y,
      z: this.forces.lift.z + this.forces.drag.z + this.forces.thrust.z + this.forces.weight.z
    };
    
    // Ground forces
    if (this.landingGear.onGround) {
      // Normal force from ground
      if (this.forces.total.z < 0) {
        this.forces.total.z -= this.forces.total.z * this.landingGear.compressionRatio;
      }
      
      // Ground friction and braking
      const groundFriction = 0.7;
      const brakeForce = this.controls.brakes * 0.8 + groundFriction * 0.2;
      const horizontalSpeed = Math.sqrt(this.state.velocity.x * this.state.velocity.x + this.state.velocity.y * this.state.velocity.y);
      
      if (horizontalSpeed > 0.1) {
        const frictionForce = brakeForce * Math.abs(this.forces.total.z) * 0.1;
        this.forces.total.x -= (this.state.velocity.x / horizontalSpeed) * frictionForce;
        this.forces.total.y -= (this.state.velocity.y / horizontalSpeed) * frictionForce;
      }
    }
  }

  private calculateMoments(): void {
    const airDensity = this.getAirDensity(this.state.position.z);
    const relativeVelocity = this.getRelativeAirVelocity();
    const airspeed = this.vectorMagnitude(relativeVelocity);
    
    if (airspeed < 0.1) {
      this.moments.pitch = 0;
      this.moments.roll = 0;
      this.moments.yaw = 0;
      return;
    }

    const dynamicPressure = 0.5 * airDensity * airspeed * airspeed;
    const momentArm = Math.sqrt(this.config.wingArea); // Simplified
    
    // Control moments
    this.moments.pitch = this.controls.elevator * dynamicPressure * this.config.wingArea * momentArm * 0.5;
    this.moments.roll = this.controls.ailerons * dynamicPressure * this.config.wingArea * momentArm * 0.3;
    this.moments.yaw = this.controls.rudder * dynamicPressure * this.config.wingArea * momentArm * 0.2;
    
    // Stability derivatives (simplified)
    const bodyVelocity = this.worldToBodyFrame(relativeVelocity);
    const angleOfAttack = Math.atan2(-bodyVelocity.z, bodyVelocity.x);
    
    // Pitch stability
    this.moments.pitch += -angleOfAttack * dynamicPressure * this.config.wingArea * momentArm * 0.1;
    
    // Roll and yaw damping
    this.moments.roll += -this.state.angularVelocity.x * dynamicPressure * this.config.wingArea * momentArm * 0.05;
    this.moments.yaw += -this.state.angularVelocity.y * dynamicPressure * this.config.wingArea * momentArm * 0.05;
  }

  private integrateMotion(deltaTime: number): void {
    // Linear motion
    this.state.acceleration = {
      x: this.forces.total.x / this.config.mass,
      y: this.forces.total.y / this.config.mass,
      z: this.forces.total.z / this.config.mass
    };
    
    this.state.velocity.x += this.state.acceleration.x * deltaTime;
    this.state.velocity.y += this.state.acceleration.y * deltaTime;
    this.state.velocity.z += this.state.acceleration.z * deltaTime;
    
    this.state.position.x += this.state.velocity.x * deltaTime;
    this.state.position.y += this.state.velocity.y * deltaTime;
    this.state.position.z += this.state.velocity.z * deltaTime;
    
    // Angular motion
    this.state.angularAcceleration = {
      x: this.moments.roll / this.config.momentOfInertia.x,
      y: this.moments.yaw / this.config.momentOfInertia.y,
      z: this.moments.pitch / this.config.momentOfInertia.z
    };
    
    this.state.angularVelocity.x += this.state.angularAcceleration.x * deltaTime;
    this.state.angularVelocity.y += this.state.angularAcceleration.y * deltaTime;
    this.state.angularVelocity.z += this.state.angularAcceleration.z * deltaTime;
    
    // Update orientation (simplified quaternion integration)
    const halfDt = deltaTime * 0.5;
    const dq = {
      x: halfDt * this.state.angularVelocity.x,
      y: halfDt * this.state.angularVelocity.y,
      z: halfDt * this.state.angularVelocity.z,
      w: 0
    };
    
    this.state.orientation = this.multiplyQuaternions(this.state.orientation, dq);
    this.normalizeQuaternion(this.state.orientation);
  }

  private updateFlightData(): void {
    const relativeVelocity = this.getRelativeAirVelocity();
    this.flightData.airspeed = this.vectorMagnitude(relativeVelocity);
    this.flightData.groundSpeed = this.vectorMagnitude(this.state.velocity);
    this.flightData.altitude = this.state.position.z;
    this.flightData.verticalSpeed = this.state.velocity.z;
    
    // Convert orientation to Euler angles
    const euler = this.quaternionToEuler(this.state.orientation);
    this.flightData.heading = euler.yaw * 180 / Math.PI;
    this.flightData.pitch = euler.pitch * 180 / Math.PI;
    this.flightData.roll = euler.roll * 180 / Math.PI;
    
    // G-force calculation
    const totalAccel = this.vectorMagnitude(this.state.acceleration);
    this.flightData.gForce = (totalAccel + this.GRAVITY) / this.GRAVITY;
  }

  private checkWarnings(): void {
    // Stall warning
    const criticalAoA = this.config.stallAngle * 0.9 * 180 / Math.PI;
    this.flightData.stallWarning = Math.abs(this.flightData.angleOfAttack) > criticalAoA;
    
    // Overspeed warning (simplified)
    const maxSpeed = 150; // m/s
    this.flightData.overspeedWarning = this.flightData.airspeed > maxSpeed;
  }

  // Utility methods
  private getAirDensity(altitude: number): number {
    const tempAtAltitude = 288.15 - this.TEMPERATURE_LAPSE_RATE * altitude;
    const pressureRatio = Math.pow(1 - this.PRESSURE_LAPSE_RATE * altitude, 5.256);
    return this.AIR_DENSITY_SEA_LEVEL * pressureRatio * (288.15 / tempAtAltitude);
  }

  private getRelativeAirVelocity(): Vector3D {
    return {
      x: this.state.velocity.x - this.wind.velocity.x,
      y: this.state.velocity.y - this.wind.velocity.y,
      z: this.state.velocity.z - this.wind.velocity.z
    };
  }

  private worldToBodyFrame(vector: Vector3D): Vector3D {
    // Simplified transformation using quaternion
    return this.rotateVectorByQuaternion(vector, this.conjugateQuaternion(this.state.orientation));
  }

  private bodyToWorldFrame(vector: Vector3D): Vector3D {
    return this.rotateVectorByQuaternion(vector, this.state.orientation);
  }

  private vectorMagnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private normalizeVector(v: Vector3D): Vector3D {
    const mag = this.vectorMagnitude(v);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    v.x /= mag;
    v.y /= mag;
    v.z /= mag;
    return v;
  }

  private scaleVector(v: Vector3D, scale: number): Vector3D {
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
  }

  private crossProduct(a: Vector3D, b: Vector3D): Vector3D {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  private rotateVectorByQuaternion(v: Vector3D, q: Quaternion): Vector3D {
    const qv = { x: q.x, y: q.y, z: q.z, w: 0 };
    const result = this.multiplyQuaternions(this.multiplyQuaternions(q, { ...v, w: 0 }), this.conjugateQuaternion(q));
    return { x: result.x, y: result.y, z: result.z };
  }

  private multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    return {
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
    };
  }

  private conjugateQuaternion(q: Quaternion): Quaternion {
    return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  }

  private normalizeQuaternion(q: Quaternion): void {
    const mag = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
    if (mag > 0) {
      q.w /= mag;
      q.x /= mag;
      q.y /= mag;
      q.z /= mag;
    }
  }

  private quaternionToEuler(q: Quaternion): { roll: number; pitch: number; yaw: number } {
    return {
      roll: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)),
      pitch: Math.asin(2 * (q.w * q.y - q.z * q.x)),
      yaw: Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
    };
  }

  // Public getters and setters
  public getState(): AircraftState {
    return { ...this.state };
  }

  public getControls(): ControlSurfaces {
    return { ...this.controls };
  }

  public setControls(controls: Partial<ControlSurfaces>): void {
    this.controls = { ...this.controls, ...controls };
  }

  public getFlightData(): FlightData {
    return { ...this.flightData };
  }

  public getForces(): AircraftForces {
    return { ...this.forces };
  }

  public setWind(wind: WindData): void {
    this.wind = { ...wind };
  }

  public getEngine(): EngineParameters {
    return { ...this.engine };
  }

  public getLandingGear(): LandingGearState {
    return { ...this.landingGear };
  }

  public getFlaps(): FlapsState {
    return { ...this.flaps };
  }

  public getFuelSystem(): FuelSystem {
    return this.fuelSystem;
  }

  public getWeather(): WeatherConditions {
    return { ...this.weather };
  }

  public setWeather(weather: Partial<WeatherConditions>): void {
    this.weather = { ...this.weather, ...weather };
  }

  public setPosition(position: Vector3D): void {
    this.state.position = { ...position };
    this.flightData.altitude = position.z;
  }

  public setVelocity(velocity: Vector3D): void {
    this.state.velocity = { ...velocity };
  }

  public setOrientation(orientation: Quaternion): void {
    this.state.orientation = { ...orientation };
  }

  public reset(): void {
    this.state.velocity = { x: 0, y: 0, z: 0 };
    this.state.acceleration = { x: 0, y: 0, z: 0 };
    this.state.angularVelocity = { x: 0, y: 0, z: 0 };
    this.state.angularAcceleration = { x: 0, y: 0, z: 0 };
    this.flightData.fuelRemaining = this.config.fuelCapacity;
  }
}