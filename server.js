import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — restrict to configured origin in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// OPTIONS handler for preflight requests (important for CORS)
app.options('*', cors(corsOptions));

// Enhanced Rate Limiting System for iTunes API
class EnhancedRateLimiter {
  constructor() {
    // Global iTunes API limits
    this.globalLimits = {
      requests: [],
      maxRequests: process.env.NODE_ENV === 'production' ? 20 : 100,
      timeWindow: 60000, // 1 minute
    };
    
    // Per-user rate limits (IP-based)
    this.userLimits = new Map();
    this.userMaxRequests = 10; // per minute per user
    this.userTimeWindow = 60000;
    
    // Per-endpoint limits
    this.endpointLimits = {
      '/api/search/tracks': { max: 30, window: 60000 },
      '/api/chart/tracks': { max: 10, window: 60000 },
      '/api/chart/artists': { max: 10, window: 60000 },
      '/api/artist/:id': { max: 20, window: 60000 },
    };
    
    // Request queue for when limits are exceeded
    this.requestQueue = [];
    this.processingQueue = false;
    
    // Cache for responses
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Check if a user can make a request
  canUserMakeRequest(userId, endpoint) {
    const now = Date.now();
    
    // Clean up old requests
    this.cleanupOldRequests(userId, now);
    
    // Check global limit
    if (this.globalLimits.requests.length >= this.globalLimits.maxRequests) {
      return { allowed: false, reason: 'global', retryAfter: this.getGlobalRetryAfter(now) };
    }
    
    // Check user limit
    const userRequests = this.userLimits.get(userId) || [];
    if (userRequests.length >= this.userMaxRequests) {
      return { allowed: false, reason: 'user', retryAfter: this.getUserRetryAfter(userId, now) };
    }
    
    // Check endpoint limit
    const endpointKey = this.getEndpointKey(endpoint);
    const endpointLimit = this.endpointLimits[endpointKey];
    if (endpointLimit) {
      const endpointRequests = this.getEndpointRequests(endpointKey, now);
      if (endpointRequests.length >= endpointLimit.max) {
        return { allowed: false, reason: 'endpoint', retryAfter: this.getEndpointRetryAfter(endpointKey, now) };
      }
    }
    
    return { allowed: true };
  }

  // Record a successful request
  recordRequest(userId, endpoint) {
    const now = Date.now();
    
    // Add to global requests
    this.globalLimits.requests.push(now);
    
    // Add to user requests
    const userRequests = this.userLimits.get(userId) || [];
    userRequests.push(now);
    this.userLimits.set(userId, userRequests);
    
    // Add to endpoint requests
    const endpointKey = this.getEndpointKey(endpoint);
    this.addEndpointRequest(endpointKey, now);
  }

  // Get cache key for a request
  getCacheKey(endpoint, query) {
    return `${endpoint}:${JSON.stringify(query)}`;
  }

  // Get cached response
  getCachedResponse(endpoint, query) {
    const key = this.getCacheKey(endpoint, query);
    const cached = this.cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    
    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // Cache a response
  setCachedResponse(endpoint, query, data) {
    const key = this.getCacheKey(endpoint, query);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  // Add request to queue
  queueRequest(userId, endpoint, query, resolve, reject) {
    this.requestQueue.push({
      userId,
      endpoint,
      query,
      resolve,
      reject,
      timestamp: Date.now(),
      priority: this.getPriority(endpoint)
    });
    
    // Sort by priority
    this.requestQueue.sort((a, b) => b.priority - a.priority);
    
    // Start processing queue if not already running
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  // Process queued requests
  async processQueue() {
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      const canProceed = this.canUserMakeRequest(request.userId, request.endpoint);
      
      if (canProceed.allowed) {
        // Remove from queue and process
        this.requestQueue.shift();
        this.recordRequest(request.userId, request.endpoint);
        request.resolve();
      } else {
        // Wait and retry
        await this.sleep(canProceed.retryAfter * 1000);
      }
    }
    
    this.processingQueue = false;
  }

  // Helper methods
  getEndpointKey(endpoint) {
    if (endpoint.includes('/search/tracks')) return '/api/search/tracks';
    if (endpoint.includes('/chart/tracks')) return '/api/chart/tracks';
    if (endpoint.includes('/chart/artists')) return '/api/chart/artists';
    if (endpoint.includes('/artist/')) return '/api/artist/:id';
    return 'default';
  }

  getPriority(endpoint) {
    const priorities = {
      '/api/search/tracks': 1,
      '/api/chart/tracks': 2,
      '/api/chart/artists': 2,
      '/api/artist/:id': 3,
    };
    return priorities[this.getEndpointKey(endpoint)] || 0;
  }

  cleanupOldRequests(userId, now) {
    // Clean global requests
    this.globalLimits.requests = this.globalLimits.requests.filter(
      time => now - time < this.globalLimits.timeWindow
    );
    
    // Clean user requests
    const userRequests = this.userLimits.get(userId) || [];
    const cleanedUserRequests = userRequests.filter(
      time => now - time < this.userTimeWindow
    );
    this.userLimits.set(userId, cleanedUserRequests);
  }

  getGlobalRetryAfter(now) {
    if (this.globalLimits.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.globalLimits.requests);
    return Math.ceil((this.globalLimits.timeWindow - (now - oldestRequest)) / 1000);
  }

  getUserRetryAfter(userId, now) {
    const userRequests = this.userLimits.get(userId) || [];
    if (userRequests.length === 0) return 0;
    const oldestRequest = Math.min(...userRequests);
    return Math.ceil((this.userTimeWindow - (now - oldestRequest)) / 1000);
  }

  getEndpointRequests(endpointKey, now) {
    // This would need to be implemented with proper storage
    return [];
  }

  addEndpointRequest(endpointKey, now) {
    // This would need to be implemented with proper storage
  }

  getEndpointRetryAfter(endpointKey, now) {
    // This would need to be implemented with proper storage
    return 60;
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get rate limit status for headers
  getRateLimitHeaders(userId) {
    const now = Date.now();
    this.cleanupOldRequests(userId, now);
    
    const userRequests = this.userLimits.get(userId) || [];
    
    return {
      'X-RateLimit-Limit': this.userMaxRequests,
      'X-RateLimit-Remaining': Math.max(0, this.userMaxRequests - userRequests.length),
      'X-RateLimit-Reset': new Date(now + this.userTimeWindow).toISOString(),
      'X-Global-Limit': this.globalLimits.maxRequests,
      'X-Global-Remaining': Math.max(0, this.globalLimits.maxRequests - this.globalLimits.requests.length),
    };
  }
}

// Initialize enhanced rate limiter
const rateLimiter = new EnhancedRateLimiter();

// Debug endpoint — only available in development
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug', (req, res) => {
    res.json({
      method: req.method,
      path: req.path,
      url: req.url,
      query: req.query,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
      },
      timestamp: new Date().toISOString(),
    });
  });
}

