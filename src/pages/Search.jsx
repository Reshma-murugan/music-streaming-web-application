import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Music } from 'lucide-react';
import { useSearchTracks } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import SongCard from '../components/SongCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './Search.css';

const Search = ({ searchQuery, onNavigateArtist }) => {
  const [filterType, setFilterType] = useState('all'); // all, music, artists
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Use custom hook for search
  const { data: searchData, loading } = useSearchTracks(debouncedSearch);
  const tracks = searchData?.data || [];

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'artists', label: 'Artists' }
  ];

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Filter Tabs */}
      <div className="search-filters" role="group" aria-label="Filter search results">
        {filterOptions.map((filter) => (
          <button
            key={filter.id}
            className={`filter-tab ${filterType === filter.id ? 'active' : ''}`}
            onClick={() => setFilterType(filter.id)}
            aria-pressed={filterType === filter.id}
            title={`Show ${filter.label}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filterType === 'all' && tracks.length > 0 ? (
        <div className="songs-grid">
          {tracks.map((track, index) => (
            <SongCard 
              key={track.id} 
              track={track} 
              index={index} 
              onNavigateArtist={onNavigateArtist}
              queue={tracks}
              queueIndex={index}
            />
          ))}
        </div>
      ) : filterType === 'music' && tracks.length > 0 ? (
        <div className="songs-grid">
          {tracks.filter(t => t.preview).map((track, index) => {
            const originalIndex = tracks.findIndex(t => t.id === track.id);
            return (
              <SongCard 
                key={track.id} 
                track={track} 
                index={originalIndex} 
                onNavigateArtist={onNavigateArtist}
                queue={tracks.filter(t => t.preview)}
                queueIndex={tracks.filter(t => t.preview).findIndex(t => t.id === track.id)}
              />
            );
          })}
        </div>
      ) : filterType === 'artists' && tracks.length > 0 ? (
        <div className="artists-list">
          <p className="filter-placeholder">Artist filtering coming soon</p>
        </div>
      ) : debouncedSearch ? (
        <div className="empty-state">
          <SearchIcon size={48} className="empty-icon" />
          <p className="empty-text">No results found for &quot;{debouncedSearch}&quot;</p>
        </div>
      ) : (
        <div className="empty-state">
          <Music size={48} className="empty-icon" />
          <p className="empty-text">Start searching for your favorite music</p>
        </div>
      )}
    </motion.div>
  );
};

export default Search;
