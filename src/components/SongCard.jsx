import { motion } from 'framer-motion';
import { Play, Pause, Heart, Plus, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylist } from '../context/PlaylistContext';
import { useFavorites } from '../context/FavoritesContext';
import './SongCard.css';

const SongCard = ({ track, index, onNavigateArtist, queue = [], queueIndex = 0, compact = false }) => {
  const { playTrack, playTrackWithQueue, currentTrack, isPlaying } = usePlayer();
  const { addToPlaylist, removeFromPlaylist, isInPlaylist } = usePlaylist();
  const { toggleFavorite, isFavorite } = useFavorites();

  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlayClick = () => {
    if (queue.length > 0) {
      playTrackWithQueue(track, queue, queueIndex);
    } else {
      playTrack(track);
    }
  };

  const handlePlaylistClick = (e) => {
    e.stopPropagation();
    if (isInPlaylist(track.id)) {
      removeFromPlaylist(track.id);
    } else {
      addToPlaylist(track);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(track);
  };

  return (
    <motion.div
      className={`song-card ${isCurrentTrack ? 'active' : ''} ${compact ? 'compact' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: compact ? -2 : -8 }}
    >
      <div className="song-card-image-container" onClick={handlePlayClick}>
        <img
          src={track.album?.cover_medium || track.album?.cover_big || track.album?.cover}
          alt={track.title}
          className="song-card-image"
          onError={(e) => {
            // Fallback to a default image if the main one fails
            e.target.src = `https://picsum.photos/seed/album-${track.id}/300/300.jpg`;
          }}
        />
        <div className="song-card-overlay">
          <motion.div
            className="play-icon-wrapper"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isCurrentTrack && isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="play-icon-offset" />
            )}
          </motion.div>
        </div>
      </div>

      <div className="song-card-content">
        <div className="song-card-info">
          <h3 className="song-title">{track.title}</h3>
          <p className="song-artist" onClick={(e) => { e.stopPropagation(); onNavigateArtist?.(track.artist.id, track.artist); }}>
            {track.artist?.name}
          </p>
        </div>

        <div className="song-card-actions">
          <motion.button
            className={`action-button ${isFavorite(track.id) ? 'favorite' : ''}`}
            onClick={handleFavoriteClick}
            whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.9 }}
          >
            <Heart size={18} fill={isFavorite(track.id) ? 'currentColor' : 'none'} />
          </motion.button>
          <motion.button
            className={`action-button ${isInPlaylist(track.id) ? 'in-playlist' : ''}`}
            onClick={handlePlaylistClick}
            whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.9 }}
          >
            {isInPlaylist(track.id) ? <Check size={18} /> : <Plus size={18} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default SongCard;
