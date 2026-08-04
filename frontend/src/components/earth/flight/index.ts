/**
 * Flight System
 * Realistic airplane flight simulation for interactive 3D Earth
 * 
 * Features:
 * - True spherical flight paths (great circle routes)
 * - Realistic aircraft orientation and banking
 * - High-performance rendering for hundreds of aircraft
 * - Progressive flight path animation
 * - Contrail/vapor trail effects
 * - Configurable aircraft models, speeds, and colors
 * - Loop and one-way flight support
 * - Delta time animation for smooth 60fps performance
 */

// Core components
export { FlightManager, useFlightManager } from './FlightManager';
export { AircraftRenderer, MultiAircraftRenderer } from './AircraftRenderer';
export { FlightPathRenderer, OptimizedFlightPaths, WaypointMarkers } from './FlightPathRenderer';
export { Contrail, SimpleContrail, MultiContrailSystem, CONTRAIL_CONFIGS } from './ContrailSystem';

// Demo and examples
export { NepalFlightDemo } from './NepalFlightDemo';
export { FlightSystemExample, InteractiveFlightExample, RealisticAirlineExample } from './FlightSystemExample';

// Hooks and utilities
export { useFlightSystem, createFlightFromTemplate, FLIGHT_TEMPLATES } from './useFlightSystem';
export { GreatCircleCalculator } from './GreatCircleCalculator';

// Types
export type {
  FlightConfiguration,
  FlightState,
  FlightCallbacks,
  FlightManagerConfig,
  GeoPosition,
  GreatCirclePoint,
  ContrailConfig,
  FlightEvent,
  FlightEventType
} from './types';

/**
 * Quick Start Example:
 * 
 * ```tsx
 * import { FlightManager, useFlightSystem, createFlightFromTemplate } from '@/components/earth/flight';
 * 
 * function MyFlightComponent() {
 *   const flightSystem = useFlightSystem({
 *     onComplete: (id) => console.log(`Flight ${id} completed`),
 *     onProgress: (id, progress) => console.log(`Flight ${id}: ${progress * 100}%`)
 *   });
 * 
 *   // Add a flight
 *   const addFlight = () => {
 *     flightSystem.addFlight(createFlightFromTemplate(
 *       'domesticCommercial',
 *       { lat: 27.7172, lng: 85.3240 }, // Kathmandu
 *       { lat: 28.2096, lng: 83.9856 }  // Pokhara
 *     ));
 *   };
 * 
 *   return (
 *     <>
 *       <button onClick={addFlight}>Add Flight</button>
 *       <FlightManager 
 *         flights={flightSystem.flights}
 *         callbacks={flightSystem.callbacks}
 *         active={true}
 *         qualityLevel="medium"
 *       />
 *     </>
 *   );
 * }
 * ```
 * 
 * Advanced Usage:
 * 
 * ```tsx
 * // Custom flight configuration
 * flightSystem.addFlight({
 *   origin: { lat: 27.7172, lng: 85.3240 },
 *   destination: { lat: 28.2096, lng: 83.9856 },
 *   speedKmh: 500,
 *   altitude: 0.1,
 *   model: '/models/aircraft/custom-jet.glb',
 *   scale: 0.02,
 *   color: '#ff6b6b',
 *   loop: true,
 *   contrails: true
 * });
 * 
 * // Multiple simultaneous flights
 * const routes = [
 *   [{ lat: 27.7172, lng: 85.3240 }, { lat: 28.2096, lng: 83.9856 }],
 *   [{ lat: 28.2096, lng: 83.9856 }, { lat: 27.6869, lng: 86.7314 }],
 * ];
 * 
 * routes.forEach(([origin, destination], i) => {
 *   flightSystem.addFlight({
 *     origin,
 *     destination,
 *     speedKmh: 300,
 *     altitude: 0.08,
 *     model: '/models/aircraft/citation_cj.glb',
 *     scale: 0.015,
 *     color: `hsl(${i * 60}, 70%, 50%)`,
 *     loop: true,
 *     contrails: true
 *   });
 * });
 * ```
 */