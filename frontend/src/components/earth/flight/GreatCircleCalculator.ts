/**
 * Great Circle Calculator
 * High-performance spherical interpolation and navigation calculations
 * Based on proven aviation algorithms for realistic flight paths
 */

import { Vector3 } from "three";
import type { GeoPosition, GreatCirclePoint } from "./types";

export class GreatCircleCalculator {
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly DEG_TO_RAD = Math.PI / 180;
  private static readonly RAD_TO_DEG = 180 / Math.PI;

  /**
   * Convert latitude/longitude to 3D Cartesian coordinates on unit sphere
   */
  static geoToCartesian(geo: GeoPosition, radius: number = 1): Vector3 {
    const lat = geo.lat * this.DEG_TO_RAD;
    const lng = geo.lng * this.DEG_TO_RAD;
    
    const x = radius * Math.cos(lat) * Math.cos(lng);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.sin(lng);
    
    return new Vector3(x, y, z);
  }

  /**
   * Convert 3D Cartesian coordinates to latitude/longitude
   */
  static cartesianToGeo(position: Vector3): GeoPosition {
    const radius = position.length();
    const lat = Math.asin(position.y / radius) * this.RAD_TO_DEG;
    const lng = Math.atan2(position.z, position.x) * this.RAD_TO_DEG;
    
    return { lat, lng };
  }

  /**
   * Calculate great circle distance between two points (Haversine formula)
   */
  static distance(a: GeoPosition, b: GeoPosition): number {
    const lat1 = a.lat * this.DEG_TO_RAD;
    const lat2 = b.lat * this.DEG_TO_RAD;
    const deltaLat = (b.lat - a.lat) * this.DEG_TO_RAD;
    const deltaLng = (b.lng - a.lng) * this.DEG_TO_RAD;

    const h = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    return 2 * this.EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  }

  /**
   * Calculate initial bearing from point A to point B
   */
  static initialBearing(a: GeoPosition, b: GeoPosition): number {
    const lat1 = a.lat * this.DEG_TO_RAD;
    const lat2 = b.lat * this.DEG_TO_RAD;
    const deltaLng = (b.lng - a.lng) * this.DEG_TO_RAD;

    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    const bearing = Math.atan2(y, x) * this.RAD_TO_DEG;
    return (bearing + 360) % 360;
  }

  /**
   * Spherical Linear Interpolation (SLERP) between two points on sphere
   * This ensures aircraft follow great circle routes, not straight lines through Earth
   */
  static slerp(a: Vector3, b: Vector3, t: number): Vector3 {
    // Normalize to unit vectors
    const aUnit = a.clone().normalize();
    const bUnit = b.clone().normalize();
    
    // Calculate angle between vectors
    const dot = Math.max(-1, Math.min(1, aUnit.dot(bUnit)));
    const angle = Math.acos(Math.abs(dot));
    
    // Handle edge cases
    if (angle < 0.001) {
      return aUnit.clone().lerp(bUnit, t);
    }
    
    // Spherical interpolation
    const sinAngle = Math.sin(angle);
    const ratioA = Math.sin((1 - t) * angle) / sinAngle;
    const ratioB = Math.sin(t * angle) / sinAngle;
    
    const result = new Vector3();
    result.copy(aUnit).multiplyScalar(ratioA);
    result.addScaledVector(bUnit, ratioB);
    
    return result.normalize();
  }

  /**
   * Generate great circle route with specified number of waypoints
   */
  static generateRoute(
    origin: GeoPosition,
    destination: GeoPosition,
    segments: number = 100,
    earthRadius: number = this.EARTH_RADIUS_KM
  ): GreatCirclePoint[] {
    const points: GreatCirclePoint[] = [];
    
    // Convert to 3D coordinates
    const startVec = this.geoToCartesian(origin);
    const endVec = this.geoToCartesian(destination);
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      
      // Spherical interpolation
      const position = this.slerp(startVec, endVec, t);
      position.multiplyScalar(earthRadius);
      
      // Convert back to geo coordinates
      const geo = this.cartesianToGeo(position);
      
      // Calculate bearing at this point
      let bearing = 0;
      if (i < segments) {
        const nextT = (i + 1) / segments;
        const nextPos = this.slerp(startVec, endVec, nextT);
        const nextGeo = this.cartesianToGeo(nextPos);
        bearing = this.initialBearing(geo, nextGeo);
      } else {
        // Use previous bearing for last point
        bearing = points[points.length - 1]?.bearing || 0;
      }
      
      points.push({
        position: position.clone(),
        geo,
        t,
        bearing
      });
    }
    
    return points;
  }

  /**
   * Get position and orientation at specific progress along route
   */
  static getPositionAtProgress(
    route: GreatCirclePoint[],
    progress: number,
    earthRadius: number
  ): {
    position: Vector3;
    direction: Vector3;
    up: Vector3;
    bearing: number;
  } {
    // Clamp progress
    progress = Math.max(0, Math.min(1, progress));
    
    // Find surrounding points
    const index = progress * (route.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(lowerIndex + 1, route.length - 1);
    const localT = index - lowerIndex;
    
    const lowerPoint = route[lowerIndex];
    const upperPoint = route[upperIndex];
    
    // Interpolate position
    const position = lowerPoint.position.clone().lerp(upperPoint.position, localT);
    
    // Calculate direction (tangent to sphere)
    let direction: Vector3;
    if (upperIndex > lowerIndex) {
      direction = upperPoint.position.clone().sub(lowerPoint.position).normalize();
    } else {
      direction = new Vector3(1, 0, 0); // Default forward
    }
    
    // Up vector always points away from Earth center
    const up = position.clone().normalize();
    
    // Ensure direction is tangent to sphere (perpendicular to up)
    direction.sub(up.clone().multiplyScalar(direction.dot(up))).normalize();
    
    // Interpolate bearing
    const bearing = lowerIndex < upperIndex ? 
      lowerPoint.bearing + (upperPoint.bearing - lowerPoint.bearing) * localT :
      lowerPoint.bearing;
    
    return {
      position,
      direction,
      up,
      bearing
    };
  }

  /**
   * Calculate banking angle for realistic turns
   */
  static calculateBankAngle(
    currentBearing: number,
    previousBearing: number,
    maxBankAngle: number = 25
  ): number {
    let deltaHeading = currentBearing - previousBearing;
    
    // Normalize angle difference
    if (deltaHeading > 180) deltaHeading -= 360;
    if (deltaHeading < -180) deltaHeading += 360;
    
    // Convert to bank angle (simplified model)
    const bankAngle = -deltaHeading * 0.5;
    
    // Clamp to realistic limits
    return Math.max(-maxBankAngle, Math.min(maxBankAngle, bankAngle));
  }

  /**
   * Optimize route generation for performance
   */
  static generateOptimizedRoute(
    origin: GeoPosition,
    destination: GeoPosition,
    distance: number,
    earthRadius: number
  ): GreatCirclePoint[] {
    // Adaptive segment count based on distance
    let segments: number;
    if (distance < 100) segments = 20;      // Short flights
    else if (distance < 1000) segments = 50; // Medium flights
    else if (distance < 5000) segments = 100; // Long flights
    else segments = 200;                      // Transcontinental
    
    return this.generateRoute(origin, destination, segments, earthRadius);
  }
}