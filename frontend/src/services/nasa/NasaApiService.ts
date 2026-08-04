/**
 * NASA API Service
 * Comprehensive service for all NASA APIs
 */

import { NASA_API_BASE, NASA_API_KEY, NASA_APIS, type NasaApiResponse } from './config';

export class NasaApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || NASA_API_KEY;
    this.baseUrl = NASA_API_BASE;
  }

  /**
   * Generic API request method
   */
  private async makeRequest<T>(
    url: string, 
    params: Record<string, any> = {},
    customBaseUrl?: string
  ): Promise<NasaApiResponse<T>> {
    try {
      const baseUrl = customBaseUrl || this.baseUrl;
      const queryParams = new URLSearchParams({
        api_key: this.apiKey,
        ...params
      });

      const fullUrl = `${baseUrl}${url}?${queryParams}`;
      
      const response = await fetch(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NASA API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          api: url,
          version: '1.0'
        }
      };
    } catch (error) {
      // Don't log CORS/network errors as they're expected when API is unavailable
      // Only log unexpected errors for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.toLowerCase().includes('failed to fetch') && 
          !errorMessage.toLowerCase().includes('cors') &&
          !errorMessage.toLowerCase().includes('network')) {
        console.warn('NASA API Request failed:', error);
      }
      
      return {
        error: {
          code: 'REQUEST_FAILED',
          message: errorMessage
        }
      };
    }
  }

  // 1. APOD - Astronomy Picture of the Day
  async getAPOD(date?: string): Promise<NasaApiResponse<APODResponse>> {
    const params = date ? { date } : {};
    return this.makeRequest<APODResponse>(NASA_APIS.APOD.endpoint, params);
  }

  async getAPODRange(startDate: string, endDate: string): Promise<NasaApiResponse<APODResponse[]>> {
    return this.makeRequest<APODResponse[]>(NASA_APIS.APOD.endpoint, {
      start_date: startDate,
      end_date: endDate
    });
  }

  async getRandomAPOD(count: number = 1): Promise<NasaApiResponse<APODResponse[]>> {
    return this.makeRequest<APODResponse[]>(NASA_APIS.APOD.endpoint, { count });
  }

  // 2. Near Earth Objects (Asteroids)
  async getNearEarthObjects(startDate: string, endDate: string): Promise<NasaApiResponse<NEOResponse>> {
    return this.makeRequest<NEOResponse>(`${NASA_APIS.ASTEROIDS.endpoint}/feed`, {
      start_date: startDate,
      end_date: endDate
    });
  }

  async getAsteroidDetails(asteroidId: string): Promise<NasaApiResponse<AsteroidDetails>> {
    return this.makeRequest<AsteroidDetails>(`${NASA_APIS.ASTEROIDS.endpoint}/neo/${asteroidId}`);
  }

  async getAsteroidStats(): Promise<NasaApiResponse<AsteroidStats>> {
    return this.makeRequest<AsteroidStats>(`${NASA_APIS.ASTEROIDS.endpoint}/stats`);
  }

  // 3. DONKI - Space Weather
  async getCoronalMassEjections(startDate: string, endDate: string): Promise<NasaApiResponse<CMEEvent[]>> {
    return this.makeRequest<CMEEvent[]>(`${NASA_APIS.DONKI.endpoint}/CME`, {
      startDate,
      endDate
    });
  }

  async getSolarFlares(startDate: string, endDate: string): Promise<NasaApiResponse<SolarFlare[]>> {
    return this.makeRequest<SolarFlare[]>(`${NASA_APIS.DONKI.endpoint}/FLR`, {
      startDate,
      endDate
    });
  }

  async getGeomagneticStorms(startDate: string, endDate: string): Promise<NasaApiResponse<GeomagneticStorm[]>> {
    return this.makeRequest<GeomagneticStorm[]>(`${NASA_APIS.DONKI.endpoint}/GST`, {
      startDate,
      endDate
    });
  }

  // 4. Earth Imagery
  async getEarthImagery(
    lat: number, 
    lon: number, 
    date: string, 
    dim: number = 0.10
  ): Promise<NasaApiResponse<EarthImagery>> {
    return this.makeRequest<EarthImagery>(`${NASA_APIS.EARTH.endpoint}/imagery`, {
      lat,
      lon,
      date,
      dim
    });
  }

  async getEarthAssets(lat: number, lon: number, date: string): Promise<NasaApiResponse<EarthAssets>> {
    return this.makeRequest<EarthAssets>(`${NASA_APIS.EARTH.endpoint}/assets`, {
      lat,
      lon,
      date
    });
  }

  // 5. EPIC - Earth Images from DSCOVR
  async getEPICImages(date?: string): Promise<NasaApiResponse<EPICImage[]>> {
    const endpoint = date 
      ? `${NASA_APIS.EPIC.endpoint}/natural/images/${date}`
      : `${NASA_APIS.EPIC.endpoint}/natural`;
    
    return this.makeRequest<EPICImage[]>(endpoint);
  }

  async getEPICEnhanced(date?: string): Promise<NasaApiResponse<EPICImage[]>> {
    const endpoint = date 
      ? `${NASA_APIS.EPIC.endpoint}/enhanced/images/${date}`
      : `${NASA_APIS.EPIC.endpoint}/enhanced`;
    
    return this.makeRequest<EPICImage[]>(endpoint);
  }

  // 6. Exoplanets
  async getExoplanets(query?: string): Promise<NasaApiResponse<ExoplanetData[]>> {
    const defaultQuery = "select pl_name,hostname,pl_orbper,pl_bmasse,pl_rade from ps where default_flag = 1";
    
    return this.makeRequest<ExoplanetData[]>(
      '', 
      { 
        query: query || defaultQuery,
        format: 'json'
      },
      NASA_APIS.EXOPLANETS.baseUrl
    );
  }

  // 7. Mars Weather (InSight)
  async getMarsWeather(): Promise<NasaApiResponse<MarsWeatherResponse>> {
    return this.makeRequest<MarsWeatherResponse>(NASA_APIS.INSIGHT.endpoint, {
      feedtype: 'json',
      ver: '1.0'
    });
  }

  // 8. Mars Rover Photos
  async getMarsRoverPhotos(
    rover: 'curiosity' | 'opportunity' | 'spirit',
    sol?: number,
    camera?: string,
    page: number = 1
  ): Promise<NasaApiResponse<MarsRoverPhotos>> {
    const params: Record<string, any> = { page };
    
    if (sol) params.sol = sol;
    if (camera) params.camera = camera;

    return this.makeRequest<MarsRoverPhotos>(
      `${NASA_APIS.MARS_ROVERS.endpoint}/rovers/${rover}/photos`,
      params
    );
  }

  async getLatestMarsRoverPhotos(rover: string): Promise<NasaApiResponse<MarsRoverPhotos>> {
    return this.makeRequest<MarsRoverPhotos>(
      `${NASA_APIS.MARS_ROVERS.endpoint}/rovers/${rover}/latest_photos`
    );
  }

  // 9. NASA Media Library
  async searchNASALibrary(
    query: string,
    mediaType?: 'image' | 'video' | 'audio'
  ): Promise<NasaApiResponse<NASALibraryResponse>> {
    const params: Record<string, any> = { q: query };
    if (mediaType) params.media_type = mediaType;

    return this.makeRequest<NASALibraryResponse>(
      NASA_APIS.NASA_LIBRARY.endpoint,
      params,
      NASA_APIS.NASA_LIBRARY.baseUrl
    );
  }

  // 10. Small Body Database (SSD)
  async getSmallBodyData(designation: string): Promise<NasaApiResponse<SmallBodyData>> {
    return this.makeRequest<SmallBodyData>(
      '/sbdb.api',
      { sstr: designation },
      NASA_APIS.SSD.baseUrl
    );
  }

  async getCloseApproachData(
    dateMin: string,
    dateMax: string,
    dist?: string
  ): Promise<NasaApiResponse<CloseApproachData>> {
    const params: Record<string, any> = {
      'date-min': dateMin,
      'date-max': dateMax
    };
    
    if (dist) params.dist = dist;

    return this.makeRequest<CloseApproachData>(
      '/cad.api',
      params,
      NASA_APIS.SSD.baseUrl
    );
  }

  // 11. Fireballs and Bolides
  async getFireballs(
    dateMin?: string,
    dateMax?: string,
    energyMin?: number
  ): Promise<NasaApiResponse<FireballData>> {
    const params: Record<string, any> = {};
    
    if (dateMin) params['date-min'] = dateMin;
    if (dateMax) params['date-max'] = dateMax;
    if (energyMin) params['energy-min'] = energyMin;

    return this.makeRequest<FireballData>(
      '/fireball.api',
      params,
      NASA_APIS.SSD.baseUrl
    );
  }

  // 12. NASA Power - Weather and Solar Data
  async getPowerData(
    lat: number,
    lon: number,
    parameters: string[],
    community: string = 'RE',
    startDate: string,
    endDate: string
  ): Promise<NasaApiResponse<PowerData>> {
    return this.makeRequest<PowerData>(
      `/temporal/daily/point`,
      {
        parameters: parameters.join(','),
        community,
        longitude: lon,
        latitude: lat,
        start: startDate,
        end: endDate,
        format: 'JSON'
      },
      NASA_APIS.POWER.baseUrl
    );
  }

  // Utility methods
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  // Get available rovers
  async getMarsRovers(): Promise<NasaApiResponse<MarsRoversResponse>> {
    return this.makeRequest<MarsRoversResponse>(`${NASA_APIS.MARS_ROVERS.endpoint}/rovers`);
  }
}