// iTunes Top Songs Chart
app.get('/api/chart/tracks', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.query);
    if (cachedResponse) {
      console.log('📦 Serving cached response for chart tracks');
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);
    
    const itunesUrl = 'https://itunes.apple.com/search?term=music&entity=song&limit=50';
    console.log(`🎵 Fetching iTunes chart: ${itunesUrl}`);
    
    const response = await fetch(itunesUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform iTunes data to our format
    const transformedTracks = data.results
      .filter(track => track.previewUrl) // Only tracks with previews
      .map((track, index) => ({
        id: track.trackId || index,
        title: track.trackName,
        artist: {
          id: track.artistId,
          name: track.artistName,
          picture: track.artworkUrl100?.replace('100x100', '300x300') || track.artworkUrl100,
          picture_small: track.artworkUrl60,
          picture_medium: track.artworkUrl100,
          picture_big: track.artworkUrl100?.replace('100x100', '500x500') || track.artworkUrl100,
        },
        album: {
          id: track.collectionId,
          title: track.collectionName,
          cover: track.artworkUrl100,
          cover_medium: track.artworkUrl100?.replace('100x100', '300x300') || track.artworkUrl100,
          cover_big: track.artworkUrl100?.replace('100x100', '600x600') || track.artworkUrl100,
        },
        duration: Math.floor((track.trackTimeMillis || 0) / 1000),
        preview: track.previewUrl,
        rank: index + 1,
        link: track.trackViewUrl,
      }));
    
    console.log(`✅ iTunes chart: Found ${transformedTracks.length} tracks with previews`);
    
    const responseData = { data: transformedTracks };
    
    // Cache the response
    rateLimiter.setCachedResponse(endpoint, req.query, responseData);
    
    // Add rate limit headers
    const headers = rateLimiter.getRateLimitHeaders(userId);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching iTunes chart tracks:', error.message);
    
    // Return demo data as fallback
    const demoData = {
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
            cover: 'https://picsum.photos/seed/afterhours/300/300.jpg',
            cover_medium: 'https://picsum.photos/seed/afterhours/300/300.jpg',
            cover_big: 'https://picsum.photos/seed/afterhours/600/600.jpg',
          },
          duration: 200,
          preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          rank: 1,
          link: '#',
        },
        // ... more demo tracks
      ]
    };
    
    res.json(demoData);
  }
});

