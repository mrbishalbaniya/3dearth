'use client';

import React, { useState, useEffect } from 'react';
import { useNasaApi } from '@/hooks/useNasaApi';

interface SolarFlare {
  flrID: string;
  instruments: Array<{
    displayName: string;
  }>;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number;
  note: string;
  linkedEvents: Array<{
    activityID: string;
  }>;
}

interface CoronalMassEjection {
  activityID: string;
  catalog: string;
  startTime: string;
  sourceLocation: string;
  activeRegionNum: number;
  note: string;
  instruments: Array<{
    displayName: string;
  }>;
  cmeAnalyses: Array<{
    time21_5: string;
    latitude: number;
    longitude: number;
    halfAngle: number;
    speed: number;
    type: string;
    isMostAccurate: boolean;
    note: string;
  }>;
  linkedEvents: Array<{
    activityID: string;
  }>;
}

interface GeomagneticStorm {
  gstID: string;
  startTime: string;
  allKpIndex: Array<{
    observedTime: string;
    kpIndex: number;
    source: string;
  }>;
  linkedEvents: Array<{
    activityID: string;
  }>;
}

interface SolarEnergeticParticle {
  sepID: string;
  eventTime: string;
  instruments: Array<{
    displayName: string;
  }>;
  linkedEvents: Array<{
    activityID: string;
  }>;
}

interface MagnetopauseCrossing {
  mpcID: string;
  eventTime: string;
  instruments: Array<{
    displayName: string;
  }>;
}

interface RadiationBeltEnhancement {
  rbeID: string;
  eventTime: string;
  instruments: Array<{
    displayName: string;
  }>;
}

interface HighSpeedStream {
  hssID: string;
  eventTime: string;
  instruments: Array<{
    displayName: string;
  }>;
  linkedEvents: Array<{
    activityID: string;
  }>;
}

