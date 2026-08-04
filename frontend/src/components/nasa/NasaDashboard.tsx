'use client';

import React, { useState, useEffect } from 'react';
import { APODViewer } from './APODViewer';
import { MarsRoverViewer } from './MarsRoverViewer';
import { EarthFromSpaceViewer } from './EarthFromSpaceViewer';
import { NEOViewer } from './NEOViewer';
import { SpaceWeatherViewer } from './SpaceWeatherViewer';
import { ExoplanetsViewer } from './ExoplanetsViewer';
import { NasaMediaViewer } from './NasaMediaViewer';
import { useNasaApiService } from '@/hooks/useNasaApi';

type DashboardTab = 
  | 'overview' 
  | 'apod' 
  | 'mars' 
  | 'earth' 
  | 'neo' 
  | 'weather' 
  | 'exoplanets' 
  | 'media';

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: string;
  description: string;
  component: React.ComponentType;
}

const NasaDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  
  const nasaApi = useNasaApiService();

  // Test API connection on mount - DISABLED to prevent console errors
  useEffect(() => {
    // Skip automatic connection test to prevent console "Failed to fetch" errors
    // User can manually test connection by clicking on tabs
    setApiStatus('error'); // Default to offline mode for better UX
  }, []);

  const tabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '🏠',
      description: 'NASA API Dashboard',
      component: () => (
        <div className="nasa-overview">
          <div className="nasa-overview__hero">
            <h2>🚀 NASA Data Explorer</h2>
            <p>
              Explore the universe through NASA's vast collection of space data, images, and scientific information. 
              From Mars rover photos to astronomy pictures of the day, discover the wonders of space exploration.
            </p>
          </div>

          {/* API Status Indicator */}
          <div className={`nasa-api-status nasa-api-status--${apiStatus}`}>
            <div className="nasa-api-status__indicator">
              {apiStatus === 'loading' && '🔄'}
              {apiStatus === 'connected' && '✅'}
              {apiStatus === 'error' && '⚠️'}
            </div>
            <div className="nasa-api-status__text">
              {apiStatus === 'loading' && 'Checking NASA API connection...'}
              {apiStatus === 'connected' && 'NASA APIs connected - live data available'}
              {apiStatus === 'error' && 'Offline mode - showing sample NASA content'}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="nasa-overview__stats">
            <div className="nasa-stat">
              <span className="nasa-stat__value">13,000+</span>
              <span className="nasa-stat__label">Astronomy Pictures</span>
            </div>
            <div className="nasa-stat">
              <span className="nasa-stat__value">500K+</span>
              <span className="nasa-stat__label">Mars Rover Photos</span>
            </div>
            <div className="nasa-stat">
              <span className="nasa-stat__value">28,000+</span>
              <span className="nasa-stat__label">Near Earth Objects</span>
            </div>
            <div className="nasa-stat">
              <span className="nasa-stat__value">5,000+</span>
              <span className="nasa-stat__label">Confirmed Exoplanets</span>
            </div>
          </div>

          {/* Featured Content */}
          <div className="nasa-overview__featured">
            <h3>🌟 Featured Datasets</h3>
            <div className="nasa-feature-grid">
              <div className="nasa-feature-card" onClick={() => setActiveTab('apod')}>
                <div className="nasa-feature-card__icon">🌌</div>
                <h4>Astronomy Picture of the Day</h4>
                <p>Daily stunning images and explanations from our universe</p>
              </div>
              <div className="nasa-feature-card" onClick={() => setActiveTab('mars')}>
                <div className="nasa-feature-card__icon">🔴</div>
                <h4>Mars Exploration</h4>
                <p>Photos and data from rovers exploring the Red Planet</p>
              </div>
              <div className="nasa-feature-card" onClick={() => setActiveTab('earth')}>
                <div className="nasa-feature-card__icon">🌍</div>
                <h4>Earth from Space</h4>
                <p>Satellite imagery and Earth observation data</p>
              </div>
              <div className="nasa-feature-card" onClick={() => setActiveTab('neo')}>
                <div className="nasa-feature-card__icon">☄️</div>
                <h4>Near Earth Objects</h4>
                <p>Tracking asteroids and comets near our planet</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'apod',
      label: 'Astronomy Picture',
      icon: '🌌',
      description: 'Astronomy Picture of the Day',
      component: APODViewer
    },
    {
      id: 'mars',
      label: 'Mars Rovers',
      icon: '🔴',
      description: 'Mars Rover Photos',
      component: MarsRoverViewer
    },
    {
      id: 'earth',
      label: 'Earth from Space',
      icon: '🌍',
      description: 'Earth Imagery from EPIC & Landsat',
      component: EarthFromSpaceViewer
    },
    {
      id: 'neo',
      label: 'Near Earth Objects',
      icon: '☄️',
      description: 'Asteroids and Comets',
      component: NEOViewer
    },
    {
      id: 'weather',
      label: 'Space Weather',
      icon: '⚡',
      description: 'Solar Activity & Geomagnetic Events',
      component: SpaceWeatherViewer
    },
    {
      id: 'exoplanets',
      label: 'Exoplanets',
      icon: '🪐',
      description: 'Planets Beyond Our Solar System',
      component: ExoplanetsViewer
    },
    {
      id: 'media',
      label: 'Media Library',
      icon: '📸',
      description: 'NASA Images, Videos & Audio',
      component: NasaMediaViewer
    }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white p-8 rounded-xl">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            NASA API Dashboard
          </h1>
          <p className="text-xl text-blue-100 mb-6">
            Explore the universe through NASA's comprehensive collection of APIs and data services
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="text-2xl mb-1">17</div>
              <div className="text-blue-200">NASA APIs</div>
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="text-2xl mb-1">∞</div>
              <div className="text-blue-200">Space Data</div>
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="text-2xl mb-1">📡</div>
              <div className="text-blue-200">Real-time</div>
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-blue-200">Missions</div>
            </div>
          </div>
        </div>
      </div>

      {/* API Categories */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tabs.slice(1).map((tab) => (
          <div
            key={tab.id}
            className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{tab.icon}</span>
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                {tab.label}
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              {tab.description}
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              Explore {tab.label}
              <span className="ml-1 transform group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Featured APIs */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured NASA APIs</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Earth & Space Observation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">APOD - Astronomy Picture of the Day</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">EPIC - Earth Polychromatic Imaging Camera</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Landsat 8 - Earth Imagery</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mars Rover Photos</span>
                <span className="text-green-600">✓</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Space Science & Exploration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Near Earth Object Web Service</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Space Weather Database (DONKI)</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Exoplanet Archive</span>
                <span className="text-green-600">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">NASA Image and Video Library</span>
                <span className="text-green-600">✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">5,000+</div>
          <div className="text-blue-100 text-sm">Confirmed Exoplanets</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">35,000+</div>
          <div className="text-green-100 text-sm">Near Earth Objects</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">600,000+</div>
          <div className="text-red-100 text-sm">Mars Photos</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
          <div className="text-2xl font-bold">150,000+</div>
          <div className="text-purple-100 text-sm">Media Items</div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">API Key</h3>
            <p className="text-gray-600 text-sm mb-2">
              Most NASA APIs work with the demo key 'DEMO_KEY', but for production use, 
              get your free API key from:
            </p>
            <a
              href="https://api.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              https://api.nasa.gov/ →
            </a>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Rate Limits</h3>
            <p className="text-gray-600 text-sm">
              DEMO_KEY: 30 requests per hour, 50 requests per day<br />
              Personal API Key: 1,000 requests per hour
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Styles */}
      <style jsx>{`
        .nasa-dashboard {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          min-height: calc(100vh - 100px);
        }

        .nasa-overview {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .nasa-overview__hero {
          text-align: center;
          padding: 2rem;
          background: linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #dc2626 100%);
          border-radius: 20px;
          color: white;
        }

        .nasa-overview__hero h2 {
          font-size: 2.5rem;
          margin: 0 0 1rem 0;
          font-weight: 800;
        }

        .nasa-overview__hero p {
          font-size: 1.1rem;
          margin: 0;
          opacity: 0.9;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }

        .nasa-api-status {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          border: 2px solid;
        }

        .nasa-api-status--loading {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
          color: #1e40af;
        }

        .nasa-api-status--connected {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
          color: #15803d;
        }

        .nasa-api-status--error {
          background: rgba(248, 113, 113, 0.1);
          border-color: #f87171;
          color: #dc2626;
        }

        .nasa-api-status__indicator {
          font-size: 1.5rem;
        }

        .nasa-overview__stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .nasa-stat {
          text-align: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(124, 58, 237, 0.1));
          border-radius: 16px;
          border: 1px solid rgba(30, 64, 175, 0.2);
        }

        .nasa-stat__value {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 0.5rem;
        }

        .nasa-stat__label {
          display: block;
          font-size: 0.9rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
        }

        .nasa-overview__featured h3 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: #1f2937;
          text-align: center;
        }

        .nasa-feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .nasa-feature-card {
          padding: 2rem;
          background: white;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .nasa-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          border-color: #3b82f6;
        }

        .nasa-feature-card__icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .nasa-feature-card h4 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #1f2937;
        }

        .nasa-feature-card p {
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .nasa-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 16px;
          overflow-x: auto;
          margin-bottom: 2rem;
        }

        .nasa-tab {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border: 2px solid transparent;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          min-width: 150px;
          font-weight: 600;
          color: #6b7280;
        }

        .nasa-tab:hover {
          border-color: #e5e7eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .nasa-tab--active {
          background: linear-gradient(135deg, #1e40af, #7c3aed);
          color: white;
          border-color: #1e40af;
        }

        .nasa-tab__icon {
          font-size: 1.5rem;
        }

        .nasa-tab__content {
          display: flex;
          flex-direction: column;
        }

        .nasa-tab__label {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .nasa-tab__desc {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .nasa-content {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid #e5e7eb;
          min-height: 400px;
        }

        @media (max-width: 768px) {
          .nasa-dashboard {
            padding: 1rem;
          }

          .nasa-overview__hero h2 {
            font-size: 2rem;
          }

          .nasa-overview__stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .nasa-feature-grid {
            grid-template-columns: 1fr;
          }

          .nasa-tabs {
            padding: 0.5rem;
          }

          .nasa-tab {
            padding: 0.75rem;
            min-width: 120px;
          }
        }
      `}</style>
    </div>
  );

  const renderActiveComponent = () => {
    if (activeTab === 'overview') {
      return renderOverview();
    }
    
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (activeTabConfig) {
      const Component = activeTabConfig.component;
      return <Component />;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {renderActiveComponent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">NASA APIs</h3>
              <p className="text-gray-600 text-sm">
                Explore the universe through NASA's open data and APIs. 
                All data is provided by NASA and is in the public domain.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Resources</h3>
              <div className="space-y-2">
                <a
                  href="https://api.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:text-blue-800 text-sm"
                >
                  NASA API Portal
                </a>
                <a
                  href="https://nasa.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:text-blue-800 text-sm"
                >
                  NASA Official Website
                </a>
                <a
                  href="https://github.com/nasa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:text-blue-800 text-sm"
                >
                  NASA on GitHub
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Earth 3D Project</h3>
              <p className="text-gray-600 text-sm">
                Integrated NASA API dashboard for the Earth 3D visualization project.
                Explore space science data alongside Earth's geography.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              Data courtesy of NASA. Built for educational and research purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { NasaDashboard };