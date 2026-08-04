'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../core/GameEngine';
import { EngineConfig } from '../types/Core';

export interface GameEngineComponentProps {
  config?: Partial<EngineConfig>;
  onEngineReady?: (engine: GameEngine) => void;
  onError?: (error: Error) => void;
  className?: string;
  width?: number;
  height?: number;
}

export const GameEngineComponent: React.FC<GameEngineComponentProps> = ({
  config = {},
  onEngineReady,
  onError,
  className = '',
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const mountedRef = useRef(true);

  const initializeEngine = useCallback(async () => {
    if (!canvasRef.current || !mountedRef.current) {
      return;
    }

    try {
      const engine = GameEngine.getInstance();
      
      const engineConfig: EngineConfig = {
        canvas: canvasRef.current,
        webgpuEnabled: true,
        antialiasing: true,
        stencil: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        audioEnabled: true,
        physicsEnabled: true,
        debugMode: process.env.NODE_ENV === 'development',
        ...config
      };

      await engine.initialize(engineConfig);
      engine.start();
      
      engineRef.current = engine;
      
      if (onEngineReady && mountedRef.current) {
        onEngineReady(engine);
      }
    } catch (error) {
      if (onError && mountedRef.current) {
        onError(error as Error);
      }
    }
  }, [config, onEngineReady, onError]);

  useEffect(() => {
    mountedRef.current = true;
    initializeEngine();

    return () => {
      mountedRef.current = false;
      if (engineRef.current) {
        engineRef.current.shutdown();
        engineRef.current = null;
      }
    };
  }, [initializeEngine]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const engine = engineRef.current.getEngine();
        if (engine) {
          engine.resize();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      style={{
        display: 'block',
        outline: 'none',
        touchAction: 'none'
      }}
    />
  );
};