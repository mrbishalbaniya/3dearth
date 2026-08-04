/**
 * NASA APIs Configuration
 * Complete list of available NASA APIs with endpoints and documentation
 */

export const NASA_API_BASE = 'https://api.nasa.gov';

// Default API key for demo purposes - users should get their own from https://api.nasa.gov/
export const NASA_API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY';

/**
 * Complete NASA API Endpoints
 */
export const NASA_APIS = {
  // 1. Astronomy Picture of the Day (APOD)
  APOD: {
    name: 'Astronomy Picture of the Day',
    endpoint: '/planetary/apod',
    description: 'Daily astronomy pictures with explanations',
    params: ['date', 'start_date', 'end_date', 'count', 'thumbs', 'concept_tags']
  },

  // 2. Asteroids - NeoWs (Near Earth Object Web Service)
  ASTEROIDS: {
    name: 'Near Earth Object Web Service',
    endpoint: '/neo/rest/v1',
    description: 'Near Earth asteroids data',
    subEndpoints: {
      feed: '/feed',
      lookup: '/neo/{asteroid_id}',
      browse: '/neo/browse',
      stats: '/stats'
    }
  },

  // 3. DONKI - Space Weather Database
  DONKI: {
    name: 'Space Weather Database Of Notifications, Knowledge, Information',
    endpoint: '/DONKI',
    description: 'Solar flares, coronal mass ejections, geomagnetic storms',
    subEndpoints: {
      cme: '/CME',
      cmeAnalysis: '/CMEAnalysis',
      gst: '/GST',
      ips: '/IPS',
      flr: '/FLR',
      sep: '/SEP',
      mpc: '/MPC',
      rbe: '/RBE',
      hss: '/HSS',
      wsa: '/WSAEnlilSimulations',
      notifications: '/notifications'
    }
  },

  // 4. Earth Imagery
  EARTH: {
    name: 'Earth Imagery',
    endpoint: '/planetary/earth',
    description: 'Landsat 8 Earth imagery',
    subEndpoints: {
      imagery: '/imagery',
      assets: '/assets'
    }
  },

  // 5. EPIC - Earth Polychromatic Imaging Camera
  EPIC: {
    name: 'Earth Polychromatic Imaging Camera',
    endpoint: '/EPIC/api',
    description: 'Full disc Earth images from DSCOVR satellite',
    subEndpoints: {
      natural: '/natural',
      enhanced: '/enhanced',
      images: '/natural/images/{date}',
      archive: '/natural/all'
    }
  },

  // 6. Exoplanets
  EXOPLANETS: {
    name: 'Exoplanet Archive',
    endpoint: '/exoplanet/archive',
    description: 'Confirmed exoplanet data',
    baseUrl: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
    params: ['query', 'format']
  },

  // 7. GeneLab
  GENELAB: {
    name: 'GeneLab Data',
    endpoint: '/genelab',
    description: 'Omics data from spaceflight and space-relevant experiments',
    baseUrl: 'https://genelab-data.ndc.nasa.gov/genelab/data'
  },

  // 8. Hubble Space Telescope
  HUBBLE: {
    name: 'Hubble Space Telescope',
    endpoint: '/hubble',
    description: 'Hubble telescope images and data',
    baseUrl: 'http://hubblesite.org/api/v3'
  },

  // 9. InSight Mars Weather
  INSIGHT: {
    name: 'InSight Mars Weather Service',
    endpoint: '/insight_weather',
    description: 'Weather data from Mars InSight lander',
    params: ['version', 'feedtype', 'ver']
  },

  // 10. Mars Rover Photos
  MARS_ROVERS: {
    name: 'Mars Rover Photos',
    endpoint: '/mars-photos/api/v1',
    description: 'Images from Mars rovers (Curiosity, Opportunity, Spirit)',
    subEndpoints: {
      rovers: '/rovers',
      photos: '/rovers/{rover}/photos',
      latest: '/rovers/{rover}/latest_photos'
    }
  },

  // 11. NASA Image and Video Library
  NASA_LIBRARY: {
    name: 'NASA Image and Video Library',
    endpoint: '/search',
    baseUrl: 'https://images-api.nasa.gov',
    description: 'NASA media library search'
  },

  // 12. Planetary Data System (PDS)
  PDS: {
    name: 'Planetary Data System',
    endpoint: '/pds',
    baseUrl: 'https://pds.nasa.gov/api',
    description: 'Planetary science data archives'
  },

  // 13. SSD/CNEOS - Small Body Database
  SSD: {
    name: 'Small Body Database',
    endpoint: '/ssd',
    baseUrl: 'https://ssd-api.jpl.nasa.gov',
    description: 'Small body database browser and API',
    subEndpoints: {
      sbdb: '/sbdb.api',
      cad: '/cad.api',
      fireball: '/fireball.api',
      scout: '/scout.api'
    }
  },

  // 14. Techport - NASA Technology Transfer
  TECHPORT: {
    name: 'NASA Technology Transfer',
    endpoint: '/techport/api',
    description: 'NASA technology transfer opportunities'
  },

  // 15. Patents
  PATENTS: {
    name: 'NASA Patents',
    endpoint: '/patents',
    description: 'NASA patent portfolio'
  },

  // 16. Sounds (NASA Audio)
  SOUNDS: {
    name: 'NASA Audio',
    endpoint: '/sounds',
    description: 'NASA audio and sound library'
  },

  // 17. NASA Power - Prediction Of Worldwide Energy Resources
  POWER: {
    name: 'Prediction Of Worldwide Energy Resources',
    baseUrl: 'https://power.larc.nasa.gov/api',
    endpoint: '/temporal',
    description: 'Solar and meteorological data'
  }
} as const;

export type NasaApiKey = keyof typeof NASA_APIS;

/**
 * Rate limiting configuration for NASA APIs
 */
export const RATE_LIMITS = {
  DEMO_KEY: {
    hourly: 30,
    daily: 50
  },
  REGISTERED_KEY: {
    hourly: 1000,
    daily: 50000
  }
};

/**
 * Common NASA API response types
 */
export interface NasaApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    api: string;
    version: string;
  };
}

/**
 * NASA API Error Codes
 */
export const NASA_ERROR_CODES = {
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_MISSING: 'API_KEY_MISSING',
  OVER_RATE_LIMIT: 'OVER_RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;