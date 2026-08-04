/**
 * Overpass API client for fetching OpenStreetMap data
 * Based on map3d by cartesiancs - MIT License
 * https://github.com/cartesiancs/map3d
 */

import type { GeoBounds, OSMBuilding, OSMResponse, OSMRoad } from "./types";
import { SAMPLE_KATHMANDU_BUILDINGS, SAMPLE_KATHMANDU_ROADS } from "./sampleData";

// Multiple Overpass API endpoints for failover
const OVERPASS_API_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const REQUEST_TIMEOUT = 25; // seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds
const USE_DEMO_MODE = true; // Set to true to use sample data when API fails

export class OverpassAPI {
  private static currentEndpointIndex = 0;

  /**
   * Sleep helper for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get next Overpass API endpoint (round-robin)
   */
  private static getNextEndpoint(): string {
    const endpoint = OVERPASS_API_ENDPOINTS[this.currentEndpointIndex];
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % OVERPASS_API_ENDPOINTS.length;
    return endpoint;
  }

  /**
   * Execute Overpass query with retry logic and failover
   */
  private static async executeQuery(query: string, retries = MAX_RETRIES): Promise<OSMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const endpoint = this.getNextEndpoint();
      
      try {
        console.log(`Overpass query attempt ${attempt + 1}/${retries + 1} using ${endpoint}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT * 1000);

        const response = await fetch(endpoint, {
          method: "POST",
          body: query,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * (attempt + 1);
          
          console.warn(`Rate limited (429). Waiting ${waitTime}ms before retry...`);
          
          if (attempt < retries) {
            await this.sleep(waitTime);
            continue;
          }
          throw new Error(
            `Overpass API rate limit exceeded. Too many requests. Please try again in a few minutes.`
          );
        }

        // Handle other HTTP errors
        if (!response.ok) {
          throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
        }

        const data: OSMResponse = await response.json();
        
        // Validate response
        if (!data.elements || !Array.isArray(data.elements)) {
          throw new Error("Invalid response format from Overpass API");
        }

        console.log(`✓ Successfully fetched ${data.elements.length} elements from Overpass`);
        return data;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === "AbortError") {
          console.error(`Request timeout after ${REQUEST_TIMEOUT}s`);
          if (attempt < retries) {
            await this.sleep(RETRY_DELAY);
            continue;
          }
        }

        // Don't retry on network errors if we've tried all endpoints
        if (attempt < retries) {
          console.warn(`Attempt ${attempt + 1} failed, retrying with different endpoint...`);
          await this.sleep(RETRY_DELAY);
          continue;
        }
      }
    }

    // All retries failed
    console.error("All Overpass API requests failed:", lastError);
    throw new Error(
      lastError?.message || "Failed to fetch data from Overpass API after multiple attempts"
    );
  }

  /**
   * Fetch buildings from OpenStreetMap within bounds
   */
  static async fetchBuildings(bounds: GeoBounds): Promise<OSMBuilding[]> {
    const { south, west, north, east } = bounds;
    
    const query = `[out:json][timeout:${REQUEST_TIMEOUT}];
      (
        way["building"](${south},${west},${north},${east});
        relation["building"](${south},${west},${north},${east});
      );
      out body geom;`;

    try {
      const data = await this.executeQuery(query);
      
      return data.elements.map((element) => ({
        id: element.id,
        type: element.type,
        tags: element.tags,
        geometry: element.geometry?.map((pt) => ({
          lat: pt.lat,
          lon: pt.lon,
        })),
      }));
    } catch (error) {
      console.error("Error fetching buildings from Overpass API:", error);
      
      // Fall back to demo data if enabled
      if (USE_DEMO_MODE) {
        console.warn("⚠️ Overpass API unavailable. Using demo data instead.");
        return SAMPLE_KATHMANDU_BUILDINGS;
      }
      
      throw error;
    }
  }

  /**
   * Fetch roads from OpenStreetMap within bounds
   */
  static async fetchRoads(bounds: GeoBounds): Promise<OSMRoad[]> {
    const { south, west, north, east } = bounds;
    
    const query = `[out:json][timeout:${REQUEST_TIMEOUT}];
      (
        way["highway"](${south},${west},${north},${east});
      );
      out body geom;`;

    try {
      const data = await this.executeQuery(query);
      
      return data.elements.filter((e): e is OSMRoad => 
        e.type === "way" && "highway" in e.tags
      );
    } catch (error) {
      console.error("Error fetching roads from Overpass API:", error);
      
      // Fall back to demo data if enabled
      if (USE_DEMO_MODE) {
        console.warn("⚠️ Overpass API unavailable. Using demo roads instead.");
        return SAMPLE_KATHMANDU_ROADS;
      }
      
      throw error;
    }
  }

  /**
   * Fetch all city data (buildings + roads) with staggered requests
   * to avoid hitting rate limits
   */
  static async fetchCityData(bounds: GeoBounds): Promise<{
    buildings: OSMBuilding[];
    roads: OSMRoad[];
  }> {
    // Fetch buildings first
    const buildings = await this.fetchBuildings(bounds);
    
    // Wait a bit before fetching roads to avoid rate limiting
    await this.sleep(1000);
    
    const roads = await this.fetchRoads(bounds);

    return { buildings, roads };
  }
}

/**
 * Predefined bounds for Kathmandu Valley
 */
export const KATHMANDU_BOUNDS: GeoBounds = {
  // Kathmandu city center
  north: 27.7172,
  south: 27.6884,
  east: 85.3340,
  west: 85.3000,
};

/**
 * Extended Kathmandu Valley bounds (includes suburbs)
 */
export const KATHMANDU_VALLEY_BOUNDS: GeoBounds = {
  north: 27.75,
  south: 27.65,
  east: 85.40,
  west: 85.25,
};