// iTunes Top Artists
app.get('/api/chart/artists', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.query);
    if (cachedResponse) {
      console.log('📦 Serving cached response for chart artists');
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);

    const targetArtistCount = 20;
    const artistsSet = new Map();

    // Use multiple seed queries to collect enough unique artists consistently
    const seedQueries = ['top music', 'pop hits', 'hip hop', 'latin', 'rock'];
    for (const seed of seedQueries) {
      if (artistsSet.size >= targetArtistCount) break;

      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(seed)}&entity=song&limit=200`;
      console.log(`🎵 Fetching artist chart seed data: ${itunesUrl}`);

      const response = await fetch(itunesUrl);
      if (!response.ok) {
        console.warn(`⚠️ Seed query failed (${seed}): HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const tracks = data.results || [];

      for (const track of tracks) {
        if (artistsSet.size >= targetArtistCount) break;
        if (!track.artistId || !track.artistName) continue;

        if (!artistsSet.has(track.artistId)) {
          artistsSet.set(track.artistId, {
            id: track.artistId,
            name: track.artistName,
            link: track.artistViewUrl || `https://itunes.apple.com/artist/${track.artistId}`,
            picture: track.artworkUrl100?.replace('100x100bb', '500x500bb') || `https://picsum.photos/seed/${track.artistName}/500/500.jpg`,
            picture_small: track.artworkUrl100?.replace('100x100bb', '56x56bb') || `https://picsum.photos/seed/${track.artistName}/56/56.jpg`,
            picture_medium: track.artworkUrl100?.replace('100x100bb', '250x250bb') || `https://picsum.photos/seed/${track.artistName}/250/250.jpg`,
            picture_big: track.artworkUrl100?.replace('100x100bb', '500x500bb') || `https://picsum.photos/seed/${track.artistName}/500/500.jpg`,
            picture_xl: track.artworkUrl100?.replace('100x100bb', '1000x1000bb') || `https://picsum.photos/seed/${track.artistName}/1000/1000.jpg`,
            type: 'artist'
          });
        }
      }
    }

    const artists = Array.from(artistsSet.values()).map((artist, index) => ({
      ...artist,
      position: index + 1
    })).slice(0, targetArtistCount);

    console.log(`✅ Chart artists: Fetched ${artists.length} popular artists`);
    
    const responseData = { data: artists, total: artists.length };
    
    // Cache the response
    rateLimiter.setCachedResponse(endpoint, req.query, responseData);
    
    // Add rate limit headers
    const headers = rateLimiter.getRateLimitHeaders(userId);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching iTunes chart artists:', error);
    res.status(500).json({ error: 'Failed to fetch chart artists', data: [] });
  }
});

// iTunes Top Albums
app.get('/api/chart/albums', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.query);
    if (cachedResponse) {
      console.log('📦 Serving cached response for chart albums');
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);

    const itunesUrl = 'https://itunes.apple.com/search?term=album&entity=album&limit=50';
    console.log(`🎵 Fetching iTunes albums: ${itunesUrl}`);
    
    const response = await fetch(itunesUrl);
    const data = await response.json();
    
    const albums = (data.results || [])
      .filter(album => album.collectionName && album.artworkUrl100)
      .slice(0, 20)
      .map((album, index) => ({
        id: album.collectionId,
        title: album.collectionName,
        artist: album.artistName,
        release_date: album.releaseDate,
        cover: album.artworkUrl100?.replace('100x100bb', '300x300bb'),
        link: album.collectionViewUrl,
        position: index + 1
      }));
    
    console.log(`✅ iTunes albums: Found ${albums.length} albums`);
    
    const responseData = { data: albums, total: albums.length };
    
    // Cache the response
    rateLimiter.setCachedResponse(endpoint, req.query, responseData);
    
    // Add rate limit headers
    const headers = rateLimiter.getRateLimitHeaders(userId);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching iTunes chart albums:', error);
    res.status(500).json({ error: 'Failed to fetch chart albums' });
  }
});

