// Artist Image Fetcher - Wikipedia only (no auth needed)
const cache = new Map();
const requestCache = new Map(); // Track in-flight requests

const fetchFromWikipediaByTitle = async (searchTitle) => {
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchTitle)}&prop=pageimages&pithumbsize=800&format=json&origin=*`
  );

  if (!response.ok) return null;

  const data = await response.json();
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  const imageUrl = page?.thumbnail?.source || null;
  return imageUrl;
};

const fetchFromWikipediaBySearch = async (searchTerm) => {
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=5&prop=pageimages&pithumbsize=800&format=json&origin=*`
  );

  if (!response.ok) return null;

  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});
  const pageWithImage = pages.find((page) => page?.thumbnail?.source);
  const imageUrl = pageWithImage?.thumbnail?.source || null;
  return imageUrl;
};

export const fetchArtistImage = async (artistName) => {
  if (!artistName) return { image: null, isValid: false };

  const cacheKey = `artist_${artistName.toLowerCase()}`;
  
  // Return from cache if available
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  // Return existing promise if request already in flight
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      
      let imageUrl = null;
      const nameWithoutThe = artistName.startsWith('The ') ? artistName.substring(4) : null;
      const attempts = [
        () => fetchFromWikipediaByTitle(artistName),
        () => fetchFromWikipediaByTitle(`${artistName} (musician)`),
        () => fetchFromWikipediaByTitle(`${artistName} (band)`),
        () => fetchFromWikipediaByTitle(`${artistName} (singer)`),
        () => fetchFromWikipediaBySearch(`${artistName} musician`),
        () => fetchFromWikipediaBySearch(`${artistName} band`)
      ];

      if (nameWithoutThe) {
        attempts.push(() => fetchFromWikipediaByTitle(nameWithoutThe));
        attempts.push(() => fetchFromWikipediaByTitle(`${nameWithoutThe} (musician)`));
        attempts.push(() => fetchFromWikipediaBySearch(`${nameWithoutThe} musician`));
      }

      for (const attempt of attempts) {
        imageUrl = await attempt();
        if (imageUrl) break;
      }
      
      const result = imageUrl 
        ? { image: imageUrl, isValid: true } 
        : { image: null, isValid: false };

      // Cache the result
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`[Artist Image] Error fetching for "${artistName}":`, error);
      const result = { image: null, isValid: false };
      cache.set(cacheKey, result);
      return result;
    } finally {
      // Remove from in-flight requests
      requestCache.delete(cacheKey);
    }
  })();
  
  // Store in-flight request
  requestCache.set(cacheKey, requestPromise);
  return requestPromise;
};

// Clear cache periodically (every hour)
setInterval(() => {
  cache.clear();
}, 60 * 60 * 1000);

// Manual cache clear function
export const clearArtistImageCache = () => {
  cache.clear();
};
