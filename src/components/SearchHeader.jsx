import { useState } from 'react';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar';
import './SearchHeader.css';

const SearchHeader = ({ onNavigateToSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Navigate to search page if not already there
    if (onNavigateToSearch) {
      onNavigateToSearch(query);
    }
  };

  return (
    <motion.div
      className="search-header-sticky"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="search-header-content">
        <SearchBar 
          value={searchQuery} 
          onChange={handleSearch}
          placeholder="What do you want to play?"
        />
      </div>
    </motion.div>
  );
};

export default SearchHeader;
