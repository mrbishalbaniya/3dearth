'use client';

import React, { useState, useEffect } from 'react';
import { useNasaApi } from '@/hooks/useNasaApi';

interface Exoplanet {
  pl_name: string;
  hostname: string;
  sy_snum: number;
  sy_pnum: number;
  discoverymethod: string;
  disc_year: number;
  disc_facility: string;
  pl_controv_flag: number;
  pl_pnum: number;
  pl_orbper: number;
  pl_orbsmax: number;
  pl_rade: number;
  pl_radj: number;
  pl_bmasse: number;
  pl_bmassj: number;
  pl_orbeccen: number;
  pl_insol: number;
  pl_eqt: number;
  st_spectype: string;
  st_teff: number;
  st_rad: number;
  st_mass: number;
  st_met: number;
  st_logg: number;
  sy_dist: number;
  sy_vmag: number;
  sy_kmag: number;
  sy_gaiamag: number;
  ra: number;
  dec: number;
  glat: number;
  glon: number;
  elat: number;
  elon: number;
}

interface ExoplanetArchiveResponse {
  columns: string[];
  data: any[][];
}

const ExoplanetsViewer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryMethod, setDiscoveryMethod] = useState('');
  const [yearRange, setYearRange] = useState({ min: 1995, max: 2024 });
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null);
  const [sortBy, setSortBy] = useState<keyof Exoplanet>('disc_year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    data: exoplanetsData,
    loading: exoplanetsLoading,
    error: exoplanetsError,
    fetchData
  } = useNasaApi<ExoplanetArchiveResponse>();

  const [processedExoplanets, setProcessedExoplanets] = useState<Exoplanet[]>([]);

  useEffect(() => {
    fetchExoplanetsData();
  }, []);

  useEffect(() => {
    if (exoplanetsData?.data) {
      const processed = processExoplanetsData(exoplanetsData);
      setProcessedExoplanets(processed);
    }
  }, [exoplanetsData]);

  const fetchExoplanetsData = () => {
    // NASA Exoplanet Archive TAP service
    const query = `
      select pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,disc_facility,
             pl_controv_flag,pl_pnum,pl_orbper,pl_orbsmax,pl_rade,pl_radj,
             pl_bmasse,pl_bmassj,pl_orbeccen,pl_insol,pl_eqt,st_spectype,
             st_teff,st_rad,st_mass,st_met,st_logg,sy_dist,sy_vmag,sy_kmag,
             sy_gaiamag,ra,dec,glat,glon,elat,elon
      from ps 
      where default_flag=1 
      order by disc_year desc
    `;
    
    // Create a custom API call function that matches the expected signature
    const tapApiCall = async () => {
      const url = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
      const params = new URLSearchParams({
        query: query.trim(),
        format: 'json'
      });
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new Error(`Exoplanet Archive API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          api: 'exoplanet-archive-tap',
          version: '1.0'
        }
      };
    };
    
    fetchData(tapApiCall);
  };

  const processExoplanetsData = (data: ExoplanetArchiveResponse): Exoplanet[] => {
    if (!data.columns || !data.data) return [];
    
    return data.data.map(row => {
      const planet: any = {};
      data.columns.forEach((column, index) => {
        planet[column] = row[index];
      });
      return planet as Exoplanet;
    });
  };

  const discoveryMethods = [
    'Transit', 'Radial Velocity', 'Microlensing', 'Direct Imaging', 
    'Astrometry', 'Eclipse Timing Variations', 'Orbital Brightness Modulation',
    'Pulsar Timing', 'Pulsation Timing Variations'
  ];

  const filteredExoplanets = processedExoplanets.filter(planet => {
    const matchesSearch = !searchQuery || 
      planet.pl_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      planet.hostname?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMethod = !discoveryMethod || 
      planet.discoverymethod?.toLowerCase().includes(discoveryMethod.toLowerCase());
    
    const matchesYear = planet.disc_year >= yearRange.min && planet.disc_year <= yearRange.max;
    
    return matchesSearch && matchesMethod && matchesYear;
  }).sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const formatNumber = (num: number, decimals = 2) => {
    if (num == null || isNaN(num)) return 'N/A';
    return num.toFixed(decimals);
  };

  const formatDistance = (distance: number) => {
    if (distance == null || isNaN(distance)) return 'N/A';
    if (distance > 1000) {
      return `${(distance / 1000).toFixed(1)}k ly`;
    }
    return `${distance.toFixed(1)} ly`;
  };

  const getHabitabilityScore = (planet: Exoplanet): { score: number; label: string; color: string } => {
    let score = 0;
    
    // Earth-like radius (0.5 to 2.0 Earth radii)
    if (planet.pl_rade >= 0.5 && planet.pl_rade <= 2.0) score += 25;
    
    // Earth-like mass (0.1 to 10 Earth masses)
    if (planet.pl_bmasse >= 0.1 && planet.pl_bmasse <= 10) score += 25;
    
    // Habitable zone temperature (200K to 350K)
    if (planet.pl_eqt >= 200 && planet.pl_eqt <= 350) score += 25;
    
    // Not too eccentric orbit (< 0.3)
    if (planet.pl_orbeccen < 0.3) score += 25;
    
    let label = 'Unknown';
    let color = 'gray';
    
    if (score >= 75) {
      label = 'Highly Habitable';
      color = 'green';
    } else if (score >= 50) {
      label = 'Potentially Habitable';
      color = 'yellow';
    } else if (score >= 25) {
      label = 'Marginally Habitable';
      color = 'orange';
    } else {
      label = 'Not Habitable';
      color = 'red';
    }
    
    return { score, label, color };
  };

  const renderPlanetCard = (planet: Exoplanet) => {
    const habitability = getHabitabilityScore(planet);
    
    return (
      <div
        key={planet.pl_name}
        className="bg-white p-6 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedPlanet(planet)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{planet.pl_name}</h3>
            <p className="text-gray-600">{planet.hostname} system</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium bg-${habitability.color}-100 text-${habitability.color}-800`}>
            {habitability.label}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Discovery Year</p>
            <p className="font-medium">{planet.disc_year || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-gray-600">Method</p>
            <p className="font-medium">{planet.discoverymethod || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-gray-600">Distance</p>
            <p className="font-medium">{formatDistance(planet.sy_dist)}</p>
          </div>
          <div>
            <p className="text-gray-600">Radius (Earth)</p>
            <p className="font-medium">{formatNumber(planet.pl_rade, 2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Mass (Earth)</p>
            <p className="font-medium">{formatNumber(planet.pl_bmasse, 2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Orbital Period</p>
            <p className="font-medium">{formatNumber(planet.pl_orbper, 1)} days</p>
          </div>
        </div>
        
        {planet.pl_eqt && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Equilibrium Temperature</p>
            <p className="font-medium">{formatNumber(planet.pl_eqt, 0)} K</p>
          </div>
        )}
      </div>
    );
  };

  const renderPlanetDetails = (planet: Exoplanet) => {
    const habitability = getHabitabilityScore(planet);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{planet.pl_name}</h2>
                <p className="text-gray-600">Orbiting {planet.hostname}</p>
              </div>
              <button
                onClick={() => setSelectedPlanet(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Planet Properties */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Planet Properties</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Radius (Earth radii):</span>
                    <span className="font-medium">{formatNumber(planet.pl_rade)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Radius (Jupiter radii):</span>
                    <span className="font-medium">{formatNumber(planet.pl_radj)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mass (Earth masses):</span>
                    <span className="font-medium">{formatNumber(planet.pl_bmasse)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mass (Jupiter masses):</span>
                    <span className="font-medium">{formatNumber(planet.pl_bmassj)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Equilibrium Temperature:</span>
                    <span className="font-medium">{formatNumber(planet.pl_eqt, 0)} K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insolation (Earth units):</span>
                    <span className="font-medium">{formatNumber(planet.pl_insol)}</span>
                  </div>
                </div>
              </div>

              {/* Orbital Properties */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Orbital Properties</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orbital Period:</span>
                    <span className="font-medium">{formatNumber(planet.pl_orbper, 2)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Semi-major Axis:</span>
                    <span className="font-medium">{formatNumber(planet.pl_orbsmax)} AU</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Eccentricity:</span>
                    <span className="font-medium">{formatNumber(planet.pl_orbeccen, 3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Planets in System:</span>
                    <span className="font-medium">{planet.sy_pnum || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stars in System:</span>
                    <span className="font-medium">{planet.sy_snum || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Stellar Properties */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Host Star Properties</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spectral Type:</span>
                    <span className="font-medium">{planet.st_spectype || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Effective Temperature:</span>
                    <span className="font-medium">{formatNumber(planet.st_teff, 0)} K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stellar Radius (Solar radii):</span>
                    <span className="font-medium">{formatNumber(planet.st_rad)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stellar Mass (Solar masses):</span>
                    <span className="font-medium">{formatNumber(planet.st_mass)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metallicity:</span>
                    <span className="font-medium">{formatNumber(planet.st_met)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Surface Gravity:</span>
                    <span className="font-medium">{formatNumber(planet.st_logg)} log10(cm/s²)</span>
                  </div>
                </div>
              </div>

              {/* Discovery & Location */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Discovery & Location</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discovery Year:</span>
                    <span className="font-medium">{planet.disc_year || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discovery Method:</span>
                    <span className="font-medium">{planet.discoverymethod || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discovery Facility:</span>
                    <span className="font-medium">{planet.disc_facility || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-medium">{formatDistance(planet.sy_dist)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Right Ascension:</span>
                    <span className="font-medium">{formatNumber(planet.ra)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Declination:</span>
                    <span className="font-medium">{formatNumber(planet.dec)}°</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Habitability Assessment */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Habitability Assessment</h3>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded font-medium bg-${habitability.color}-100 text-${habitability.color}-800`}>
                  {habitability.label}
                </span>
                <span className="text-gray-600">
                  Score: {habitability.score}/100
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Based on radius, mass, temperature, and orbital eccentricity compared to Earth-like conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            NASA Exoplanet Archive
          </h1>
          <p className="text-gray-600">
            Explore confirmed exoplanets and their properties
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Planets/Stars
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Kepler, TRAPPIST, TOI"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discovery Method
              </label>
              <select
                value={discoveryMethod}
                onChange={(e) => setDiscoveryMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Methods</option>
                {discoveryMethods.map(method => (
                  <option key={method} value={method.toLowerCase()}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discovery Year (Min)
              </label>
              <input
                type="number"
                value={yearRange.min}
                onChange={(e) => setYearRange(prev => ({ ...prev, min: parseInt(e.target.value) || 1995 }))}
                min={1995}
                max={2024}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discovery Year (Max)
              </label>
              <input
                type="number"
                value={yearRange.max}
                onChange={(e) => setYearRange(prev => ({ ...prev, max: parseInt(e.target.value) || 2024 }))}
                min={1995}
                max={2024}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as keyof Exoplanet)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="disc_year">Discovery Year</option>
                <option value="sy_dist">Distance</option>
                <option value="pl_rade">Planet Radius</option>
                <option value="pl_bmasse">Planet Mass</option>
                <option value="pl_orbper">Orbital Period</option>
                <option value="pl_eqt">Temperature</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredExoplanets.length}</span> of{' '}
            <span className="font-semibold">{processedExoplanets.length}</span> confirmed exoplanets
          </p>
        </div>

        {/* Error Display */}
        {exoplanetsError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-800">Error: {exoplanetsError}</p>
          </div>
        )}

        {/* Loading Display */}
        {exoplanetsLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Exoplanets Grid */}
        {!exoplanetsLoading && filteredExoplanets.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredExoplanets.slice(0, 50).map(renderPlanetCard)}
          </div>
        )}

        {/* No Results */}
        {!exoplanetsLoading && filteredExoplanets.length === 0 && processedExoplanets.length > 0 && (
          <div className="text-center py-12 text-gray-600">
            No exoplanets match your current filters. Try adjusting your search criteria.
          </div>
        )}

        {/* Planet Details Modal */}
        {selectedPlanet && renderPlanetDetails(selectedPlanet)}
      </div>
    </div>
  );
};

export { ExoplanetsViewer };