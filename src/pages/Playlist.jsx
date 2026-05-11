import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Music, Trash2, Plus, ChevronRight, Play, Pause } from 'lucide-react';
import { useRef } from 'react';
import { usePlaylist } from '../context/PlaylistContext';
import { usePlayer } from '../context/PlayerContext';
import { useAutoScrollToActiveTrack } from '../hooks/useAutoScrollToActiveTrack';
import SongCard from '../components/SongCard';
import PlaylistSongCard from '../components/PlaylistSongCard';
import './Playlist.css';

const Playlist = () => {
  const { playlists, createPlaylist, deletePlaylist, updatePlaylistName, playlist, removeFromPlaylist } = usePlaylist();
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('playlist-1');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const playlistGridRef = useRef(null);

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId) || playlists[0];

  // Auto-scroll to active track
  useAutoScrollToActiveTrack(selectedPlaylist?.tracks || [], playlistGridRef);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = createPlaylist(newPlaylistName.trim());
      setSelectedPlaylistId(newPlaylist.id);
      setNewPlaylistName('');
      setShowCreateForm(false);
    }
  };

  const handleDeletePlaylist = (playlistId) => {
    if (playlistId === 'playlist-1') return; // Don't allow deleting default playlist
    deletePlaylist(playlistId);
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId('playlist-1');
    }
  };

  const handleRenamePlaylist = (playlistId, newName) => {
    if (newName.trim()) {
      updatePlaylistName(playlistId, newName.trim());
      setEditingPlaylistId(null);
    }
  };

  const handlePlayPlaylist = () => {
    if (selectedPlaylist?.tracks.length > 0) {
      playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks, 0);
    }
  };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="playlist-page-header">
        <div className="header-text">
          <h1 className="home-title">My Playlists</h1>
          <p className="home-subtitle">
            {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} in your collection
          </p>
        </div>
        <motion.button
          className="create-playlist-button"
          onClick={() => setShowCreateForm(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          <span>Create Playlist</span>
        </motion.button>
      </div>

      {/* Playlist Creation Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            className="create-playlist-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              className="playlist-name-input"
              autoFocus
            />
            <div className="create-form-actions">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPlaylistName('');
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
              >
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlists Sidebar */}
      <div className="playlists-sidebar">
        {playlists.map(playlist => (
          <motion.div
            key={playlist.id}
            className={`playlist-item ${selectedPlaylistId === playlist.id ? 'active' : ''}`}
            onClick={() => setSelectedPlaylistId(playlist.id)}
            whileHover={{ x: 4 }}
          >
            <div className="playlist-info">
              <div className="playlist-icon">
                <Music size={20} />
              </div>
              <div className="playlist-details">
                {editingPlaylistId === playlist.id ? (
                  <input
                    type="text"
                    defaultValue={playlist.name}
                    onBlur={(e) => handleRenamePlaylist(playlist.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRenamePlaylist(playlist.id, e.target.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="playlist-rename-input"
                    autoFocus
                  />
                ) : (
                  <>
                    <h3 className="playlist-name">{playlist.name}</h3>
                    <p className="playlist-count">
                      {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="playlist-actions">
              {selectedPlaylistId === playlist.id && playlist.tracks.length > 0 && (
                <motion.button
                  className="play-playlist-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPlaylist();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isPlaying && currentTrack && selectedPlaylist.tracks.some(t => t.id === currentTrack.id) ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                </motion.button>
              )}
              <button
                className="playlist-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playlist.id !== 'playlist-1') {
                    setEditingPlaylistId(playlist.id);
                  }
                }}
                title="Rename playlist"
              >
                ✏️
              </button>
              {playlist.id !== 'playlist-1' && (
                <button
                  className="playlist-action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePlaylist(playlist.id);
                  }}
                  title="Delete playlist"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selected Playlist Content */}
      <div className="playlist-content">
        {selectedPlaylist ? (
          <>
            <div className="selected-playlist-header">
              <h2>{selectedPlaylist.name}</h2>
              <p>{selectedPlaylist.tracks.length} songs</p>
            </div>
            
            {selectedPlaylist.tracks.length > 0 ? (
              <div className="playlist-songs-list" ref={playlistGridRef}>
                {selectedPlaylist.tracks.map((track, index) => (
                  <PlaylistSongCard 
                    key={track.id} 
                    track={track} 
                    index={index} 
                    playlistId={selectedPlaylist.id}
                    tracks={selectedPlaylist.tracks} 
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Music size={48} className="empty-icon" />
                <p className="empty-text">This playlist is empty</p>
                <p className="empty-subtext">Add songs from Home or Artist pages to build this playlist</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Library size={48} className="empty-icon" />
            <p className="empty-text">No playlists found</p>
            <p className="empty-subtext">Create your first playlist to get started</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Playlist;
