import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { RecentlyPlayedProvider } from './context/RecentlyPlayedContext';
import { FollowedArtistsProvider } from './context/FollowedArtistsContext.jsx';
import Sidebar from './components/Sidebar';
import SearchHeader from './components/SearchHeader';
import NowPlayingPanel from './components/NowPlayingPanel';
import Home from './pages/Home';
import Search from './pages/Search';
import Playlist from './pages/Playlist';
import Favorites from './pages/Favorites';
import Artists from './pages/Artists';
import ArtistProfile from './pages/ArtistProfile';
import './App.css';

const AppContent = () => {
  const [activePage, setActivePage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedArtistData, setSelectedArtistData] = useState(null);
  const { isPanelOpen } = usePlayer();

  const navigateToArtist = (artistId, artistData = null) => {
    setSelectedArtistId(artistId);
    setSelectedArtistData(artistData);
    setActivePage('artist');
  };

  const navigateBack = () => {
    setActivePage('home');
    setSelectedArtistId(null);
    setSelectedArtistData(null);
  };

  const handleNavigateToSearch = (query) => {
    setSearchQuery(query);
    setActivePage('search');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home onNavigateArtist={navigateToArtist} />;
      case 'search':
        return <Search searchQuery={searchQuery} onNavigateArtist={navigateToArtist} />;
      case 'playlist':
        return <Playlist />;
      case 'favorites':
        return <Favorites />;
      case 'artists':
        return <Artists onNavigateArtist={navigateToArtist} />;
      case 'artist':
        return <ArtistProfile artistId={selectedArtistId} fallbackArtistData={selectedArtistData} onBack={navigateBack} />;
      default:
        return <Home onNavigateArtist={navigateToArtist} />;
    }
  };

  return (
    <div className={`app ${isPanelOpen ? 'show-now-playing' : ''}`}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} onNavigateArtist={navigateToArtist} />
      
      <div className="content-layout">
        <div className="main-layout">
          <SearchHeader onNavigateToSearch={handleNavigateToSearch} />
          
          <main className="main-content">
            <AnimatePresence mode="wait">
              {renderPage()}
            </AnimatePresence>
          </main>
        </div>
        
        <NowPlayingPanel onNavigateArtist={navigateToArtist} />
      </div>
    </div>
  );
};

function App() {
  return (
    <RecentlyPlayedProvider>
      <PlayerProvider>
        <PlaylistProvider>
          <FavoritesProvider>
            <FollowedArtistsProvider>
              <AppContent />
            </FollowedArtistsProvider>
          </FavoritesProvider>
        </PlaylistProvider>
      </PlayerProvider>
    </RecentlyPlayedProvider>
  );
}

export default App;
