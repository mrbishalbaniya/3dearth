/**
 * Kathmandu 3D Navigation Utilities
 * Helper functions for navigating to and viewing Kathmandu in 3D
 */

import { useEarthStore } from "@/components/earth/store/earthStore";

export const KATHMANDU_COORDINATES = {
  lat: 27.7172,
  lng: 85.3240,
  elevation: 1400, // meters above sea level
  name: "Kathmandu",
  nameNe: "काठमाडौं",
  description: "Capital and largest city of Nepal"
};

export const KATHMANDU_VIEW_PRESETS = {
  // Overview of the city from high altitude
  overview: {
    ...KATHMANDU_COORDINATES,
    altitudeM: 50000, // 50km - see the entire Kathmandu Valley
    duration: 3000,
    approach: "rotateThenZoom" as const
  },
  
  // City level view
  city: {
    ...KATHMANDU_COORDINATES,
    altitudeM: 15000, // 15km - good city detail
    duration: 2500,
    approach: "rotateThenZoom" as const
  },
  
  // Neighborhood level view
  neighborhood: {
    ...KATHMANDU_COORDINATES,
    altitudeM: 5000, // 5km - see buildings and streets
    duration: 2000,
    approach: "rotateThenZoom" as const
  },
  
  // Street level view (careful - might be too low for some areas)
  street: {
    ...KATHMANDU_COORDINATES,
    altitudeM: 1000, // 1km - very close view
    duration: 1500,
    approach: "rotateThenZoom" as const
  }
};

/**
 * Navigate to Kathmandu with a specific preset view
 */
export const flyToKathmandu = (preset: keyof typeof KATHMANDU_VIEW_PRESETS = "city") => {
  const { requestFlyTo } = useEarthStore.getState();
  const viewConfig = KATHMANDU_VIEW_PRESETS[preset];
  
  requestFlyTo(viewConfig);
  
  console.log(`Flying to Kathmandu (${preset} view):`, {
    coordinates: `${viewConfig.lat}, ${viewConfig.lng}`,
    altitude: `${(viewConfig.altitudeM / 1000).toFixed(1)}km`,
    duration: `${viewConfig.duration}ms`
  });
};

/**
 * Navigate to specific areas within Kathmandu
 */
export const KATHMANDU_AREAS = {
  // Durbar Square - Historic center
  durbarSquare: {
    lat: 27.7045,
    lng: 85.3067,
    altitudeM: 3000,
    name: "Durbar Square",
    nameNe: "दरबार स्क्वायर"
  },
  
  // Swayambhunath Stupa (Monkey Temple)
  swayambhunath: {
    lat: 27.7149,
    lng: 85.2906,
    altitudeM: 2000,
    name: "Swayambhunath",
    nameNe: "स्वयम्भूनाथ"
  },
  
  // Tribhuvan International Airport
  airport: {
    lat: 27.6966,
    lng: 85.3591,
    altitudeM: 3000,
    name: "Tribhuvan Airport",
    nameNe: "त्रिभुवन एयरपोर्ट"
  },
  
  // Pashupatinath Temple
  pashupatinath: {
    lat: 27.7104,
    lng: 85.3485,
    altitudeM: 2000,
    name: "Pashupatinath",
    nameNe: "पशुपतिनाथ"
  }
};

/**
 * Navigate to a specific area in Kathmandu
 */
export const flyToKathmanduArea = (area: keyof typeof KATHMANDU_AREAS) => {
  const { requestFlyTo } = useEarthStore.getState();
  const areaConfig = KATHMANDU_AREAS[area];
  
  requestFlyTo({
    ...areaConfig,
    duration: 2000,
    approach: "rotateThenZoom"
  });
  
  console.log(`Flying to ${areaConfig.name}:`, {
    coordinates: `${areaConfig.lat}, ${areaConfig.lng}`,
    altitude: `${(areaConfig.altitudeM / 1000).toFixed(1)}km`
  });
};

/**
 * Interactive tutorial for exploring Kathmandu
 */
export const startKathmanduTour = async () => {
  const areas = Object.keys(KATHMANDU_AREAS) as Array<keyof typeof KATHMANDU_AREAS>;
  
  // Start with overview
  flyToKathmandu("overview");
  
  // Wait 4 seconds, then tour each area
  setTimeout(() => {
    let currentIndex = 0;
    
    const tourInterval = setInterval(() => {
      if (currentIndex >= areas.length) {
        clearInterval(tourInterval);
        // End with city view
        setTimeout(() => flyToKathmandu("city"), 1000);
        return;
      }
      
      flyToKathmanduArea(areas[currentIndex]);
      currentIndex++;
    }, 4000); // Visit each area for 4 seconds
    
  }, 4000);
};