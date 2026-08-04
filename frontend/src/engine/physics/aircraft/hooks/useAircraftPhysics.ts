import { useState, useEffect, useRef } from 'react';
import { AircraftPhysics } from '../core/AircraftPhysics';
import { 
  AircraftPhysicsConfig, 
  ControlSurfaces, 
  FlightData, 
  EngineParameters,
  LandingGearState,
  FlapsState,
  WeatherConditions,
  FuelSystem as IFuelSystem,
  Vector3D
} from '../types/AircraftTypes';

interface UseAircraftPhysicsOptions {
  config: AircraftPhysicsConfig;
  initialPosition?: Vector3D;
  initialOrientation?: { x: number; y: number; z: number; w: number };
  autoUpdate?: boolean;
}

export function useAircraftPhysics({
  config,
  initialPosition = { x: 0, y: 0, z: 1000 },
  initialOrientation = { x: 0, y: 0, z: 0, w: 1 },
  autoUpdate = true
}: UseAircraftPhysicsOptions) {
  const physicsRef = useRef<AircraftPhysics | null>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const [flightData, setFlightData] = useState<FlightData>({
    airspeed: 0,
    groundSpeed: 0,
    altitude: initialPosition.z,
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
  });

  const [engine, setEngine] = useState<EngineParameters>({
    thrust: 0,
    rpm: 800,
    fuelFlow: 0,
    temperature: 85,
    pressure: 29.92,
    torque: 0
  });

  const [landingGear, setLandingGear] = useState<LandingGearState>({
    deployed: true,
    position: 1,
    locked: true,
    onGround: false,
    compressionRatio: 0
  });

  const [flaps, setFlaps] = useState<FlapsState>({
    position: 0,
    angle: 0,
    liftBonus: 0,
    dragPenalty: 0
  });

  const [fuel, setFuel] = useState<IFuelSystem>({
    totalCapacity: config.fuelCapacity,
    remaining: config.fuelCapacity,
    consumptionRate: config.fuelConsumptionRate,
    efficiency: 1.0,
    lowFuelWarning: config.fuelCapacity * 0.2,
    fuelPumps: true,
    fuelDistribution: {
      leftWing: config.fuelCapacity / 3,
      rightWing: config.fuelCapacity / 3,
      center: config.fuelCapacity / 3
    }
  });

  const [controls, setControls] = useState<ControlSurfaces>({
    elevator: 0,
    rudder: 0,
    ailerons: 0,
    flaps: 0,
    throttle: 0,
    brakes: 0,
    landingGear: true
  });

  const [weather, setWeather] = useState<WeatherConditions>({
    wind: { velocity: { x: 0, y: 0, z: 0 }, turbulence: { intensity: 0, scale: 1000 } },
    turbulence: { intensity: 0.1, scale: 1000, direction: { x: 0, y: 0, z: 0 }, frequency: 0.1 },
    visibility: 10000,
    precipitation: 0,
    temperature: 15,
    pressure: 1013.25,
    humidity: 0.6
  });

  // Initialize physics
  useEffect(() => {
    physicsRef.current = new AircraftPhysics(config);
    physicsRef.current.setPosition(initialPosition);
    physicsRef.current.setOrientation(initialOrientation);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [config]);

  // Update loop
  useEffect(() => {
    if (!autoUpdate || !physicsRef.current) return;

    const update = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.016); // Cap at 60fps
      lastTimeRef.current = currentTime;

      if (physicsRef.current && deltaTime > 0) {
        // Set current controls and weather
        physicsRef.current.setControls(controls);
        physicsRef.current.setWeather(weather);
        
        // Update physics
        physicsRef.current.update(deltaTime);
        
        // Get updated state
        const newFlightData = physicsRef.current.getFlightData();
        const newEngine = physicsRef.current.getEngine();
        const newLandingGear = physicsRef.current.getLandingGear();
        const newFlaps = physicsRef.current.getFlaps();
        const newFuel = physicsRef.current.getFuelSystem().getFuelState();
        
        setFlightData(newFlightData);
        setEngine(newEngine);
        setLandingGear(newLandingGear);
        setFlaps(newFlaps);
        setFuel(newFuel);
      }
      
      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [autoUpdate, controls, weather]);

  const updateControls = (newControls: Partial<ControlSurfaces>) => {
    setControls(prev => ({ ...prev, ...newControls }));
  };

  const updateWeather = (newWeather: Partial<WeatherConditions>) => {
    setWeather(prev => ({ ...prev, ...newWeather }));
  };

  const resetAircraft = () => {
    if (physicsRef.current) {
      physicsRef.current.reset();
      physicsRef.current.setPosition(initialPosition);
      physicsRef.current.setOrientation(initialOrientation);
    }
  };

  const getAircraftPosition = (): Vector3D | null => {
    if (!physicsRef.current) return null;
    return physicsRef.current.getState().position;
  };

  const getAircraftOrientation = (): { x: number; y: number; z: number; w: number } | null => {
    if (!physicsRef.current) return null;
    return physicsRef.current.getState().orientation;
  };

  const getAircraftVelocity = (): Vector3D | null => {
    if (!physicsRef.current) return null;
    return physicsRef.current.getState().velocity;
  };

  const setAircraftPosition = (position: Vector3D) => {
    if (physicsRef.current) {
      physicsRef.current.setPosition(position);
    }
  };

  const addFuel = (amount: number) => {
    if (physicsRef.current) {
      physicsRef.current.getFuelSystem().addFuel(amount);
    }
  };

  return {
    // State
    flightData,
    engine,
    landingGear,
    flaps,
    fuel,
    controls,
    weather,
    
    // Actions
    updateControls,
    updateWeather,
    resetAircraft,
    addFuel,
    
    // Getters
    getAircraftPosition,
    getAircraftOrientation,
    getAircraftVelocity,
    setAircraftPosition,
    
    // Physics instance (for advanced use)
    physics: physicsRef.current
  };
}