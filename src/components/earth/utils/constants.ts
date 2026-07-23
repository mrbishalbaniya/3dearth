import type { EarthMarker, EarthQualityProfile } from "../types";

/** Earth radius in scene units (1 unit ≈ Earth radius). */
export const EARTH_RADIUS = 1;

/** Cloud shell slightly above the surface. */
export const CLOUD_RADIUS = 1.008;

/** Atmosphere shell for Fresnel glow. */
export const ATMOSPHERE_RADIUS = 1.045;

/** Soft outer atmosphere halo. */
export const ATMOSPHERE_HALO_RADIUS = 1.14;

/** Moon (approx visual scale — not true lunar distance). */
export const MOON_RADIUS = 0.27;
export const MOON_ORBIT_RADIUS = 4.2;

/** Default idle Earth spin (radians / second). */
export const IDLE_EARTH_ROTATION_SPEED = 0.015;

/** Cloud layer rotates independently (radians / second). */
export const CLOUD_ROTATION_SPEED = 0.022;

/** Resume idle rotation after this many ms of no interaction. */
export const IDLE_RESUME_DELAY_MS = 4000;

/** Orbit distance limits (camera from focus / origin). */
export const CAMERA_MIN_DISTANCE = 160 / 6_371_000; // ~160 m AGL — Street reachable
export const CAMERA_MAX_DISTANCE = 12.5; // deep space
export const CAMERA_DEFAULT_DISTANCE = 3.2;

/** Polar angle limits (prevent flipping / pole lock). */
export const CAMERA_MIN_POLAR = 0.05;
export const CAMERA_MAX_POLAR = Math.PI - 0.05;

/** Damping & inertia. */
export const CAMERA_DAMPING = 0.068;
export const CAMERA_ZOOM_SPEED = 0.42;
export const CAMERA_ROTATE_SPEED = 0.55;
export const CAMERA_PAN_SPEED = 0.85;
/** Per-frame zoom velocity decay (higher = longer, smoother coast). */
export const CAMERA_ZOOM_INERTIA = 0.93;
export const CAMERA_SPRING = 10.5;

/** Fly-to defaults. */
export const FLY_TO_DEFAULT_DURATION = 1.8;
export const FLY_TO_DEFAULT_ALTITUDE = 1.85;

/** Sun / lighting. */
export const SUN_INTENSITY = 2.4;
export const AMBIENT_INTENSITY = 0.08;
export const HEMISPHERE_SKY = "#8ec8ff";
export const HEMISPHERE_GROUND = "#0a1520";
export const HEMISPHERE_INTENSITY = 0.35;

/** Atmosphere colors. */
export const ATMOSPHERE_COLOR = "#4da6ff";
export const ATMOSPHERE_NIGHT_COLOR = "#1a3a6e";
export const SUNSET_COLOR = "#ff8a4c";
export const MORNING_COLOR = "#ffd4a3";

/** Border styling. */
export const BORDER_COLOR = "#e8f4ff";
export const BORDER_OPACITY = 0.55;
export const BORDER_LINE_WIDTH = 1.25;

/** Marker defaults. */
export const MARKER_BASE_RADIUS = 0.012;
export const MARKER_HOVER_SCALE = 1.35;
export const MARKER_SELECTED_SCALE = 1.55;
export const MARKER_ALTITUDE = 0.012;

/** Texture URLs — local first, CDN fallback for 2K–8K Earth maps. */
export const TEXTURE_PATHS = {
  day: "/textures/earth/earth_day.jpg",
  night: "/textures/earth/earth_night.jpg",
  normal: "/textures/earth/earth_normal.jpg",
  specular: "/textures/earth/earth_specular.jpg",
  roughness: "/textures/earth/earth_roughness.jpg",
  clouds: "/textures/earth/earth_clouds.jpg",
} as const;

/**
 * High-quality public CDN fallbacks (Solar System Scope / Three.js planets).
 * Prefer local 8K assets when present under /public/textures/earth/.
 */
