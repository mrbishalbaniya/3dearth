/**
 * Nepal Flight Demo
 * Demonstrates the flight system with realistic Nepal aviation routes
 */

import React, { useState, useEffect } from "react";
import { FlightManager } from "./FlightManager";
import { useFlightSystem, createFlightFromTemplate } from "./useFlightSystem";
import type { FlightConfiguration, FlightCallbacks } from "./types";

/**
 * Real Nepal airports and destinations
 */
const NEPAL_AIRPORTS = {
  VNKT: { lat: 27.6966, lng: 85.3591, name: "Tribhuvan International (Kathmandu)" },
  VNPK: { lat: 28.2009, lng: 83.9822, name: "Pokhara Airport" },
  VNBT: { lat: 27.5008, lng: 83.4161, name: "Gautam Buddha Airport (Bhairahawa)" },
  VNBW: { lat: 27.5058, lng: 83.4161, name: "Siddharthanagar Airport" },
  VNJP: { lat: 27.6311, lng: 85.9222, name: "Janakpur Airport" },
  VNRT: { lat: 27.3947, lng: 83.2142, name: "Rupandehi Airport" },
  VNSM: { lat: 29.2167, lng: 81.6167, name: "Simikot Airport" },
  VNLK: { lat: 27.8906, lng: 86.7314, name: "Lukla Airport (Tenzing-Hillary)" },
  VNMO: { lat: 28.0864, lng: 84.0658, name: "Jomsom Airport" }
};

interface NepalFlightDemoProps {
  /** Whether demo is active */
  active?: boolean;
  
  /** Quality level for performance */
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra';
  
  /** Whether to show domestic routes */
  showDomesticRoutes?: boolean;
  
  /** Whether to show mountain flights */
  showMountainFlights?: boolean;
  
  /** Flight speed multiplier for demo purposes */
  speedMultiplier?: number;
}

export const NepalFlightDemo: React.FC<NepalFlightDemoProps> = ({
  active = true,
  qualityLevel = 'medium',
  showDomesticRoutes = true,
  showMountainFlights = true,
  speedMultiplier = 2.0
}) => {
  const flightSystem = useFlightSystem({
    onStart: (flightId) => {
      console.log(`✈️ Nepal Flight ${flightId} departing`);
    },
    onProgress: (flightId, progress) => {
      // Throttled progress logging
      if (progress > 0 && Math.floor(progress * 10) !== Math.floor((progress - 0.1) * 10)) {
        console.log(`✈️ Nepal Flight ${flightId}: ${Math.round(progress * 100)}% complete`);
      }
    },
    onComplete: (flightId) => {
      console.log(`🛬 Nepal Flight ${flightId} arrived safely`);
    }
  });
  
  // Extract functions to avoid dependency issues
  const { clearAllFlights, addFlight } = flightSystem;
  
  // Initialize demo flights
  useEffect(() => {
    if (!active) return;
    
    // Clear existing flights
    clearAllFlights();
    
    if (showDomesticRoutes) {
      // Domestic commercial routes
      addFlight({
        ...createFlightFromTemplate('domesticCommercial', 
          NEPAL_AIRPORTS.VNKT, 
          NEPAL_AIRPORTS.VNPK
        ),
        speedKmh: 350 * speedMultiplier,
        color: '#e74c3c'
      });
      
      addFlight({
        ...createFlightFromTemplate('domesticCommercial', 
          NEPAL_AIRPORTS.VNPK, 
          NEPAL_AIRPORTS.VNKT
        ),
        speedKmh: 350 * speedMultiplier,
        color: '#3498db'
      });
      
      addFlight({
        ...createFlightFromTemplate('privateJet', 
          NEPAL_AIRPORTS.VNKT, 
          NEPAL_AIRPORTS.VNBT
        ),
        speedKmh: 300 * speedMultiplier,
        color: '#f39c12'
      });
    }
    
    if (showMountainFlights) {
      // Mountain/tourist flights
      addFlight({
        ...createFlightFromTemplate('mountainTour', 
          NEPAL_AIRPORTS.VNKT, 
          NEPAL_AIRPORTS.VNLK
        ),
        speedKmh: 250 * speedMultiplier,
        color: '#9b59b6',
        loop: false
      });
      
      addFlight({
        ...createFlightFromTemplate('mountainTour', 
          NEPAL_AIRPORTS.VNKT, 
          NEPAL_AIRPORTS.VNMO
        ),
        speedKmh: 280 * speedMultiplier,
        color: '#1abc9c'
      });
      
      // Scenic Everest flight (circular route)
      addFlight({
        origin: NEPAL_AIRPORTS.VNKT,
        destination: { lat: 27.9881, lng: 86.9250 }, // Near Everest
        speedKmh: 200 * speedMultiplier,
        altitude: 0.15, // Very high for Everest views
        model: '/models/aircraft/cirrus_sr22.glb',
        scale: 0.008,
        color: '#e67e22',
        loop: true,
        contrails: true
      });
    }
  }, [active, showDomesticRoutes, showMountainFlights, speedMultiplier, clearAllFlights, addFlight]);
  
  if (!active) {
    return null;
  }
  
  return (
    <FlightManager
      flights={flightSystem.flights}
      callbacks={flightSystem.callbacks}
      active={active}
      qualityLevel={qualityLevel}
      config={{
        earthRadius: 6371.1,
        defaultAltitude: 0.05,
        maxFlights: qualityLevel === 'low' ? 3 : qualityLevel === 'medium' ? 5 : 8
      }}
    />
  );
};

/**
 * Predefined flight configurations for easy testing
 */
export const DEMO_FLIGHT_CONFIGS = {
  // Quick test flight (Kathmandu to Pokhara)
  quickTest: {
    id: 'quick-test',
    origin: NEPAL_AIRPORTS.VNKT,
    destination: NEPAL_AIRPORTS.VNPK,
    speedKmh: 800, // Fast for testing
    altitude: 0.05,
    model: '/models/aircraft/citation_cj.glb',
    scale: 0.02,
    color: '#ff0000',
    loop: false,
    contrails: true,
    active: true
  } as FlightConfiguration,
  
  // Scenic mountain tour
  mountainTour: {
    id: 'mountain-tour',
    origin: NEPAL_AIRPORTS.VNKT,
    destination: NEPAL_AIRPORTS.VNLK,
    speedKmh: 200,
    altitude: 0.12,
    model: '/models/aircraft/low-poly_airplane.glb',
    scale: 0.01,
    color: '#00ff00',
    loop: true,
    contrails: false,
    active: true
  } as FlightConfiguration
};

/**
 * Helper function to create custom Nepal flights
 */
export const createNepalFlight = (
  from: keyof typeof NEPAL_AIRPORTS,
  to: keyof typeof NEPAL_AIRPORTS,
  options: Partial<FlightConfiguration> = {}
): FlightConfiguration => {
  return {
    id: `${from}-${to}-${Date.now()}`,
    origin: NEPAL_AIRPORTS[from],
    destination: NEPAL_AIRPORTS[to],
    speedKmh: 300,
    altitude: 0.08,
    model: '/models/aircraft/citation_cj.glb',
    scale: 0.015,
    color: '#3498db',
    loop: false,
    contrails: true,
    active: true,
    ...options
  };
};