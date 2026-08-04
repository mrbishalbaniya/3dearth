import { AircraftPhysicsConfig } from '../types/AircraftTypes';

export const CESSNA_172_CONFIG: AircraftPhysicsConfig = {
  mass: 1100, // kg
  wingArea: 16.2, // m²
  aspectRatio: 7.32,
  oswaldsEfficiency: 0.75,
  liftCurveSlope: 5.7, // per radian
  zeroLiftAngle: -0.05, // radians
  stallAngle: 0.28, // radians (~16 degrees)
  maxLiftCoefficient: 1.4,
  dragCoefficient0: 0.025,
  maxThrust: 1200, // N
  thrustResponseTime: 2.0, // seconds
  momentOfInertia: { x: 1500, y: 3000, z: 4000 }, // kg·m²
  fuelCapacity: 212, // kg equivalent fuel mass for simplified model
  fuelConsumptionRate: 0.0125, // kg/s at full throttle
  maxBrakingForce: 5000, // N
  centerOfGravity: { x: 0, y: 0, z: 0 },
  centerOfLift: { x: -0.2, y: 0, z: 0 },
  centerOfThrust: { x: -2, y: 0, z: 0 }
};

export const BOEING_737_CONFIG: AircraftPhysicsConfig = {
  mass: 70000, // kg
  wingArea: 125, // m²
  aspectRatio: 9.5,
  oswaldsEfficiency: 0.85,
  liftCurveSlope: 6.2, // per radian
  zeroLiftAngle: -0.02, // radians
  stallAngle: 0.24, // radians (~14 degrees)
  maxLiftCoefficient: 1.6,
  dragCoefficient0: 0.018,
  maxThrust: 120000, // N (combined)
  thrustResponseTime: 5.0, // seconds
  momentOfInertia: { x: 500000, y: 1200000, z: 1600000 }, // kg·m²
  fuelCapacity: 20000, // kg equivalent fuel mass for simplified model
  fuelConsumptionRate: 0.694, // kg/s at high thrust
  maxBrakingForce: 200000, // N
  centerOfGravity: { x: 0, y: 0, z: 0 },
  centerOfLift: { x: 0, y: 0, z: 0 },
  centerOfThrust: { x: 0, y: -3, z: -1 }
};

export const F16_CONFIG: AircraftPhysicsConfig = {
  mass: 12000, // kg
  wingArea: 27.9, // m²
  aspectRatio: 3.2,
  oswaldsEfficiency: 0.65,
  liftCurveSlope: 4.8, // per radian
  zeroLiftAngle: 0.02, // radians
  stallAngle: 0.35, // radians (~20 degrees)
  maxLiftCoefficient: 1.8,
  dragCoefficient0: 0.022,
  maxThrust: 120000, // N (with afterburner)
  thrustResponseTime: 1.0, // seconds
  momentOfInertia: { x: 15000, y: 80000, z: 95000 }, // kg·m²
  fuelCapacity: 3200, // kg equivalent fuel mass for simplified model
  fuelConsumptionRate: 0.9, // kg/s at military power
  maxBrakingForce: 80000, // N
  centerOfGravity: { x: 0, y: 0, z: 0 },
  centerOfLift: { x: 0.5, y: 0, z: 0 },
  centerOfThrust: { x: -4, y: 0, z: 0 }
};