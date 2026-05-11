import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, User, ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { useArtist } from '../hooks/useFetch';
import { usePlayer } from '../context/PlayerContext';
import { useFavorites } from '../context/FavoritesContext';
import { useFollowedArtists } from '../context/FollowedArtistsContext.jsx';
import { fetchArtistImage } from '../services/lastfmClient';
import LoadingSpinner from '../components/LoadingSpinner';
import './ArtistProfile.css';

const ArtistProfile = ({ artistId, fallbackArtistData, onBack }) => {
  const [expandTracks, setExpandTracks] = useState(false);
  const [artistImage, setArtistImage] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  
  const { toggleFollow, isFollowing } = useFollowedArtists();
  
  // Initialize with fallback image immediately to prevent flickering
  const [stableImageUrl, setStableImageUrl] = useState(() => {
    return fallbackArtistData?.picture_xl || 
           fallbackArtistData?.picture_big || 
           fallbackArtistData?.picture ||
           fallbackArtistData?.image ||
           null;
  });
  
  // Single professional lookup that returns both artist info + top songs
  const { data: artistData, loading: loading, error} = useArtist(artistId);
  
  const { currentTrack, isPlaying, playTrack, playTrackWithQueueAndArtist } = usePlayer();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Helper function to play track with artist's top tracks as queue
  const playArtistTrack = (track, index = 0) => {
    if (topTracks.length > 0) {
      playTrackWithQueueAndArtist(track, topTracks, index, artist);
    } else {
      playTrack(track);
    }
  };

  const handleFollowToggle = async () => {
    setFollowLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      // Enrich the artist object with the currently displayed image (Wikipedia photo)
      // so the Followed section shows the same picture the user sees here
      const artistWithCorrectImage = {
        ...artist,
        picture:        stableImageUrl || artist.picture,
        picture_small:  stableImageUrl || artist.picture_small,
        picture_medium: stableImageUrl || artist.picture_medium,
        picture_big:    stableImageUrl || artist.picture_big,
        picture_xl:     stableImageUrl || artist.picture_xl,
        image:          stableImageUrl || artist.image,
      };
      toggleFollow(artistWithCorrectImage);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Use fallback if API data is not available yet
  const actualArtistData = useMemo(() => 
    artistData || (fallbackArtistData ? { artist: fallbackArtistData, songs: [] } : null),
    [artistData, fallbackArtistData]
  );

  // Extract from professional lookup response
  const artist = actualArtistData?.artist || null;
  const topTracks = actualArtistData?.songs || [];



  // Fetch Wikipedia artist image using fallback data if necessary
  useEffect(() => {
    let isMounted = true;
    
    const artistName = artist?.name || fallbackArtistData?.name;
    if (artistName) {
      fetchArtistImage(artistName).then((result) => {
        if (isMounted) {
          setArtistImage(result.image);
          // Only update stable URL if we got a real Wikipedia image
          if (result.image) {
            setStableImageUrl(result.image);
          }
        }
      }).catch((error) => {
        if (isMounted) {
          console.error(`[ArtistProfile] Error fetching artist image:`, error);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [artist?.name, fallbackArtistData?.name]);

  // Keep banner fallback in sync when navigating between artists,
  // but don't overwrite a successfully loaded Wikipedia image
  useEffect(() => {
    setArtistImage(null); // reset Wikipedia image for new artist
    const nextStableImage =
      fallbackArtistData?.picture_xl ||
      fallbackArtistData?.picture_big ||
      fallbackArtistData?.picture ||
      fallbackArtistData?.image ||
      artist?.picture_xl ||
      artist?.picture_big ||
      artist?.picture ||
      artist?.image ||
      null;
    setStableImageUrl(nextStableImage);
  }, [artistId]); // only re-run when the artist actually changes, not on every render

  const isLoading = loading;

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!artist) {
    return (
      <div className="error-state" style={{padding: '40px', color: '#fff'}}>
        <h2>⚠️ Artist data not available</h2>
        <p><strong>Artist ID:</strong> {artistId}</p>
        {error && <p style={{color: '#ff6b6b'}}><strong>API Error:</strong> {error}</p>}
        {onBack && <button onClick={onBack} style={{marginTop: '20px', padding: '10px 20px', cursor: 'pointer', background: '#8B5CF6', border: 'none', borderRadius: '8px', color: '#fff'}}>← Go Back</button>}
        <details style={{marginTop: '20px', fontSize: '12px', opacity: 0.6}}>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({artistData, error, loading}, null, 2)}</pre>
        </details>
      </div>
    );
  }

  // Artist image from Wikipedia (if found) or platform image
  // Priority: stable (already loaded) → wikipedia → fallback data pictures → api data pictures → placeholder
  const displayArtistImage = stableImageUrl || 
    artistImage || 
    fallbackArtistData?.picture_xl || fallbackArtistData?.picture_big || fallbackArtistData?.picture ||
    fallbackArtistData?.image || fallbackArtistData?.image_big || fallbackArtistData?.image_medium ||
    artist?.picture_xl || artist?.picture_big || artist?.picture || 
    artist?.image || artist?.image_big || artist?.image_medium || 
    'https://via.placeholder.com/600x600?text=Artist';
  

  
  const displayTracks = expandTracks ? topTracks : topTracks.slice(0, 10);

  return (
    <motion.div 
      className="artist-profile-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Back Button */}
      {onBack && (
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      )}

      {/* Artist Header */}
      <header className="artist-header">
        <div className="artist-banner-overlay" />

        {/* Left — text info */}
        <div className="artist-header-content">
          <div className="verification-badge">
            <User size={14} className="badge-icon" />
            <span>Artist</span>
          </div>
          <h1 className="artist-profile-name">{artist.name}</h1>

          <div className="artist-stats-row">
            {artist.genre && (
              <span className="stat-item genre-tag">{artist.genre}</span>
            )}
            {artist.position && (
              <span className="stat-item">📊 #{artist.position}</span>
            )}
          </div>

          <div className="artist-actions">
            <button
              className="artist-play-btn"
              onClick={() => topTracks[0] && playArtistTrack(topTracks[0], 0)}
              disabled={!topTracks[0]}
            >
              <div className="play-icon-circle">
                <Play size={24} fill="currentColor" />
              </div>
              <span>Play Top Tracks</span>
            </button>

            <button
              className={`artist-follow-btn ${isFollowing(artist?.id) ? 'following' : ''}`}
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <div className="follow-spinner"></div>
              ) : isFollowing(artist?.id) ? (
                <>
                  <UserCheck size={20} />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Follow</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right — rounded artist portrait */}
        <div className="artist-portrait-wrap">
          <img
            src={displayArtistImage}
            alt={artist.name}
            className="artist-portrait-img"
            crossOrigin="anonymous"
            onLoad={() => {
              if (artistImage && displayArtistImage === artistImage) {
                setStableImageUrl(displayArtistImage);
              }
            }}
            onError={(e) => {
              const backupImage =
                fallbackArtistData?.picture ||
                artist?.picture ||
                'https://via.placeholder.com/300x300?text=Artist';
              if (backupImage !== e.currentTarget.src) e.currentTarget.src = backupImage;
            }}
          />
        </div>
      </header>

      {/* Artist Content */}
      <div className="profile-scroll-content">
        
        {/* Popular Tracks Section */}
        {topTracks.length > 0 && (
          <section className="profile-section">
            <div className="section-header">
              <h2 className="section-title">Popular Tracks</h2>
              {topTracks.length > 10 && !expandTracks && (
                <button 
                  className="show-all-btn"
                  onClick={() => setExpandTracks(true)}
                >
                  Show All
                </button>
              )}
              {expandTracks && topTracks.length > 10 && (
                <button 
                  className="show-all-btn"
                  onClick={() => setExpandTracks(false)}
                >
                  Show Less
                </button>
              )}
            </div>
            
            <div className="tracks-list" role="list">
              {displayTracks.map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                const isTrackPlaying = isActive && isPlaying;

                return (
                  <motion.div 
                    key={track.id}
                    className={`track-list-item ${isActive ? 'active' : ''}`}
                    role="listitem"
                    onClick={() => playArtistTrack(track, index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playArtistTrack(track, index);
                      }
                    }}
                    tabIndex="0"
                    title={`Play ${track.title} by ${track.artist?.name}`}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="track-rank">
                      {isTrackPlaying ? (
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        >
                          <Pause size={16} fill="currentColor" />
                        </motion.div>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="track-main-info">
                      <img 
                        src={track.album?.cover_medium || track.album?.cover}
                        alt={track.title}
                        className="track-thumb"
                        loading="lazy"
                      />
                      <div>
                        <div className="track-title">{track.title}</div>
                        <div className="track-meta" style={{justifyContent: 'flex-start'}}>
                          <span className="track-duration">{track.artist?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="track-meta">
                      <span className="track-duration">
                        {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                      </span>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={`track-heart-btn ${isFavorite(track.id) ? 'favorite' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          aria-label={isFavorite(track.id) ? 'Remove from favorites' : 'Add to favorites'}
                          title={isFavorite(track.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart
                            className={`track-heart ${isFavorite(track.id) ? 'favorited' : ''}`}
                            size={18}
                            fill={isFavorite(track.id) ? 'currentColor' : 'none'}
                          />
                        </button>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {topTracks.length === 0 && !isLoading && (
          <section className="profile-section">
            <p className="empty-message">No popular tracks found.</p>
          </section>
        )}

        </div>
    </motion.div>
  );
};

export default ArtistProfile;