// Type definitions for API responses
export interface APODResponse {
  copyright?: string;
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
  thumbnail_url?: string;
}

export interface NEOResponse {
  links: {
    next?: string;
    prev?: string;
    self: string;
  };
  element_count: number;
  near_earth_objects: Record<string, NEOObject[]>;
}

export interface NEOObject {
  id: string;
  neo_reference_id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: { estimated_diameter_min: number; estimated_diameter_max: number };
    meters: { estimated_diameter_min: number; estimated_diameter_max: number };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: CloseApproach[];
}

export interface CloseApproach {
  close_approach_date: string;
  close_approach_date_full: string;
  epoch_date_close_approach: number;
  relative_velocity: {
    kilometers_per_second: string;
    kilometers_per_hour: string;
    miles_per_hour: string;
  };
  miss_distance: {
    astronomical: string;
    lunar: string;
    kilometers: string;
    miles: string;
  };
  orbiting_body: string;
}

export interface AsteroidDetails extends NEOObject {
  designation: string;
  orbital_data: {
    orbit_id: string;
    orbit_determination_date: string;
    first_observation_date: string;
    last_observation_date: string;
    data_arc_in_days: number;
    observations_used: number;
    orbit_uncertainty: string;
    minimum_orbit_intersection: string;
    jupiter_tisserand_invariant: string;
    epoch_osculation: string;
    eccentricity: string;
    semi_major_axis: string;
    inclination: string;
    ascending_node_longitude: string;
    orbital_period: string;
    perihelion_distance: string;
    perihelion_argument: string;
    aphelion_distance: string;
    perihelion_time: string;
    mean_anomaly: string;
    mean_motion: string;
  };
}

