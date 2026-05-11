import { createContext, useContext, useState, useEffect } from 'react';

const FollowedArtistsContext = createContext();

export const useFollowedArtists = () => {
  const context = useContext(FollowedArtistsContext);
  if (!context) {
    throw new Error('useFollowedArtists must be used within a FollowedArtistsProvider');
  }
  return context;
};

export const FollowedArtistsProvider = ({ children }) => {
  const [followedArtists, setFollowedArtists] = useState([]);

  // Load followed artists from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('followedArtists');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out test artists
        const filtered = parsed.filter(artist => 
          artist.id !== 'test-artist-1' && 
          artist.name !== 'Test Artist'
        );
        setFollowedArtists(filtered);
        // Update localStorage with filtered data
        if (filtered.length > 0) {
          localStorage.setItem('followedArtists', JSON.stringify(filtered));
        } else {
          localStorage.removeItem('followedArtists');
        }
      } catch (error) {
        console.error('Error loading followed artists:', error);
      }
    }
  }, []);

  // Save to localStorage whenever followedArtists changes
  useEffect(() => {
    if (followedArtists.length > 0) {
      localStorage.setItem('followedArtists', JSON.stringify(followedArtists));
    }
  }, [followedArtists]);

  const followArtist = (artist) => {
    if (!artist.id) {
      // Generate a temporary ID if missing
      artist.id = artist.name || 'temp-' + Date.now();
    }
    
    setFollowedArtists(prev => {
      const exists = prev.find(a => a.id === artist.id);
      if (!exists) {
        return [...prev, artist];
      }
      return prev;
    });
  };

  const unfollowArtist = (artistId) => {
    setFollowedArtists(prev => prev.filter(artist => artist.id !== artistId));
  };

  const isFollowing = (artistId) => {
    return followedArtists.some(artist => artist.id === artistId);
  };

  const toggleFollow = (artist) => {
    if (isFollowing(artist.id)) {
      unfollowArtist(artist.id);
    } else {
      followArtist(artist);
    }
  };

  const value = {
    followedArtists,
    followArtist,
    unfollowArtist,
    isFollowing,
    toggleFollow,
  };

  return (
    <FollowedArtistsContext.Provider value={value}>
      {children}
    </FollowedArtistsContext.Provider>
  );
};
