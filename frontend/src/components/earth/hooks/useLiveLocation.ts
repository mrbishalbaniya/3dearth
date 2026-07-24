"use client";

import { useEffect, useRef } from "react";
import { useEarthStore } from "../store/earthStore";

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 4_000,
  timeout: 15_000,
};

/**
 * Starts / stops navigator.geolocation.watchPosition while tracking is on.
 * First fix flies the camera to the user.
 */
export function useLiveLocation() {
  const tracking = useEarthStore((s) => s.locationTracking);
  const setUserLocation = useEarthStore((s) => s.setUserLocation);
  const setLocationTracking = useEarthStore((s) => s.setLocationTracking);
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);
  const watchId = useRef<number | null>(null);
  const flewOnce = useRef(false);

  useEffect(() => {
    if (!tracking) {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      flewOnce.current = false;
      return;
    }

    if (!navigator.geolocation) {
      window.alert("Location is not supported in this browser.");
      setLocationTracking(false);
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({
          lat,
          lng,
          accuracyM: pos.coords.accuracy || 50,
          heading: Number.isFinite(pos.coords.heading)
            ? pos.coords.heading
            : null,
          updatedAt: Date.now(),
        });

        if (!flewOnce.current) {
          flewOnce.current = true;
          requestFlyTo({
            lat,
            lng,
            altitudeM: 8_000,
            duration: 2.6,
            approach: "rotateThenZoom",
          });
        }
      },
      (err) => {
        setLocationTracking(false);
        window.alert(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied."
            : "Could not get your live location.",
        );
      },
      GEO_OPTS,
    );

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [
    tracking,
    setUserLocation,
    setLocationTracking,
    requestFlyTo,
  ]);
}
