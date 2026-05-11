import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
  const inputRef = useRef(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button className="clear-button" onClick={handleClear} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