export const TEXTURE_CDN_FALLBACKS = {
  day: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/earth_atmos_2048.jpg",
  night:
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/earth_lights_2048.png",
  normal:
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/earth_normal_2048.jpg",
  specular:
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/earth_specular_2048.jpg",
  roughness:
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/earth_specular_2048.jpg",
  clouds:
    "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/earth_clouds_1024.png",
} as const;

export const GEOJSON_URL = "/data/countries.geojson";

export const QUALITY_PROFILES: Record<
  EarthQualityProfile["id"],
  EarthQualityProfile
> = {
  ultra: {
    id: "ultra",
    dpr: [1, 2],
    earthSegments: 160,
    cloudSegments: 112,
    atmosphereSegments: 80,
    starCount: 120_000,
    enableBloom: true,
    enableShadows: true,
    anisotropicFiltering: 16,
    textureMaxSize: 8192,
    maxTileRadius: 3,
    maxBuildings: 1200,
  },
  high: {
    id: "high",
    dpr: [1, 1.75],
    earthSegments: 112,
    cloudSegments: 80,
    atmosphereSegments: 56,
    starCount: 60_000,
    enableBloom: true,
    enableShadows: false,
    anisotropicFiltering: 8,
    textureMaxSize: 4096,
    maxTileRadius: 2,
    maxBuildings: 700,
  },
  medium: {
    id: "medium",
    dpr: [1, 1.5],
    earthSegments: 72,
    cloudSegments: 56,
    atmosphereSegments: 40,
    starCount: 18_000,
    enableBloom: true,
    enableShadows: false,
    anisotropicFiltering: 4,
    textureMaxSize: 2048,
    maxTileRadius: 2,
    maxBuildings: 350,
  },
  low: {
    id: "low",
    dpr: [1, 1],
    earthSegments: 48,
    cloudSegments: 32,
    atmosphereSegments: 24,
    starCount: 4_000,
    enableBloom: false,
    enableShadows: false,
    anisotropicFiltering: 1,
    textureMaxSize: 1024,
    maxTileRadius: 1,
    maxBuildings: 150,
  },
};

/** Demo markers — cities worldwide. */
export const DEFAULT_MARKERS: EarthMarker[] = [
  {
    id: "nyc",
    name: "New York",
    description: "Financial hub · Americas",
    lat: 40.7128,
    lng: -74.006,
    status: "active",
    color: "#5eead4",
  },
  {
    id: "london",
    name: "London",
    description: "Global finance · Europe",
    lat: 51.5074,
    lng: -0.1278,
    status: "active",
    color: "#93c5fd",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    description: "Technology · Asia-Pacific",
    lat: 35.6762,
    lng: 139.6503,
    status: "active",
    color: "#f9a8d4",
  },
  {
    id: "sydney",
    name: "Sydney",
    description: "Gateway · Oceania",
    lat: -33.8688,
    lng: 151.2093,
    status: "idle",
    color: "#fcd34d",
  },
  {
    id: "dubai",
    name: "Dubai",
    description: "Trade corridor · MENA",
    lat: 25.2048,
    lng: 55.2708,
    status: "active",
    color: "#fdba74",
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    description: "Commerce · South America",
    lat: -23.5505,
    lng: -46.6333,
    status: "idle",
    color: "#86efac",
  },
  {
    id: "nairobi",
    name: "Nairobi",
    description: "Innovation · East Africa",
    lat: -1.2921,
    lng: 36.8219,
    status: "alert",
    color: "#fca5a5",
  },
  {
    id: "singapore",
    name: "Singapore",
    description: "Maritime hub · SE Asia",
    lat: 1.3521,
    lng: 103.8198,
    status: "active",
    color: "#a5b4fc",
  },
];

export const STATUS_COLORS: Record<string, string> = {
  active: "#34d399",
  idle: "#94a3b8",
  alert: "#f87171",
  offline: "#64748b",
};