export interface AsteroidStats {
  near_earth_object_count: number;
  close_approach_count: number;
  last_updated: string;
  source: string;
  nasa_jpl_url: string;
}

export interface CMEEvent {
  activityID: string;
  catalog: string;
  startTime: string;
  sourceLocation: string;
  activeRegionNum?: number;
  link: string;
  note?: string;
  instruments: Array<{
    displayName: string;
  }>;
  cmeAnalyses?: Array<{
    time21_5: string;
    latitude: number;
    longitude: number;
    halfAngle: number;
    speed: number;
    type: string;
    note?: string;
  }>;
}

export interface SolarFlare {
  flrID: string;
  instruments: Array<{
    displayName: string;
  }>;
  beginTime: string;
  peakTime?: string;
  endTime?: string;
  classType: string;
  sourceLocation: string;
  activeRegionNum?: number;
  link: string;
  note?: string;
}

export interface GeomagneticStorm {
  gstID: string;
  startTime: string;
  allKpIndex: Array<{
    observedTime: string;
    kpIndex: number;
    source: string;
  }>;
  link: string;
}

export interface EarthImagery {
  date: string;
  url: string;
}

export interface EarthAssets {
  date: string;
  id: string;
  resource: {
    dataset: string;
    planet: string;
  };
}

export interface EPICImage {
  identifier: string;
  caption: string;
  image: string;
  version: string;
  centroid_coordinates: {
    lat: number;
    lon: number;
  };
  dscovr_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  lunar_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  sun_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  attitude_quaternions: {
    q0: number;
    q1: number;
    q2: number;
    q3: number;
  };
  date: string;
  coords: {
    centroid_coordinates: {
      lat: number;
      lon: number;
    };
  };
}

