import { createContext, useContext, useState, useEffect } from 'react';

const PlaylistContext = createContext();

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within PlaylistProvider');
  }
  return context;
};

export const PlaylistProvider = ({ children }) => {
  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem('musicPlaylists');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default playlist structure
    return [
      {
        id: 'playlist-1',
        name: 'Playlist 1',
        tracks: [],
        createdAt: new Date().toISOString(),
        cover: null
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('musicPlaylists', JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (name = 'New Playlist') => {
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name,
      tracks: [],
      createdAt: new Date().toISOString(),
      cover: null
    };
    setPlaylists([...playlists, newPlaylist]);
    return newPlaylist;
  };

  const addToPlaylist = (track, playlistId) => {
    setPlaylists(prevPlaylists => 
      prevPlaylists.map(playlist => {
        if (playlist.id === playlistId) {
          const existingTrack = playlist.tracks.find(t => t.id === track.id);
          if (!existingTrack) {
            return {
              ...playlist,
              tracks: [...playlist.tracks, track]
            };
          }
          // Return the playlist even if track already exists to ensure state updates
          return playlist;
        }
        return playlist;
      })
    );
  };

  const removeFromPlaylist = (trackId, playlistId) => {
    setPlaylists(prevPlaylists =>
      prevPlaylists.map(playlist => {
        if (playlist.id === playlistId) {
          return {
            ...playlist,
            tracks: playlist.tracks.filter(t => t.id !== trackId)
          };
        }
        return playlist;
      })
    );
  };

  const isInPlaylist = (trackId, playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? playlist.tracks.some(t => t.id === trackId) : false;
  };

  const getPlaylistsForTrack = (trackId) => {
    return playlists.filter(playlist => 
      playlist.tracks.some(t => t.id === trackId)
    );
  };

  const updatePlaylistName = (playlistId, newName) => {
    setPlaylists(prevPlaylists =>
      prevPlaylists.map(playlist =>
        playlist.id === playlistId ? { ...playlist, name: newName } : playlist
      )
    );
  };

  const deletePlaylist = (playlistId) => {
    setPlaylists(prevPlaylists => prevPlaylists.filter(p => p.id !== playlistId));
  };

  // Legacy functions for backward compatibility
  const addToMainPlaylist = (track) => {
    addToPlaylist(track, 'playlist-1');
  };

  const removeFromMainPlaylist = (trackId) => {
    removeFromPlaylist(trackId, 'playlist-1');
  };

  const isInMainPlaylist = (trackId) => {
    return isInPlaylist(trackId, 'playlist-1');
  };

  const getMainPlaylist = () => {
    return playlists.find(p => p.id === 'playlist-1') || { tracks: [] };
  };

  const value = {
    playlists,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    isInPlaylist,
    getPlaylistsForTrack,
    updatePlaylistName,
    deletePlaylist,
    // Legacy compatibility
    playlist: getMainPlaylist().tracks,
    addToMainPlaylist,
    removeFromMainPlaylist,
    isInMainPlaylist,
    clearPlaylist: () => updatePlaylistName('playlist-1', { tracks: [] }),
  };

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
};