// iTunes Search Tracks
app.get('/api/search/tracks', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ data: [], total: 0 });
    }
    
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.query);
    if (cachedResponse) {
      console.log(`📦 Serving cached search results for "${q}"`);
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=50`;
    console.log(`🔍 Searching iTunes for "${q}": ${itunesUrl}`);
    
    const response = await fetch(itunesUrl);
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      const playableTracks = data.results
        .filter(track => track.previewUrl && track.trackName)
        .map((track, index) => ({
          id: track.trackId,
          title: track.trackName,
          artist: {
            id: track.artistId,
            name: track.artistName || 'Unknown',
            picture: track.artworkUrl100?.replace('100x100bb', '300x300bb') || 'https://picsum.photos/seed/artist/300/300.jpg',
            picture_small: track.artworkUrl100 || 'https://picsum.photos/seed/artist/56/56.jpg',
            picture_medium: track.artworkUrl100?.replace('100x100bb', '250x250bb') || 'https://picsum.photos/seed/artist/250/250.jpg',
            picture_big: track.artworkUrl100?.replace('100x100bb', '500x500bb') || 'https://picsum.photos/seed/artist/500/500.jpg',
          },
          album: {
            id: track.collectionId,
            title: track.collectionName || 'Unknown',
            cover: track.artworkUrl100?.replace('100x100bb', '300x300bb') || 'https://picsum.photos/seed/album/300/300.jpg',
          },
          preview: track.previewUrl,
          duration: Math.floor(track.trackTimeMillis / 1000),
          link: track.trackViewUrl,
          rank: index + 1
        }))
        .slice(0, 20);
      
      console.log(`✅ Search for "${q}": Found ${playableTracks.length} tracks from ${data.results.length} total`);
      
      const responseData = { data: playableTracks, total: playableTracks.length };
      
      // Cache the response
      rateLimiter.setCachedResponse(endpoint, req.query, responseData);
      
      // Add rate limit headers
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      return res.json(responseData);
    }
    
    res.json({ data: [], total: 0 });
  } catch (error) {
    console.error('Error searching iTunes tracks:', error.message);
    res.status(500).json({ error: 'Search failed', data: [] });
  }
});

// iTunes Lookup Artist
app.get('/api/artist/:id', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    const { id } = req.params;
    
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.params);
    if (cachedResponse) {
      console.log('📦 Serving cached response for artist lookup');
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);

    // Professional approach: Use Lookup with entity=song to get artist info + top songs in ONE request
    const lookupUrl = `https://itunes.apple.com/lookup?id=${id}&entity=song&limit=30`;
    console.log(`\n🎨 ========== ARTIST DETAIL LOOKUP ==========`);
    console.log(`📍 Artist ID: ${id}`);
    console.log(`🔗 Lookup URL: ${lookupUrl}`);

    const response = await fetch(lookupUrl);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Separate artist info from tracks (first result is artist, rest are songs)
    const artistInfo = data.results[0];
    const topSongs = data.results
      .filter(item => item.wrapperType === 'track' && item.previewUrl)
      .slice(0, 20);

    // Pro-tip: iTunes doesn't provide direct artist photo, so use first track's album art
    const artistImage = topSongs[0]?.artworkUrl100?.replace('100x100bb', '600x600bb') || 
                        `https://picsum.photos/seed/${artistInfo.artistName}/600/600.jpg`;

    const artistDetail = {
      id: artistInfo.artistId,
      name: artistInfo.artistName,
      genre: artistInfo.primaryGenreName || 'Music',
      link: artistInfo.artistLinkUrl || `https://itunes.apple.com/artist/${artistInfo.artistId}`,
      picture: artistImage,
      picture_big: artistImage,
      picture_xl: artistImage.replace('600x600bb', '1000x1000bb'),
      country: 'Global'
    };

    const songs = topSongs.map((song, index) => ({
      id: song.trackId,
      title: song.trackName,
      artist: {
        id: song.artistId,
        name: song.artistName
      },
      album: {
        id: song.collectionId,
        title: song.collectionName || 'Unknown',
        cover: song.artworkUrl100?.replace('100x100bb', '300x300bb'),
        cover_small: song.artworkUrl100,
        cover_medium: song.artworkUrl100?.replace('100x100bb', '250x250bb'),
        cover_big: song.artworkUrl100?.replace('100x100bb', '500x500bb')
      },
      preview: song.previewUrl, // Direct .m4a file - no proxying needed!
      duration: Math.floor(song.trackTimeMillis / 1000),
      rank: index + 1,
      link: song.trackViewUrl
    }));

    console.log(`✅ Artist: ${artistDetail.name}`);
    console.log(`✅ Genre: ${artistDetail.genre}`);
    console.log(`✅ Top Songs: ${songs.length} tracks fetched`);
    console.log(`📸 Using album art as artist image`);

    const responseData = {
      artist: artistDetail,
      songs: songs,
      total: songs.length
    };
    
    // Cache the response
    rateLimiter.setCachedResponse(endpoint, req.params, responseData);
    
    // Add rate limit headers
    const headers = rateLimiter.getRateLimitHeaders(userId);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching iTunes artist detail:', error.message);
    res.status(500).json({ error: 'Failed to fetch artist details' });
  }
});

