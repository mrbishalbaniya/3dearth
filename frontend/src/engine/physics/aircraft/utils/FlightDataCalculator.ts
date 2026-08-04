import { Vector3D, AircraftState, FlightData, AircraftPhysicsConfig } from '../types/AircraftTypes';

export class FlightDataCalculator {
  private static readonly GRAVITY = 9.81;
  private static readonly KNOTS_TO_MS = 0.514444;
  private static readonly MS_TO_KNOTS = 1.94384;
  private static readonly FEET_TO_METERS = 0.3048;
  private static readonly METERS_TO_FEET = 3.28084;

  public static calculateAirspeed(
    velocity: Vector3D,
    windVelocity: Vector3D,
    airDensity: number,
    staticPressure: number
  ): {
    indicatedAirspeed: number; // IAS in knots
    trueAirspeed: number; // TAS in knots
    groundSpeed: number; // GS in knots
    calibratedAirspeed: number; // CAS in knots
  } {
    // Calculate relative air velocity
    const relativeVelocity = {
      x: velocity.x - windVelocity.x,
      y: velocity.y - windVelocity.y,
      z: velocity.z - windVelocity.z
    };

    // True Airspeed
    const trueAirspeed = Math.sqrt(
      relativeVelocity.x * relativeVelocity.x +
      relativeVelocity.y * relativeVelocity.y +
      relativeVelocity.z * relativeVelocity.z
    ) * this.MS_TO_KNOTS;

    // Ground Speed
    const groundSpeed = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
    ) * this.MS_TO_KNOTS;

    // Indicated Airspeed (simplified - accounts for air density)
    const seaLevelDensity = 1.225;
    const densityRatio = Math.sqrt(airDensity / seaLevelDensity);
    const indicatedAirspeed = trueAirspeed * densityRatio;

    // Calibrated Airspeed (simplified - IAS corrected for instrument errors)
    const calibratedAirspeed = indicatedAirspeed * 1.02; // Approximate 2% correction

