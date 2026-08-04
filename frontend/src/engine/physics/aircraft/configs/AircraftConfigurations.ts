import { AircraftConfiguration, AircraftPhysicsConfig, CockpitCameraConfig, ControlConfiguration } from '../types/AircraftTypes';

export const AIRCRAFT_CONFIGS: Record<string, AircraftConfiguration> = {
  // General Aviation - Single Engine
  cessna172: {
    type: 'cessna172',
    name: 'Cessna 172 Skyhawk',
    physics: {
      mass: 1157, // kg (empty weight + fuel + pilot)
      wingspan: 11.0, // m
      wingArea: 16.2, // m²
      aspectRatio: 7.32,
      liftCurveSlope: 5.5, // per radian
      zeroLiftAngle: -0.05, // radians (~-3 degrees)
      stallAngle: 0.28, // radians (~16 degrees)
      maxLiftCoefficient: 1.4,
      dragCoefficient0: 0.025,
      dragCoefficientK: 0.04,
      oswaldsEfficiency: 0.8,
      maxThrust: 1340, // N (180 HP)
      thrustResponseTime: 3.0, // seconds
      fuelCapacity: 212, // liters
      fuelConsumptionRate: 0.015, // kg/s at full throttle
      centerOfGravity: { x: 0, y: 0, z: 0 },
      momentOfInertia: { x: 1285, y: 1824, z: 2666 }, // kg⋅m²
      landingGearHeight: 1.8, // m
      wheelBase: 2.3, // m
      maxBrakingForce: 8000, // N
      tyreFriction: 0.8,
      groundFriction: 0.7
    },
    cockpit: {
      eyePosition: { x: -0.8, y: -0.3, z: 0.4 }, // Relative to CG
      viewDirection: { x: 1, y: 0, z: 0 },
      fieldOfView: 75,
      nearClip: 0.1,
      farClip: 50000,
      headTracking: false,
      smoothing: 5.0,
      bobIntensity: 0.5,
      gForceIntensity: 1.0
    },
    controls: {
      maxDeflections: {
        elevator: 25, // degrees
        aileron: 20,
        rudder: 30,
        flaps: 40
      },
      responseSpeeds: {
        elevator: 60, // deg/s
        aileron: 80,
        rudder: 45,
        flaps: 8
      }
    }
  },

  // Light Twin Engine
  beech58: {
    type: 'beech58',
    name: 'Beechcraft Baron 58',
    physics: {
      mass: 2495, // kg
      wingspan: 11.5, // m
      wingArea: 18.5, // m²
      aspectRatio: 7.15,
      liftCurveSlope: 5.2,
      zeroLiftAngle: -0.04,
      stallAngle: 0.26,
      maxLiftCoefficient: 1.35,
      dragCoefficient0: 0.023,
      dragCoefficientK: 0.038,
      oswaldsEfficiency: 0.82,
      maxThrust: 4450, // N (2x 300 HP)
      thrustResponseTime: 2.5,
      fuelCapacity: 568, // liters
      fuelConsumptionRate: 0.032,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      momentOfInertia: { x: 2580, y: 4200, z: 5900 },
      landingGearHeight: 2.1,
      wheelBase: 2.8,
      maxBrakingForce: 12000,
      tyreFriction: 0.8,
      groundFriction: 0.7
    },
    cockpit: {
      eyePosition: { x: -1.2, y: -0.4, z: 0.5 },
      viewDirection: { x: 1, y: 0, z: 0 },
      fieldOfView: 75,
      nearClip: 0.1,
      farClip: 50000,
      headTracking: false,
      smoothing: 4.0,
      bobIntensity: 0.3,
      gForceIntensity: 0.8
    },
    controls: {
      maxDeflections: {
        elevator: 22,
        aileron: 18,
        rudder: 25,
        flaps: 35
      },
      responseSpeeds: {
        elevator: 50,
        aileron: 65,
        rudder: 40,
        flaps: 6
      }
    }
  },

  // Turboprop
  kingAir350: {
    type: 'kingAir350',
    name: 'Beechcraft King Air 350',
    physics: {
      mass: 4581, // kg
      wingspan: 17.7, // m
      wingArea: 28.2, // m²
      aspectRatio: 11.1,
      liftCurveSlope: 5.8,
      zeroLiftAngle: -0.03,
      stallAngle: 0.24,
      maxLiftCoefficient: 1.5,
      dragCoefficient0: 0.021,
      dragCoefficientK: 0.035,
      oswaldsEfficiency: 0.85,
      maxThrust: 7340, // N (2x 1050 SHP)
      thrustResponseTime: 2.0,
      fuelCapacity: 1361, // liters
      fuelConsumptionRate: 0.058,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      momentOfInertia: { x: 5200, y: 8900, z: 12500 },
      landingGearHeight: 2.4,
      wheelBase: 3.2,
      maxBrakingForce: 18000,
      tyreFriction: 0.85,
      groundFriction: 0.75
    },
    cockpit: {
      eyePosition: { x: -1.8, y: -0.5, z: 0.6 },
      viewDirection: { x: 1, y: 0, z: 0 },
      fieldOfView: 70,
      nearClip: 0.1,
      farClip: 50000,
      headTracking: true,
      smoothing: 3.5,
      bobIntensity: 0.2,
      gForceIntensity: 0.6
    },
    controls: {
      maxDeflections: {
        elevator: 20,
        aileron: 15,
        rudder: 22,
        flaps: 45
      },
      responseSpeeds: {
        elevator: 45,
        aileron: 55,
        rudder: 35,
        flaps: 4
      }
    }
  },

  // Light Jet
  citation_cj4: {
    type: 'citation_cj4',
    name: 'Cessna Citation CJ4',
    physics: {
      mass: 7802, // kg
      wingspan: 15.5, // m
      wingArea: 27.3, // m²
      aspectRatio: 8.8,
      liftCurveSlope: 6.2,
      zeroLiftAngle: -0.025,
      stallAngle: 0.22,
      maxLiftCoefficient: 1.6,
      dragCoefficient0: 0.018,
      dragCoefficientK: 0.032,
      oswaldsEfficiency: 0.87,
      maxThrust: 17792, // N (2x 3930 lbf)
      thrustResponseTime: 1.5,
      fuelCapacity: 2143, // liters
      fuelConsumptionRate: 0.125,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      momentOfInertia: { x: 8500, y: 15200, z: 22000 },
      landingGearHeight: 2.8,
      wheelBase: 4.1,
      maxBrakingForce: 35000,
      tyreFriction: 0.85,
      groundFriction: 0.8
    },
    cockpit: {
      eyePosition: { x: -2.5, y: -0.6, z: 0.8 },
      viewDirection: { x: 1, y: 0, z: 0 },
      fieldOfView: 65,
      nearClip: 0.1,
      farClip: 50000,
      headTracking: true,
      smoothing: 3.0,
      bobIntensity: 0.1,
      gForceIntensity: 0.4
    },
    controls: {
      maxDeflections: {
        elevator: 18,
        aileron: 12,
        rudder: 20,
        flaps: 35
      },
      responseSpeeds: {
        elevator: 40,
        aileron: 50,
        rudder: 30,
        flaps: 3
      }
    }
  },

  // Aerobatic Aircraft
  extra300: {
    type: 'extra300',
    name: 'Extra EA-300',
    physics: {
      mass: 760, // kg
      wingspan: 7.4, // m
      wingArea: 11.0, // m²
      aspectRatio: 4.98,
      liftCurveSlope: 6.8,
      zeroLiftAngle: 0.0,
      stallAngle: 0.35, // Higher for aerobatic aircraft
      maxLiftCoefficient: 1.8,
      dragCoefficient0: 0.028,
      dragCoefficientK: 0.045,
      oswaldsEfficiency: 0.75,
      maxThrust: 2200, // N (300 HP)
      thrustResponseTime: 1.0, // Very responsive
      fuelCapacity: 115, // liters
      fuelConsumptionRate: 0.025,
      centerOfGravity: { x: 0, y: 0, z: 0 },
      momentOfInertia: { x: 450, y: 680, z: 1050 }, // Lower for agility
      landingGearHeight: 1.6,
      wheelBase: 2.0,
      maxBrakingForce: 6000,
      tyreFriction: 0.9,
      groundFriction: 0.8
    },
    cockpit: {
      eyePosition: { x: -0.6, y: 0, z: 0.3 }, // Centered for aerobatics
      viewDirection: { x: 1, y: 0, z: 0 },
      fieldOfView: 80, // Wide FOV for aerobatics
      nearClip: 0.1,
      farClip: 50000,
      headTracking: false,
      smoothing: 8.0, // Less smoothing for aerobatics
      bobIntensity: 1.0,
      gForceIntensity: 2.0 // High G effects
    },
    controls: {
      maxDeflections: {
        elevator: 35, // Large deflections for aerobatics
        aileron: 30,
        rudder: 35,
        flaps: 0 // No flaps on aerobatic aircraft
      },
      responseSpeeds: {
        elevator: 120, // Very fast response
        aileron: 150,
        rudder: 100,
        flaps: 0
      }
    }
  }
};

