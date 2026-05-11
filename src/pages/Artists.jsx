import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, UserPlus, UserCheck, MoreHorizontal } from 'lucide-react';
import { useChartArtists } from '../hooks/useFetch';
import { useFollowedArtists } from '../context/FollowedArtistsContext.jsx';
import { usePlayer } from '../context/PlayerContext';
import ArtistCard from '../components/ArtistCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './Artists.css';

const Artists = ({ onNavigateArtist }) => {
  const { data: artistsData, loading, error } = useChartArtists();
  const artists = artistsData?.data || [];
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'followed'
  const { followedArtists, toggleFollow, isFollowing } = useFollowedArtists();
  const { playTrackWithArtist } = usePlayer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Filter artists to exclude meditation titles and tracks
  const filteredArtists = artists.filter(item => {
    if (!item || !item.name) return false;
    const name = item.name.toLowerCase();
    const meditationKeywords = ['meditation', 'yoga', 'healing', 'music consort', 'relaxation', 'zen', 'mindfulness'];
    const isMeditationLike = meditationKeywords.some(keyword => name.includes(keyword));
    const isTrackLike = item.title || item.preview || item.duration || item.album || item.track;
    if (isMeditationLike || isTrackLike) return false;
    return item.type === 'artist' || (!isTrackLike && !isMeditationLike);
  });

  // Get a featured artist for hero section (first followed artist or first artist)
  const featuredArtist = viewMode === 'followed' && followedArtists.length > 0 
    ? followedArtists[0] 
    : filteredArtists.length > 0 
    ? filteredArtists[0] 
    : null;

  const handlePlay = async () => {
    if (!featuredArtist) return;
    
    try {
      // Get a sample track from the artist to play
      const sampleTrack = {
        id: featuredArtist.id + '-sample',
        title: featuredArtist.name + ' - Top Track',
        artist: featuredArtist,
        preview: null,
        duration: 180
      };
      
      await playTrackWithArtist(sampleTrack, featuredArtist);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing artist:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!featuredArtist) return;
    
    setFollowLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toggleFollow(featuredArtist);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Get artists to display based on view mode
  const displayArtists = viewMode === 'followed' ? followedArtists : filteredArtists;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  if (loading) {
    return (
      <div className="artists-page">
        <div className="artists-header">
          <h1>Artists</h1>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="artists-page">
        <div className="artists-header">
          <h1>Artists</h1>
        </div>
        <div className="error-message">
          <p>Failed to load artists. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artists-page">
      {/* Hero Section */}
      {featuredArtist && (
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-image">
              <img 
                src={featuredArtist.picture_xl || featuredArtist.picture_big || featuredArtist.picture || 'https://via.placeholder.com/300x300?text=Artist'} 
                alt={featuredArtist.name}
                className="hero-avatar"
              />
            </div>
            <div className="hero-info">
              <h1 className="hero-title">{featuredArtist.name}</h1>
              <div className="hero-stats">
                <span className="stat-item">
                  {viewMode === 'followed' ? followedArtists.length : filteredArtists.length} Artists
                </span>
                {viewMode === 'followed' && (
                  <span className="stat-item">Following</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {featuredArtist && (
        <div className="action-bar">
          <motion.button
            className="play-btn"
            onClick={handlePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            Play
          </motion.button>
          
          <motion.button
            className={`follow-btn ${isFollowing(featuredArtist.id) ? 'following' : ''}`}
            onClick={handleFollowToggle}
            disabled={followLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {followLoading ? (
              <div className="follow-spinner"></div>
            ) : isFollowing(featuredArtist.id) ? (
              <UserCheck size={20} />
            ) : (
              <UserPlus size={20} />
            )}
            {isFollowing(featuredArtist.id) ? 'Following' : 'Follow'}
          </motion.button>
          
          <motion.button
            className="more-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MoreHorizontal size={20} />
          </motion.button>
        </div>
      )}

      {/* Artists Header */}
      <div className="artists-header">
        <h1>Artists</h1>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All Artists
          </button>
          <button
            className={`view-btn ${viewMode === 'followed' ? 'active' : ''}`}
            onClick={() => setViewMode('followed')}
          >
            Followed ({followedArtists.length})
          </button>
        </div>
      </div>

      <div className="artists-content">
        {displayArtists.length === 0 ? (
          <div className="empty-state">
            <h3>
              {viewMode === 'followed' 
                ? "No followed artists yet" 
                : "No artists available"
              }
            </h3>
            <p>
              {viewMode === 'followed'
                ? "Start following artists to see them here"
                : "Check back later for new artists"
              }
            </p>
          </div>
        ) : (
          <motion.div
            className="artists-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {displayArtists.map((artist, index) => (
              <motion.div
                key={artist.id || index}
                variants={itemVariants}
                className="artist-grid-item"
              >
                <ArtistCard
                  artist={artist}
                  index={index}
                  onClick={() => onNavigateArtist && onNavigateArtist(artist.id, artist)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Artists;
