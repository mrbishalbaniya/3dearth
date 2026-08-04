'use client';

import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from '@/engine/core/GameEngine';
import { GameEngineComponent } from '@/engine/components/GameEngineComponent';
import { BasicDemo } from '@/engine/demo/BasicDemo';
import { PerformanceMonitor, PerformanceMetrics } from '@/engine/performance/PerformanceMonitor';

export default function EngineDemoPage() {
  const [engineReady, setEngineReady] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  
  const demoRef = useRef<BasicDemo | null>(null);
  const performanceMonitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (engineReady) {
      interval = setInterval(() => {
        const currentMetrics = performanceMonitor.getCurrentMetrics();
        setMetrics(currentMetrics);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [engineReady, performanceMonitor]);

  const handleEngineReady = async (engine: GameEngine) => {
    try {
      setEngineReady(true);
      setError(null);
      
      console.log('Engine ready:', engine);
    } catch (err) {
      setError(`Engine initialization failed: ${err}`);
    }
  };

  const handleEngineError = (err: Error) => {
    setError(`Engine error: ${err.message}`);
    setEngineReady(false);
  };

  const startDemo = async () => {
    if (!engineReady) {
      setError('Engine not ready');
      return;
    }

    try {
      const demo = new BasicDemo();
      await demo.initialize();
      demo.start();
      
      demoRef.current = demo;
      setDemoRunning(true);
      setError(null);
      
      console.log('Demo started');
    } catch (err) {
      setError(`Demo initialization failed: ${err}`);
    }
  };

  const stopDemo = () => {
    if (demoRef.current) {
      demoRef.current.stop();
      demoRef.current.destroy();
      demoRef.current = null;
      setDemoRunning(false);
      
      console.log('Demo stopped');
    }
  };

  const resetEngine = () => {
    stopDemo();
    
    const engine = GameEngine.getInstance();
    engine.shutdown();
    
    setEngineReady(false);
    setDemoRunning(false);
    setError(null);
    setMetrics(null);
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Babylon.js Game Engine Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Engine Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Engine Viewport</h2>
              
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <GameEngineComponent
                  onEngineReady={handleEngineReady}
                  onError={handleEngineError}
                  className="w-full h-full"
                  config={{
                    webgpuEnabled: true,
                    antialiasing: true,
                    debugMode: true
                  }}
                />
                
                {!engineReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p>Initializing Engine...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-900 border border-red-600 rounded-lg">
                  <h3 className="font-semibold text-red-300 mb-2">Error</h3>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Engine Status */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Engine Status</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Engine:</span>
                    <span className={`font-medium ${engineReady ? 'text-green-400' : 'text-red-400'}`}>
                      {engineReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Demo:</span>
                    <span className={`font-medium ${demoRunning ? 'text-green-400' : 'text-gray-400'}`}>
                      {demoRunning ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Demo Controls */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Demo Controls</h3>
                
                <div className="space-y-2">
                  <button
                    onClick={startDemo}
                    disabled={!engineReady || demoRunning}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                  >
                    Start Demo
                  </button>
                  
                  <button
                    onClick={stopDemo}
                    disabled={!demoRunning}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                  >
                    Stop Demo
                  </button>
                  
                  <button
                    onClick={resetEngine}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Reset Engine
                  </button>
                </div>
              </div>
              
              {/* Performance Metrics */}
              {metrics && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Performance</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>FPS:</span>
                      <span className={`font-medium ${
                        metrics.fps >= 60 ? 'text-green-400' : 
                        metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {Math.round(metrics.fps)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Frame Time:</span>
                      <span className="font-medium text-gray-300">
                        {metrics.frameTime.toFixed(2)}ms
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-medium text-gray-300">
                        {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Draw Calls:</span>
                      <span className="font-medium text-gray-300">
                        {metrics.drawCalls}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Triangles:</span>
                      <span className="font-medium text-gray-300">
                        {metrics.triangles.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Instructions */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                
                <div className="text-sm space-y-2 text-gray-300">
                  <p>1. Wait for the engine to initialize</p>
                  <p>2. Click "Start Demo" to load the scene</p>
                  <p>3. Use mouse to look around</p>
                  <p>4. WASD keys to move camera</p>
                  <p>5. Watch the animated objects</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}