export interface ExoplanetData {
  pl_name: string;
  hostname: string;
  pl_orbper?: number;
  pl_bmasse?: number;
  pl_rade?: number;
}

export interface MarsWeatherResponse {
  [sol: string]: {
    AT?: {
      av?: number;
      ct?: number;
      mn?: number;
      mx?: number;
    };
    First_UTC: string;
    HWS?: {
      av?: number;
      ct?: number;
      mn?: number;
      mx?: number;
    };
    Last_UTC: string;
    PRE?: {
      av?: number;
      ct?: number;
      mn?: number;
      mx?: number;
    };
    Season: string;
    WD?: {
      most_common?: {
        compass_degrees: number;
        compass_point: string;
        compass_right: number;
        compass_up: number;
        ct: number;
      };
    };
  };
}

export interface MarsRoverPhotos {
  photos: Array<{
    id: number;
    sol: number;
    camera: {
      id: number;
      name: string;
      rover_id: number;
      full_name: string;
    };
    img_src: string;
    earth_date: string;
    rover: {
      id: number;
      name: string;
      landing_date: string;
      launch_date: string;
      status: string;
      max_sol: number;
      max_date: string;
      total_photos: number;
    };
  }>;
}

export interface MarsRoversResponse {
  rovers: Array<{
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
    max_sol: number;
    max_date: string;
    total_photos: number;
    cameras: Array<{
      name: string;
      full_name: string;
    }>;
  }>;
}

export interface NASALibraryResponse {
  collection: {
    version: string;
    href: string;
    items: Array<{
      href: string;
      data: Array<{
        center: string;
        title: string;
        nasa_id: string;
        date_created: string;
        keywords?: string[];
        media_type: string;
        description: string;
        description_508?: string;
        secondary_creator?: string;
        photographer?: string;
        album?: string[];
      }>;
      links?: Array<{
        href: string;
        rel: string;
        render?: string;
      }>;
    }>;
    metadata: {
      total_hits: number;
    };
    links?: Array<{
      href: string;
      rel: string;
      prompt?: string;
    }>;
  };
}

export interface SmallBodyData {
  object: {
    fullname: string;
    des: string;
    prefix?: string;
    orbit_class: {
      name: string;
      code: string;
    };
  };
  phys_par?: Array<{
    name: string;
    value: string;
    sigma?: string;
    units: string;
    ref: string;
    notes?: string;
  }>;
}

export interface CloseApproachData {
  signature: {
    source: string;
    version: string;
  };
  count: string;
  fields: string[];
  data: string[][];
}

export interface FireballData {
  signature: {
    source: string;
    version: string;
  };
  count: string;
  fields: string[];
  data: string[][];
}

export interface PowerData {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    parameter: Record<string, any>;
  };
}

export default NasaApiService;