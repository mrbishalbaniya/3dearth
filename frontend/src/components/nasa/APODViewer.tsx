"use client";

import { useState } from 'react';
import { useNasaApiService } from '@/hooks/useNasaApi';
import Image from 'next/image';

/**
 * Astronomy Picture of the Day Viewer - Manual API calls only
 */
export function APODViewer() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [apodData, setApodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const nasaApi = useNasaApiService();

  // Fallback APOD data for when API is not available
  const fallbackAPOD = {
    title: "The Horsehead Nebula",
    date: "2024-01-15",
    explanation: "One of the most identifiable nebulae in the sky, the Horsehead Nebula in Orion is part of a large, dark, molecular cloud. Also known as Barnard 33, the unusual shape was first discovered on a photographic plate in the late 1800s. The red glow originates from hydrogen gas predominantly behind the nebula, ionized by the nearby bright star Sigma Orionis. The darkness of the Horsehead is caused mostly by thick dust, although the lower part of the Horsehead's neck casts a shadow to the left. Streams of gas leaving the nebula are funneled by a strong magnetic field. Bright spots in the Horsehead Nebula's base are young stars just in the process of forming. Light takes about 1,500 years to reach us from the Horsehead Nebula.",
    url: "https://apod.nasa.gov/apod/image/2401/HorseheadOrion_Pugh_960.jpg",
    hdurl: "https://apod.nasa.gov/apod/image/2401/HorseheadOrion_Pugh_2847.jpg",
    media_type: "image" as const,
    service_version: "v1",
    copyright: "Mike Pugh"
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const getRandomAPOD = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await nasaApi.getAPOD(selectedDate || undefined);
      
      if (response.error) {
        setError(response.error.message);
        setApodData(fallbackAPOD);
      } else {
        setApodData(response.data);
        setError(null);
      }
    } catch (err) {
      // Handle network errors silently
      setError('API not available');
      setApodData(fallbackAPOD);
    } finally {
      setLoading(false);
    }
  };

  const showFallbackData = () => {
    setApodData(fallbackAPOD);
    setError(null);
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Use fallback data if there's an error and no data
  const displayAPOD = apodData;

  return (
    <div className="apod-viewer">
      <div className="apod-controls">
        <h2>🌌 NASA Astronomy Picture of the Day</h2>
        <div className="date-controls">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="date-picker"
          />
          <button onClick={getRandomAPOD} className="random-btn">
            � Try Live API
          </button>
          <button onClick={showFallbackData} className="random-btn">
            📡 Sample APOD
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading astronomy picture...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>⚠️ NASA API temporarily unavailable - showing sample content</p>
          <button onClick={getRandomAPOD} className="retry-btn">
            🔄 Try Live API
          </button>
        </div>
      )}

      {displayAPOD && !loading && (
        <div className="apod-content">
          <div className="apod-header">
            <h3>{displayAPOD.title}</h3>
            <p className="apod-date">{formatDate(displayAPOD.date)}</p>
            {displayAPOD.copyright && (
              <p className="apod-copyright">© {displayAPOD.copyright}</p>
            )}
            {error && (
              <p className="fallback-notice">
                📡 Offline Content - Connect to internet for live data
              </p>
            )}
          </div>

          <div className="apod-media">
            {displayAPOD.media_type === 'image' ? (
              <div className="image-container">
                <Image
                  src={displayAPOD.url}
                  alt={displayAPOD.title}
                  width={800}
                  height={600}
                  className="apod-image"
                  priority
                />
                {displayAPOD.hdurl && (
                  <a 
                    href={displayAPOD.hdurl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hd-link"
                  >
                    🖼️ View HD Version
                  </a>
                )}
              </div>
            ) : (
              <div className="video-container">
                <iframe
                  src={displayAPOD.url}
                  title={displayAPOD.title}
                  width="100%"
                  height="450"
                  frameBorder="0"
                  allowFullScreen
                  className="apod-video"
                />
              </div>
            )}
          </div>

          <div className="apod-explanation">
            <h4>Explanation</h4>
            <p>{displayAPOD.explanation}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .apod-viewer {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: rgba(0, 0, 0, 0.9);
          border-radius: 16px;
          color: white;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .apod-controls {
          margin-bottom: 24px;
        }

        .apod-controls h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .date-controls {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .date-picker {
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 14px;
        }

        .random-btn, .retry-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .random-btn:hover, .retry-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .loading {
          text-align: center;
          padding: 40px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #667eea;
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
          margin-bottom: 20px;
        }

        .apod-content {
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .apod-header {
          margin-bottom: 20px;
          text-align: center;
        }

        .apod-header h3 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #fbbf24;
        }

        .apod-date {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 4px 0;
        }

        .apod-copyright {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .fallback-notice {
          font-size: 12px;
          color: #fbbf24;
          margin: 8px 0 0 0;
          padding: 4px 8px;
          background: rgba(251, 191, 36, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .apod-media {
          margin-bottom: 24px;
          text-align: center;
        }

        .image-container {
          position: relative;
        }

        .apod-image {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .hd-link {
          display: inline-block;
          margin-top: 12px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .hd-link:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .video-container {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .apod-video {
          border-radius: 12px;
        }

        .apod-explanation {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .apod-explanation h4 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #fbbf24;
        }

        .apod-explanation p {
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        @media (max-width: 768px) {
          .apod-viewer {
            padding: 16px;
          }

          .apod-controls h2 {
            font-size: 20px;
          }

          .date-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .date-picker, .random-btn {
            width: 100%;
          }

          .apod-header h3 {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}