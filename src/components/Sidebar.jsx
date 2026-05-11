import { motion } from 'framer-motion';
import { Home, Library, Heart, Music, Users } from 'lucide-react';
import { useFollowedArtists } from '../context/FollowedArtistsContext.jsx';
import './Sidebar.css';

const Sidebar = ({ activePage, setActivePage, onNavigateArtist }) => {
  const { followedArtists } = useFollowedArtists();
  
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'playlist', label: 'Playlist', icon: Library },
    { id: 'favorites', label: 'Favorites', icon: Heart },
  ];

  return (
    <motion.div
      className="sidebar"
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="sidebar-header">
        <h1 className="sidebar-logo">
          <div className="logo-icon-wrapper">
            <Music className="logo-icon" size={28} />
          </div>
          <span className="logo-text">Beatify</span>
        </h1>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </motion.button>
          );
        })}
        
        {/* Followed Artists Section Header */}
        {followedArtists.length > 0 && (
          <motion.div
            className="nav-item"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Users size={20} className="nav-icon" />
            <span className="nav-label">Followed Artists</span>
          </motion.div>
        )}
        
        {/* Followed Artists List */}
        {followedArtists.slice(0, 5).map((artist) => (
          <motion.div
            key={artist.id}
            className="nav-item followed-artist-item"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            title={artist.name}
            onClick={() => onNavigateArtist && onNavigateArtist(artist.id, artist)}
          >
            <img 
              src={artist.picture_small || artist.picture || 'https://via.placeholder.com/32x32?text=A'} 
              alt={artist.name}
              className="nav-icon followed-artist-avatar"
            />
            <span className="nav-label followed-artist-name">{artist.name}</span>
          </motion.div>
        ))}
        
        {followedArtists.length > 5 && (
          <motion.div
            className="nav-item more-artists"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="nav-label">+{followedArtists.length - 5} more</span>
          </motion.div>
        )}
      </nav>
    </motion.div>
  );
};

export default Sidebar;
