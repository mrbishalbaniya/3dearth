"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useMemo, useState } from "react";
import { Group, PlaneGeometry, MeshStandardMaterial, Mesh, TextureLoader, BufferGeometry } from "three";
import { FlightCorridorEngine, TileRequest } from "./FlightCorridorEngine";
import { TileStreamingManager } from "./TileStreamingManager";
import { FlightPathVisualizer } from "./FlightPathVisualizer";
import { useEarthStore } from "../store/earthStore";
import { useGameStore } from "@/components/game/store/gameStore";

/**
 * FlightCorridorTerrain - Renders ONLY terrain along flight corridor
 * 
 * DOES NOT render the entire Earth.
 * Streams tiles dynamically based on aircraft position.
 */
export function FlightCorridorTerrain() {
  const groupRef = useRef<Group>(null);
  const engineRef = useRef<FlightCorridorEngine | null>(null);
  const streamingManagerRef = useRef<TileStreamingManager | null>(null);
  const tilesRef = useRef<Map<string, Mesh>>(new Map());
  
  const { scene } = useThree();
  
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  
  const flightState = useGameStore((s) => s.flightState);

  // Initialize engines
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new FlightCorridorEngine(512, 20000); // 512MB budget, 20km radius
      
      // Expose globally for debug panel
      if (typeof window !== "undefined") {
        (window as any).__flightCorridor = {
          engine: engineRef.current,
          manager: null,
        };
      }
    }
    
    if (!streamingManagerRef.current) {
      streamingManagerRef.current = new TileStreamingManager({
        maxConcurrentRequests: 6,
        maxRetries: 3,
        prefetchDistance: 50000, // 50km
      });
      
      // Expose globally for debug panel
      if (typeof window !== "undefined" && (window as any).__flightCorridor) {
        (window as any).__flightCorridor.manager = streamingManagerRef.current;
      }
    }

    return () => {
      // Cleanup
      if (streamingManagerRef.current) {
        streamingManagerRef.current.abortAll();
        streamingManagerRef.current.clearMemoryCache();
      }
      
      // Clear global refs
      if (typeof window !== "undefined") {
        delete (window as any).__flightCorridor;
      }
    };
  }, []);

  // Initialize flight corridor when flight starts
  useEffect(() => {
    if (!flightState || !engineRef.current) return;

    // For Nepal demo: Lukla to Kathmandu
    const departure = { lat: 27.6883, lng: 86.7314, icao: "VNLK" }; // Lukla
    const destination = { lat: 27.7172, lng: 85.3240, icao: "VNKT" }; // Kathmandu

    engineRef.current.initializeCorridor(
      departure.lat,
      departure.lng,
      destination.lat,
      destination.lng,
      departure.icao,
      destination.icao,
      3000, // 3km cruise altitude
      20000  // 20km streaming radius
    );

    console.log("[FlightCorridor] Initialized corridor:", {
      from: departure.icao,
      to: destination.icao,
      distance: engineRef.current.getCorridor()?.totalDistanceNm,
    });
  }, [flightState]);

  // Main streaming loop
  useFrame(() => {
    if (!engineRef.current || !streamingManagerRef.current || !flightState) return;

    const engine = engineRef.current;
    const streaming = streamingManagerRef.current;

    // Update aircraft position in corridor engine
    engine.updateAircraftPosition(focusLat, focusLng, altitudeM);

    const state = engine.getState();

    // Load new tiles
    if (state.loadQueue.length > 0) {
      console.log(`[FlightCorridor] Loading ${state.loadQueue.length} tiles...`);
      
      const loadPromise = streaming.loadTiles(state.loadQueue);
      
      loadPromise.then(loadedTiles => {
        console.log(`[FlightCorridor] Loaded ${loadedTiles.size} tiles`);
        
        for (const [key, tileData] of loadedTiles) {
          // Create tile mesh
          const mesh = createTileMesh(tileData);
          if (mesh && groupRef.current) {
            groupRef.current.add(mesh);
            tilesRef.current.set(key, mesh);
            engine.markTileLoaded(key, tileData.sizeBytes);
            console.log(`[FlightCorridor] Added tile ${key} at position`, mesh.position);
          } else {
            console.error(`[FlightCorridor] Failed to create mesh for tile ${key}`);
          }
        }
      }).catch(err => {
        console.error("[FlightCorridor] Tile loading failed:", err);
      });

      // Clear load queue
      state.loadQueue = [];
    }

    // Unload tiles outside corridor
    if (state.unloadQueue.length > 0) {
      console.log(`[FlightCorridor] Unloading ${state.unloadQueue.length} tiles...`);
      
      for (const key of state.unloadQueue) {
        const mesh = tilesRef.current.get(key);
        if (mesh && groupRef.current) {
          groupRef.current.remove(mesh);
          mesh.geometry.dispose();
          
          // Handle material disposal
          const disposeMaterial = (mat: any) => {
            if (mat.map && typeof mat.map.dispose === 'function') {
              mat.map.dispose();
            }
            if (typeof mat.dispose === 'function') {
              mat.dispose();
            }
          };
          
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(disposeMaterial);
          } else {
            disposeMaterial(mesh.material);
          }
          
          tilesRef.current.delete(key);
          engine.unloadTile(key);
        }
      }

      // Clear unload queue
      state.unloadQueue = [];
    }

    // Memory management - evict LRU if exceeding budget
    if (engine.isMemoryExceeded()) {
      console.warn("[FlightCorridor] Memory budget exceeded, evicting LRU tiles");
      engine.evictLRU(state.maxMemoryMB * 0.8); // Evict to 80% budget
    }
  });

  // Fallback terrain mesh (visible immediately) with some elevation variation
  const fallbackTerrain = useMemo(() => {
    const geometry = new PlaneGeometry(100000, 100000, 128, 128);
    const positions = geometry.attributes.position.array;
    
    // Add some simple mountain-like elevation
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 1];
      
      // Create wave-like mountains
      const elevation = 
        Math.sin(x * 0.00005) * 2000 +
        Math.cos(z * 0.00004) * 1500 +
        Math.sin(x * 0.0001 + z * 0.0001) * 800;
      
      positions[i + 2] = 3000 + elevation; // Base at 3000m
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }, []);

  const fallbackMesh = useMemo(() => (
    <mesh
      geometry={fallbackTerrain}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial 
        color="#7a6a55"
        roughness={0.95}
        metalness={0.05}
        wireframe={false}
      />
    </mesh>
  ), [fallbackTerrain]);

  return (
    <>
      {/* Fallback ground plane with mountains (appears immediately while tiles load) */}
      {fallbackMesh}
      
      {/* Streaming tile meshes */}
      <group ref={groupRef} />

      {/* Flight path visualization */}
      <FlightPathVisualizer corridor={engineRef.current?.getCorridor() || null} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50000, 100000, 50000]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50000}
        shadow-camera-right={50000}
        shadow-camera-top={50000}
        shadow-camera-bottom={-50000}
        shadow-camera-near={1}
        shadow-camera-far={200000}
      />
      
      {/* Sky */}
      <color attach="background" args={["#87CEEB"]} />
      <fog attach="fog" args={["#a0c5e8", 20000, 150000]} />
    </>
  );
}

