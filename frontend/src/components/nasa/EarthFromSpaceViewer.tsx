"use client";

import { useState } from 'react';
import { useEPICImages, useNasaApiCall } from '@/hooks/useNasaApi';
import { useNasaApiService } from '@/hooks/useNasaApi';
import Image from 'next/image';

/**
 * Earth from Space Viewer (EPIC and Earth Imagery)
 */
export function EarthFromSpaceViewer() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [imageType, setImageType] = useState<'natural' | 'enhanced'>('natural');
  const [earthImageryCoords, setEarthImageryCoords] = useState({
    lat: 27.7172, // Default to Kathmandu
    lon: 85.3240,
    date: new Date().toISOString().split('T')[0],
    dim: 0.10
  });

  const nasaApi = useNasaApiService();

  const { data: epicImages, loading: epicLoading, error: epicError, refetch: refetchEPIC } = useEPICImages(
    selectedDate || undefined,
    imageType === 'enhanced',
    { enabled: false } // Disable automatic loading
  );

  const { 
    data: earthImagery, 
    loading: earthLoading, 
    error: earthError, 
    refetch: refetchEarthImagery 
  } = useNasaApiCall(
    () => nasaApi.getEarthImagery(
      earthImageryCoords.lat, 
      earthImageryCoords.lon, 
      earthImageryCoords.date, 
      earthImageryCoords.dim
    ),
    [earthImageryCoords],
    { enabled: false }
  );

  const handleEarthImagerySearch = () => {
    refetchEarthImagery();
  };

  const getEPICImageUrl = (imageName: string, date: string) => {
    const formattedDate = date.split(' ')[0].replaceAll('-', '/');
    const imageTypeStr = imageType === 'enhanced' ? 'enhanced' : 'natural';
    return `https://epic.gsfc.nasa.gov/archive/${imageTypeStr}/${formattedDate}/png/${imageName}.png`;
  };

  const formatCoordinates = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
  };

  const presetLocations = [
    { name: '🏔️ Kathmandu', lat: 27.7172, lon: 85.3240 },
    { name: '🗽 New York', lat: 40.7128, lon: -74.0060 },
    { name: '🏛️ Paris', lat: 48.8566, lon: 2.3522 },
    { name: '🌸 Tokyo', lat: 35.6762, lon: 139.6503 },
    { name: '🏜️ Cairo', lat: 30.0444, lon: 31.2357 },
    { name: '🏖️ Sydney', lat: -33.8688, lon: 151.2093 },
    { name: '🏔️ Everest', lat: 27.9881, lon: 86.9250 },
    { name: '🌋 Hawaii', lat: 19.8968, lon: -155.5828 }
  ];

  return (
    <div className="earth-space-viewer">
      <h2>🌍 Earth from Space</h2>
      
      <div className="viewer-tabs">
        <div className="tab-section">
          <h3>🛰️ EPIC - Full Disc Earth</h3>
          <p>Real Earth images from the DSCOVR satellite at Lagrange point L1</p>
          
          <div className="epic-controls">
            <div className="control-group">
              <label>Date (optional)</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="date-input"
              />
            </div>
            
            <div className="control-group">
              <label>Image Type</label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value as 'natural' | 'enhanced')}
                className="type-select"
              >
                <option value="natural">Natural Color</option>
                <option value="enhanced">Enhanced</option>
              </select>
            </div>

            <div className="control-group">
              <button onClick={() => refetchEPIC()} className="search-btn">
                🛰️ Load EPIC Images
              </button>
            </div>
          </div>

          {epicLoading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading EPIC images...</p>
            </div>
          )}

          {epicError && (
            <div className="error">
              <p>❌ Error: {epicError}</p>
            </div>
          )}

          {epicImages && !epicLoading ? (
            <div className="epic-results">
              <h4>
                📅 {epicImages.length} images 
                {selectedDate ? ` from ${new Date(selectedDate).toLocaleDateString()}` : ' (Latest)'}
              </h4>
              
              <div className="epic-grid">
                {epicImages.slice(0, 6).map((image) => (
                  <div key={image.identifier} className="epic-card">
                    <div className="epic-image-container">
                      <Image
                        src={getEPICImageUrl(image.image, image.date)}
                        alt={image.caption}
                        width={300}
                        height={300}
                        className="epic-image"
                        loading="lazy"
                      />
                    </div>
                    <div className="epic-info">
                      <h5>{image.caption}</h5>
                      <div className="epic-details">
                        <p><strong>Time:</strong> {new Date(image.date).toLocaleString()}</p>
                        <p><strong>Center:</strong> {formatCoordinates(image.centroid_coordinates.lat, image.centroid_coordinates.lon)}</p>
                      </div>
                      <a
                        href={getEPICImageUrl(image.image, image.date)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="full-image-link"
                      >
                        🖼️ Full Resolution
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="tab-section">
          <h3>🛰️ Landsat Earth Imagery</h3>
          <p>High-resolution satellite imagery of specific locations on Earth</p>
          
          <div className="earth-imagery-controls">
            <div className="coordinates-input">
              <div className="coord-group">
                <label>Latitude</label>
                <input
                  type="number"
                  value={earthImageryCoords.lat}
                  onChange={(e) => setEarthImageryCoords(prev => ({ 
                    ...prev, 
                    lat: parseFloat(e.target.value) || 0 
                  }))}
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="coord-input"
                />
              </div>
              
              <div className="coord-group">
                <label>Longitude</label>
                <input
                  type="number"
                  value={earthImageryCoords.lon}
                  onChange={(e) => setEarthImageryCoords(prev => ({ 
                    ...prev, 
                    lon: parseFloat(e.target.value) || 0 
                  }))}
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="coord-input"
                />
              </div>
              
              <div className="coord-group">
                <label>Date</label>
                <input
                  type="date"
                  value={earthImageryCoords.date}
                  onChange={(e) => setEarthImageryCoords(prev => ({ 
                    ...prev, 
                    date: e.target.value 
                  }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="date-input"
                />
              </div>
              
              <div className="coord-group">
                <label>Size (degrees)</label>
                <select
                  value={earthImageryCoords.dim}
                  onChange={(e) => setEarthImageryCoords(prev => ({ 
                    ...prev, 
                    dim: parseFloat(e.target.value) 
                  }))}
                  className="dim-select"
                >
                  <option value={0.05}>0.05° (~5.5km)</option>
                  <option value={0.10}>0.10° (~11km)</option>
                  <option value={0.15}>0.15° (~16.5km)</option>
                  <option value={0.25}>0.25° (~28km)</option>
                </select>
              </div>
            </div>

            <div className="preset-locations">
              <p>Quick locations:</p>
              <div className="preset-buttons">
                {presetLocations.map((location) => (
                  <button
                    key={location.name}
                    onClick={() => setEarthImageryCoords(prev => ({
                      ...prev,
                      lat: location.lat,
                      lon: location.lon
                    }))}
                    className="preset-btn"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleEarthImagerySearch} className="search-btn">
              🔍 Get Satellite Image
            </button>
          </div>

          {earthLoading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading satellite imagery...</p>
            </div>
          )}

          {earthError && (
            <div className="error">
              <p>❌ Error: {earthError}</p>
              <p>Try a different date or location</p>
            </div>
          )}

          {earthImagery && !earthLoading && typeof earthImagery === 'object' && 'date' in earthImagery && 'url' in earthImagery ? (
            <div className="earth-imagery-result">
              <h4>
                📍 {formatCoordinates(earthImageryCoords.lat, earthImageryCoords.lon)} 
                - {new Date((earthImagery as any).date).toLocaleDateString()}
              </h4>
              <div className="earth-image-container">
                <Image
                  src={(earthImagery as any).url}
                  alt={`Satellite view of ${formatCoordinates(earthImageryCoords.lat, earthImageryCoords.lon)}`}
                  width={512}
                  height={512}
                  className="earth-satellite-image"
                />
                <a
                  href={(earthImagery as any).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="full-image-link"
                >
                  🖼️ Full Resolution
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .earth-space-viewer {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: rgba(0, 0, 0, 0.9);
          border-radius: 16px;
          color: white;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .earth-space-viewer h2 {
          margin: 0 0 24px 0;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
        }

        .viewer-tabs {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .tab-section {
          background: rgba(255, 255, 255, 0.02);
          padding: 24px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tab-section h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #60a5fa;
        }

        .tab-section p {
          margin: 0 0 20px 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        .epic-controls {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
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

        .date-input, .type-select, .coord-input, .dim-select {
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 14px;
        }

        .earth-imagery-controls {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .coordinates-input {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .coord-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .preset-locations p {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 500;
          color: #fbbf24;
        }

        .preset-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .preset-btn {
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .preset-btn:hover {
          background: rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .search-btn {
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .search-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .loading {
          text-align: center;
          padding: 40px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #3b82f6;
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
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          margin: 20px 0;
        }

        .epic-results h4, .earth-imagery-result h4 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #fbbf24;
        }

        .epic-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .epic-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.2s ease;
        }

        .epic-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
        }

        .epic-image-container, .earth-image-container {
          position: relative;
          width: 100%;
        }

        .epic-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .earth-satellite-image {
          width: 100%;
          max-width: 512px;
          height: auto;
          border-radius: 8px;
        }

        .epic-info {
          padding: 16px;
        }

        .epic-info h5 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #60a5fa;
        }

        .epic-details {
          margin-bottom: 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .epic-details p {
          margin: 4px 0;
        }

        .full-image-link {
          display: inline-block;
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          text-decoration: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .full-image-link:hover {
          background: rgba(59, 130, 246, 0.3);
        }

        .earth-imagery-result {
          text-align: center;
        }

        @media (max-width: 768px) {
          .earth-space-viewer {
            padding: 16px;
          }

          .epic-controls {
            flex-direction: column;
            gap: 16px;
          }

          .coordinates-input {
            grid-template-columns: 1fr;
          }

          .epic-grid {
            grid-template-columns: 1fr;
          }

          .preset-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}