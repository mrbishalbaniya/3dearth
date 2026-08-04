'use client';

import React, { useState, useEffect } from 'react';
import { useNasaApi } from '@/hooks/useNasaApi';

interface MediaItem {
  data: Array<{
    nasa_id: string;
    title: string;
    description: string;
    keywords: string[];
    media_type: 'image' | 'video' | 'audio';
    date_created: string;
    center: string;
    photographer?: string;
    location?: string;
    album?: string[];
    secondary_creator?: string;
  }>;
  links?: Array<{
    href: string;
    rel: string;
    render?: string;
  }>;
}

interface MediaSearchResponse {
  collection: {
    version: string;
    href: string;
    items: MediaItem[];
    metadata: {
      total_hits: number;
    };
    links?: Array<{
      rel: string;
      prompt: string;
      href: string;
    }>;
  };
}

interface MediaAsset {
  href: string;
}

const NasaMediaViewer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('earth');
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [center, setCenter] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);

  const {
    data: searchResults,
    loading: searchLoading,
    error: searchError,
    fetchData: fetchSearchResults
  } = useNasaApi<MediaSearchResponse>();

  const {
    data: assetResults,
    loading: assetLoading,
    fetchData: fetchAssets
  } = useNasaApi<{ collection: { items: MediaAsset[] } }>();

  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = () => {
    const params: any = {
      q: searchQuery || 'earth',
      page_size: 100
    };

    if (mediaType !== 'all') {
      params.media_type = mediaType;
    }

    if (yearStart) {
      params.year_start = yearStart;
    }

    if (yearEnd) {
      params.year_end = yearEnd;
    }

    if (center) {
      params.center = center;
    }

    // Create a custom API call function for NASA media search
    const mediaSearchCall = async () => {
      const url = 'https://images-api.nasa.gov/search';
      const queryParams = new URLSearchParams(params);
      
      const response = await fetch(`${url}?${queryParams}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NASA Media API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          api: 'nasa-media-library',
          version: '1.0'
        }
      };
    };

    fetchSearchResults(mediaSearchCall);
  };

  const handleItemClick = (item: MediaItem) => {
    setSelectedItem(item);
    
    // Fetch assets for the selected item
    if (item.data[0]?.nasa_id) {
      const assetApiCall = async () => {
        const url = `https://images-api.nasa.gov/asset/${item.data[0].nasa_id}`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`NASA Asset API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          data,
          metadata: {
            timestamp: new Date().toISOString(),
            api: 'nasa-asset-api',
            version: '1.0'
          }
        };
      };

      fetchAssets(assetApiCall);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getPreviewImage = (item: MediaItem) => {
    const link = item.links?.find(link => link.rel === 'preview');
    return link?.href || '/placeholder-image.jpg';
  };

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      default:
        return '📄';
    }
  };

  const renderMediaGrid = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {searchResults?.collection.items.map((item, index) => {
        const data = item.data[0];
        if (!data) return null;

        return (
          <div
            key={`${data.nasa_id}-${index}`}
            className="bg-white rounded-lg border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleItemClick(item)}
          >
            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
              <img
                src={getPreviewImage(item)}
                alt={data.title}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9IjEwMCIgeT0iNjAiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjczODAiPk5BU0EgTWVkaWE8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {data.title}
                </h3>
                <span className="text-2xl ml-2">
                  {getMediaTypeIcon(data.media_type)}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                {data.description}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{formatDate(data.date_created)}</span>
                <span>{data.center}</span>
              </div>
              
              {data.keywords && data.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.keywords.slice(0, 3).map((keyword, kidx) => (
                    <span
                      key={kidx}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                  {data.keywords.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{data.keywords.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMediaModal = () => {
    if (!selectedItem) return null;

    const data = selectedItem.data[0];
    const previewLink = selectedItem.links?.find(link => link.rel === 'preview');
    const captions = selectedItem.links?.filter(link => link.rel === 'captions') || [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 pr-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {data.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">{getMediaTypeIcon(data.media_type)}</span>
                    {data.media_type.charAt(0).toUpperCase() + data.media_type.slice(1)}
                  </span>
                  <span>{data.center}</span>
                  <span>{formatDate(data.date_created)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setSelectedAssets([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Media Preview */}
              <div>
                {data.media_type === 'image' && previewLink && (
                  <img
                    src={previewLink.href}
                    alt={data.title}
                    className="w-full rounded-lg"
                  />
                )}
                
                {data.media_type === 'video' && previewLink && (
                  <video
                    controls
                    className="w-full rounded-lg"
                    poster={previewLink.href}
                  >
                    <source src={previewLink.href} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
                
                {data.media_type === 'audio' && (
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <div className="text-6xl mb-4">🎵</div>
                    <p className="text-gray-600">Audio content</p>
                  </div>
                )}

                {/* Available Assets */}
                {assetResults?.collection.items && assetResults.collection.items.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Available Assets</h3>
                    <div className="space-y-2">
                      {assetResults.collection.items.map((asset, index) => (
                        <a
                          key={index}
                          href={asset.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm text-blue-600 hover:text-blue-800 break-all"
                        >
                          {asset.href.split('/').pop()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {data.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">NASA ID:</span>
                      <span className="font-medium">{data.nasa_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Created:</span>
                      <span className="font-medium">{formatDate(data.date_created)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Center:</span>
                      <span className="font-medium">{data.center}</span>
                    </div>
                    {data.photographer && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Photographer:</span>
                        <span className="font-medium">{data.photographer}</span>
                      </div>
                    )}
                    {data.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{data.location}</span>
                      </div>
                    )}
                    {data.secondary_creator && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Secondary Creator:</span>
                        <span className="font-medium">{data.secondary_creator}</span>
                      </div>
                    )}
                  </div>
                </div>

                {data.keywords && data.keywords.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-1">
                      {data.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.album && data.album.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Albums</h3>
                    <div className="space-y-1">
                      {data.album.map((albumName, index) => (
                        <span
                          key={index}
                          className="block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded"
                        >
                          {albumName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const nasaCenters = [
    'ARC', 'AFRC', 'GRC', 'GSFC', 'HQ', 'JSC', 'KSC', 'LARC', 'MSFC', 'SSC'
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            NASA Image and Video Library
          </h1>
          <p className="text-gray-600">
            Explore NASA's vast collection of images, videos, and audio files
          </p>
        </div>

        {/* Search Controls */}
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Search Media</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Terms
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Earth, Mars, Apollo, ISS"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Media Type
              </label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NASA Center
              </label>
              <select
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Centers</option>
                {nasaCenters.map(centerCode => (
                  <option key={centerCode} value={centerCode}>
                    {centerCode}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Start
              </label>
              <input
                type="number"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                placeholder="e.g., 2020"
                min="1958"
                max="2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year End
              </label>
              <input
                type="number"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                placeholder="e.g., 2024"
                min="1958"
                max="2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Results Summary */}
        {searchResults && (
          <div className="bg-white p-4 rounded-lg border mb-6">
            <p className="text-gray-600">
              Found{' '}
              <span className="font-semibold">
                {searchResults.collection.metadata.total_hits.toLocaleString()}
              </span>{' '}
              results • Showing{' '}
              <span className="font-semibold">
                {searchResults.collection.items.length}
              </span>{' '}
              items
            </p>
          </div>
        )}

        {/* Error Display */}
        {searchError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-800">Error: {searchError}</p>
          </div>
        )}

        {/* Loading Display */}
        {searchLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Results Grid */}
        {!searchLoading && searchResults?.collection.items && (
          <div>
            {searchResults.collection.items.length > 0 ? (
              renderMediaGrid()
            ) : (
              <div className="text-center py-12 text-gray-600">
                No media found. Try different search terms or filters.
              </div>
            )}
          </div>
        )}

        {/* Media Modal */}
        {renderMediaModal()}
      </div>
    </div>
  );
};

export { NasaMediaViewer };