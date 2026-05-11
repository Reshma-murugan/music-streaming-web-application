import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, Plus, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylist } from '../context/PlaylistContext';
import { useFavorites } from '../context/FavoritesContext';
import PlaylistModal from './PlaylistModal';
import './PlaylistSongCard.css';

const PlaylistSongCard = ({ track, index, playlistId, tracks = [] }) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { removeFromPlaylist, getPlaylistsForTrack } = usePlaylist();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const isCurrentTrack = currentTrack?.id === track.id;
  const trackPlaylists = getPlaylistsForTrack(track.id);
  const isInAnyPlaylist = trackPlaylists.length > 0;

  const handlePlayClick = () => {
    // If we have a tracks array, use it as the queue, otherwise just play the single track
    if (tracks.length > 0) {
      const trackIndex = tracks.findIndex(t => t.id === track.id);
      playTrack(track, tracks, trackIndex);
    } else {
      playTrack(track);
    }
  };

  const handleRemoveFromPlaylist = (e) => {
    e.stopPropagation();
    removeFromPlaylist(track.id, playlistId);
  };

  const handlePlaylistClick = (e) => {
    e.stopPropagation();
    setShowPlaylistModal(true);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(track);
  };

  return (
    <>
      <motion.div
        className={`playlist-song-card ${isCurrentTrack ? 'active' : ''}`}
        data-track-id={track.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -4 }}
      >
        <div className="playlist-song-card-image-container" onClick={handlePlayClick}>
          <img
            src={track.album?.cover_medium || track.album?.cover_big || track.album?.cover}
            alt={track.title}
            className="playlist-song-card-image"
            onError={(e) => {
              // Fallback to a default image if the main one fails
              e.target.src = `https://picsum.photos/seed/album-${track.id}/300/300.jpg`;
            }}
          />
          <div className="playlist-song-card-overlay">
            <motion.div
              className="play-icon-wrapper"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="play-icon-offset" />
              )}
            </motion.div>
          </div>
        </div>

        <div className="playlist-song-card-content">
          <div className="playlist-song-card-info">
            <h3 className="playlist-song-title">{track.title}</h3>
            <p className="playlist-song-artist" onClick={(e) => { e.stopPropagation(); }}>
              {track.artist?.name}
            </p>
          </div>

          <div className="playlist-song-card-actions">
            <motion.button
              className={`action-button ${isFavorite(track.id) ? 'favorite' : ''}`}
              onClick={handleFavoriteClick}
              whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart 
                size={16} 
                fill={isFavorite(track.id) ? 'currentColor' : 'none'}
                className={isFavorite(track.id) ? 'favorited-heart' : ''}
              />
            </motion.button>
            <motion.button
              className={`action-button ${isInAnyPlaylist ? 'in-playlist' : ''}`}
              onClick={handlePlaylistClick}
              whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.9 }}
              title={isInAnyPlaylist ? `In ${trackPlaylists.length} playlist${trackPlaylists.length > 1 ? 's' : ''}` : 'Add to playlist'}
            >
              {isInAnyPlaylist ? <Plus size={16} /> : <Plus size={16} />}
            </motion.button>
            <motion.button
              className="action-button remove-from-playlist"
              onClick={handleRemoveFromPlaylist}
              whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.1)' }}
              whileTap={{ scale: 0.9 }}
              title="Remove from this playlist"
            >
              <Trash2 size={16} />
            </motion.button>
          </div>
        </div>
      </motion.div>
      
      <PlaylistModal 
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        track={track}
      />
    </>
  );
};

export default PlaylistSongCard;
