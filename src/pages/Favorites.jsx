import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import SongCard from '../components/SongCard';
import './Favorites.css';

const Favorites = () => {
  const { favorites } = useFavorites();

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="home-header">
        <h1 className="home-title">Favorites</h1>
        <p className="home-subtitle">
          {favorites.length} {favorites.length === 1 ? 'song' : 'songs'} you&apos;ve liked
        </p>
      </div>

      {favorites.length > 0 ? (
        <div className="songs-grid">
          {favorites.map((track, index) => (
            <SongCard key={track.id} track={track} index={index} queue={favorites} queueIndex={index} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={48} className="empty-icon" />
          <p className="empty-text">No favorite songs yet</p>
          <p className="empty-subtext">Click the heart on any song to save it here</p>
        </div>
      )}
    </motion.div>
  );
};

export default Favorites;
