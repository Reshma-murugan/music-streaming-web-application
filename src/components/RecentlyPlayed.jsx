import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRecentlyPlayed } from '../context/RecentlyPlayedContext';
import SongCard from './SongCard';
import './RecentlyPlayed.css';

const RecentlyPlayed = ({ showClearButton = false }) => {
  const { tracks, clearHistory } = useRecentlyPlayed();
  const [isExpanded, setIsExpanded] = useState(false);

  const maxLimit = isExpanded ? 20 : 10;
  const recentTracks = tracks.slice(0, maxLimit);

  if (recentTracks.length === 0) {
    return null;
  }

  return (
    <div className="section-row recently-played-section">
      <div className="section-header">
        <h2 className="section-title">Recently Played</h2>
        <div className="header-actions">
          {tracks.length > 10 && (
            <button className="show-all-btn" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Show less' : 'Show all'}
            </button>
          )}
          {showClearButton && (
            <button className="clear-history-btn" onClick={clearHistory}>
              Clear History
            </button>
          )}
        </div>
      </div>
      <div className={`compact-list ${!isExpanded ? 'horizontal-scroll' : ''}`}>
        {recentTracks.map((track, index) => (
          <SongCard
            key={`recent-${track.id}-${index}`}
            track={track}
            index={index}
            queue={recentTracks}
            queueIndex={index}
            compact={true}
          />
        ))}
      </div>
    </div>
  );
};

export default RecentlyPlayed;
