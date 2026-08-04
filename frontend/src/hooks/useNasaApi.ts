/**
 * React hooks for NASA APIs
 */

import { useState, useEffect, useCallback } from 'react';
import NasaApiService, { 
  type APODResponse, 
  type NEOResponse, 
  type MarsRoverPhotos,
  type EPICImage
} from '@/services/nasa/NasaApiService';
import type { NasaApiResponse } from '@/services/nasa/config';

const nasaApi = new NasaApiService();

interface UseNasaApiOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for Astronomy Picture of the Day
 */
export function useAPOD(date?: string, options: UseNasaApiOptions = {}): ApiState<APODResponse> {
  const [state, setState] = useState<Omit<ApiState<APODResponse>, 'refetch'>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchAPOD = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await nasaApi.getAPOD(date);
      
      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error!.message }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data! }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [date]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchAPOD();
    }
  }, [fetchAPOD, options.enabled]);

  useEffect(() => {
    if (options.refetchInterval && options.enabled !== false) {
      const interval = setInterval(fetchAPOD, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAPOD, options.refetchInterval, options.enabled]);

  return {
    ...state,
    refetch: fetchAPOD
  };
}

/**
 * Hook for Near Earth Objects
 */
export function useNearEarthObjects(
  startDate: string, 
  endDate: string, 
  options: UseNasaApiOptions = {}
): ApiState<NEOResponse> {
  const [state, setState] = useState<Omit<ApiState<NEOResponse>, 'refetch'>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchNEO = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await nasaApi.getNearEarthObjects(startDate, endDate);
      
      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error!.message }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data! }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchNEO();
    }
  }, [fetchNEO, options.enabled]);

  return {
    ...state,
    refetch: fetchNEO
  };
}

/**
 * Hook for Mars Rover Photos
 */
export function useMarsRoverPhotos(
  rover: 'curiosity' | 'opportunity' | 'spirit',
  sol?: number,
  camera?: string,
  options: UseNasaApiOptions = {}
): ApiState<MarsRoverPhotos> {
  const [state, setState] = useState<Omit<ApiState<MarsRoverPhotos>, 'refetch'>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchPhotos = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await nasaApi.getMarsRoverPhotos(rover, sol, camera);
      
      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error!.message }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data! }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [rover, sol, camera]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchPhotos();
    }
  }, [fetchPhotos, options.enabled]);

  return {
    ...state,
    refetch: fetchPhotos
  };
}

/**
 * Hook for EPIC Earth images
 */
export function useEPICImages(
  date?: string,
  enhanced: boolean = false,
  options: UseNasaApiOptions = {}
): ApiState<EPICImage[]> {
  const [state, setState] = useState<Omit<ApiState<EPICImage[]>, 'refetch'>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchEPIC = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = enhanced 
        ? await nasaApi.getEPICEnhanced(date)
        : await nasaApi.getEPICImages(date);
      
      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error!.message }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data! }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [date, enhanced]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchEPIC();
    }
  }, [fetchEPIC, options.enabled]);

  return {
    ...state,
    refetch: fetchEPIC
  };
}

/**
 * Generic hook for any NASA API
 */
export function useNasaApiCall<T>(
  apiCall: () => Promise<NasaApiResponse<T>>,
  dependencies: any[] = [],
  options: UseNasaApiOptions = {}
): ApiState<T> {
  const [state, setState] = useState<Omit<ApiState<T>, 'refetch'>>({
    data: null,
    loading: false,
    error: null
  });

  const executeCall = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      
      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error!.message }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data! }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, dependencies);

  useEffect(() => {
    if (options.enabled !== false) {
      executeCall();
    }
  }, [executeCall, options.enabled]);

  return {
    ...state,
    refetch: executeCall
  };
}

/**
 * Flexible hook for any NASA API with custom fetch function
 */
export function useNasaApi<T>(): {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchData: (apiCall: () => Promise<NasaApiResponse<T>>) => Promise<void>;
} {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  const fetchData = useCallback(async (apiCall: () => Promise<NasaApiResponse<T>>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      
      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error!.message }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data! }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, []);

  return {
    ...state,
    fetchData
  };
}

/**
 * Hook to get NASA API service instance
 */
export function useNasaApiService(apiKey?: string): NasaApiService {
  return new NasaApiService(apiKey);
}

export default nasaApi;