import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Music } from 'lucide-react';
import { fetchArtistImage } from '../services/lastfmClient';
import './ArtistCard.css';

const ArtistCard = ({ artist, index, onClick, loading = false }) => {
  const [artistImage, setArtistImage] = useState(null);

  useEffect(() => {
    // Track if component is still mounted
    let isMounted = true;

    if (artist?.name) {
      fetchArtistImage(artist.name).then((result) => {
        if (isMounted) {
          setArtistImage(result.image);
        }
      }).catch((error) => {
        if (isMounted) {
          console.error(`[ArtistCard] Error fetching image for ${artist.name}:`, error);
        }
      });
    }

    // Cleanup: mark as unmounted to prevent state update
    return () => {
      isMounted = false;
    };
  }, [artist?.name]);
  if (loading) {
    return (
      <motion.div
        className="artist-card skeleton"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <div className="artist-image-container">
          <div className="skeleton-image"></div>
        </div>
        <div className="artist-info">
          <div className="skeleton-text"></div>
          <div className="skeleton-text small"></div>
        </div>
      </motion.div>
    );
  }

  const formatFollowers = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <motion.div
      className="artist-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      onClick={onClick}
    >
      <div className="artist-image-container">
        <img
          src={artistImage || artist.picture_medium || artist.picture || artist.image_medium || 'https://via.placeholder.com/300x300?text=Artist'}
          alt={artist.name}
          className="artist-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x300?text=Not+Found';
          }}
        />
        {artist.nb_fan && (
          <div className="artist-badge">
            <Users size={12} />
            <span>{formatFollowers(artist.nb_fan)}</span>
          </div>
        )}
      </div>
      <div className="artist-info">
        <h3 className="artist-name">{artist.name || 'Unknown Artist'}</h3>
        <div className="artist-meta">
          <Music size={12} />
          <span className="artist-label">Artist</span>
          {artist.position && (
            <span className="artist-rank">#{artist.position}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ArtistCard;
