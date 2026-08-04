import { AircraftPhysicsConfig, Vector3D } from '../types/AircraftTypes';

export type AircraftType = 'cessna172' | 'kingair350' | 'citation_cj4' | 'boeing737' | 'airbus_a320' | 'f16' | 'glider';

export const AIRCRAFT_CONFIGS: Record<AircraftType, AircraftPhysicsConfig> = {
  cessna172: {
    mass: 1157, // kg (empty weight + fuel + pilot)
    wingspan: 11.0, // m
    wingArea: 16.17, // m²
    aspectRatio: 7.52,
    liftCurveSlope: 5.73, // per radian
    zeroLiftAngle: -0.0349, // radians (-2 degrees)
    stallAngle: 0.2618, // radians (15 degrees)
    maxLiftCoefficient: 1.4,
    dragCoefficient0: 0.031, // parasitic drag
    dragCoefficientK: 0.045, // induced drag factor
    oswaldsEfficiency: 0.75,
    maxThrust: 1340, // N (180 HP)
    thrustResponseTime: 2.5, // seconds
    fuelCapacity: 212, // kg
    fuelConsumptionRate: 0.0125, // kg/s at full throttle
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 948, y: 1346, z: 1967 } // kg⋅m²
  },

  kingair350: {
    mass: 6350, // kg
    wingspan: 17.65, // m
    wingArea: 28.15, // m²
    aspectRatio: 11.03,
    liftCurveSlope: 5.85, // per radian
    zeroLiftAngle: -0.0262, // radians (-1.5 degrees)
    stallAngle: 0.2269, // radians (13 degrees)
    maxLiftCoefficient: 1.6,
    dragCoefficient0: 0.0185,
    dragCoefficientK: 0.038,
    oswaldsEfficiency: 0.82,
    maxThrust: 23400, // N (2 × 850 SHP)
    thrustResponseTime: 1.8,
    fuelCapacity: 1537, // kg
    fuelConsumptionRate: 0.0694, // kg/s at full throttle
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 8600, y: 12200, z: 18900 }
  },

  citation_cj4: {
    mass: 7530, // kg
    wingspan: 15.49, // m
    wingArea: 25.94, // m²
    aspectRatio: 9.25,
    liftCurveSlope: 5.9, // per radian
    zeroLiftAngle: -0.0175, // radians (-1 degree)
    stallAngle: 0.2094, // radians (12 degrees)
    maxLiftCoefficient: 1.5,
    dragCoefficient0: 0.022,
    dragCoefficientK: 0.035,
    oswaldsEfficiency: 0.85,
    maxThrust: 34700, // N (2 × FJ44-4A)
    thrustResponseTime: 1.2,
    fuelCapacity: 2176, // kg
    fuelConsumptionRate: 0.139, // kg/s at full throttle
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 12000, y: 18500, z: 28200 }
  },

  boeing737: {
    mass: 66000, // kg (typical operating weight)
    wingspan: 35.8, // m
    wingArea: 124.6, // m²
    aspectRatio: 10.27,
    liftCurveSlope: 6.1, // per radian
    zeroLiftAngle: -0.0349, // radians (-2 degrees)
    stallAngle: 0.2443, // radians (14 degrees)
    maxLiftCoefficient: 1.8,
    dragCoefficient0: 0.018,
    dragCoefficientK: 0.032,
    oswaldsEfficiency: 0.88,
    maxThrust: 233600, // N (2 × CFM56)
    thrustResponseTime: 3.5,
    fuelCapacity: 20890, // kg
    fuelConsumptionRate: 0.694, // kg/s at full throttle
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 847000, y: 1284000, z: 2044000 }
  },

  airbus_a320: {
    mass: 64500, // kg
    wingspan: 35.8, // m
    wingArea: 122.6, // m²
    aspectRatio: 10.45,
    liftCurveSlope: 6.15, // per radian
    zeroLiftAngle: -0.0349, // radians (-2 degrees)
    stallAngle: 0.2443, // radians (14 degrees)
    maxLiftCoefficient: 1.75,
    dragCoefficient0: 0.019,
    dragCoefficientK: 0.033,
    oswaldsEfficiency: 0.87,
    maxThrust: 233600, // N (2 × V2500)
    thrustResponseTime: 3.2,
    fuelCapacity: 18280, // kg
    fuelConsumptionRate: 0.667, // kg/s at full throttle
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 820000, y: 1250000, z: 2000000 }
  },

  f16: {
    mass: 12000, // kg (loaded)
    wingspan: 9.96, // m
    wingArea: 27.87, // m²
    aspectRatio: 3.2,
    liftCurveSlope: 4.8, // per radian (delta wing)
    zeroLiftAngle: 0, // radians
    stallAngle: 0.4363, // radians (25 degrees)
    maxLiftCoefficient: 1.2,
    dragCoefficient0: 0.025,
    dragCoefficientK: 0.06, // higher for delta wing
    oswaldsEfficiency: 0.65,
    maxThrust: 131000, // N (F110-GE-129)
    thrustResponseTime: 0.8,
    fuelCapacity: 4060, // kg
    fuelConsumptionRate: 2.78, // kg/s at full afterburner
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 9500, y: 55800, z: 63100 }
  },

  glider: {
    mass: 600, // kg
    wingspan: 15.0, // m
    wingArea: 10.5, // m²
    aspectRatio: 21.43,
    liftCurveSlope: 6.2, // per radian
    zeroLiftAngle: -0.0175, // radians (-1 degree)
    stallAngle: 0.2618, // radians (15 degrees)
    maxLiftCoefficient: 1.6,
    dragCoefficient0: 0.008, // very low parasitic drag
    dragCoefficientK: 0.015, // very low induced drag
    oswaldsEfficiency: 0.95, // high efficiency
    maxThrust: 0, // N (no engine)
    thrustResponseTime: 0,
    fuelCapacity: 0, // kg
    fuelConsumptionRate: 0, // kg/s
    centerOfGravity: { x: 0, y: 0, z: 0 },
    momentOfInertia: { x: 280, y: 820, z: 1050 }
  }
};

