import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChartTracks, useChartArtists } from '../hooks/useFetch';
import SongCard from '../components/SongCard';
import ArtistCard from '../components/ArtistCard';
import RecentlyPlayed from '../components/RecentlyPlayed';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css';

const Home = ({ onNavigateArtist }) => {
  const [expandedSections, setExpandedSections] = useState({
    trending: false,
    artists: false,
    recent: false
  });

  // Use custom hooks for cleaner code
  const { data: tracksData, loading: tracksLoading, apiSource: tracksApiSource } = useChartTracks();
  const { data: artistsData, loading: artistsLoading, apiSource: artistsApiSource } = useChartArtists();

  const tracks = tracksData?.data || [];
  const artists = artistsData?.data || [];
  
  // Filter to ensure only actual artists are shown
  const popularArtists = artists.filter(item => {
    if (!item || !item.name) return false;
    const name = item.name.toLowerCase();
    const meditationKeywords = ['meditation', 'yoga', 'healing', 'music consort', 'relaxation', 'zen', 'mindfulness'];
    const isMeditationLike = meditationKeywords.some(keyword => name.includes(keyword));
    const isTrackLike = item.title || item.preview || item.duration || item.album || item.track;
    if (isMeditationLike || isTrackLike) return false;
    return item.type === 'artist' || (!isTrackLike && !isMeditationLike);
  });
  
  const loading = tracksLoading || artistsLoading;

  const sectionTitles = {
    trending: 'Trending Songs',
    artists: 'Popular Artists',
    recent: 'Recent Songs',
  };
  const hasAnyData = tracks.length > 0 || artists.length > 0;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const trendingSongs = Array.isArray(tracks) 
    ? (expandedSections.trending ? tracks.filter(t => t.preview).slice(0, 50) : tracks.filter(t => t.preview).slice(0, 15)) 
    : [];
    
  const recentTracks = Array.isArray(tracks)
    ? (expandedSections.recent ? tracks.filter(t => t.preview).slice(15, 65) : tracks.filter(t => t.preview).slice(15, 30))
    : [];

  const displayedArtists = expandedSections.artists ? popularArtists.slice(0, 50) : popularArtists.slice(0, 15);

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {loading ? (
        <LoadingSpinner />
      ) : hasAnyData ? (
        <div className="home-sections">
          {/* Recently Played Section */}
          <RecentlyPlayed limit={10} showClearButton={true} />
          
          <div className="section-row">
            <div className="section-header">
              <h2 className="section-title">{sectionTitles.trending}</h2>
              {tracks.filter(t => t.preview).length > 15 && (
                <button className="show-all-btn" onClick={() => toggleSection('trending')}>
                  {expandedSections.trending ? 'Show less' : 'Show all'}
                </button>
              )}
            </div>
            <div className={`section-grid ${!expandedSections.trending ? 'horizontal-scroll' : ''}`}>
            {trendingSongs.map((track, index) => (
              <SongCard 
                key={`trending-${track.id}`} 
                track={track} 
                index={index} 
                onNavigateArtist={onNavigateArtist}
                queue={trendingSongs}
                queueIndex={index}
              />
            ))}
            </div>
          </div>
          <div className="section-row">
            <div className="section-header">
              <h2 className="section-title">{sectionTitles.artists}</h2>
              {popularArtists.length > 15 && (
                <button className="show-all-btn" onClick={() => toggleSection('artists')}>
                  {expandedSections.artists ? 'Show less' : 'Show all'}
                </button>
              )}
            </div>
            <div className={`section-grid ${!expandedSections.artists ? 'horizontal-scroll' : ''}`}>
            {displayedArtists.length > 0 ? (
              displayedArtists.map((artist, index) => (
                <ArtistCard 
                  key={`artist-${artist.id}`} 
                  artist={artist} 
                  index={index} 
                  loading={artistsLoading}
                  onClick={() => onNavigateArtist(artist.id, artist)}
                />
              ))
            ) : (
              <p className="empty-text">No artists available right now.</p>
            )}
            </div>
          </div>
          <div className="section-row">
            <div className="section-header">
              <h2 className="section-title">{sectionTitles.recent}</h2>
              {tracks.filter(t => t.preview).length > 30 && (
                <button className="show-all-btn" onClick={() => toggleSection('recent')}>
                  {expandedSections.recent ? 'Show less' : 'Show all'}
                </button>
              )}
            </div>
            <div className={`section-grid ${!expandedSections.recent ? 'horizontal-scroll' : ''}`}>
            {recentTracks.map((track, index) => (
              <SongCard 
                key={`recent-${track.id}`} 
                track={track} 
                index={index} 
                onNavigateArtist={onNavigateArtist}
              />
            ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-text">Unable to load music data. Please check your connection or try again later.</p>
        </div>
      )}
    </motion.div>
  );
};

export default Home;
