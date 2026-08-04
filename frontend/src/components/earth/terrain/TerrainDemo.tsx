'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

import { TerrainStreamingEngine, TerrainUtils } from '../../../engine/terrain';

export const TerrainDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const terrainEngineRef = useRef<TerrainStreamingEngine | null>(null);
  const cameraRef = useRef<FreeCamera | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 1000, z: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    initializeBabylonScene();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !terrainEngineRef.current) return;

    const interval = setInterval(() => {
      updateStats();
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoaded]);

  const initializeBabylonScene = async () => {
    try {
      // Create Babylon.js engine
      const engine = new Engine(canvasRef.current!, true);
      engineRef.current = engine;

      // Create scene
      const scene = new Scene(engine);
      sceneRef.current = scene;

      // Setup camera
      const camera = new FreeCamera('camera', new Vector3(0, 1000, -2000), scene);
      camera.setTarget(Vector3.Zero());
      camera.attachToCanvas(canvasRef.current!, true);
      camera.speed = 50;
      cameraRef.current = camera;

      // Setup lighting
      const hemisphericLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
      hemisphericLight.intensity = 0.6;

      const directionalLight = new DirectionalLight('dirLight', new Vector3(-1, -1, -1), scene);
      directionalLight.intensity = 0.8;
      directionalLight.position = new Vector3(1000, 2000, 1000);

      // Setup shadows
      const shadowGenerator = new ShadowGenerator(2048, directionalLight);
      shadowGenerator.useBlurExponentialShadowMap = true;

      // Create terrain streaming engine
      const terrainEngine = new TerrainStreamingEngine(scene, camera);
      terrainEngineRef.current = terrainEngine;

      // Configure terrain
      const config = TerrainUtils.createDefaultConfig();
      config.chunkSize = 512;
      config.heightScale = 50;
      config.maxLOD = 4;
      config.lodDistance = [300, 600, 1200, 2400];
      config.maxChunksInMemory = 50;
      
      terrainEngine.setConfiguration(config);

      // Setup procedural heightmap
      const heightmapSource = TerrainUtils.createProceduralSource((x: number, z: number) => {
        return generateTerrainHeight(x, z);
      });
      
      terrainEngine.setHeightmapSource(heightmapSource);

      // Add some vegetation templates
      createVegetationTemplates(scene, terrainEngine);

      // Initialize terrain engine
      await terrainEngine.initialize();

      // Setup camera controls
      setupCameraControls(camera);

      // Start render loop
      engine.runRenderLoop(() => {
        if (scene && !scene.isDisposed) {
          scene.render();
          updateCameraPosition();
        }
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        engine.resize();
      });

      setIsLoaded(true);
      
    } catch (error) {
      console.error('Failed to initialize terrain demo:', error);
    }
  };

  const generateTerrainHeight = (x: number, z: number): number => {
    const scale = 0.001;
    let height = 0;
    let amplitude = 100;
    let frequency = scale;

    // Multiple octaves of noise
    for (let i = 0; i < 5; i++) {
      height += Math.sin(x * frequency) * Math.cos(z * frequency) * amplitude;
      height += Math.sin(x * frequency * 2.1 + z * frequency * 0.3) * amplitude * 0.5;
      
      frequency *= 2.0;
      amplitude *= 0.5;
    }

    // Add some larger features
    height += Math.sin(x * 0.0001) * Math.cos(z * 0.0001) * 500;
    
    // Clamp to reasonable values
    return Math.max(0, height);
  };

  const createVegetationTemplates = (scene: Scene, terrainEngine: TerrainStreamingEngine) => {
    // Create simple tree template
    const treeMesh = MeshBuilder.CreateCylinder('tree', {
      height: 10,
      diameterTop: 2,
      diameterBottom: 1
    }, scene);
    
    const treeMaterial = new StandardMaterial('treeMaterial', scene);
    treeMaterial.diffuseColor = new Color3(0.4, 0.2, 0.1);
    treeMesh.material = treeMaterial;

    // Create grass template
    const grassMesh = MeshBuilder.CreateBox('grass', {
      width: 0.5,
      height: 2,
      depth: 0.1
    }, scene);
    
    const grassMaterial = new StandardMaterial('grassMaterial', scene);
    grassMaterial.diffuseColor = new Color3(0.2, 0.6, 0.2);
    grassMesh.material = grassMaterial;

    // Register vegetation types
    terrainEngine.addVegetationType('tree', treeMesh, 500);
    terrainEngine.addVegetationType('grass', grassMesh, 2000);

    // Generate initial vegetation
    setTimeout(() => {
      terrainEngine.generateVegetation('tree', 0.01);
      terrainEngine.generateVegetation('grass', 0.05);
    }, 2000);
  };

  const setupCameraControls = (camera: FreeCamera) => {
    const canvas = canvasRef.current!;
    
    // WASD movement
    const keys: { [key: string]: boolean } = {};
    
    window.addEventListener('keydown', (event) => {
      keys[event.code] = true;
    });
    
    window.addEventListener('keyup', (event) => {
      keys[event.code] = false;
    });

    // Camera movement in render loop
    sceneRef.current!.registerBeforeRender(() => {
      const speed = 20;
      
      if (keys['KeyW']) camera.position.addInPlace(camera.getDirection(Vector3.Forward()).scale(speed));
      if (keys['KeyS']) camera.position.addInPlace(camera.getDirection(Vector3.Backward()).scale(speed));
      if (keys['KeyA']) camera.position.addInPlace(camera.getDirection(Vector3.Left()).scale(speed));
      if (keys['KeyD']) camera.position.addInPlace(camera.getDirection(Vector3.Right()).scale(speed));
      if (keys['KeyQ']) camera.position.y -= speed;
      if (keys['KeyE']) camera.position.y += speed;
    });
  };

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    
    const pos = cameraRef.current.position;
    setCameraPosition({
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      z: Math.round(pos.z)
    });
  };

  const updateStats = () => {
    if (!terrainEngineRef.current) return;
    
    const statistics = terrainEngineRef.current.getStatistics();
    setStats(statistics);
  };

  const cleanup = () => {
    if (terrainEngineRef.current) {
      terrainEngineRef.current.dispose();
    }
    
    if (sceneRef.current) {
      sceneRef.current.dispose();
    }
    
    if (engineRef.current) {
      engineRef.current.dispose();
    }
  };

  const resetCamera = () => {
    if (!cameraRef.current) return;
    
    cameraRef.current.position = new Vector3(0, 1000, -2000);
    cameraRef.current.setTarget(Vector3.Zero());
  };

  const toggleTerrain = () => {
    if (!terrainEngineRef.current) return;
    
    const isEnabled = terrainEngineRef.current.isEngineEnabled();
    terrainEngineRef.current.setEnabled(!isEnabled);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ outline: 'none' }}
      />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg min-w-64">
        <h2 className="text-lg font-bold mb-2">Terrain Streaming Demo</h2>
        
        <div className="space-y-2 text-sm">
          <div>
            <strong>Camera Position:</strong>
            <div>X: {cameraPosition.x}</div>
            <div>Y: {cameraPosition.y}</div>
            <div>Z: {cameraPosition.z}</div>
          </div>
          
          {stats && (
            <div>
              <strong>Terrain Stats:</strong>
              <div>Active Chunks: {stats.chunkManager.activeChunks}</div>
              <div>Loading Chunks: {stats.chunkManager.loadingChunks}</div>
              <div>Visible Chunks: {stats.visibleChunks}</div>
              <div>Memory Usage: {(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB</div>
              <div>QuadTree Nodes: {stats.quadTree.totalNodes}</div>
            </div>
          )}
          
          <div>
            <strong>Controls:</strong>
            <div>WASD - Move</div>
            <div>Q/E - Up/Down</div>
            <div>Mouse - Look Around</div>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <button
            onClick={resetCamera}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Reset Camera
          </button>
          
          <button
            onClick={toggleTerrain}
            className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            Toggle Terrain
          </button>
        </div>
      </div>
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-xl">Loading Terrain...</div>
        </div>
      )}
    </div>
  );
};