// iTunes Artist Top Tracks
app.get('/api/artist/:id/top', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    const { id } = req.params;
    
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.params);
    if (cachedResponse) {
      console.log('📦 Serving cached response for artist top tracks');
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);

    const response = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const artist = data.results[0];
      const topTracks = data.results
        .slice(1) // First result is the artist, rest are songs
        .filter(track => track.previewUrl)
        .slice(0, 20)
        .map((track, index) => ({
          id: track.trackId,
          title: track.trackName,
          preview: track.previewUrl,
          duration: Math.floor(track.trackTimeMillis / 1000),
          link: track.trackViewUrl,
          rank: index + 1
        }));
      
      const responseData = { data: topTracks, total: topTracks.length };
      
      // Cache the response
      rateLimiter.setCachedResponse(endpoint, req.params, responseData);
      
      // Add rate limit headers
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      res.json(responseData);
    } else {
      res.json({ data: [], total: 0 });
    }
  } catch (error) {
    console.error('Error fetching iTunes artist top tracks:', error);
    res.status(500).json({ error: 'Failed to fetch artist top tracks' });
  }
});

// iTunes Artist Albums
app.get('/api/artist/:id/albums', async (req, res) => {
  const userId = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  try {
    const { id } = req.params;
    
    // Check cache first
    const cachedResponse = rateLimiter.getCachedResponse(endpoint, req.params);
    if (cachedResponse) {
      console.log('📦 Serving cached response for artist albums');
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json(cachedResponse);
    }
    
    // Check rate limits
    const canProceed = rateLimiter.canUserMakeRequest(userId, endpoint);
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}: ${canProceed.reason}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        reason: canProceed.reason,
        retryAfter: canProceed.retryAfter,
        message: `Too many requests. Please wait ${canProceed.retryAfter} seconds.`
      });
    }
    
    // Record the request
    rateLimiter.recordRequest(userId, endpoint);

    const response = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=album`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const artist = data.results[0];
      const albums = data.results
        .slice(1) // First result is the artist, rest are albums
        .filter(album => album.collectionType === 'Album' && album.artworkUrl100)
        .slice(0, 20)
        .map((album, index) => ({
          id: album.collectionId,
          title: album.collectionName,
          release_date: album.releaseDate,
          cover: album.artworkUrl100?.replace('100x100bb', '300x300bb'),
          cover_medium: album.artworkUrl100?.replace('100x100bb', '600x600bb'),
          cover_big: album.artworkUrl100?.replace('100x100bb', '1000x1000bb'),
          track_count: album.trackCount,
          link: album.collectionViewUrl,
          position: index + 1
        }));
      
      const responseData = { data: albums, total: albums.length };
      
      // Cache the response
      rateLimiter.setCachedResponse(endpoint, req.params, responseData);
      
      // Add rate limit headers
      const headers = rateLimiter.getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      res.json(responseData);
    } else {
      res.json({ data: [], total: 0 });
    }
  } catch (error) {
    console.error('Error fetching iTunes artist albums:', error);
    res.status(500).json({ error: 'Failed to fetch artist albums' });
  }
});

// iTunes preview proxy - iTunes previews usually work fine but proxy anyway for consistency
app.get('/api/preview', async (req, res) => {
  try {
    const url = req.url.split('url=')[1];
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    console.log(`\n🎵 ========== AUDIO PROXY REQUEST ==========`);
    console.log(`📍 Encoded URL: ...${url.substring(url.length - 40)}`);
    
    try {
      const decodedUrl = decodeURIComponent(url);
      console.log(`🔗 Decoded: ${decodedUrl}`);
      
      const response = await axios({
        url: decodedUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Detect audio format from URL
      let contentType = 'audio/mp4'; // iTunes uses .m4a by default
      if (decodedUrl.includes('.mp3')) {
        contentType = 'audio/mpeg';
      } else if (decodedUrl.includes('.m4a') || decodedUrl.includes('.aac')) {
        contentType = 'audio/mp4';
      }

      res.status(200);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', response.headers['content-length'] || '');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Accept-Ranges');
      
      console.log(`✅ Audio proxy: Starting stream`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Length: ${response.headers['content-length'] || 'unknown'}`);
      
      response.data.pipe(res);
      
      response.data.on('error', (streamErr) => {
        console.error(`❌ Proxy stream error: ${streamErr.message}`);
      });
      
    } catch (axiosErr) {
      console.error(`❌ Axios error: ${axiosErr.message}`);
      throw axiosErr;
    }
    
  } catch (error) {
    console.error(`❌ Preview proxy error: ${error.message}`);
    res.status(500).json({ error: 'Failed to proxy audio' });
  }
});

