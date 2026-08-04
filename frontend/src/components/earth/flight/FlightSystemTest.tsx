/**
 * Flight System Integration Test
 * Simple test component to verify the flight system works correctly
 */

import React, { useEffect, useState } from "react";
import { FlightManager } from "./FlightManager";
import type { FlightConfiguration } from "./types";

export const FlightSystemTest: React.FC = () => {
  const [testFlights, setTestFlights] = useState<FlightConfiguration[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  useEffect(() => {
    // Test 1: Simple point-to-point flight
    const testFlight1: FlightConfiguration = {
      id: 'test-flight-1',
      origin: { lat: 27.7172, lng: 85.3240 }, // Kathmandu
      destination: { lat: 28.2096, lng: 83.9856 }, // Pokhara
      speedKmh: 1000, // Fast for testing
      altitude: 0.05,
      model: '/models/aircraft/citation_cj.glb',
      scale: 0.02,
      color: '#ff0000',
      loop: false,
      contrails: true,
      active: true
    };
    
    // Test 2: Looping flight
    const testFlight2: FlightConfiguration = {
      id: 'test-flight-2',
      origin: { lat: 28.2096, lng: 83.9856 }, // Pokhara
      destination: { lat: 27.6869, lng: 86.7314 }, // Lukla
      speedKmh: 800,
      altitude: 0.08,
      model: '/models/aircraft/low-poly_airplane.glb',
      scale: 0.015,
      color: '#00ff00',
      loop: true,
      contrails: false,
      active: true
    };
    
    setTestFlights([testFlight1, testFlight2]);
    addTestResult('Flight system test initialized with 2 test flights');
  }, []);
  
  return (
    <>
      <FlightManager
        flights={testFlights}
        active={true}
        qualityLevel="medium"
        callbacks={{
          onStart: (flightId) => {
            addTestResult(`✈️ Flight ${flightId} started`);
          },
          onProgress: (flightId, progress) => {
            if (progress >= 0.25 && progress < 0.26) {
              addTestResult(`✈️ Flight ${flightId} 25% complete`);
            }
            if (progress >= 0.50 && progress < 0.51) {
              addTestResult(`✈️ Flight ${flightId} 50% complete`);
            }
            if (progress >= 0.75 && progress < 0.76) {
              addTestResult(`✈️ Flight ${flightId} 75% complete`);
            }
          },
          onComplete: (flightId) => {
            addTestResult(`🛬 Flight ${flightId} completed successfully`);
          }
        }}
      />
      
      {/* Test Results Display */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: 120,
          right: 20,
          width: 300,
          maxHeight: 400,
          background: 'rgba(0,0,0,0.9)',
          color: '#00ff00',
          padding: 12,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: 'monospace',
          overflow: 'auto',
          zIndex: 1000,
          border: '1px solid #333'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Flight System Test Log</h4>
          {testResults.map((result, i) => (
            <div key={i} style={{ marginBottom: 2 }}>
              {result}
            </div>
          ))}
          {testResults.length === 0 && (
            <div style={{ color: '#666' }}>Waiting for flight events...</div>
          )}
        </div>
      )}
    </>
  );
};

/**
 * Performance Test Component
 * Tests the system with multiple simultaneous flights
 */
interface PerformanceTestProps {
  flightCount?: number;
}

export const FlightSystemPerformanceTest: React.FC<PerformanceTestProps> = ({
  flightCount = 10
}) => {
  const [flights, setFlights] = useState<FlightConfiguration[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    frameTime: 0,
    activeFlights: 0
  });
  
  useEffect(() => {
    // Generate multiple test flights
    const testFlights: FlightConfiguration[] = [];
    const airports = [
      { lat: 27.7172, lng: 85.3240, name: 'Kathmandu' },
      { lat: 28.2096, lng: 83.9856, name: 'Pokhara' },
      { lat: 27.6869, lng: 86.7314, name: 'Lukla' },
      { lat: 28.0864, lng: 84.0658, name: 'Jomsom' },
      { lat: 27.3947, lng: 83.2142, name: 'Rupandehi' }
    ];
    
    for (let i = 0; i < flightCount; i++) {
      const origin = airports[Math.floor(Math.random() * airports.length)];
      let destination = airports[Math.floor(Math.random() * airports.length)];
      
      // Ensure different origin and destination
      while (destination === origin) {
        destination = airports[Math.floor(Math.random() * airports.length)];
      }
      
      testFlights.push({
        id: `perf-test-${i}`,
        origin,
        destination,
        speedKmh: 200 + Math.random() * 400,
        altitude: 0.05 + Math.random() * 0.1,
        model: '/models/aircraft/citation_cj.glb',
        scale: 0.01 + Math.random() * 0.01,
        color: `hsl(${(i * 137) % 360}, 70%, 50%)`,
        loop: Math.random() > 0.5,
        contrails: Math.random() > 0.3,
        active: true
      });
    }
    
    setFlights(testFlights);
  }, [flightCount]);
  
  // Simple FPS monitor
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        const frameTime = Math.round((currentTime - lastTime) / frameCount * 100) / 100;
        
        setPerformanceMetrics(prev => ({
          ...prev,
          fps,
          frameTime,
          activeFlights: flights.filter(f => f.active).length
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    const animationId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animationId);
  }, [flights]);
  
  return (
    <>
      <FlightManager
        flights={flights}
        active={true}
        qualityLevel="medium"
      />
      
      {/* Performance Metrics Display */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: 200,
          left: 20,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: 12,
          borderRadius: 6,
          fontSize: 12,
          zIndex: 1000
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Performance Test</h4>
          <div>FPS: {performanceMetrics.fps}</div>
          <div>Frame Time: {performanceMetrics.frameTime}ms</div>
          <div>Active Flights: {performanceMetrics.activeFlights}</div>
          <div>Total Flights: {flights.length}</div>
        </div>
      )}
    </>
  );
};