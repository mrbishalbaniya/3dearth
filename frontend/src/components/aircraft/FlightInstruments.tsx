'use client';

import React from 'react';
import { FlightData, EngineParameters, LandingGearState, BrakeSystemState } from '@/engine/physics/aircraft/types/AircraftTypes';

interface FlightInstrumentsProps {
  flightData: FlightData;
  engine: EngineParameters;
  landingGear: LandingGearState;
  brakeSystem: BrakeSystemState;
}

export const FlightInstruments: React.FC<FlightInstrumentsProps> = ({
  flightData,
  engine,
  landingGear,
  brakeSystem
}) => {
  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg font-mono text-sm">
      <div className="grid grid-cols-2 gap-4">
        {/* Flight Data */}
        <div>
          <h3 className="text-yellow-400 mb-2">Flight Data</h3>
          <div>Airspeed: {flightData.airspeed.toFixed(1)} m/s</div>
          <div>Altitude: {flightData.altitude.toFixed(0)} m</div>
          <div>VS: {flightData.verticalSpeed.toFixed(1)} m/s</div>
          <div>Heading: {flightData.heading.toFixed(0)}°</div>
          <div>Pitch: {flightData.pitch.toFixed(1)}°</div>
          <div>Roll: {flightData.roll.toFixed(1)}°</div>
          <div>AoA: {flightData.angleOfAttack.toFixed(1)}°</div>
          <div>G-Force: {flightData.gForce.toFixed(2)}g</div>
          <div>Fuel: {flightData.fuelRemaining.toFixed(0)} kg</div>
        </div>

        {/* Engine Data */}
        <div>
          <h3 className="text-green-400 mb-2">Engine</h3>
          <div>Thrust: {engine.thrust.toFixed(0)} N</div>
          <div>RPM: {engine.rpm.toFixed(0)}</div>
          <div>Fuel Flow: {engine.fuelFlow.toFixed(1)} kg/h</div>
          <div>Temp: {engine.temperature.toFixed(0)}°C</div>
          <div>Pressure: {engine.pressure.toFixed(2)} inHg</div>
          <div>Torque: {engine.torque.toFixed(0)} Nm</div>
        </div>

        {/* Systems Status */}
        <div>
          <h3 className="text-blue-400 mb-2">Systems</h3>
          <div>Gear: {landingGear.deployed ? 'DOWN' : 'UP'} 
            {landingGear.locked ? ' (LOCKED)' : ' (MOVING)'}
          </div>
          <div>On Ground: {landingGear.onGround ? 'YES' : 'NO'}</div>
          <div>Compression: {(landingGear.compressionRatio * 100).toFixed(0)}%</div>
          <div>Brake Temp: {brakeSystem.brakeTemperature.toFixed(0)}°C</div>
          <div>Brake Press: {brakeSystem.brakePressure.toFixed(1)} bar</div>
          <div>Antiskid: {brakeSystem.antiskid ? 'ON' : 'OFF'}</div>
        </div>

        {/* Warnings */}
        <div>
          <h3 className="text-red-400 mb-2">Warnings</h3>
          {flightData.stallWarning && (
            <div className="text-red-500 font-bold">STALL WARNING</div>
          )}
          {flightData.overspeedWarning && (
            <div className="text-red-500 font-bold">OVERSPEED</div>
          )}
          {brakeSystem.brakeTemperature > 300 && (
            <div className="text-orange-500">HOT BRAKES</div>
          )}
          {flightData.fuelRemaining < 50 && (
            <div className="text-yellow-500">LOW FUEL</div>
          )}
        </div>
      </div>

      {/* Ground Contact Indicator */}
      {flightData.groundContact && (
        <div className="mt-4 p-2 bg-green-800 rounded text-center">
          ON GROUND - Taxi Speed: {flightData.taxiSpeed.toFixed(1)} m/s
        </div>
      )}
    </div>
  );
};