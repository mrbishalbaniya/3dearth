'use client';

import React, { useState, useEffect } from 'react';
import { ControlSurfaces } from '../types/AircraftTypes';

interface AircraftControlsProps {
  controls: ControlSurfaces;
  onControlChange: (controls: Partial<ControlSurfaces>) => void;
  keyboardControls?: boolean;
}

export const AircraftControls: React.FC<AircraftControlsProps> = ({
  controls,
  onControlChange,
  keyboardControls = true
}) => {
  const [keys, setKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!keyboardControls) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.key.toLowerCase()));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardControls]);

  useEffect(() => {
    if (!keyboardControls) return;

    const updateControls = () => {
      const newControls: Partial<ControlSurfaces> = {};

      // Elevator (Pitch) - W/S or Arrow Up/Down
      if (keys.has('w') || keys.has('arrowup')) {
        newControls.elevator = Math.min(1, (newControls.elevator || controls.elevator) + 0.02);
      } else if (keys.has('s') || keys.has('arrowdown')) {
        newControls.elevator = Math.max(-1, (newControls.elevator || controls.elevator) - 0.02);
      } else {
        newControls.elevator = controls.elevator * 0.95; // Gradual return to center
      }

      // Ailerons (Roll) - A/D or Arrow Left/Right
      if (keys.has('a') || keys.has('arrowleft')) {
        newControls.ailerons = Math.max(-1, (newControls.ailerons || controls.ailerons) - 0.02);
      } else if (keys.has('d') || keys.has('arrowright')) {
        newControls.ailerons = Math.min(1, (newControls.ailerons || controls.ailerons) + 0.02);
      } else {
        newControls.ailerons = controls.ailerons * 0.95; // Gradual return to center
      }

      // Rudder - Q/E
      if (keys.has('q')) {
        newControls.rudder = Math.max(-1, (newControls.rudder || controls.rudder) - 0.02);
      } else if (keys.has('e')) {
        newControls.rudder = Math.min(1, (newControls.rudder || controls.rudder) + 0.02);
      } else {
        newControls.rudder = controls.rudder * 0.98; // Gradual return to center
      }

      // Throttle - Shift/Ctrl
      if (keys.has('shift')) {
        newControls.throttle = Math.min(1, (newControls.throttle || controls.throttle) + 0.01);
      } else if (keys.has('control')) {
        newControls.throttle = Math.max(0, (newControls.throttle || controls.throttle) - 0.01);
      }

      // Brakes - Space
      if (keys.has(' ')) {
        newControls.brakes = 1;
      } else {
        newControls.brakes = 0;
      }

      onControlChange(newControls);
    };

    const interval = setInterval(updateControls, 16); // ~60fps
    return () => clearInterval(interval);
  }, [keys, controls, onControlChange, keyboardControls]);

  const handleSliderChange = (control: keyof ControlSurfaces, value: number) => {
    onControlChange({ [control]: value });
  };

  const handleToggle = (control: keyof ControlSurfaces) => {
    onControlChange({ [control]: !controls[control] });
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-4 min-w-96">
      <h3 className="text-white font-bold mb-4">Aircraft Controls</h3>
      
      {/* Primary Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-white text-sm mb-1">Elevator</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={controls.elevator}
            onChange={(e) => handleSliderChange('elevator', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 text-center">{controls.elevator.toFixed(2)}</div>
        </div>
        
        <div>
          <label className="block text-white text-sm mb-1">Ailerons</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={controls.ailerons}
            onChange={(e) => handleSliderChange('ailerons', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 text-center">{controls.ailerons.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-white text-sm mb-1">Rudder</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={controls.rudder}
            onChange={(e) => handleSliderChange('rudder', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 text-center">{controls.rudder.toFixed(2)}</div>
        </div>
        
        <div>
          <label className="block text-white text-sm mb-1">Throttle</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controls.throttle}
            onChange={(e) => handleSliderChange('throttle', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 text-center">{(controls.throttle * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-white text-sm mb-1">Flaps</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={controls.flaps}
            onChange={(e) => handleSliderChange('flaps', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 text-center">{(controls.flaps * 100).toFixed(0)}%</div>
        </div>
        
        <div>
          <label className="block text-white text-sm mb-1">Brakes</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controls.brakes}
            onChange={(e) => handleSliderChange('brakes', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 text-center">{(controls.brakes * 100).toFixed(0)}%</div>
        </div>

        <div className="flex flex-col justify-center">
          <label className="block text-white text-sm mb-1">Landing Gear</label>
          <button
            onClick={() => handleToggle('landingGear')}
            className={`px-3 py-1 rounded text-sm font-bold ${
              controls.landingGear 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}
          >
            {controls.landingGear ? 'DOWN' : 'UP'}
          </button>
        </div>
      </div>

      {/* Keyboard Help */}
      {keyboardControls && (
        <div className="text-xs text-gray-400 mt-4 border-t border-gray-600 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>WASD / Arrows: Pitch & Roll</div>
            <div>Q/E: Rudder</div>
            <div>Shift/Ctrl: Throttle</div>
            <div>Space: Brakes</div>
          </div>
        </div>
      )}
    </div>
  );
};