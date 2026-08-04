export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface AircraftState {
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  orientation: Quaternion;
  angularVelocity: Vector3D;
  angularAcceleration: Vector3D;
}

export interface AircraftPhysicsConfig {
  mass: number;
  wingspan?: number;
  wingArea: number;
  aspectRatio: number;
  oswaldsEfficiency: number;
  liftCurveSlope: number;
  zeroLiftAngle: number;
  stallAngle: number;
  maxLiftCoefficient: number;
  dragCoefficient0: number;
  dragCoefficientK?: number;
  maxThrust: number;
  thrustResponseTime: number;
  momentOfInertia: Vector3D;
  fuelCapacity: number;
  fuelConsumptionRate: number;
  maxBrakingForce: number;
  landingGearHeight?: number;
  wheelBase?: number;
  tyreFriction?: number;
  groundFriction?: number;
  centerOfGravity: Vector3D;
  centerOfLift?: Vector3D;
  centerOfThrust?: Vector3D;
}

export interface ControlSurfaces {
  elevator: number;     // -1 to 1
  rudder: number;       // -1 to 1
  ailerons: number;     // -1 to 1
  flaps: number;        // 0 to 1
  throttle: number;     // 0 to 1
  brakes: number;       // 0 to 1
  leftBrake?: number;   // 0 to 1
  rightBrake?: number;  // 0 to 1
  parkingBrake?: boolean;
  landingGear: boolean;
}

export interface ControlInputs {
  throttle: number;
  elevator: number;
  aileron: number;
  rudder: number;
  flaps: number;
  brakes: number;
  landingGear: boolean;
}

export interface AircraftForces {
  lift: Vector3D;
  drag: Vector3D;
  thrust: Vector3D;
  weight: Vector3D;
  ground: Vector3D;
  brake: Vector3D;
  total: Vector3D;
}

export interface AircraftMoments {
  pitch: number;
  roll: number;
  yaw: number;
}

export interface WindData {
  velocity: Vector3D;
  turbulence: {
    intensity: number;
    scale: number;
  };
}

export interface FlightData {
  airspeed: number;
  groundSpeed: number;
  altitude: number;
  verticalSpeed: number;
  angleOfAttack: number;
  sideslipAngle: number;
  heading: number;
  pitch: number;
  roll: number;
  gForce: number;
  fuelRemaining: number;
  stallWarning: boolean;
  overspeedWarning: boolean;
  groundContact: boolean;
  taxiSpeed: number;
}

export interface EngineParameters {
  thrust: number;
  rpm: number;
  fuelFlow: number;
  temperature: number;
  pressure: number;
  torque: number;
}

export interface LandingGearState {
  deployed: boolean;
  position: number;     // 0 = retracted, 1 = deployed
  locked: boolean;
  onGround: boolean;
  compressionRatio: number;
}

export interface FlapsState {
  position: number;     // 0 to 1
  angle: number;        // degrees
  liftBonus: number;
  dragPenalty: number;
}

export interface BrakeSystemState {
  pressure?: number;     // 0 to 1
  brakePressure?: number;
  leftBrake?: number;
  rightBrake?: number;
  parkingBrake?: boolean;
  temperature: number;  // degrees C
  brakeTemperature?: number;
  effectiveness: number; // 0 to 1
  antiskid: boolean;
  locked: boolean;
}

export interface TurbulenceData {
  intensity: number;
  scale: number;
  direction: Vector3D;
  frequency: number;
}

export interface GroundContact {
  inContact: boolean;
  normal: Vector3D;
  friction: number;
  material: string;
}

export interface CockpitCamera {
  position: Vector3D;
  target: Vector3D;
  fov: number;
  shake: {
    intensity: number;
    frequency: number;
  };
  headTracking: boolean;
}

export interface CockpitCameraConfig {
  position?: Vector3D;
  target?: Vector3D;
  eyePosition?: Vector3D;
  viewDirection?: Vector3D;
  fieldOfView: number;
  nearClip: number;
  farClip: number;
  headTracking: boolean;
  smoothing: number;
  bobIntensity: number;
  gForceIntensity: number;
}

export interface ControlConfiguration {
  maxDeflections: {
    elevator: number;
    aileron: number;
    rudder: number;
    flaps: number;
  };
  responseSpeeds: {
    elevator: number;
    aileron: number;
    rudder: number;
    flaps: number;
  };
}

export interface AircraftConfiguration {
  type: string;
  name: string;
  physics: AircraftPhysicsConfig;
  cockpit: CockpitCameraConfig;
  controls: ControlConfiguration;
}

export interface WeatherConditions {
  wind: WindData;
  turbulence: TurbulenceData;
  visibility: number;
  precipitation: number;
  temperature: number;
  pressure: number;
  humidity: number;
}

export interface AircraftPerformance {
  stallSpeed: number;
  cruiseSpeed: number;
  maxSpeed: number;
  serviceceiling: number;
  range: number;
  climbRate: number;
  glideRatio: number;
  turnRadius: number;
  rollRate: number;
}

export interface FuelSystem {
  totalCapacity: number;
  remaining: number;
  consumptionRate: number;
  efficiency: number;
  lowFuelWarning: number;
  fuelPumps: boolean;
  fuelDistribution: {
    leftWing: number;
    rightWing: number;
    center: number;
  };
}

export interface SystemsStatus {
  engine: boolean;
  electrical: boolean;
  hydraulics: boolean;
  navigation: boolean;
  communication: boolean;
  autopilot: boolean;
  warnings: string[];
  cautions: string[];
}