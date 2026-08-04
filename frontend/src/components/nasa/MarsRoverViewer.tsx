"use client";

import { useState, useEffect } from 'react';
import { useNasaApiCall } from '@/hooks/useNasaApi';
import { useNasaApiService } from '@/hooks/useNasaApi';
import Image from 'next/image';

/**
 * Mars Rover Photos Viewer - Manual API calls only to prevent console errors
 */
export function MarsRoverViewer() {
  const [selectedRover, setSelectedRover] = useState<'curiosity' | 'opportunity' | 'spirit'>('curiosity');
  const [selectedSol, setSelectedSol] = useState<number>();
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  
  // Manual state management - no automatic API calls
  const [manualPhotos, setManualPhotos] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const nasaApi = useNasaApiService();

  // Disable all automatic API calls to prevent CORS errors
  const { data: roversInfo, error: roversError } = useNasaApiCall(
    () => nasaApi.getMarsRovers(),
    [],
    { enabled: false } // Completely disabled
  );

  // Don't log CORS errors to console as they're expected
  useEffect(() => {
    // Only log unexpected errors, not CORS/network issues
    if (roversError && !roversError.toLowerCase().includes('fetch')) {
      console.warn('Unexpected NASA API Error:', roversError);
    }
  }, [roversError]);

  const roverOptions = [
    { value: 'curiosity', label: '🔴 Curiosity', status: 'Active' },
    { value: 'opportunity', label: '🟠 Opportunity', status: 'Complete' },
    { value: 'spirit', label: '🟡 Spirit', status: 'Complete' }
  ];

  const cameraOptions = [
    { value: '', label: 'All Cameras' },
    { value: 'FHAZ', label: 'Front Hazard Avoidance Camera' },
    { value: 'RHAZ', label: 'Rear Hazard Avoidance Camera' },
    { value: 'MAST', label: 'Mast Camera' },
    { value: 'CHEMCAM', label: 'Chemistry and Camera Complex' },
    { value: 'MAHLI', label: 'Mars Hand Lens Imager' },
    { value: 'MARDI', label: 'Mars Descent Imager' },
    { value: 'NAVCAM', label: 'Navigation Camera' },
    { value: 'PANCAM', label: 'Panoramic Camera' },
    { value: 'MINITES', label: 'Miniature Thermal Emission Spectrometer' }
  ];

  const getCurrentRoverInfo = () => {
    if (roversInfo && typeof roversInfo === 'object' && 'rovers' in roversInfo && Array.isArray((roversInfo as any).rovers)) {
      return (roversInfo as any).rovers.find((rover: any) => 
        rover.name.toLowerCase() === selectedRover.toLowerCase()
      );
    }
    
    // Fallback rover info when API is not available
    const fallbackRovers = {
      curiosity: {
        name: 'Curiosity',
        status: 'active',
        landing_date: '2012-08-05',
        max_sol: 3000,
        total_photos: 500000
      },
      opportunity: {
        name: 'Opportunity', 
        status: 'complete',
        landing_date: '2004-01-25',
        max_sol: 5352,
        total_photos: 198000
      },
      spirit: {
        name: 'Spirit',
        status: 'complete', 
        landing_date: '2004-01-04',
        max_sol: 2208,
        total_photos: 124000
      }
    };
    
    return fallbackRovers[selectedRover] || null;
  };

  const handleLoadLatest = async () => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      const response = await nasaApi.getMarsRoverPhotos(
        selectedRover, 
        selectedSol, 
        selectedCamera || undefined
      );
      
      if (response.error) {
        setApiError(response.error.message);
        setManualPhotos(getFallbackPhotos());
      } else {
        setManualPhotos(response.data);
        setApiError(null);
      }
    } catch (error) {
      // Don't log expected network/CORS errors
      setApiError('API not available');
      setManualPhotos(getFallbackPhotos());
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadOfflineContent = () => {
    setManualPhotos(getFallbackPhotos());
    setApiError(null);
    setIsLoading(false);
  };

  // Enhanced fallback photos for Mars rovers
  const getFallbackPhotos = () => {
    return {
      photos: [
        {
          id: 424905,
          sol: 1000,
          camera: {
            id: 20,
            name: 'FHAZ',
            rover_id: 5,
            full_name: 'Front Hazard Avoidance Camera'
          },
          img_src: 'https://images-assets.nasa.gov/image/PIA16239/PIA16239~thumb.jpg',
          earth_date: '2015-05-30',
          rover: {
            id: 5,
            name: 'Curiosity',
            landing_date: '2012-08-05',
            launch_date: '2011-11-26',
            status: 'active',
            max_sol: 3000,
            max_date: '2020-12-15',
            total_photos: 500000
          }
        },
        {
          id: 424906,
          sol: 1000,
          camera: {
            id: 22,
            name: 'MAST',
            rover_id: 5,
            full_name: 'Mast Camera'
          },
          img_src: 'https://images-assets.nasa.gov/image/PIA16920/PIA16920~thumb.jpg',
          earth_date: '2015-05-30',
          rover: {
            id: 5,
            name: 'Curiosity',
            landing_date: '2012-08-05',
            launch_date: '2011-11-26',
            status: 'active',
            max_sol: 3000,
            max_date: '2020-12-15',
            total_photos: 500000
          }
        },
        {
          id: 424907,
          sol: 1000,
          camera: {
            id: 21,
            name: 'RHAZ',
            rover_id: 5,
            full_name: 'Rear Hazard Avoidance Camera'
          },
          img_src: 'https://images-assets.nasa.gov/image/PIA24430/PIA24430~thumb.jpg',
          earth_date: '2015-05-30',
          rover: {
            id: 5,
            name: 'Curiosity',
            landing_date: '2012-08-05',
            launch_date: '2011-11-26',
            status: 'active',
            max_sol: 3000,
            max_date: '2020-12-15',
            total_photos: 500000
          }
        }
      ]
    };
  };

  const roverInfo = getCurrentRoverInfo();

  return (
    <div className="mars-rover-viewer">
      <div className="rover-controls">
        <h2>🚀 Mars Rover Photos</h2>
        
        <div className="control-grid">
          <div className="control-group">
            <label htmlFor="rover-select">Rover</label>
            <select
              id="rover-select"
              value={selectedRover}
              onChange={(e) => setSelectedRover(e.target.value as any)}
              className="control-select"
            >
              {roverOptions.map(rover => (
                <option key={rover.value} value={rover.value}>
                  {rover.label} ({rover.status})
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="sol-input">Sol (Mars Day)</label>
            <input
              id="sol-input"
              type="number"
              value={selectedSol || ''}
              onChange={(e) => setSelectedSol(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Latest"
              min="1"
              max={roverInfo?.max_sol}
              className="control-input"
            />
          </div>

          <div className="control-group">
            <label htmlFor="camera-select">Camera</label>
            <select
              id="camera-select"
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="control-select"
            >
              {cameraOptions.map(camera => (
                <option key={camera.value} value={camera.value}>
                  {camera.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <button onClick={handleLoadLatest} className="load-btn">
              �️ Try Live API
            </button>
          </div>
          
          <div className="control-group">
            <button onClick={handleLoadOfflineContent} className="offline-btn">
              📡 View Sample Photos
            </button>
          </div>
        </div>

        {roverInfo && (
          <div className="rover-info">
            <h3>{roverInfo.name} Mission Info</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Launch:</span>
                <span>{new Date(roverInfo.launch_date).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Landing:</span>
                <span>{new Date(roverInfo.landing_date).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className={`status ${roverInfo.status.toLowerCase()}`}>
                  {roverInfo.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Photos:</span>
                <span>{roverInfo.total_photos.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Max Sol:</span>
                <span>{roverInfo.max_sol}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Latest Date:</span>
                <span>{new Date(roverInfo.max_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading Mars photos...</p>
        </div>
      )}

      {apiError && (
        <div className="error">
          <p>⚠️ NASA API temporarily unavailable</p>
          <p className="error-sub">Showing sample Mars rover photos below</p>
          <button onClick={handleLoadLatest} className="retry-btn">
            🔄 Try Live API
          </button>
        </div>
      )}

      {manualPhotos && (
        <div className="photos-section">
          {apiError && (
            <div className="offline-notice">
              <p>📡 Offline Mode - Sample content from NASA Mars missions</p>
            </div>
          )}
          
          <div className="photos-header">
            <h3>
              {manualPhotos.photos.length} Photos 
              {selectedSol && ` from Sol ${selectedSol}`}
              {selectedCamera && ` (${selectedCamera})`}
              {apiError && ' (Sample Data)'}
            </h3>
          </div>

          {manualPhotos.photos.length === 0 ? (
            <div className="no-photos">
              <p>🔍 No photos found for the selected criteria</p>
              <p>Try a different Sol number or camera</p>
            </div>
          ) : (
            <div className="photos-grid">
              {manualPhotos.photos.map((photo) => (
                <div key={photo.id} className="photo-card">
                  <div className="photo-container">
                    <Image
                      src={photo.img_src}
                      alt={`${photo.camera.full_name} - Sol ${photo.sol}`}
                      width={400}
                      height={300}
                      className="mars-photo"
                      loading="lazy"
                    />
                  </div>
                  <div className="photo-info">
                    <h4>{photo.camera.full_name}</h4>
                    <div className="photo-details">
                      <span>Sol {photo.sol}</span>
                      <span>{new Date(photo.earth_date).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={photo.img_src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="photo-link"
                    >
                      🔍 Full Size
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .mars-rover-viewer {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: rgba(0, 0, 0, 0.9);
          border-radius: 16px;
          color: white;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rover-controls h2 {
          margin: 0 0 20px 0;
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #f97316, #dc2626);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .control-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .control-group label {
          font-size: 14px;
          font-weight: 500;
          color: #fbbf24;
        }

        .control-select, .control-input {
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 14px;
        }

        .control-select option {
          background: #1f2937;
          color: white;
        }

        .load-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, #f97316, #dc2626);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          align-self: end;
        }

        .load-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
        }

        .offline-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          align-self: end;
        }

        .offline-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .rover-info {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rover-info h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #fbbf24;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-label {
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
        }

        .status.active {
          color: #10b981;
          font-weight: 600;
        }

        .status.complete {
          color: #f59e0b;
          font-weight: 600;
        }

        .loading {
          text-align: center;
          padding: 40px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #f97316;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error {
          text-align: center;
          padding: 20px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .error-sub {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 8px 0;
        }

        .offline-notice {
          text-align: center;
          padding: 12px;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 8px;
          margin-bottom: 16px;
          color: #fbbf24;
          font-size: 14px;
        }

        .retry-btn {
          padding: 8px 16px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 10px;
        }

        .photos-section {
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .photos-header h3 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: #fbbf24;
        }

        .no-photos {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.7);
        }

        .photos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .photo-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.2s ease;
        }

        .photo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(249, 115, 22, 0.2);
        }

        .photo-container {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }

        .mars-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-info {
          padding: 16px;
        }

        .photo-info h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: #fbbf24;
        }

        .photo-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .photo-link {
          display: inline-block;
          padding: 6px 12px;
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
          text-decoration: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .photo-link:hover {
          background: rgba(249, 115, 22, 0.3);
        }

        @media (max-width: 768px) {
          .mars-rover-viewer {
            padding: 16px;
          }

          .control-grid {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .photos-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}