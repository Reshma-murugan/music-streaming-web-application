import { useState, useEffect } from 'react';

// Configurable API base — set VITE_API_BASE_URL in .env for production
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Rate limiting for iTunes API (20 requests per minute)
const rateLimiter = {
  requests: [],
  maxRequests: 20,
  timeWindow: 60000,

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
};

// Enhanced useFetch with rate limit awareness
export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [state, setState] = useState({
    apiSource: 'unknown',
    rateLimitInfo: null
  });

  useEffect(() => {
    if (!url) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setState({
        apiSource: 'unknown',
        rateLimitInfo: null
      });

      try {
        const response = await fetch(url);
        
        // Extract rate limit headers
        const rateLimitHeaders = {};
        const rateLimitHeaderNames = [
          'x-ratelimit-limit',
          'x-ratelimit-remaining', 
          'x-ratelimit-reset',
          'x-global-limit',
          'x-global-remaining'
        ];
        
        rateLimitHeaderNames.forEach(headerName => {
          const value = response.headers.get(headerName);
          if (value) {
            rateLimitHeaders[headerName] = value;
          }
        });

        const newRateLimitInfo = rateLimitHeaders['x-ratelimit-remaining'] !== undefined ? {
          limit: parseInt(rateLimitHeaders['x-ratelimit-limit']) || 100,
          remaining: parseInt(rateLimitHeaders['x-ratelimit-remaining']) || 100,
          reset: rateLimitHeaders['x-ratelimit-reset'],
          globalLimit: parseInt(rateLimitHeaders['x-global-limit']) || 100,
          globalRemaining: parseInt(rateLimitHeaders['x-global-remaining']) || 100,
        } : null;

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit exceeded
            const retryAfter = response.headers.get('retry-after');
            const errorData = await response.json();
            throw new Error(`Rate limit exceeded. Retry after: ${retryAfter || 'unknown'} seconds. Reason: ${errorData.reason || 'unknown'}`);
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
        setState({
          apiSource: 'itunes',
          rateLimitInfo: newRateLimitInfo
        });
      } catch (err) {
        setError(err.message);
        
        if (options.demoData) {
          setData(options.demoData);
          setState({
            apiSource: 'demo',
            rateLimitInfo: null
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { 
    data, 
    loading, 
    error, 
    apiSource: state.apiSource, 
    rateLimitInfo: state.rateLimitInfo 
  };
};

// Search tracks using iTunes API via backend
export const useSearchTracks = (query) => {
  const proxyUrl = query ? `${API_BASE}/api/search/tracks?q=${encodeURIComponent(query)}` : null;
  
  const { data, loading, error, apiSource } = useFetch(proxyUrl, {
    demoData: {
      data: [
        {
          id: 1,
          title: 'Blinding Lights',
          artist: {
            id: 101,
            name: 'The Weeknd',
            picture: 'https://picsum.photos/seed/weeknd/300/300.jpg',
            picture_small: 'https://picsum.photos/seed/weeknd/56/56.jpg',
            picture_medium: 'https://picsum.photos/seed/weeknd/250/250.jpg',
            picture_big: 'https://picsum.photos/seed/weeknd/500/500.jpg',
          },
          album: {
            id: 1001,
            title: 'After Hours',
            cover: 'https://picsum.photos/seed/album1/300/300.jpg'
          },
          preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: 200,
          rank: 1
        }
      ]
    }
  });

  const proxyPreviewUrl = (url) => {
    if (!url) return null;
    return `${API_BASE}/api/preview?url=${encodeURIComponent(url)}`;
  };

  const transformedData = data && data.data
    ? {
        data: data.data
          .filter(track => track.preview)
          .map((track, index) => ({
            ...track,
            preview: proxyPreviewUrl(track.preview),
            rank: index + 1
          }))
      }
    : data;

  return { data: transformedData, loading, error, apiSource };
};

// Chart tracks using iTunes API via backend
export const useChartTracks = () => {
  const proxyUrl = `${API_BASE}/api/chart/tracks`;
  
  const { data, loading, error, apiSource } = useFetch(proxyUrl, {
    demoData: {
      data: [
        {
          id: 1,
          title: 'Blinding Lights',
          artist: {
            id: 101,
            name: 'The Weeknd',
            picture: 'https://picsum.photos/seed/weeknd/300/300.jpg',
            picture_small: 'https://picsum.photos/seed/weeknd/56/56.jpg',
            picture_medium: 'https://picsum.photos/seed/weeknd/250/250.jpg',
            picture_big: 'https://picsum.photos/seed/weeknd/500/500.jpg',
          },
          album: {
            id: 1001,
            title: 'After Hours',
            cover: 'https://picsum.photos/seed/album1/300/300.jpg'
          },
          preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: 200,
          rank: 1
        },
        {
          id: 2,
          title: 'Levitating',
          artist: {
            id: 102,
            name: 'Dua Lipa',
            picture: 'https://picsum.photos/seed/dualipa/300/300.jpg',
            picture_small: 'https://picsum.photos/seed/dualipa/56/56.jpg',
            picture_medium: 'https://picsum.photos/seed/dualipa/250/250.jpg',
            picture_big: 'https://picsum.photos/seed/dualipa/500/500.jpg',
          },
          album: {
            id: 1002,
            title: 'Future Nostalgia',
            cover: 'https://picsum.photos/seed/album2/300/300.jpg'
          },
          preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          duration: 203,
          rank: 2
        }
      ]
    }
  });

  const proxyPreviewUrl = (url) => {
    if (!url) return null;
    return `${API_BASE}/api/preview?url=${encodeURIComponent(url)}`;
  };

  const transformedData = data && data.data 
    ? {
        data: data.data
          .filter(track => track.preview)
          .map((track, index) => ({
            ...track,
            preview: proxyPreviewUrl(track.preview),
            rank: index + 1
          }))
      }
    : data;

  return { data: transformedData, loading, error, apiSource };
};

// Chart artists using iTunes API via backend
export const useChartArtists = () => {
  const proxyUrl = `${API_BASE}/api/chart/artists`;
  
  const { data, loading, error, apiSource } = useFetch(proxyUrl, {
    demoData: {
      data: [
        {
          id: 101,
          name: 'The Weeknd',
          picture: 'https://picsum.photos/seed/weeknd/300/300.jpg',
          picture_small: 'https://picsum.photos/seed/weeknd/56/56.jpg',
          picture_medium: 'https://picsum.photos/seed/weeknd/250/250.jpg',
          picture_big: 'https://picsum.photos/seed/weeknd/500/500.jpg',
          position: 1,
          type: 'artist'
        },
        {
          id: 102,
          name: 'Taylor Swift',
          picture: 'https://picsum.photos/seed/taylor/300/300.jpg',
          picture_small: 'https://picsum.photos/seed/taylor/56/56.jpg',
          picture_medium: 'https://picsum.photos/seed/taylor/250/250.jpg',
          picture_big: 'https://picsum.photos/seed/taylor/500/500.jpg',
          position: 2,
          type: 'artist'
        }
      ]
    }
  });

  return { data, loading, error, apiSource };
};

// Chart albums using iTunes API via backend
export const useChartAlbums = () => {
  const proxyUrl = `${API_BASE}/api/chart/albums`;
  
  const { data, loading, error, apiSource } = useFetch(proxyUrl, {
    demoData: {
      data: [
        {
          id: 1001,
          title: 'After Hours',
          artist: 'The Weeknd',
          cover: 'https://picsum.photos/seed/album1/300/300.jpg',
          position: 1
        },
        {
          id: 1002,
          title: 'Future Nostalgia',
          artist: 'Dua Lipa',
          cover: 'https://picsum.photos/seed/album2/300/300.jpg',
          position: 2
        }
      ]
    }
  });

  return { data, loading, error, apiSource };
};

// Artist details - Professional lookup that returns artist info + top songs in one request
export const useArtist = (artistId) => {
  const proxyUrl = artistId ? `${API_BASE}/api/artist/${artistId}` : null;
  
  const { data, loading, error, apiSource } = useFetch(proxyUrl, {
    demoData: {
      artist: {
        id: 123,
        name: 'Demo Artist',
        genre: 'Pop',
        picture: 'https://picsum.photos/seed/artist/600/600.jpg'
      },
      songs: [
        {
          id: 1,
          title: 'Demo Song',
          preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
        }
      ]
    }
  });

  // The new endpoint returns { artist, songs, total }
  // Transform preview URLs through proxy for consistency
  const proxyPreviewUrl = (url) => {
    if (!url) return null;
    return url; // iTunes .m4a files work directly, no proxy needed
  };

  const transformedData = data ? {
    artist: data.artist || null,
    songs: data.songs ? data.songs.map(song => ({
      ...song,
      preview: proxyPreviewUrl(song.preview),
      rank: song.rank || 1
    })) : [],
    total: data.total || 0
  } : null;

  return { data: transformedData, loading, error, apiSource };
};

// Artist top tracks - Now handled by useArtist, but kept for backward compatibility
export const useArtistTopTracks = (artistId) => {
  const { data: artistData, loading, error, apiSource } = useArtist(artistId);
  
  // Return just the songs from the artist data
  const topTracksData = artistData ? {
    data: artistData.songs || [],
    total: artistData.total || 0
  } : null;

  return { data: topTracksData, loading, error, apiSource };
};

// Artist albums
export const useArtistAlbums = (artistId) => {
  const proxyUrl = artistId ? `${API_BASE}/api/artist/${artistId}/albums` : null;
  
  const { data, loading, error, apiSource } = useFetch(proxyUrl, {
    demoData: {
      data: [
        {
          id: 1001,
          title: 'Album',
          artist: 'Artist',
          cover: 'https://picsum.photos/seed/album/300/300.jpg'
        }
      ]
    }
  });

  return { data, loading, error, apiSource };
};
