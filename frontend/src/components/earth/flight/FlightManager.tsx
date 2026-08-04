/**
 * Flight Manager
 * High-performance flight system orchestrator for realistic airplane simulation
 */

import React, { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, Color } from "three";
import { GreatCircleCalculator } from "./GreatCircleCalculator";
import { MultiAircraftRenderer } from "./AircraftRenderer";
import { OptimizedFlightPaths } from "./FlightPathRenderer";
import { MultiContrailSystem, CONTRAIL_CONFIGS } from "./ContrailSystem";
import type {
  FlightConfiguration,
  FlightState,
  FlightCallbacks,
  FlightManagerConfig,
  GreatCirclePoint,
  ContrailConfig
} from "./types";

interface FlightManagerProps {
  /** Array of flight configurations */
  flights: FlightConfiguration[];
  
  /** Flight event callbacks */
  callbacks?: FlightCallbacks;
  
  /** Manager configuration */
  config?: Partial<FlightManagerConfig>;
  
  /** Whether flight system is active */
  active?: boolean;
  
  /** Performance optimization level */
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Internal flight data structure for optimization
 */
interface InternalFlightData {
  id: string;
  config: FlightConfiguration;
  route: GreatCirclePoint[];
  state: FlightState;
  contrailConfig: ContrailConfig;
  distance: number;
  startTime: number;
  previousBearing: number;
}

export const FlightManager: React.FC<FlightManagerProps> = ({
  flights,
  callbacks,
  config: userConfig,
  active = true,
  qualityLevel = 'medium'
}) => {
  const groupRef = useRef<Group>(null);
  const flightDataRef = useRef<Map<string, InternalFlightData>>(new Map());
  const timeRef = useRef(0);
  
  // Default configuration
  const config: FlightManagerConfig = useMemo(() => ({
    earthRadius: 6371.1, // Earth radius in km (matches constants)
    defaultAltitude: 0.05, // 50m above surface
    maxFlights: 100,
    qualityLevel: qualityLevel,
    ...userConfig
  }), [userConfig, qualityLevel]);
  
  // Performance settings based on quality level
  const performanceSettings = useMemo(() => {
    switch (config.qualityLevel) {
      case 'low':
        return {
          maxFlights: 20,
          routeSegments: 20,
          contrailEnabled: false,
          useSimpleContrails: true,
          updateFrequency: 2 // Update every 2 frames
        };
      case 'medium':
        return {
          maxFlights: 50,
          routeSegments: 50,
          contrailEnabled: true,
          useSimpleContrails: true,
          updateFrequency: 1
        };
      case 'high':
        return {
          maxFlights: 80,
          routeSegments: 100,
          contrailEnabled: true,
          useSimpleContrails: false,
          updateFrequency: 1
        };
      case 'ultra':
        return {
          maxFlights: 100,
          routeSegments: 200,
          contrailEnabled: true,
          useSimpleContrails: false,
          updateFrequency: 1
        };
      default:
        return {
          maxFlights: 50,
          routeSegments: 50,
          contrailEnabled: true,
          useSimpleContrails: true,
          updateFrequency: 1
        };
    }
  }, [config.qualityLevel]);
  
  // Initialize flight data when flights change
  const initializeFlightData = useCallback((flightConfig: FlightConfiguration): InternalFlightData => {
    const distance = GreatCircleCalculator.distance(flightConfig.origin, flightConfig.destination);
    const altitude = flightConfig.altitude ?? config.defaultAltitude;
    const earthRadius = config.earthRadius + altitude;
    
    // Generate optimized route
    const route = GreatCircleCalculator.generateOptimizedRoute(
      flightConfig.origin,
      flightConfig.destination,
      distance,
      earthRadius
    );
    
    // Initial state
    const initialPosition = route[0]?.position || new Vector3();
    const initialState: FlightState = {
      position: initialPosition.clone(),
      direction: new Vector3(1, 0, 0),
      up: initialPosition.clone().normalize(),
      bankAngle: 0,
      progress: flightConfig.progress || 0,
      completed: false
    };
    
    // Select contrail configuration
    let contrailConfig = CONTRAIL_CONFIGS.medium;
    if (distance < 500) contrailConfig = CONTRAIL_CONFIGS.light;
    else if (distance > 2000) contrailConfig = CONTRAIL_CONFIGS.heavy;
    
    return {
      id: flightConfig.id,
      config: flightConfig,
      route,
      state: initialState,
      contrailConfig,
      distance,
      startTime: timeRef.current,
      previousBearing: 0
    };
  }, [config]);
  
  // Update flight data when flights change
  useEffect(() => {
    const currentData = flightDataRef.current;
    const newData = new Map<string, InternalFlightData>();
    
    // Limit number of active flights for performance
    const activeFlights = flights
      .filter(f => f.active !== false)
      .slice(0, performanceSettings.maxFlights);
    
    activeFlights.forEach(flightConfig => {
      const existing = currentData.get(flightConfig.id);
      
      if (existing && 
          existing.config.origin.lat === flightConfig.origin.lat &&
          existing.config.origin.lng === flightConfig.origin.lng &&
          existing.config.destination.lat === flightConfig.destination.lat &&
          existing.config.destination.lng === flightConfig.destination.lng) {
        // Update existing flight config
        existing.config = flightConfig;
        newData.set(flightConfig.id, existing);
      } else {
        // Create new flight data
        newData.set(flightConfig.id, initializeFlightData(flightConfig));
      }
    });
    
    flightDataRef.current = newData;
  }, [flights, initializeFlightData, performanceSettings.maxFlights]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!active) return;
    
    timeRef.current += delta;
    
    // Performance optimization: skip frames for lower quality
    if (performanceSettings.updateFrequency > 1 && 
        Math.floor(state.clock.elapsedTime * 60) % performanceSettings.updateFrequency !== 0) {
      return;
    }
    
    const flightData = flightDataRef.current;
    
    flightData.forEach((data, flightId) => {
      if (!data.config.active || data.state.completed) return;
      
      const { config: flightConfig, route, state } = data;
      
      // Calculate flight progress based on speed and time
      const elapsedTime = timeRef.current - data.startTime;
      const speedMs = (flightConfig.speedKmh * 1000) / 3600; // Convert km/h to m/s
      const progressDistance = speedMs * elapsedTime;
      const totalDistance = data.distance * 1000; // Convert to meters
      
      let newProgress = Math.min(1, progressDistance / totalDistance);
      
      // Apply manual progress override if specified
      if (flightConfig.progress !== undefined) {
        newProgress = Math.max(0, Math.min(1, flightConfig.progress));
      }
      
      // Update flight state
      if (newProgress < 1) {
        const positionData = GreatCircleCalculator.getPositionAtProgress(
          route,
          newProgress,
          config.earthRadius + (flightConfig.altitude || config.defaultAltitude)
        );
        
        // Update state
        state.position = positionData.position;
        state.direction = positionData.direction;
        state.up = positionData.up;
        state.progress = newProgress;
        
        // Calculate banking angle for turns
        const currentBearing = positionData.bearing;
        state.bankAngle = GreatCircleCalculator.calculateBankAngle(
          currentBearing,
          data.previousBearing
        );
        data.previousBearing = currentBearing;
        
        // Progress callback
        if (callbacks?.onProgress) {
          callbacks.onProgress(flightId, newProgress);
        }
      } else {
        // Flight completed
        state.progress = 1;
        state.completed = true;
        
        if (flightConfig.loop) {
          // Reset for loop
          data.startTime = timeRef.current;
          state.completed = false;
          state.progress = 0;
          
          // Optionally swap origin/destination for round trip
          const temp = flightConfig.origin;
          flightConfig.origin = flightConfig.destination;
          flightConfig.destination = temp;
          
          // Regenerate route
          data.route = GreatCircleCalculator.generateOptimizedRoute(
            flightConfig.origin,
            flightConfig.destination,
            data.distance,
            config.earthRadius + (flightConfig.altitude || config.defaultAltitude)
          );
        } else {
          // Completion callback
          if (callbacks?.onComplete) {
            callbacks.onComplete(flightId);
          }
        }
      }
    });
  });
  
  // Prepare render data
  const renderData = useMemo(() => {
    const activeFlights = Array.from(flightDataRef.current.values())
      .filter(data => data.config.active !== false && !data.state.completed);
    
    const aircraftData = activeFlights.map(data => ({
      id: data.id,
      flightState: data.state,
      modelPath: data.config.model,
      scale: data.config.scale,
      color: new Color(data.config.color),
      visible: true
    }));
    
    const pathData = activeFlights.map(data => ({
      id: data.id,
      route: data.route,
      progress: data.state.progress,
      color: new Color(data.config.color),
      visible: true
    }));
    
    const contrailData = activeFlights
      .filter(data => data.config.contrails && performanceSettings.contrailEnabled)
      .map(data => ({
        id: data.id,
        aircraftPosition: data.state.position,
        aircraftUp: data.state.up,
        active: true,
        config: data.contrailConfig,
        useSimple: performanceSettings.useSimpleContrails
      }));
    
    return { aircraftData, pathData, contrailData };
  }, [performanceSettings]);
  
  if (!active) return null;
  
  return (
    <group ref={groupRef}>
      {/* Flight paths */}
      <OptimizedFlightPaths paths={renderData.pathData} />
      
      {/* Aircraft */}
      <MultiAircraftRenderer flights={renderData.aircraftData} />
      
      {/* Contrails */}
      {performanceSettings.contrailEnabled && (
        <MultiContrailSystem contrails={renderData.contrailData} />
      )}
    </group>
  );
};

/**
 * Hook for managing flight system
 */
export const useFlightManager = () => {
  const flightsRef = useRef<FlightConfiguration[]>([]);
  
  const addFlight = useCallback((flight: FlightConfiguration) => {
    flightsRef.current = [...flightsRef.current, flight];
  }, []);
  
  const removeFlight = useCallback((flightId: string) => {
    flightsRef.current = flightsRef.current.filter(f => f.id !== flightId);
  }, []);
  
  const updateFlight = useCallback((flightId: string, updates: Partial<FlightConfiguration>) => {
    flightsRef.current = flightsRef.current.map(f => 
      f.id === flightId ? { ...f, ...updates } : f
    );
  }, []);
  
  const clearAllFlights = useCallback(() => {
    flightsRef.current = [];
  }, []);
  
  return {
    flights: flightsRef.current,
    addFlight,
    removeFlight,
    updateFlight,
    clearAllFlights
  };
};