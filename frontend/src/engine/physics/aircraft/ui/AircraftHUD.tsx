'use client';

import React from 'react';
import { FlightData, EngineParameters, LandingGearState, FlapsState, FuelSystem } from '../types/AircraftTypes';

interface AircraftHUDProps {
  flightData: FlightData;
  engine: EngineParameters;
  landingGear: LandingGearState;
  flaps: FlapsState;
  fuel: FuelSystem;
}

export const AircraftHUD: React.FC<AircraftHUDProps> = ({
  flightData,
  engine,
  landingGear,
  flaps,
  fuel
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none text-white font-mono text-sm">
      {/* Primary Flight Display */}
      <div className="absolute top-4 left-4 bg-black/70 rounded p-4 min-w-64">
        <h3 className="text-lg font-bold mb-2 text-cyan-400">Primary Flight Display</h3>
        
        {/* Airspeed and Altitude */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-gray-300">Airspeed</div>
            <div className="text-2xl font-bold text-green-400">{Math.round(flightData.airspeed * 1.944)} kts</div>
            <div className="text-xs text-gray-400">{Math.round(flightData.airspeed)} m/s</div>
          </div>
          <div>
            <div className="text-gray-300">Altitude</div>
            <div className="text-2xl font-bold text-green-400">{Math.round(flightData.altitude * 3.281)} ft</div>
            <div className="text-xs text-gray-400">{Math.round(flightData.altitude)} m</div>
          </div>
        </div>

        {/* Attitude */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <div className="text-gray-300">Heading</div>
            <div className="text-lg font-bold text-yellow-400">{Math.round(flightData.heading).toString().padStart(3, '0')}°</div>
          </div>
          <div>
            <div className="text-gray-300">Pitch</div>
            <div className="text-lg font-bold text-yellow-400">{flightData.pitch.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-gray-300">Roll</div>
            <div className="text-lg font-bold text-yellow-400">{flightData.roll.toFixed(1)}°</div>
          </div>
        </div>

        {/* Vertical Speed and G-Force */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-300">V/S</div>
            <div className="text-lg font-bold text-blue-400">{Math.round(flightData.verticalSpeed * 196.85)} fpm</div>
          </div>
          <div>
            <div className="text-gray-300">G-Force</div>
            <div className="text-lg font-bold text-purple-400">{flightData.gForce.toFixed(2)} g</div>
          </div>
        </div>
      </div>

      {/* Engine Display */}
      <div className="absolute top-4 right-4 bg-black/70 rounded p-4 min-w-48">
        <h3 className="text-lg font-bold mb-2 text-orange-400">Engine</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-300">RPM:</span>
            <span className="font-bold text-orange-400">{Math.round(engine.rpm)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Thrust:</span>
            <span className="font-bold text-orange-400">{Math.round(engine.thrust)} N</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Fuel Flow:</span>
            <span className="font-bold text-orange-400">{engine.fuelFlow.toFixed(1)} L/h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Temp:</span>
            <span className={`font-bold ${engine.temperature > 120 ? 'text-red-400' : 'text-orange-400'}`}>
              {Math.round(engine.temperature)}°C
            </span>
          </div>
        </div>
      </div>

      {/* Systems Status */}
      <div className="absolute bottom-4 left-4 bg-black/70 rounded p-4 min-w-64">
        <h3 className="text-lg font-bold mb-2 text-cyan-400">Systems</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-300 mb-2">Landing Gear</div>
            <div className={`flex items-center space-x-2 ${landingGear.deployed ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${landingGear.deployed ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="font-bold">{landingGear.deployed ? 'DOWN' : 'UP'}</span>
            </div>
            {landingGear.onGround && (
              <div className="text-xs text-yellow-400 mt-1">ON GROUND</div>
            )}
          </div>

          <div>
            <div className="text-gray-300 mb-2">Flaps</div>
            <div className="text-blue-400 font-bold">{Math.round(flaps.angle)}°</div>
            <div className="text-xs text-gray-400">Pos: {Math.round(flaps.position * 100)}%</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-gray-300 mb-2">Fuel</div>
          <div className="flex justify-between items-center">
            <span className="text-yellow-400 font-bold">{Math.round(fuel.remaining)} L</span>
            <span className="text-xs text-gray-400">
              ({Math.round((fuel.remaining / fuel.totalCapacity) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div 
              className={`h-2 rounded-full transition-all ${
                fuel.remaining / fuel.totalCapacity > 0.2 ? 'bg-green-400' : 
                fuel.remaining / fuel.totalCapacity > 0.1 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${(fuel.remaining / fuel.totalCapacity) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      <div className="absolute bottom-4 right-4 space-y-2">
        {flightData.stallWarning && (
          <div className="bg-red-600/90 text-white px-4 py-2 rounded font-bold animate-pulse">
            ⚠️ STALL WARNING
          </div>
        )}
        {flightData.overspeedWarning && (
          <div className="bg-red-600/90 text-white px-4 py-2 rounded font-bold animate-pulse">
            ⚠️ OVERSPEED
          </div>
        )}
        {fuel.remaining / fuel.totalCapacity < 0.1 && (
          <div className="bg-yellow-600/90 text-white px-4 py-2 rounded font-bold">
            ⚠️ LOW FUEL
          </div>
        )}
      </div>

      {/* Artificial Horizon (Mini) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-b from-blue-500 to-blue-700 border-2 border-white">
          {/* Horizon Line */}
          <div 
            className="absolute w-full h-full"
            style={{ 
              transform: `rotate(${-flightData.roll}deg) translateY(${flightData.pitch * 2}px)` 
            }}
          >
            <div className="absolute top-1/2 w-full h-0.5 bg-white transform -translate-y-0.5"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white transform -translate-x-1/2 -translate-y-0.5"></div>
          </div>
          {/* Aircraft Symbol */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-0.5 bg-yellow-400"></div>
            <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-yellow-400 transform -translate-x-1/2 -translate-y-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};