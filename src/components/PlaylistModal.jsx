import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Music, Trash2 } from 'lucide-react';
import { usePlaylist } from '../context/PlaylistContext';
import './PlaylistModal.css';

const PlaylistModal = ({ isOpen, onClose, track }) => {
  const { playlists, createPlaylist, addToPlaylist, removeFromPlaylist, isInPlaylist, getPlaylistsForTrack } = usePlaylist();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen || !track) return null;

  const handleAddToPlaylist = (playlistId) => {
    addToPlaylist(track, playlistId);
    onClose();
  };

  const handleRemoveFromPlaylist = (playlistId) => {
    removeFromPlaylist(track.id, playlistId);
    onClose();
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = createPlaylist(newPlaylistName.trim());
      addToPlaylist(track, newPlaylist.id);
      setNewPlaylistName('');
      setShowCreateForm(false);
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreatePlaylist();
    }
  };

  const trackPlaylists = getPlaylistsForTrack(track.id);

  return (
    <AnimatePresence>
      <motion.div
        className="playlist-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="playlist-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="playlist-modal-header">
            <h3>Add to Playlist</h3>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="track-info">
            <div className="track-thumbnail">
              <img 
                src={track.album?.cover_medium || track.album?.cover} 
                alt={track.title}
                onError={(e) => {
                  e.target.src = `https://picsum.photos/seed/album-${track.id}/60/60.jpg`;
                }}
              />
            </div>
            <div className="track-details">
              <h4>{track.title}</h4>
              <p>{track.artist?.name}</p>
            </div>
          </div>

          <div className="playlist-list">
            <h4>Playlists</h4>
            {playlists.map(playlist => {
              const hasTrack = isInPlaylist(track.id, playlist.id);
              return (
                <button
                  key={playlist.id}
                  className={`playlist-item ${hasTrack ? 'has-track' : ''}`}
                  onClick={() => !hasTrack && handleAddToPlaylist(playlist.id)}
                  disabled={hasTrack}
                >
                  <div className="playlist-item-info">
                    <div className="playlist-icon">
                      {hasTrack ? <Check size={16} /> : <Music size={16} />}
                    </div>
                    <div className="playlist-item-details">
                      <span className="playlist-name">{playlist.name}</span>
                      <span className="playlist-count">
                        {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
                      </span>
                    </div>
                  </div>
                  <div className="playlist-item-actions">
                    {hasTrack ? (
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromPlaylist(playlist.id);
                        }}
                        title="Remove from playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span className="added-text">Add</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="create-playlist-section">
            {!showCreateForm ? (
              <button 
                className="create-playlist-btn"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={16} />
                Create New Playlist
              </button>
            ) : (
              <div className="create-playlist-form">
                <input
                  type="text"
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyPress={handleKeyPress}
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
                    Create & Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlaylistModal;
