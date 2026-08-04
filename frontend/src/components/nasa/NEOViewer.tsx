'use client';

import React, { useState, useEffect } from 'react';
import { useNasaApi } from '@/hooks/useNasaApi';

interface NearEarthObject {
  id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
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
  }>;
  is_sentry_object: boolean;
}

interface NEOFeedResponse {
  links: {
    next: string;
    prev: string;
    self: string;
  };
  element_count: number;
  near_earth_objects: Record<string, NearEarthObject[]>;
}

interface NEOLookupResponse extends NearEarthObject {
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

const NEOViewer: React.FC = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString().split('T')[0];
  });
  const [selectedNeoId, setSelectedNeoId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'feed' | 'lookup' | 'browse'>('feed');

  const { 
    data: neoFeed, 
    loading: feedLoading, 
    error: feedError,
    fetchData: fetchNeoFeed
  } = useNasaApi<NEOFeedResponse>();

  const {
    data: neoLookup,
    loading: lookupLoading,
    error: lookupError,
    fetchData: fetchNeoLookup
  } = useNasaApi<NEOLookupResponse>();

  const {
    data: neoBrowse,
    loading: browseLoading,
    error: browseError,
    fetchData: fetchNeoBrowse
  } = useNasaApi<{ links: any; page: any; near_earth_objects: NearEarthObject[] }>();

  // Fallback NEO data for offline mode
  const fallbackNeoFeed: NEOFeedResponse = {
    links: {
      next: "",
      prev: "",
      self: "https://api.nasa.gov/neo/rest/v1/feed"
    },
    element_count: 3,
    near_earth_objects: {
      [startDate]: [
        {
          id: "54016439",
          name: "(2020 SO)",
          nasa_jpl_url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54016439",
          absolute_magnitude_h: 28.2,
          estimated_diameter: {
            kilometers: {
              estimated_diameter_min: 0.004,
              estimated_diameter_max: 0.009
            }
          },
          is_potentially_hazardous_asteroid: false,
          close_approach_data: [{
            close_approach_date: startDate,
            close_approach_date_full: `${startDate}T12:00`,
            epoch_date_close_approach: Date.now(),
            relative_velocity: {
              kilometers_per_second: "0.5",
              kilometers_per_hour: "1800",
              miles_per_hour: "1118"
            },
            miss_distance: {
              astronomical: "0.002",
              lunar: "0.8",
              kilometers: "300000",
              miles: "186411"
            },
            orbiting_body: "Earth"
          }],
          is_sentry_object: false
        },
        {
          id: "2465633",
          name: "465633 (2009 JR5)",
          nasa_jpl_url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2465633",
          absolute_magnitude_h: 20.8,
          estimated_diameter: {
            kilometers: {
              estimated_diameter_min: 0.2,
              estimated_diameter_max: 0.4
            }
          },
          is_potentially_hazardous_asteroid: true,
          close_approach_data: [{
            close_approach_date: endDate,
            close_approach_date_full: `${endDate}T08:30`,
            epoch_date_close_approach: Date.now() + 7 * 24 * 60 * 60 * 1000,
            relative_velocity: {
              kilometers_per_second: "15.2",
              kilometers_per_hour: "54720",
              miles_per_hour: "33993"
            },
            miss_distance: {
              astronomical: "0.05",
              lunar: "19.4",
              kilometers: "7480000",
              miles: "4649000"
            },
            orbiting_body: "Earth"
          }],
          is_sentry_object: false
        }
      ]
    }
  };

  useEffect(() => {
    // Don't make automatic API calls - wait for user to click Search button
    // handleFetchFeed(); // Removed to prevent console errors
  }, []);

  const handleFetchFeed = () => {
    // Create a custom API call function for NEO feed
    const neoFeedCall = async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        detailed: 'true',
        api_key: process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY'
      });
      
      const url = `https://api.nasa.gov/neo/rest/v1/feed?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NASA NEO API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          api: 'nasa-neo-feed',
          version: '1.0'
        }
      };
    };

    fetchNeoFeed(neoFeedCall);
  };

  const handleLookupNeo = () => {
    if (selectedNeoId.trim()) {
      // Create a custom API call function for NEO lookup
      const neoLookupCall = async () => {
        const params = new URLSearchParams({
          api_key: process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY'
        });
        
        const url = `https://api.nasa.gov/neo/rest/v1/neo/${selectedNeoId.trim()}?${params}`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`NASA NEO Lookup API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          data,
          metadata: {
            timestamp: new Date().toISOString(),
            api: 'nasa-neo-lookup',
            version: '1.0'
          }
        };
      };

      fetchNeoLookup(neoLookupCall);
    }
  };

  const handleBrowseNeos = () => {
    // Create a custom API call function for NEO browse
    const neoBrowseCall = async () => {
      const params = new URLSearchParams({
        page: '0',
        size: '20',
        api_key: process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY'
      });
      
      const url = `https://api.nasa.gov/neo/rest/v1/neo/browse?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NASA NEO Browse API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          api: 'nasa-neo-browse',
          version: '1.0'
        }
      };
    };

    fetchNeoBrowse(neoBrowseCall);
  };

  const formatDistance = (kilometers: string) => {
    const km = parseFloat(kilometers);
    if (km > 1000000) {
      return `${(km / 1000000).toFixed(2)}M km`;
    } else if (km > 1000) {
      return `${(km / 1000).toFixed(2)}K km`;
    }
    return `${km.toFixed(0)} km`;
  };

  const formatDiameter = (min: number, max: number) => {
    if (min > 1) {
      return `${min.toFixed(1)} - ${max.toFixed(1)} km`;
    }
    return `${(min * 1000).toFixed(0)} - ${(max * 1000).toFixed(0)} m`;
  };

  const renderNeoCard = (neo: NearEarthObject) => {
    const approach = neo.close_approach_data[0];
    return (
      <div
        key={neo.id}
        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
          neo.is_potentially_hazardous_asteroid
            ? 'border-red-300 bg-red-50 hover:bg-red-100'
            : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
        onClick={() => {
          setSelectedNeoId(neo.id);
          setActiveTab('lookup');
          handleLookupNeo();
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900">{neo.name}</h3>
          {neo.is_potentially_hazardous_asteroid && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
              Potentially Hazardous
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Diameter:</p>
            <p className="font-medium">
              {formatDiameter(
                neo.estimated_diameter.kilometers.estimated_diameter_min,
                neo.estimated_diameter.kilometers.estimated_diameter_max
              )}
            </p>
          </div>
          
          <div>
            <p className="text-gray-600">Magnitude:</p>
            <p className="font-medium">{neo.absolute_magnitude_h.toFixed(1)}</p>
          </div>
          
          {approach && (
            <>
              <div>
                <p className="text-gray-600">Closest Approach:</p>
                <p className="font-medium">
                  {new Date(approach.close_approach_date).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-gray-600">Miss Distance:</p>
                <p className="font-medium">
                  {formatDistance(approach.miss_distance.kilometers)}
                </p>
              </div>
              
              <div className="col-span-2">
                <p className="text-gray-600">Velocity:</p>
                <p className="font-medium">
                  {parseFloat(approach.relative_velocity.kilometers_per_hour).toLocaleString()} km/h
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderNeoDetails = (neo: NEOLookupResponse) => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">{neo.name}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Physical Properties</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Diameter:</span>
                <span className="font-medium">
                  {formatDiameter(
                    neo.estimated_diameter.kilometers.estimated_diameter_min,
                    neo.estimated_diameter.kilometers.estimated_diameter_max
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Absolute Magnitude:</span>
                <span className="font-medium">{neo.absolute_magnitude_h.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Potentially Hazardous:</span>
                <span className={`font-medium ${neo.is_potentially_hazardous_asteroid ? 'text-red-600' : 'text-green-600'}`}>
                  {neo.is_potentially_hazardous_asteroid ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {neo.orbital_data && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Orbital Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Orbital Period:</span>
                  <span className="font-medium">
                    {parseFloat(neo.orbital_data.orbital_period).toFixed(2)} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Eccentricity:</span>
                  <span className="font-medium">
                    {parseFloat(neo.orbital_data.eccentricity).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Semi-major Axis:</span>
                  <span className="font-medium">{neo.orbital_data.semi_major_axis} AU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inclination:</span>
                  <span className="font-medium">
                    {parseFloat(neo.orbital_data.inclination).toFixed(2)}°
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Close Approaches</h3>
          <div className="space-y-3">
            {neo.close_approach_data.map((approach, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Date:</p>
                    <p className="font-medium">
                      {new Date(approach.close_approach_date_full).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Distance:</p>
                    <p className="font-medium">
                      {formatDistance(approach.miss_distance.kilometers)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Velocity:</p>
                    <p className="font-medium">
                      {parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(2)} km/s
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Orbiting:</p>
                    <p className="font-medium">{approach.orbiting_body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Near Earth Objects (NEO)
          </h1>
          <p className="text-gray-600">
            Explore asteroids and comets that come close to Earth's orbit
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'feed', label: 'Recent Approaches' },
            { id: 'lookup', label: 'NEO Details' },
            { id: 'browse', label: 'Browse All' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Filter by Date Range
              </h2>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleFetchFeed}
                    disabled={feedLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {feedLoading ? 'Loading...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {feedError && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">⚠️ NASA API temporarily unavailable - showing sample data</p>
                <button
                  onClick={handleFetchFeed}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  🔄 Try Live API
                </button>
              </div>
            )}

            {(neoFeed || feedError) && (
              <div className="space-y-6">
                {feedError && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      📡 Offline Content - Connect to internet for live NEO data
                    </p>
                  </div>
                )}
                
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-gray-600">
                    Found <span className="font-semibold">{(neoFeed || fallbackNeoFeed).element_count}</span> near Earth objects
                  </p>
                </div>

                {Object.entries((neoFeed || fallbackNeoFeed).near_earth_objects).map(([date, neos]) => (
                  <div key={date} className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {neos.map(renderNeoCard)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lookup Tab */}
        {activeTab === 'lookup' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Lookup Specific NEO
              </h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={selectedNeoId}
                  onChange={(e) => setSelectedNeoId(e.target.value)}
                  placeholder="Enter NEO ID (e.g., 54016439)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleLookupNeo}
                  disabled={lookupLoading || !selectedNeoId.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {lookupLoading ? 'Loading...' : 'Lookup'}
                </button>
              </div>
            </div>

            {lookupError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Error: {lookupError}</p>
              </div>
            )}

            {neoLookup && renderNeoDetails(neoLookup)}
          </div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Browse All NEOs
                </h2>
                <button
                  onClick={handleBrowseNeos}
                  disabled={browseLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {browseLoading ? 'Loading...' : 'Load NEOs'}
                </button>
              </div>
            </div>

            {browseError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Error: {browseError}</p>
              </div>
            )}

            {neoBrowse && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {neoBrowse.near_earth_objects.map(renderNeoCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { NEOViewer };