// Test endpoint - serve working fallback audio directly
app.get('/api/test-audio', async (req, res) => {
  try {
    const fallbackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    console.log(`\n🧪 ========== TEST AUDIO ENDPOINT ==========`);
    console.log(`📍 Testing audio streaming capability`);
    console.log(`🔗 Source: ${fallbackUrl}`);
    
    const response = await axios({
      url: fallbackUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 8000,
    });

    res.status(200);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', response.headers['content-length'] || '');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Accept-Ranges');
    
    console.log(`✅ Headers set, piping audio to browser`);
    console.log(`   Content-Type: audio/mpeg`);
    console.log(`   Content-Length: ${response.headers['content-length'] || 'unknown'}`);
    console.log(`   Access-Control-Allow-Origin: *`);
    
    response.data.pipe(res);
    response.data.on('error', (err) => {
      console.error('❌ Test audio stream error:', err.message);
    });
  } catch (error) {
    console.error('❌ Test audio error:', error.message);
    res.status(500).send('Test audio error');
  }
});

// Diagnostic endpoint - comprehensive system info
app.get('/api/diagnostic', (req, res) => {
  const nodeVersion = process.version;
  const platform = process.platform;
  const port = PORT;
  const uptime = process.uptime();
  
  res.json({
    status: 'Server running',
    timestamp: new Date().toISOString(),
    environment: {
      node_version: nodeVersion,
      platform: platform,
      port: port,
      uptime_seconds: Math.floor(uptime),
    },
    api: {
      provider: 'Apple iTunes',
      rateLimit: '20 requests per minute',
      requiresAuth: false,
      previewFormat: 'Direct HTTPS URL (.m4a)',
    },
    endpoints: {
      chart_tracks: 'GET /api/chart/tracks',
      chart_artists: 'GET /api/chart/artists',
      chart_albums: 'GET /api/chart/albums',
      search_tracks: 'GET /api/search/tracks?q={query}',
      artist_info: 'GET /api/artist/:id',
      artist_top: 'GET /api/artist/:id/top',
      artist_albums: 'GET /api/artist/:id/albums',
      preview: 'GET /api/preview?url={encodedUrl}',
      test_audio: 'GET /api/test-audio',
      debug: 'GET /api/debug',
      diagnostic: 'GET /api/diagnostic',
    },
    cors_enabled: true,
    cross_origin_audio: 'anonymous (configured)',
    streaming_available: true,
  });
});