    return {
      indicatedAirspeed,
      trueAirspeed,
      groundSpeed,
      calibratedAirspeed
    };
  }

  public static calculateAltitudeData(position: Vector3D, standardPressure: number = 1013.25): {
    pressureAltitude: number; // feet
    densityAltitude: number; // feet
    geometricAltitude: number; // feet
    absoluteAltitude: number; // feet AGL (if terrain data available)
  } {
    const geometricAltitude = position.z * this.METERS_TO_FEET;
    
    // Pressure altitude (standard atmosphere)
    const pressureAltitude = geometricAltitude; // Simplified - would use barometric setting

    // Density altitude (accounts for temperature and pressure effects)
    const standardTemp = 15; // °C at sea level
    const lapseRate = 1.98; // °C per 1000 feet
    const temperatureAtAltitude = standardTemp - (lapseRate * geometricAltitude / 1000);
    
    // Simplified density altitude calculation
    const densityAltitude = pressureAltitude + (temperatureAtAltitude - standardTemp) * 120;

    return {
      pressureAltitude,
      densityAltitude,
      geometricAltitude,
      absoluteAltitude: geometricAltitude // Would subtract terrain elevation
    };
  }

  public static calculateFlightAngles(
    velocity: Vector3D,
    windVelocity: Vector3D,
    orientation: { pitch: number; roll: number; yaw: number }
  ): {
    angleOfAttack: number; // degrees
    sideslipAngle: number; // degrees
    flightPathAngle: number; // degrees
    trackAngle: number; // degrees (ground track)
    driftAngle: number; // degrees
  } {
    // Calculate relative air velocity
    const relativeVelocity = {
      x: velocity.x - windVelocity.x,
      y: velocity.y - windVelocity.y,
      z: velocity.z - windVelocity.z
    };

    const airspeed = Math.sqrt(
      relativeVelocity.x * relativeVelocity.x +
      relativeVelocity.y * relativeVelocity.y +
      relativeVelocity.z * relativeVelocity.z
    );

    let angleOfAttack = 0;
    let sideslipAngle = 0;
    let flightPathAngle = 0;

    if (airspeed > 0.1) {
      // Angle of attack (difference between pitch and flight path angle)
      flightPathAngle = Math.atan2(-relativeVelocity.z, 
        Math.sqrt(relativeVelocity.x * relativeVelocity.x + relativeVelocity.y * relativeVelocity.y)
      ) * 180 / Math.PI;
      
      angleOfAttack = orientation.pitch - flightPathAngle;
      
      // Sideslip angle
      sideslipAngle = Math.atan2(relativeVelocity.y, relativeVelocity.x) * 180 / Math.PI - orientation.yaw;
      
      // Normalize angles
      angleOfAttack = this.normalizeAngle(angleOfAttack);
      sideslipAngle = this.normalizeAngle(sideslipAngle);
    }

    // Ground track angle
    const trackAngle = Math.atan2(velocity.y, velocity.x) * 180 / Math.PI;
    
    // Drift angle (difference between heading and track)
    const driftAngle = this.normalizeAngle(trackAngle - orientation.yaw);

    return {
      angleOfAttack,
      sideslipAngle,
      flightPathAngle,
      trackAngle,
      driftAngle
    };
  }

  public static calculateLoadFactors(
    acceleration: Vector3D,
    orientation: { pitch: number; roll: number; yaw: number }
  ): {
    normalGForce: number; // Gz (positive up)
    lateralGForce: number; // Gy (positive right)
    longitudinalGForce: number; // Gx (positive forward)
    totalGForce: number;
  } {
    // Convert acceleration to G-forces
    const gx = acceleration.x / this.GRAVITY;
    const gy = acceleration.y / this.GRAVITY;
    const gz = (acceleration.z + this.GRAVITY) / this.GRAVITY; // Add gravity component

    // Total G-force magnitude
    const totalGForce = Math.sqrt(gx * gx + gy * gy + gz * gz);

    return {
      normalGForce: gz,
      lateralGForce: gy,
      longitudinalGForce: gx,
      totalGForce
    };
  }

  public static calculatePerformanceData(
    velocity: Vector3D,
    acceleration: Vector3D,
    fuelRemaining: number,
    fuelConsumptionRate: number,
    aircraftConfig: AircraftPhysicsConfig
  ): {
    climbRate: number; // feet per minute
    endurance: number; // hours
    range: number; // nautical miles
    fuelFlow: number; // gallons per hour
    specificFuelConsumption: number; // lbs/hr/hp
  } {
    // Climb rate in feet per minute
    const climbRate = velocity.z * this.METERS_TO_FEET * 60;

    // Endurance calculation
    const endurance = fuelConsumptionRate > 0 ? fuelRemaining / fuelConsumptionRate : Infinity;

    // Range calculation (simplified)
    const groundSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const range = endurance * groundSpeed * this.MS_TO_KNOTS;

    // Fuel flow in gallons per hour (convert from kg/s)
    const fuelFlow = fuelConsumptionRate * 3600 / 2.68; // Approximate kg to gallons conversion

    // Specific fuel consumption
    const thrustPower = aircraftConfig.maxThrust * groundSpeed; // Simplified power calculation
    const specificFuelConsumption = thrustPower > 0 ? (fuelConsumptionRate * 3600 * 2.205) / (thrustPower / 745.7) : 0;

    return {
      climbRate,
      endurance,
      range,
      fuelFlow,
      specificFuelConsumption
    };
  }

  public static calculateStallSpeeds(
    aircraftConfig: AircraftPhysicsConfig,
    altitude: number,
    weight: number,
    flapsPosition: number,
    bankAngle: number = 0
  ): {
    stallSpeedClean: number; // knots
    stallSpeedFlaps: number; // knots
    stallSpeedCurrent: number; // knots (with current configuration)
    maneuveringSpeed: number; // knots (Va)
  } {
    const airDensity = this.getAirDensity(altitude);
    const loadFactor = 1 / Math.cos(bankAngle * Math.PI / 180);

    // Base stall speed calculation: Vs = sqrt((2 * W) / (ρ * S * CLmax))
    const baseStallSpeed = Math.sqrt(
      (2 * weight * this.GRAVITY) / 
      (airDensity * aircraftConfig.wingArea * aircraftConfig.maxLiftCoefficient)
    ) * this.MS_TO_KNOTS;

    const stallSpeedClean = baseStallSpeed * Math.sqrt(loadFactor);

    // With flaps (increased CLmax)
    const flapsLiftIncrease = 1 + (flapsPosition * 0.4); // 40% increase at full flaps
    const stallSpeedFlaps = stallSpeedClean / Math.sqrt(flapsLiftIncrease);

    // Current configuration
    const currentLiftIncrease = 1 + (flapsPosition * 0.4);
    const stallSpeedCurrent = baseStallSpeed * Math.sqrt(loadFactor) / Math.sqrt(currentLiftIncrease);

    // Maneuvering speed (simplified)
    const maneuveringSpeed = stallSpeedCurrent * Math.sqrt(aircraftConfig.maxLiftCoefficient / 1.0);

    return {
      stallSpeedClean,
      stallSpeedFlaps,
      stallSpeedCurrent,
      maneuveringSpeed
    };
  }

  public static calculateNavigationData(
    position: Vector3D,
    velocity: Vector3D,
    targetPosition: Vector3D
  ): {
    distanceToTarget: number; // nautical miles
    bearingToTarget: number; // degrees
    timeToTarget: number; // minutes
    crossTrackError: number; // nautical miles
    desiredTrack: number; // degrees
  } {
    const deltaX = targetPosition.x - position.x;
    const deltaY = targetPosition.y - position.y;
    
    // Distance in meters, convert to nautical miles
    const distanceToTarget = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 1852;
    
    // Bearing to target
    const bearingToTarget = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    // Time to target
    const groundSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const timeToTarget = groundSpeed > 0 ? (distanceToTarget * 1852) / groundSpeed / 60 : Infinity;
    
    // Simplified cross track error and desired track
    const crossTrackError = 0; // Would require waypoint navigation data
    const desiredTrack = bearingToTarget;

    return {
      distanceToTarget,
      bearingToTarget: this.normalizeAngle(bearingToTarget),
      timeToTarget,
      crossTrackError,
      desiredTrack: this.normalizeAngle(desiredTrack)
    };
  }

  private static normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle <= -180) angle += 360;
    return angle;
  }

  private static getAirDensity(altitude: number): number {
    // Standard atmosphere model
    const seaLevelDensity = 1.225; // kg/m³
    const temperatureLapseRate = 0.0065; // K/m
    const pressureLapseRate = 0.0000225; // /m
    
    const tempAtAltitude = 288.15 - temperatureLapseRate * altitude;
    const pressureRatio = Math.pow(1 - pressureLapseRate * altitude, 5.256);
    
    return seaLevelDensity * pressureRatio * (288.15 / tempAtAltitude);
  }

  public static calculateWeatherEffects(
    windSpeed: number,
    windDirection: number,
    heading: number,
    airspeed: number
  ): {
    headwind: number; // knots
    crosswind: number; // knots
    windCorrectionAngle: number; // degrees
    effectiveAirspeed: number; // knots
  } {
    const windAngleRelative = (windDirection - heading) * Math.PI / 180;
    
    const headwind = windSpeed * Math.cos(windAngleRelative);
    const crosswind = windSpeed * Math.sin(windAngleRelative);
    
    // Wind correction angle for maintaining track
    const windCorrectionAngle = Math.atan2(crosswind, airspeed) * 180 / Math.PI;
    
    // Effective airspeed considering headwind/tailwind
    const effectiveAirspeed = airspeed - headwind;
    
    return {
      headwind,
      crosswind,
      windCorrectionAngle,
      effectiveAirspeed
    };
  }
}