export function getAircraftConfig(type: AircraftType): AircraftPhysicsConfig {
  return { ...AIRCRAFT_CONFIGS[type] };
}

export function getAvailableAircraft(): AircraftType[] {
  return Object.keys(AIRCRAFT_CONFIGS) as AircraftType[];
}

export function getAircraftDisplayName(type: AircraftType): string {
  const names: Record<AircraftType, string> = {
    cessna172: 'Cessna 172 Skyhawk',
    kingair350: 'Beechcraft King Air 350',
    citation_cj4: 'Citation CJ4',
    boeing737: 'Boeing 737-800',
    airbus_a320: 'Airbus A320',
    f16: 'F-16 Fighting Falcon',
    glider: 'ASK 21 Glider'
  };
  
  return names[type] || type;
}

export function getAircraftCategory(type: AircraftType): 'light' | 'turboprop' | 'jet' | 'airliner' | 'military' | 'glider' {
  const categories: Record<AircraftType, 'light' | 'turboprop' | 'jet' | 'airliner' | 'military' | 'glider'> = {
    cessna172: 'light',
    kingair350: 'turboprop',
    citation_cj4: 'jet',
    boeing737: 'airliner',
    airbus_a320: 'airliner',
    f16: 'military',
    glider: 'glider'
  };
  
  return categories[type];
}

export function getRecommendedAircraftForMission(missionType: 'training' | 'touring' | 'commercial' | 'aerobatic'): AircraftType[] {
  switch (missionType) {
    case 'training':
      return ['cessna172', 'glider'];
    case 'touring':
      return ['cessna172', 'kingair350', 'citation_cj4'];
    case 'commercial':
      return ['boeing737', 'airbus_a320'];
    case 'aerobatic':
      return ['f16'];
    default:
      return ['cessna172'];
  }
}