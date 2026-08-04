'use client';

import React from 'react';
import { AircraftSimulator } from '@/components/aircraft/AircraftSimulator';
import { AircraftPhysicsConfig } from '@/engine/physics/aircraft/types/AircraftTypes';

export default function AircraftSimulatorPage() {
  // Configuration for a Cessna 172-style aircraft
  const aircraftConfig: Partial<AircraftPhysicsConfig> = {
    mass: 1200,
    wingspan: 11,
    wingArea: 16,
    aspectRatio: 7.5,
    liftCurveSlope: 5.5,
    zeroLiftAngle: -0.05,
    stallAngle: 0.25,
    maxLiftCoefficient: 1.4,
    dragCoefficient0: 0.025,
    dragCoefficientK: 0.04,
    oswaldsEfficiency: 0.8,
    maxThrust: 2000,
    thrustResponseTime: 2,
    fuelCapacity: 150,
    fuelConsumptionRate: 0.008,
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 1000, y: 2000, z: 3000 },
    landingGearHeight: 1.5,
    wheelBase: 2.5,
    maxBrakingForce: 15000,
    tyreFriction: 0.8,
    groundFriction: 0.7
  };

  return (
    <div className="w-full h-screen bg-gray-900">
      <AircraftSimulator
        aircraftConfig={aircraftConfig}
        initialPosition={{ x: 0, y: 0, z: 1000 }}
      />
    </div>
  );
}