// Test page endpoint
app.get('/test-audio.html', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background-color: #f0f0f0; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 10px 20px; margin: 5px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background-color: #0056b3; }
        button.danger { background-color: #dc3545; }
        .log { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; margin-top: 10px; }
        .log-entry { padding: 5px 0; border-bottom: 1px solid #e9ecef; }
        .log-entry.success { color: #28a745; }
        .log-entry.error { color: #dc3545; }
        input[type="range"] { width: 200px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Audio Test</h1>
        <div class="test-section">
            <h2>Direct Volume Test</h2>
            <p>Use this to verify audio output is working</p>
            <button onclick="testDirectVolume()">🔊 Test Direct Volume (JavaScript)</button>
            <button onclick="testFallbackAudio()">Test Fallback MP3</button>
            <button onclick="testItunesAudio()">Test iTunes Track</button>
            <div style="margin-top: 15px;">
                <label>Volume: </label>
                <input type="range" id="vol" min="0" max="1" step="0.1" value="1" onchange="updateVolume(this.value)">
                <span id="volValue">100%</span>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h3>Console Output:</h3>
            <div class="log" id="log"></div>
        </div>
    </div>
    <script>
        let testAudio = null;
        const logDiv = document.getElementById('log');
        
        function log(msg) {
            const d = new Date();
            const time = d.toLocaleTimeString();
            const entry = document.createElement('div');
            logDiv.appendChild(entry);
            entry.className = msg.includes('❌') ? 'log-entry error' : 'log-entry success';
            entry.textContent = '[' + time + '] ' + msg;
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(msg);
        }
        
        function updateVolume(v) {
            if (testAudio) {
                testAudio.volume = parseFloat(v);
                document.getElementById('volValue').textContent = Math.round(v * 100) + '%';
                log('📢 Volume set to ' + Math.round(v * 100) + '%');
            }
        }
        
        function createAudio() {
            if (testAudio) testAudio.pause();
            testAudio = new Audio();
            testAudio.crossOrigin = 'anonymous';
            testAudio.volume = 1;
            testAudio.muted = false;
            testAudio.addEventListener('play', () => log('▶️ PLAYING'));
            testAudio.addEventListener('error', (e) => log('❌ ERROR: ' + e.target.error?.message));
            testAudio.addEventListener('canplay', () => log('✅ READY'));
            log('🔊 Audio created (unmuted, vol=1)');
        }
        
        async function testFallbackAudio() {
            log('Testing fallback MP3...');
            createAudio();
            testAudio.src = '/api/test-audio';
            const p = testAudio.play();
            if (p) p.catch(e => log('❌ Play failed: ' + e.message));
        }
        
        async function testItunesAudio() {
            log('Fetching iTunes track...');
            try {
                const res = await fetch('/api/chart/tracks');
                const d = await res.json();
                const url = d.tracks[0].preview;
                log('Got: ' + d.tracks[0].title);
                createAudio();
                testAudio.src = '/api/preview?url=' + encodeURIComponent(url);
                const p = testAudio.play();
                if (p) p.catch(e => log('❌ Play failed: ' + e.message));
            } catch (e) {
                log('❌ Error: ' + e.message);
            }
        }
        
        function testDirectVolume() {
            log('Creating audio for direct volume test...');
            createAudio();
            // Create a simple beep sound using Web Audio API
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = 0.3;
            osc.frequency.value = 440;
            osc.type = 'sine';
            osc.start();
            setTimeout(() => osc.stop(), 500);
            log('🔊 Beep sound played using Web Audio API');
        }
        
        log('Audio Test Page Ready');
    </script>
</body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  // Catch-all route to serve the React app for any other request
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  const rateLimit = process.env.NODE_ENV === 'production' ? '20/min' : '100/min (dev mode)';
  
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`\n📡 iTunes API Endpoints (Rate Limit: ${rateLimit}):`);
  console.log(`   GET /api/chart/tracks - Top songs globally`);
  console.log(`   GET /api/chart/artists - Popular artists`);
  console.log(`   GET /api/chart/albums - Top albums`);
  console.log(`   GET /api/search/tracks?q={query} - Search by song title/artist`);
  console.log(`   GET /api/artist/:id - Get artist info`);
  console.log(`   GET /api/artist/:id/top - Get artist top songs`);
  console.log(`   GET /api/artist/:id/albums - Get artist albums`);
  console.log(`\n🎵 Audio Proxy:`);
  console.log(`   GET /api/preview?url={encodedUrl} - Proxy iTunes audio`);
  console.log(`\n🧪 Testing & Diagnostics:`);
  console.log(`   GET /api/test-audio - Test working audio stream`);
  console.log(`   GET /api/debug - Show request info`);
  console.log(`   GET /api/diagnostic - System diagnostics`);
  console.log(`\n✅ All endpoints ready!\n`);
});
