import { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('musicFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('musicFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (track) => {
    if (isFavorite(track.id)) {
      setFavorites(favorites.filter(t => t.id !== track.id));
    } else {
      setFavorites([...favorites, track]);
    }
  };

  const isFavorite = (trackId) => {
    return favorites.some(t => t.id === trackId);
  };

  const value = {
    favorites,
    toggleFavorite,
    isFavorite,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};