export function getAircraftConfig(type: string): AircraftConfiguration | null {
  return AIRCRAFT_CONFIGS[type] || null;
}

export function getAvailableAircraft(): { type: string; name: string }[] {
  return Object.values(AIRCRAFT_CONFIGS).map(config => ({
    type: config.type,
    name: config.name
  }));
}

export function createCustomAircraftConfig(
  type: string,
  name: string,
  physicsOverrides: Partial<AircraftPhysicsConfig>,
  cockpitOverrides?: Partial<CockpitCameraConfig>,
  controlOverrides?: Partial<ControlConfiguration>
): AircraftConfiguration {
  // Use Cessna 172 as base configuration
  const baseConfig = AIRCRAFT_CONFIGS.cessna172;
  
  return {
    type,
    name,
    physics: { ...baseConfig.physics, ...physicsOverrides },
    cockpit: { ...baseConfig.cockpit, ...cockpitOverrides },
    controls: { ...baseConfig.controls, ...controlOverrides }
  };
}

// Fuel system configurations for different aircraft
export const FUEL_SYSTEM_CONFIGS = {
  cessna172: {
    tanks: [
      {
        id: 'left_main',
        capacity: 106, // liters
        currentFuel: 106,
        position: { x: 0, y: -2.5, z: 0 },
        priority: 1,
        fuelType: 'AVGAS' as const,
        pumps: [{
          id: 'left_mechanical',
          active: true,
          flowRate: 150, // L/min
          pressure: 25,
          electrical: false,
          mechanical: true
        }],
        sensors: [
          { type: 'quantity' as const, value: 100, threshold: 0, alarm: false },
          { type: 'low_level' as const, value: 0, threshold: 10, alarm: false }
        ]
      },
      {
        id: 'right_main',
        capacity: 106,
        currentFuel: 106,
        position: { x: 0, y: 2.5, z: 0 },
        priority: 1,
        fuelType: 'AVGAS' as const,
        pumps: [{
          id: 'right_mechanical',
          active: true,
          flowRate: 150,
          pressure: 25,
          electrical: false,
          mechanical: true
        }],
        sensors: [
          { type: 'quantity' as const, value: 100, threshold: 0, alarm: false },
          { type: 'low_level' as const, value: 0, threshold: 10, alarm: false }
        ]
      }
    ],
    totalCapacity: 212,
    fuelDensity: 0.72, // kg/L for AVGAS
    consumptionModel: {
      idleRate: 15, // L/hour
      cruiseRate: 35,
      maxRate: 55
    },
    transferSystem: {
      enabled: false,
      transferRate: 0
    }
  },

  citation_cj4: {
    tanks: [
      {
        id: 'left_main',
        capacity: 1071.5,
        currentFuel: 1071.5,
        position: { x: 0, y: -4.0, z: -0.5 },
        priority: 1,
        fuelType: 'JET_A1' as const,
        pumps: [
          {
            id: 'left_boost',
            active: true,
            flowRate: 300,
            pressure: 45,
            electrical: true,
            mechanical: false
          },
          {
            id: 'left_backup',
            active: false,
            flowRate: 150,
            pressure: 30,
            electrical: true,
            mechanical: false
          }
        ],
        sensors: [
          { type: 'quantity' as const, value: 100, threshold: 0, alarm: false },
          { type: 'low_level' as const, value: 0, threshold: 50, alarm: false },
          { type: 'temperature' as const, value: 15, threshold: 60, alarm: false }
        ]
      },
      {
        id: 'right_main',
        capacity: 1071.5,
        currentFuel: 1071.5,
        position: { x: 0, y: 4.0, z: -0.5 },
        priority: 1,
        fuelType: 'JET_A1' as const,
        pumps: [
          {
            id: 'right_boost',
            active: true,
            flowRate: 300,
            pressure: 45,
            electrical: true,
            mechanical: false
          },
          {
            id: 'right_backup',
            active: false,
            flowRate: 150,
            pressure: 30,
            electrical: true,
            mechanical: false
          }
        ],
        sensors: [
          { type: 'quantity' as const, value: 100, threshold: 0, alarm: false },
          { type: 'low_level' as const, value: 0, threshold: 50, alarm: false },
          { type: 'temperature' as const, value: 15, threshold: 60, alarm: false }
        ]
      }
    ],
    totalCapacity: 2143,
    fuelDensity: 0.775, // kg/L for Jet A1
    consumptionModel: {
      idleRate: 50,
      cruiseRate: 180,
      maxRate: 350
    },
    transferSystem: {
      enabled: true,
      transferRate: 20 // L/min
    }
  }
};

export function getFuelSystemConfig(aircraftType: string) {
  return FUEL_SYSTEM_CONFIGS[aircraftType as keyof typeof FUEL_SYSTEM_CONFIGS] || FUEL_SYSTEM_CONFIGS.cessna172;
}