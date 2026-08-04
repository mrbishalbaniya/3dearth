/**
 * Hook for accessing user's geolocation
 */

import { useState, useEffect } from "react";

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationState {
  loading: boolean;
  error: string | null;
  data: GeolocationData | null;
  permission: "granted" | "denied" | "prompt" | null;
}

export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = useState<GeolocationState>({
    loading: true,
    error: null,
    data: null,
    permission: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        loading: false,
        error: "Geolocation is not supported by your browser",
        data: null,
        permission: "denied",
      });
      return;
    }

    // Check permission status
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setState((prev) => ({ ...prev, permission: result.state }));
        })
        .catch(() => {
          // Permissions API not supported, continue anyway
        });
    }

    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          loading: false,
          error: null,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          permission: "granted",
        });
      },
      (error) => {
        let errorMessage = "Failed to get location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }

        setState({
          loading: false,
          error: errorMessage,
          data: null,
          permission: error.code === error.PERMISSION_DENIED ? "denied" : null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );
  }, []);

  return state;
}
