/**
 * Flight System Hook
 * Easy-to-use React hook for managing realistic airplane flights
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { FlightConfiguration, FlightCallbacks } from "./types";

export interface FlightSystemState {
  flights: FlightConfiguration[];
  isActive: boolean;
  totalFlights: number;
  activeFlights: number;
  completedFlights: number;
}

export interface FlightSystemActions {
  addFlight: (flight: Omit<FlightConfiguration, 'id'> & { id?: string }) => string;
  removeFlight: (flightId: string) => void;
  updateFlight: (flightId: string, updates: Partial<FlightConfiguration>) => void;
  clearAllFlights: () => void;
  pauseAllFlights: () => void;
  resumeAllFlights: () => void;
  toggleFlightSystem: () => void;
}

export const useFlightSystem = (initialCallbacks?: FlightCallbacks) => {
  const [state, setState] = useState<FlightSystemState>({
    flights: [],
    isActive: true,
    totalFlights: 0,
    activeFlights: 0,
    completedFlights: 0
  });
  
  const callbacksRef = useRef<FlightCallbacks>(initialCallbacks || {});
  const flightCounterRef = useRef(0);
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = initialCallbacks || {};
  }, [initialCallbacks]);
  
  // Generate unique flight ID
  const generateFlightId = useCallback(() => {
    return `flight_${Date.now()}_${++flightCounterRef.current}`;
  }, []);
  
  // Add new flight - wrapped in useCallback for stable reference
  const addFlight = useCallback((flightConfig: Omit<FlightConfiguration, 'id'> & { id?: string }): string => {
    const flightId = flightConfig.id || generateFlightId();
    
    const newFlight: FlightConfiguration = {
      ...flightConfig,
      id: flightId,
      active: flightConfig.active ?? true
    };
    
    setState(prev => ({
      ...prev,
      flights: [...prev.flights, newFlight],
      totalFlights: prev.totalFlights + 1,
      activeFlights: newFlight.active ? prev.activeFlights + 1 : prev.activeFlights
    }));
    
    // Trigger start callback
    if (callbacksRef.current.onStart && newFlight.active) {
      callbacksRef.current.onStart(flightId);
    }
    
    return flightId;
  }, [generateFlightId]);
  
  // Remove flight - wrapped in useCallback for stable reference
  const removeFlight = useCallback((flightId: string) => {
    setState(prev => {
      const flight = prev.flights.find(f => f.id === flightId);
      return {
        ...prev,
        flights: prev.flights.filter(f => f.id !== flightId),
        activeFlights: flight?.active ? Math.max(0, prev.activeFlights - 1) : prev.activeFlights
      };
    });
  }, []);
  
  // Update flight configuration - wrapped in useCallback for stable reference
  const updateFlight = useCallback((flightId: string, updates: Partial<FlightConfiguration>) => {
    setState(prev => ({
      ...prev,
      flights: prev.flights.map(f => 
        f.id === flightId ? { ...f, ...updates } : f
      )
    }));
  }, []);
  
  // Clear all flights - wrapped in useCallback for stable reference
  const clearAllFlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      flights: [],
      activeFlights: 0
    }));
  }, []);
  
  // Pause all flights - wrapped in useCallback for stable reference
  const pauseAllFlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      flights: prev.flights.map(f => ({ ...f, active: false })),
      activeFlights: 0
    }));
  }, []);
  
  // Resume all flights - wrapped in useCallback for stable reference
  const resumeAllFlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      flights: prev.flights.map(f => ({ ...f, active: true })),
      activeFlights: prev.flights.length
    }));
  }, []);
  
  // Toggle flight system on/off - wrapped in useCallback for stable reference
  const toggleFlightSystem = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: !prev.isActive
    }));
  }, []);
  
  // Enhanced callbacks that update state - memoized for stability
  const enhancedCallbacks: FlightCallbacks = useMemo(() => ({
    onStart: (flightId) => {
      callbacksRef.current.onStart?.(flightId);
    },
    
    onProgress: (flightId, progress) => {
      callbacksRef.current.onProgress?.(flightId, progress);
    },
    
    onComplete: (flightId) => {
      setState(prev => ({
        ...prev,
        completedFlights: prev.completedFlights + 1,
        activeFlights: Math.max(0, prev.activeFlights - 1)
      }));
      
      callbacksRef.current.onComplete?.(flightId);
    }
  }), []);
  
  // Memoize actions for stable references
  const actions: FlightSystemActions = useMemo(() => ({
    addFlight,
    removeFlight,
    updateFlight,
    clearAllFlights,
    pauseAllFlights,
    resumeAllFlights,
    toggleFlightSystem
  }), [addFlight, removeFlight, updateFlight, clearAllFlights, pauseAllFlights, resumeAllFlights, toggleFlightSystem]);
  
  return {
    ...state,
    ...actions,
    callbacks: enhancedCallbacks
  };
};

/**
 * Predefined flight templates for common routes
 */
export const FLIGHT_TEMPLATES = {
  // Domestic Nepal routes
  domesticCommercial: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => ({
    origin,
    destination,
    speedKmh: 350,
    altitude: 0.08,
    model: '/models/aircraft/citation_cj.glb',
    scale: 0.015,
    color: '#e74c3c',
    loop: true,
    contrails: true
  }),
  
  // Mountain/scenic flights
  mountainTour: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => ({
    origin,
    destination,
    speedKmh: 200,
    altitude: 0.12,
    model: '/models/aircraft/low-poly_airplane.glb',
    scale: 0.01,
    color: '#9b59b6',
    loop: true,
    contrails: false
  }),
  
  // Private/small aircraft
  privateJet: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => ({
    origin,
    destination,
    speedKmh: 300,
    altitude: 0.06,
    model: '/models/aircraft/cirrus_sr22.glb',
    scale: 0.012,
    color: '#3498db',
    loop: false,
    contrails: true
  })
};

/**
 * Helper function to create flights from templates
 */
export const createFlightFromTemplate = (
  template: keyof typeof FLIGHT_TEMPLATES,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  overrides: Partial<FlightConfiguration> = {}
): Omit<FlightConfiguration, 'id'> => {
  return {
    ...FLIGHT_TEMPLATES[template](origin, destination),
    ...overrides
  };
};