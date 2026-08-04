'use client';

import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 as BabylonVector3 } from '@babylonjs/core/Maths/math.vector';

import { TerrainStreamingEngine, TerrainUtils } from '../../../engine/terrain';
import { useEarthStore } from '../store/earthStore';

interface TerrainIntegrationProps {
  enabled?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export const TerrainIntegration: React.FC<TerrainIntegrationProps> = ({
  enabled = true,
  quality = 'medium'
}) => {
  const { scene: threeScene, camera: threeCamera } = useThree();
  const babylonEngineRef = useRef<Engine | null>(null);
  const babylonSceneRef = useRef<Scene | null>(null);
  const terrainEngineRef = useRef<TerrainStreamingEngine | null>(null);
  const babylonCameraRef = useRef<UniversalCamera | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const setTerrainEnabled = useEarthStore((s) => s.setTerrainEnabled);
  const terrainEnabled = useEarthStore((s) => s.terrainEnabled);

  useEffect(() => {
    if (!enabled || !terrainEnabled) {
      return;
    }

    initializeTerrain();
    
    return () => {
      cleanup();
    };
  }, [enabled, terrainEnabled, quality]);

  useEffect(() => {
    if (!terrainEngineRef.current || !babylonCameraRef.current) return;

    // Sync Three.js camera with Babylon.js camera
    const syncCameras = () => {
      if (threeCamera && babylonCameraRef.current) {
        const pos = threeCamera.position;
        babylonCameraRef.current.position = new BabylonVector3(pos.x, pos.y, pos.z);
        
        const target = new THREE.Vector3();
        threeCamera.getWorldDirection(target);
        target.add(threeCamera.position);
        
        babylonCameraRef.current.setTarget(new BabylonVector3(target.x, target.y, target.z));
      }
    };

    const animate = () => {
      syncCameras();
      requestAnimationFrame(animate);
    };

    animate();
  }, [threeCamera]);

  const initializeTerrain = async () => {
    try {
      // Create hidden canvas for Babylon.js
      const canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
      canvasRef.current = canvas;

      // Initialize Babylon.js engine
      const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
      });
      babylonEngineRef.current = engine;

      // Create Babylon.js scene
      const babylonScene = new Scene(engine);
      babylonSceneRef.current = babylonScene;

      // Create Babylon.js camera
      const babylonCamera = new UniversalCamera('terrainCamera', new BabylonVector3(0, 1000, 0), babylonScene);
      babylonCameraRef.current = babylonCamera;

      // Initialize terrain streaming engine
      const terrainEngine = new TerrainStreamingEngine(babylonScene, babylonCamera);
      terrainEngineRef.current = terrainEngine;

      // Configure terrain based on quality
      const config = getTerrainConfigForQuality(quality);
      terrainEngine.setConfiguration(config);

      // Setup heightmap source
      const heightmapSource = TerrainUtils.createProceduralSource((x: number, z: number) => {
        return generateRealisticTerrain(x, z);
      });
      
      terrainEngine.setHeightmapSource(heightmapSource);

      // Initialize
      await terrainEngine.initialize();

      // Start render loop
      engine.runRenderLoop(() => {
        if (babylonScene && !babylonScene.isDisposed) {
          babylonScene.render();
        }
      });

      console.log('Terrain integration initialized');
      
    } catch (error) {
      console.error('Failed to initialize terrain integration:', error);
    }
  };

  const getTerrainConfigForQuality = (quality: string) => {
    const baseConfig = TerrainUtils.createDefaultConfig();
    
    switch (quality) {
      case 'low':
        return {
          ...baseConfig,
          chunkSize: 1024,
          heightmapResolution: 33,
          maxLOD: 3,
          lodDistance: [1000, 2000, 4000],
          maxChunksInMemory: 25
        };
      
      case 'medium':
        return {
          ...baseConfig,
          chunkSize: 512,
          heightmapResolution: 65,
          maxLOD: 4,
          lodDistance: [500, 1000, 2000, 4000],
          maxChunksInMemory: 50
        };
      
      case 'high':
        return {
          ...baseConfig,
          chunkSize: 256,
          heightmapResolution: 129,
          maxLOD: 6,
          lodDistance: [200, 500, 1000, 2000, 4000, 8000],
          maxChunksInMemory: 100
        };
      
      default:
        return baseConfig;
    }
  };

  const generateRealisticTerrain = (x: number, z: number): number => {
    const earthRadius = 6371000; // Earth radius in meters
    
    // Convert to normalized coordinates
    const normalizedX = x / earthRadius;
    const normalizedZ = z / earthRadius;
    
    let height = 0;
    
    // Continental shelf
    const continentalBase = Math.sin(normalizedX * Math.PI * 2) * Math.cos(normalizedZ * Math.PI * 2) * 2000;
    height += Math.max(-4000, continentalBase);
    
    // Mountain ranges
    const mountainNoise = 
      Math.sin(normalizedX * 50) * Math.cos(normalizedZ * 30) * 3000 +
      Math.sin(normalizedX * 25 + normalizedZ * 15) * 1500 +
      Math.sin(normalizedX * 12.5 + normalizedZ * 7.5) * 750;
    
    if (continentalBase > -1000) { // Only add mountains on land
      height += Math.max(0, mountainNoise * Math.max(0, (continentalBase + 1000) / 2000));
    }
    
    // Rolling hills
    height += Math.sin(normalizedX * 200) * Math.cos(normalizedZ * 150) * 200;
    height += Math.sin(normalizedX * 100 + normalizedZ * 80) * 100;
    
    // Small scale features
    height += Math.sin(normalizedX * 500) * Math.cos(normalizedZ * 600) * 50;
    
    // Ensure realistic bounds
    return Math.max(-11000, Math.min(8848, height)); // Mariana Trench to Everest
  };

  const cleanup = () => {
    if (terrainEngineRef.current) {
      terrainEngineRef.current.dispose();
      terrainEngineRef.current = null;
    }
    
    if (babylonSceneRef.current) {
      babylonSceneRef.current.dispose();
      babylonSceneRef.current = null;
    }
    
    if (babylonEngineRef.current) {
      babylonEngineRef.current.dispose();
      babylonEngineRef.current = null;
    }
    
    if (canvasRef.current && document.body.contains(canvasRef.current)) {
      document.body.removeChild(canvasRef.current);
      canvasRef.current = null;
    }
  };

  // This component doesn't render anything in the Three.js scene
  // It manages terrain in a separate Babylon.js context
  return null;
};