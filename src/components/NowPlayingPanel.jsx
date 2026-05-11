import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, User, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, UserPlus, UserCheck, Maximize2, ArrowLeft } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useFollowedArtists } from '../context/FollowedArtistsContext.jsx';
import { fetchArtistImage } from '../services/lastfmClient';
import './NowPlayingPanel.css';

const NowPlayingPanel = ({ onNavigateArtist }) => {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    togglePlay,
    seek, 
    changeVolume, 
    nextTrack, 
    previousTrack,
    repeatMode,
    toggleRepeat,
    currentArtistContext,
    isPanelOpen,
    setIsPanelOpen
  } = usePlayer();
  
  const { toggleFollow, isFollowing } = useFollowedArtists();
  
  const [artistImage, setArtistImage] = useState(null);
  const [isValidArtist, setIsValidArtist] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Get the display artist name - prefer artist context over track artist
  const displayArtistName = currentArtistContext?.name || currentTrack?.artist?.name;

  useEffect(() => {
    if (displayArtistName) {
      let isMounted = true;
      
      setArtistImage(null);
      setIsValidArtist(false);
      fetchArtistImage(displayArtistName).then((result) => {
        if (isMounted) {
          setArtistImage(result.image);
          setIsValidArtist(result.image !== null); // Only valid if we have an image
        }
      }).catch((error) => {
        if (isMounted) {
          console.error(`[NowPlayingPanel] Error fetching artist image:`, error);
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [displayArtistName]);



  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(pos * duration);
  };

  const handleVolumeChange = (e) => {
    changeVolume(parseFloat(e.target.value));
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const artistId = currentArtistContext?.id || currentTrack?.artist?.id;
  const canOpenArtistProfile = Boolean(onNavigateArtist && artistId);

  const handleArtistProfileOpen = () => {
    if (!canOpenArtistProfile) return;
    setIsFullScreen(false);
    setIsPanelOpen(false); // Optionally close the side panel as well to focus on the artist page
    onNavigateArtist(artistId, currentArtistContext || currentTrack?.artist || null);
  };

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    setFollowLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const artist = currentArtistContext || currentTrack?.artist;
      if (artist) {
        // Enrich with the Wikipedia image shown on the panel
        const artistWithImage = {
          ...artist,
          picture:        artistImage || artist.picture,
          picture_small:  artistImage || artist.picture_small,
          picture_medium: artistImage || artist.picture_medium,
          picture_big:    artistImage || artist.picture_big,
          picture_xl:     artistImage || artist.picture_xl,
          image:          artistImage || artist.image,
        };
        toggleFollow(artistWithImage);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (!currentTrack) return (
    <aside className={`now-playing-panel ${isPanelOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h2 className="panel-title">Now Playing</h2>
        <div className="panel-actions">
          <button className="action-icon" onClick={() => setIsPanelOpen(false)} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="panel-empty">
        <div className="empty-icon-wrapper">
          <User size={48} className="empty-icon" />
        </div>
        <p>Select a track to see details</p>
      </div>
    </aside>
  );

  return (
    <aside className={`now-playing-panel ${isPanelOpen ? 'open' : ''} ${isFullScreen ? 'full-screen' : ''}`}>
      <div className="panel-header">
        {isFullScreen && (
          <button type="button" className="action-icon" onClick={() => setIsFullScreen(false)} aria-label="Back">
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 className="panel-title" style={{ flex: 1, textAlign: isFullScreen ? 'center' : 'left' }}>
          {isFullScreen ? 'Now Playing' : currentTrack.title}
        </h2>
        <div className="panel-actions">
          {!isFullScreen && (
            <button type="button" className="action-icon" onClick={() => setIsFullScreen(true)} aria-label="Full screen">
              <Maximize2 size={18} />
            </button>
          )}
          <button type="button" className="action-icon" onClick={() => { setIsPanelOpen(false); setIsFullScreen(false); }} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="panel-content scrollable">
        {/* Album Art - Large and Prominent */}
        <motion.div 
          className="main-art-container"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          key={currentTrack.id}
        >
          <div className="art-gradient-overlay" />
          <img 
            src={currentTrack.album?.cover_medium || currentTrack.album?.cover_big || currentTrack.album?.cover} 
            alt={currentTrack.title} 
            className="main-art"
          />
        </motion.div>

        {/* Track Details with Action Buttons */}
        <motion.div 
          className="track-details"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="track-info-row">
            <div className="text-info">
              <h1 className="info-title">{currentTrack.title}</h1>
              <p className="info-artist">{displayArtistName}</p>
            </div>
          </div>
        </motion.div>

        {/* Artist Card - Only show if valid artist found */}
        {isValidArtist && (
          <motion.div 
            className="artist-card-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            role={canOpenArtistProfile ? 'button' : undefined}
            tabIndex={canOpenArtistProfile ? 0 : undefined}
            onClick={handleArtistProfileOpen}
            onKeyDown={(event) => {
              if (!canOpenArtistProfile) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleArtistProfileOpen();
              }
            }}
          >
            <div className="artist-card-header">
              <p className="card-label">
                About the artist {canOpenArtistProfile ? '• Tap to open' : ''}
              </p>
            </div>
            <div className="artist-card-content">
              <div className="artist-profile-header">
                <img 
                  src={artistImage} 
                  className="panel-artist-picture"
                  alt={displayArtistName}
                />
              </div>
              <div className="artist-bio">
                <h3 className="panel-artist-name">{displayArtistName}</h3>
                <button 
                  className={`panel-follow-btn ${isFollowing(artistId) ? 'following' : ''}`}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <div className="panel-follow-spinner"></div>
                  ) : isFollowing(artistId) ? (
                    <>
                      <UserCheck size={14} />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credits Section */}
        <motion.div 
          className="credits-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="section-subtitle">Credits</h3>
          <div className="credits-list">
            <div className="credit-item">
              <p className="credit-role">Source</p>
              <p className="credit-name">iTunes API</p>
            </div>
            <div className="credit-item">
              <p className="credit-role">Album</p>
              <p className="credit-name">{currentTrack.album?.title}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Player Controls Section */}
      <div className="panel-controls-section">
        {/* Progress Bar - Full Width */}
        <div className="progress-container">
          <div className="progress-bar-container" onClick={handleProgressClick}>
            <div className="progress-bar-bg">
              <motion.div 
                className="progress-bar-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="time-row">
            <span className="time-display">{formatTime(currentTime)}</span>
            <span className="time-display">{formatTime(duration)}</span>
          </div>
        </div>

        {/* All Controls in Single Line */}
        <div className="main-controls">
          <motion.button
            className="control-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </motion.button>

          <motion.button
            className="skip-button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={previousTrack}
            title="Previous track"
          >
            <SkipBack size={20} fill="currentColor" />
          </motion.button>

          <motion.button
            className="play-button-main"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="play-icon-offset" />}
          </motion.button>

          <motion.button
            className="skip-button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextTrack}
            title="Next track"
          >
            <SkipForward size={20} fill="currentColor" />
          </motion.button>

          <motion.button
            className={`control-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleRepeat}
            title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'one' ? 'One' : 'All'}`}
          >
            <Repeat size={18} />
            {repeatMode === 'one' && <span className="repeat-indicator">1</span>}
            {repeatMode === 'all' && <span className="repeat-indicator">All</span>}
          </motion.button>
        </div>

        {/* Volume Control - Full Width */}
        <div className="volume-container">
          <button 
            className="volume-icon-btn" 
            onClick={() => changeVolume(volume === 0 ? 0.5 : 0)}
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
            title="Adjust volume"
          />
        </div>
      </div>
    </aside>
  );
};

export default NowPlayingPanel;