const SpaceWeatherViewer: React.FC = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return thirtyDaysAgo.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [activeTab, setActiveTab] = useState<'flr' | 'cme' | 'gst' | 'sep' | 'mpc' | 'rbe' | 'hss'>('flr');

  const {
    data: solarFlares,
    loading: flrLoading,
    error: flrError,
    fetchData: fetchSolarFlares
  } = useNasaApi<SolarFlare[]>();

  const {
    data: cmes,
    loading: cmeLoading,
    error: cmeError,
    fetchData: fetchCMEs
  } = useNasaApi<CoronalMassEjection[]>();

  const {
    data: geomagneticStorms,
    loading: gstLoading,
    error: gstError,
    fetchData: fetchGeomagneticStorms
  } = useNasaApi<GeomagneticStorm[]>();

  const {
    data: seps,
    loading: sepLoading,
    error: sepError,
    fetchData: fetchSEPs
  } = useNasaApi<SolarEnergeticParticle[]>();

  const {
    data: mpcs,
    loading: mpcLoading,
    error: mpcError,
    fetchData: fetchMPCs
  } = useNasaApi<MagnetopauseCrossing[]>();

  const {
    data: rbes,
    loading: rbeLoading,
    error: rbeError,
    fetchData: fetchRBEs
  } = useNasaApi<RadiationBeltEnhancement[]>();

  const {
    data: hsses,
    loading: hssLoading,
    error: hssError,
    fetchData: fetchHSSes
  } = useNasaApi<HighSpeedStream[]>();

  useEffect(() => {
    fetchCurrentData();
  }, [activeTab]);

  const fetchCurrentData = () => {
    const params = {
      startDate,
      endDate
    };

    // Create custom API call functions for each DONKI endpoint
    const createDonkiApiCall = (endpoint: string) => async () => {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        api_key: process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY'
      });
      
      const url = `https://api.nasa.gov/${endpoint}?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NASA DONKI API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          api: `nasa-donki-${endpoint.split('/')[1].toLowerCase()}`,
          version: '1.0'
        }
      };
    };

    switch (activeTab) {
      case 'flr':
        fetchSolarFlares(createDonkiApiCall('DONKI/FLR'));
        break;
      case 'cme':
        fetchCMEs(createDonkiApiCall('DONKI/CME'));
        break;
      case 'gst':
        fetchGeomagneticStorms(createDonkiApiCall('DONKI/GST'));
        break;
      case 'sep':
        fetchSEPs(createDonkiApiCall('DONKI/SEP'));
        break;
      case 'mpc':
        fetchMPCs(createDonkiApiCall('DONKI/MPC'));
        break;
      case 'rbe':
        fetchRBEs(createDonkiApiCall('DONKI/RBE'));
        break;
      case 'hss':
        fetchHSSes(createDonkiApiCall('DONKI/HSS'));
        break;
    }
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString();
  };

  const getFlareClass = (classType: string) => {
    if (!classType) return { color: 'gray', intensity: 'Unknown' };
    
    const firstChar = classType.charAt(0);
    switch (firstChar) {
      case 'X':
        return { color: 'red', intensity: 'Extreme' };
      case 'M':
        return { color: 'orange', intensity: 'Strong' };
      case 'C':
        return { color: 'yellow', intensity: 'Moderate' };
      case 'B':
        return { color: 'blue', intensity: 'Small' };
      case 'A':
        return { color: 'green', intensity: 'Minor' };
      default:
        return { color: 'gray', intensity: 'Unknown' };
    }
  };

  const renderSolarFlares = () => (
    <div className="space-y-4">
      {solarFlares?.map((flare) => {
        const flareClass = getFlareClass(flare.classType);
        return (
          <div key={flare.flrID} className="bg-white p-6 rounded-lg border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Solar Flare {flare.flrID}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium bg-${flareClass.color}-100 text-${flareClass.color}-800`}
                  >
                    {flare.classType || 'Unknown Class'}
                  </span>
                  <span className="text-gray-600 text-sm">
                    {flareClass.intensity} Intensity
                  </span>
                </div>
              </div>
              {flare.activeRegionNum && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Active Region</p>
                  <p className="font-medium">{flare.activeRegionNum}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Begin Time</p>
                <p className="font-medium">{formatDateTime(flare.beginTime)}</p>
              </div>
              <div>
                <p className="text-gray-600">Peak Time</p>
                <p className="font-medium">{formatDateTime(flare.peakTime)}</p>
              </div>
              <div>
                <p className="text-gray-600">End Time</p>
                <p className="font-medium">{formatDateTime(flare.endTime)}</p>
              </div>
            </div>

            {flare.sourceLocation && (
              <div className="mt-4">
                <p className="text-gray-600 text-sm">Source Location</p>
                <p className="font-medium">{flare.sourceLocation}</p>
              </div>
            )}

            {flare.instruments?.length > 0 && (
              <div className="mt-4">
                <p className="text-gray-600 text-sm">Observing Instruments</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {flare.instruments.map((instrument, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded"
                    >
                      {instrument.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {flare.note && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-700">{flare.note}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderCMEs = () => (
    <div className="space-y-4">
      {cmes?.map((cme) => (
        <div key={cme.activityID} className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Coronal Mass Ejection {cme.activityID}
              </h3>
              <p className="text-gray-600 text-sm">Catalog: {cme.catalog}</p>
            </div>
            {cme.activeRegionNum && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Active Region</p>
                <p className="font-medium">{cme.activeRegionNum}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-600">Start Time</p>
              <p className="font-medium">{formatDateTime(cme.startTime)}</p>
            </div>
            <div>
              <p className="text-gray-600">Source Location</p>
              <p className="font-medium">{cme.sourceLocation || 'N/A'}</p>
            </div>
          </div>

          {cme.cmeAnalyses?.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">CME Analysis</h4>
              {cme.cmeAnalyses.map((analysis, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded mb-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Speed</p>
                      <p className="font-medium">{analysis.speed} km/s</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Half Angle</p>
                      <p className="font-medium">{analysis.halfAngle}°</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Latitude</p>
                      <p className="font-medium">{analysis.latitude}°</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Longitude</p>
                      <p className="font-medium">{analysis.longitude}°</p>
                    </div>
                  </div>
                  {analysis.isMostAccurate && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Most Accurate Analysis
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {cme.instruments?.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-600 text-sm">Observing Instruments</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {cme.instruments.map((instrument, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded"
                  >
                    {instrument.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {cme.note && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-700">{cme.note}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderGeomagneticStorms = () => (
    <div className="space-y-4">
      {geomagneticStorms?.map((storm) => (
        <div key={storm.gstID} className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Geomagnetic Storm {storm.gstID}
            </h3>
            <div className="text-right">
              <p className="text-sm text-gray-600">Start Time</p>
              <p className="font-medium">{formatDateTime(storm.startTime)}</p>
            </div>
          </div>

          {storm.allKpIndex?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Kp Index Values</h4>
              <div className="space-y-2">
                {storm.allKpIndex.slice(0, 10).map((kp, index) => {
                  let kpClass = 'bg-green-100 text-green-800';
                  if (kp.kpIndex >= 5) kpClass = 'bg-red-100 text-red-800';
                  else if (kp.kpIndex >= 4) kpClass = 'bg-orange-100 text-orange-800';
                  else if (kp.kpIndex >= 3) kpClass = 'bg-yellow-100 text-yellow-800';

                  return (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {formatDateTime(kp.observedTime)}
                        </p>
                        <p className="text-xs text-gray-600">Source: {kp.source}</p>
                      </div>
                      <span className={`px-3 py-1 rounded font-medium ${kpClass}`}>
                        Kp {kp.kpIndex}
                      </span>
                    </div>
                  );
                })}
                {storm.allKpIndex.length > 10 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... and {storm.allKpIndex.length - 10} more readings
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: 'flr', label: 'Solar Flares', count: solarFlares?.length },
    { id: 'cme', label: 'CMEs', count: cmes?.length },
    { id: 'gst', label: 'Geomagnetic Storms', count: geomagneticStorms?.length },
    { id: 'sep', label: 'Solar Particles', count: seps?.length },
    { id: 'mpc', label: 'Magnetopause', count: mpcs?.length },
    { id: 'rbe', label: 'Radiation Belt', count: rbes?.length },
    { id: 'hss', label: 'High Speed Streams', count: hsses?.length }
  ];

  const currentLoading = {
    flr: flrLoading,
    cme: cmeLoading,
    gst: gstLoading,
    sep: sepLoading,
    mpc: mpcLoading,
    rbe: rbeLoading,
    hss: hssLoading
  }[activeTab];

  const currentError = {
    flr: flrError,
    cme: cmeError,
    gst: gstError,
    sep: sepError,
    mpc: mpcError,
    rbe: rbeError,
    hss: hssError
  }[activeTab];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Space Weather (DONKI)
          </h1>
          <p className="text-gray-600">
            Database of Notifications, Knowledge, Information for space weather events
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white p-6 rounded-lg border mb-6">
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
                onClick={fetchCurrentData}
                disabled={currentLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {currentLoading ? 'Loading...' : 'Update'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
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
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-800">Error: {currentError}</p>
          </div>
        )}

        {/* Loading Display */}
        {currentLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Content */}
        {!currentLoading && (
          <div>
            {activeTab === 'flr' && renderSolarFlares()}
            {activeTab === 'cme' && renderCMEs()}
            {activeTab === 'gst' && renderGeomagneticStorms()}
            {activeTab === 'sep' && (
              <div className="text-center py-12 text-gray-600">
                Solar Energetic Particle events will be displayed here
              </div>
            )}
            {activeTab === 'mpc' && (
              <div className="text-center py-12 text-gray-600">
                Magnetopause Crossing events will be displayed here
              </div>
            )}
            {activeTab === 'rbe' && (
              <div className="text-center py-12 text-gray-600">
                Radiation Belt Enhancement events will be displayed here
              </div>
            )}
            {activeTab === 'hss' && (
              <div className="text-center py-12 text-gray-600">
                High Speed Stream events will be displayed here
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { SpaceWeatherViewer };