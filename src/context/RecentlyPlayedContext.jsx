import { createContext, useContext, useReducer, useEffect } from 'react';

// Action types
const RECENTLY_PLAYED_ACTIONS = {
  ADD_TRACK: 'ADD_TRACK',
  REMOVE_TRACK: 'REMOVE_TRACK',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  LOAD_HISTORY: 'LOAD_HISTORY',
  SET_MAX_TRACKS: 'SET_MAX_TRACKS',
};

// Initial state
const initialState = {
  tracks: [],
  maxTracks: 50, // Default to 50 tracks
  isLoading: false,
};

// Reducer function
const recentlyPlayedReducer = (state, action) => {
  switch (action.type) {
    case RECENTLY_PLAYED_ACTIONS.ADD_TRACK: {
      const { track } = action.payload;
      const playedAt = new Date().toISOString();
      
      // Check if track already exists in history
      const existingIndex = state.tracks.findIndex(
        t => t.id === track.id || (t.title === track.title && t.artist.name === track.artist.name)
      );
      
      let newTracks;
      if (existingIndex !== -1) {
        // Remove existing track and add it to the beginning (update play time)
        newTracks = [
          { ...track, playedAt, playCount: (state.tracks[existingIndex].playCount || 1) + 1 },
          ...state.tracks.filter((_, index) => index !== existingIndex)
        ];
      } else {
        // Add new track to the beginning
        newTracks = [{ ...track, playedAt, playCount: 1 }, ...state.tracks];
      }
      
      // Keep only the most recent maxTracks
      const trimmedTracks = newTracks.slice(0, state.maxTracks);
      
      // Save to localStorage
      try {
        localStorage.setItem('recentlyPlayed', JSON.stringify(trimmedTracks));
      } catch (error) {
        console.warn('Failed to save recently played to localStorage:', error);
      }
      
      return {
        ...state,
        tracks: trimmedTracks,
      };
    }
    
    case RECENTLY_PLAYED_ACTIONS.REMOVE_TRACK: {
      const { trackId } = action.payload;
      const newTracks = state.tracks.filter(track => track.id !== trackId);
      
      // Save to localStorage
      try {
        localStorage.setItem('recentlyPlayed', JSON.stringify(newTracks));
      } catch (error) {
        console.warn('Failed to save recently played to localStorage:', error);
      }
      
      return {
        ...state,
        tracks: newTracks,
      };
    }
    
    case RECENTLY_PLAYED_ACTIONS.CLEAR_HISTORY: {
      // Clear from localStorage
      try {
        localStorage.removeItem('recentlyPlayed');
      } catch (error) {
        console.warn('Failed to clear recently played from localStorage:', error);
      }
      
      return {
        ...state,
        tracks: [],
      };
    }
    
    case RECENTLY_PLAYED_ACTIONS.LOAD_HISTORY: {
      const { tracks } = action.payload;
      return {
        ...state,
        tracks: tracks || [],
        isLoading: false,
      };
    }
    
    case RECENTLY_PLAYED_ACTIONS.SET_MAX_TRACKS: {
      const { maxTracks } = action.payload;
      const trimmedTracks = state.tracks.slice(0, maxTracks);
      
      // Save to localStorage
      try {
        localStorage.setItem('recentlyPlayed', JSON.stringify(trimmedTracks));
      } catch (error) {
        console.warn('Failed to save recently played to localStorage:', error);
      }
      
      return {
        ...state,
        tracks: trimmedTracks,
        maxTracks,
      };
    }
    
    default:
      return state;
  }
};

// Create context
const RecentlyPlayedContext = createContext();

// Provider component
export const RecentlyPlayedProvider = ({ children }) => {
  const [state, dispatch] = useReducer(recentlyPlayedReducer, initialState);

  // Load history from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('recentlyPlayed');
        if (saved) {
          const tracks = JSON.parse(saved);
          dispatch({ type: RECENTLY_PLAYED_ACTIONS.LOAD_HISTORY, payload: { tracks } });
        }
      } catch (error) {
        console.warn('Failed to load recently played from localStorage:', error);
        dispatch({ type: RECENTLY_PLAYED_ACTIONS.LOAD_HISTORY, payload: { tracks: [] } });
      }
    };

    loadHistory();
  }, []);

  // Action creators
  const addTrack = (track) => {
    if (!track || !track.id) return;
    dispatch({ type: RECENTLY_PLAYED_ACTIONS.ADD_TRACK, payload: { track } });
  };

  const removeTrack = (trackId) => {
    dispatch({ type: RECENTLY_PLAYED_ACTIONS.REMOVE_TRACK, payload: { trackId } });
  };

  const clearHistory = () => {
    dispatch({ type: RECENTLY_PLAYED_ACTIONS.CLEAR_HISTORY });
  };

  const setMaxTracks = (maxTracks) => {
    dispatch({ type: RECENTLY_PLAYED_ACTIONS.SET_MAX_TRACKS, payload: { maxTracks } });
  };

  // Get recently played tracks sorted by newest first (already sorted by add logic)
  const getRecentTracks = (limit = null) => {
    if (limit) {
      return state.tracks.slice(0, limit);
    }
    return state.tracks;
  };

  // Get tracks played in the last X hours
  const getTracksFromLastHours = (hours = 24) => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return state.tracks.filter(track => 
      new Date(track.playedAt) > cutoffTime
    );
  };

  // Get most played tracks
  const getMostPlayedTracks = (limit = 10) => {
    return [...state.tracks]
      .sort((a, b) => (b.playCount || 1) - (a.playCount || 1))
      .slice(0, limit);
  };

  const value = {
    ...state,
    addTrack,
    removeTrack,
    clearHistory,
    setMaxTracks,
    getRecentTracks,
    getTracksFromLastHours,
    getMostPlayedTracks,
  };

  return (
    <RecentlyPlayedContext.Provider value={value}>
      {children}
    </RecentlyPlayedContext.Provider>
  );
};

// Hook to use the context
export const useRecentlyPlayed = () => {
  const context = useContext(RecentlyPlayedContext);
  if (!context) {
    throw new Error('useRecentlyPlayed must be used within a RecentlyPlayedProvider');
  }
  return context;
};

export { RECENTLY_PLAYED_ACTIONS };
