/**
 * Flight System Usage Example
 * Demonstrates how easy it is to add realistic flights to your 3D Earth
 */

import React, { useEffect } from "react";
import { FlightManager } from "./FlightManager";
import { useFlightSystem, createFlightFromTemplate } from "./useFlightSystem";

/**
 * Simple example showing how to use the flight system
 */
export const FlightSystemExample: React.FC = () => {
  const flightSystem = useFlightSystem({
    onComplete: (flightId) => {
      console.log(`✈️ Flight ${flightId} has arrived at destination`);
    },
    onProgress: (flightId, progress) => {
      if (progress === 0.5) {
        console.log(`✈️ Flight ${flightId} is halfway to destination`);
      }
    }
  });
  
  // Add some demo flights on mount
  useEffect(() => {
    // Commercial flight: Kathmandu to Pokhara
    flightSystem.addFlight(createFlightFromTemplate(
      'domesticCommercial',
      { lat: 27.7172, lng: 85.3240 }, // Kathmandu
      { lat: 28.2096, lng: 83.9856 }  // Pokhara
    ));
    
    // Mountain tour: Kathmandu to Lukla (Everest region)
    flightSystem.addFlight(createFlightFromTemplate(
      'mountainTour',
      { lat: 27.7172, lng: 85.3240 }, // Kathmandu
      { lat: 27.6869, lng: 86.7314 }  // Lukla
    ));
    
    // Private jet: Pokhara to Kathmandu
    flightSystem.addFlight(createFlightFromTemplate(
      'privateJet',
      { lat: 28.2096, lng: 83.9856 }, // Pokhara
      { lat: 27.7172, lng: 85.3240 }  // Kathmandu
    ));
    
  }, [flightSystem]);
  
  return (
    <FlightManager
      flights={flightSystem.flights}
      callbacks={flightSystem.callbacks}
      active={flightSystem.isActive}
      qualityLevel="medium"
    />
  );
};

/**
 * Interactive example with controls
 */
interface InteractiveFlightExampleProps {
  showControls?: boolean;
}

export const InteractiveFlightExample: React.FC<InteractiveFlightExampleProps> = ({
  showControls = false
}) => {
  const flightSystem = useFlightSystem();
  
  // Quick add functions
  const addRandomFlight = () => {
    const origins = [
      { lat: 27.7172, lng: 85.3240, name: 'Kathmandu' },
      { lat: 28.2096, lng: 83.9856, name: 'Pokhara' },
      { lat: 27.6869, lng: 86.7314, name: 'Lukla' }
    ];
    
    const origin = origins[Math.floor(Math.random() * origins.length)];
    const destination = origins[Math.floor(Math.random() * origins.length)];
    
    if (origin !== destination) {
      flightSystem.addFlight({
        origin,
        destination,
        speedKmh: 200 + Math.random() * 300,
        altitude: 0.05 + Math.random() * 0.1,
        model: '/models/aircraft/citation_cj.glb',
        scale: 0.01 + Math.random() * 0.01,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        loop: Math.random() > 0.5,
        contrails: Math.random() > 0.3
      });
    }
  };
  
  return (
    <>
      <FlightManager
        flights={flightSystem.flights}
        callbacks={flightSystem.callbacks}
        active={flightSystem.isActive}
        qualityLevel="medium"
      />
      
      {showControls && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: 16,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000
        }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Flight System Controls</h3>
          
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Active: {flightSystem.activeFlights} | 
            Total: {flightSystem.totalFlights} | 
            Completed: {flightSystem.completedFlights}
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addRandomFlight} style={{ padding: '4px 8px', fontSize: 12 }}>
              Add Flight
            </button>
            <button onClick={flightSystem.clearAllFlights} style={{ padding: '4px 8px', fontSize: 12 }}>
              Clear All
            </button>
            <button onClick={flightSystem.toggleFlightSystem} style={{ padding: '4px 8px', fontSize: 12 }}>
              {flightSystem.isActive ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Production-ready example with realistic airline schedules
 */
export const RealisticAirlineExample: React.FC = () => {
  const flightSystem = useFlightSystem({
    onComplete: (flightId) => {
      console.log(`Flight ${flightId} completed successfully`);
    }
  });
  
  useEffect(() => {
    // Simulate realistic airline schedule
    const scheduleFlights = () => {
      // Morning departures
      setTimeout(() => {
        flightSystem.addFlight({
          origin: { lat: 27.7172, lng: 85.3240 }, // Kathmandu
          destination: { lat: 28.2096, lng: 83.9856 }, // Pokhara
          speedKmh: 350,
          altitude: 0.08,
          model: '/models/aircraft/citation_cj.glb',
          scale: 0.015,
          color: '#e74c3c',
          loop: true,
          contrails: true
        });
      }, 1000);
      
      // Afternoon departure
      setTimeout(() => {
        flightSystem.addFlight({
          origin: { lat: 28.2096, lng: 83.9856 }, // Pokhara
          destination: { lat: 27.7172, lng: 85.3240 }, // Kathmandu
          speedKmh: 350,
          altitude: 0.08,
          model: '/models/aircraft/citation_cj.glb',
          scale: 0.015,
          color: '#3498db',
          loop: true,
          contrails: true
        });
      }, 5000);
      
      // Mountain scenic flight
      setTimeout(() => {
        flightSystem.addFlight({
          origin: { lat: 27.7172, lng: 85.3240 }, // Kathmandu
          destination: { lat: 27.9881, lng: 86.9250 }, // Near Everest
          speedKmh: 200,
          altitude: 0.15,
          model: '/models/aircraft/low-poly_airplane.glb',
          scale: 0.008,
          color: '#f39c12',
          loop: true,
          contrails: true
        });
      }, 10000);
    };
    
    scheduleFlights();
  }, [flightSystem]);
  
  return (
    <FlightManager
      flights={flightSystem.flights}
      callbacks={flightSystem.callbacks}
      active={true}
      qualityLevel="high"
      config={{
        earthRadius: 6371.1,
        defaultAltitude: 0.05,
        maxFlights: 10
      }}
    />
  );
};