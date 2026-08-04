'use client';

import { useEffect, useRef, useState } from 'react';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WorldEngine } from '@/engine/world';

interface WorldGameCanvasProps {
  className?: string;
}

export function WorldGameCanvas({ className = '' }: WorldGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const engine = new WorldEngine({
          canvas,
          camera: {
            initialPosition: new Vector3(0, 260, -540),
            initialTarget: new Vector3(0, 24, 0),
            speed: 1.25,
            far: 60000,
          },
          terrain: {
            viewDistance: 6,
            chunkSize: 256,
            chunkResolution: 48,
            maxHeight: 220,
          },
          environment: {
            hdrUrl: '',
            exposure: 1.05,
            contrast: 1.12,
          },
          debug: {
            enabled: process.env.NODE_ENV === 'development',
            updateIntervalMs: 250,
          },
        });

        await engine.initialize();

        if (cancelled) {
          engine.dispose();
          return;
        }

        engine.start();
        engineRef.current = engine;
        setIsReady(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to initialize world engine';
          // Surface root cause in dev tools for fast diagnosis.
          console.error('World engine initialization failed:', err);
          setError(message);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        tabIndex={0}
        aria-label="3D World Engine"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          outline: 'none',
          touchAction: 'none',
        }}
      />

      {!isReady && !error && (
        <div className="world-engine-loading">Initializing world engine...</div>
      )}

      {error && <div className="world-engine-error">World engine error: {error}</div>}
    </>
  );
}