/**
 * Create mesh from tile data
 */
function createTileMesh(tileData: any): Mesh | null {
  try {
    // Parse tile key to get coordinates
    const [zoom, x, z] = tileData.key.split("/").map(Number);
    
    // Convert tile coordinates to world position
    const tileSize = 1000; // meters
    const worldX = (x - Math.pow(2, zoom - 1)) * tileSize;
    const worldZ = (z - Math.pow(2, zoom - 1)) * tileSize;

    // Create geometry
    const geometry = new PlaneGeometry(tileSize, tileSize, 63, 63);
    
    // Apply elevation if available
    if (tileData.elevation) {
      const positions = geometry.attributes.position.array;
      const elevationData = tileData.elevation;
      const resolution = 256; // Must match mock generator
      
      // Map geometry vertices to elevation data
      const segments = 63; // PlaneGeometry segments
      for (let iy = 0; iy <= segments; iy++) {
        for (let ix = 0; ix <= segments; ix++) {
          const vertIdx = (iy * (segments + 1) + ix) * 3;
          
          // Map to elevation data coords
          const ex = Math.floor((ix / segments) * (resolution - 1));
          const ey = Math.floor((iy / segments) * (resolution - 1));
          const elevIdx = ey * resolution + ex;
          
          if (elevIdx < elevationData.length) {
            positions[vertIdx + 2] = elevationData[elevIdx];
          }
        }
      }
      
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    // Create material
    const material = new MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
    });

    // Apply satellite texture if available (ImageBitmap -> Texture)
    if (tileData.satellite instanceof ImageBitmap) {
      const canvas = document.createElement('canvas');
      canvas.width = tileData.satellite.width;
      canvas.height = tileData.satellite.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(tileData.satellite, 0, 0);
        const texture = new TextureLoader().load(canvas.toDataURL());
        material.map = texture;
        material.needsUpdate = true;
      }
    }

    // Create mesh
    const mesh = new Mesh(geometry, material);
    mesh.position.set(worldX, 0, worldZ);
    mesh.rotation.x = -Math.PI / 2; // Horizontal plane
    mesh.receiveShadow = true;
    mesh.castShadow = false;

    return mesh;
  } catch (error) {
    console.error("[FlightCorridor] Failed to create tile mesh:", error);
    return null;
  }
}
