import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export const useAutoScrollToActiveTrack = (trackList, scrollContainerRef = null) => {
  const { currentTrack } = usePlayer();
  const previousTrackRef = useRef();

  useEffect(() => {
    // Only scroll if the current track has changed and we have a valid track
    if (currentTrack && currentTrack.id !== previousTrackRef.current && trackList?.some(t => t.id === currentTrack.id)) {
      // Find the active track element - try multiple selectors
      let activeElement = document.querySelector('.track-list-item.active, .song-card.active');
      
      // If not found with class, try to find by data attribute
      if (!activeElement && currentTrack.id) {
        activeElement = document.querySelector(`[data-track-id="${currentTrack.id}"]`);
      }
      
      // If still not found, try a broader search
      if (!activeElement) {
        const allTrackElements = document.querySelectorAll('.track-list-item, .song-card');
        allTrackElements.forEach(el => {
          if (el.textContent.includes(currentTrack.title) || 
              el.getAttribute('aria-label')?.includes(currentTrack.title)) {
            activeElement = el;
          }
        });
      }
      
      if (activeElement) {
        // Determine the scroll container
        const scrollContainer = scrollContainerRef?.current || 
                              activeElement.closest('.tracks-list, .songs-grid, .section-content-scroll, .page-container') ||
                              window;
        
        // Use scrollIntoView for simplicity and reliability
        try {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        } catch (error) {
          // Fallback to manual scrolling
          if (scrollContainer !== window) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = activeElement.getBoundingClientRect();
            
            const targetScrollTop = scrollContainer.scrollTop + 
                                  (elementRect.top - containerRect.top) - 
                                  (containerRect.height / 2) + 
                                  (elementRect.height / 2);
            
            scrollContainer.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          }
        }
      }
      
      // Update the previous track reference
      previousTrackRef.current = currentTrack.id;
    }
  }, [currentTrack, scrollContainerRef, trackList]);

  return previousTrackRef;
};
