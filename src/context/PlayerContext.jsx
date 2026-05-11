import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useRecentlyPlayed } from './RecentlyPlayedContext';

const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [trackQueue, setTrackQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [currentArtistContext, setCurrentArtistContext] = useState(null);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'one', 'all'
  const audioRef = useRef(null);
  const { addTrack } = useRecentlyPlayed();
  const trackPlayStartTime = useRef(null);
  const hasTrackedPlay = useRef(false);

  // Initialize audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.volume = 1;
      audio.muted = false;
      audio.preload = 'auto';
      
      // Append to DOM to ensure proper audio context initialization
      // Use hidden positioning to keep it out of view
      audio.style.display = 'none';
      document.body.appendChild(audio);
      
      audioRef.current = audio;
    }
    
    // Cleanup on unmount
    return () => {
      if (audioRef.current && audioRef.current.parentNode) {
        audioRef.current.parentNode.removeChild(audioRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (!currentTrack) {
        setIsPlaying(false);
        return;
      }

      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(err => {
          console.error('❌ Replay failed:', err.message);
          setIsPlaying(false);
        });
        setIsPlaying(true);
        return;
      }

      if (trackQueue.length === 0) {
        setIsPlaying(false);
        return;
      }

      const effectiveQueueIndex = queueIndex >= 0
        ? queueIndex
        : trackQueue.findIndex(track => track.id === currentTrack.id);
      const nextIndex = effectiveQueueIndex + 1;

      if (nextIndex < trackQueue.length) {
        playTrack(trackQueue[nextIndex]);
        setQueueIndex(nextIndex);
        return;
      }

      if (repeatMode === 'all') {
        playTrack(trackQueue[0]);
        setQueueIndex(0);
        return;
      }

      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, repeatMode, trackQueue, queueIndex]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const playTrack = (track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const audio = audioRef.current;
      if (!audio) {
        console.error('❌ Audio element not initialized');
        return;
      }

      // Stop and reset previous playback
      audio.pause();
      audio.currentTime = 0;
      
      // CRITICAL: Ensure audio is not muted
      audio.muted = false;
      audio.volume = 1;
      
      setCurrentTrack(track);
      
      // Set up event listeners
      const handlePlayStart = () => {
        // Add to recently played when playback actually starts
        if (!hasTrackedPlay.current) {
          addTrack(track);
          hasTrackedPlay.current = true;
        }
        audio.removeEventListener('play', handlePlayStart);
      };

      const handleCanPlay = () => {
        audio.removeEventListener('canplay', handleCanPlay);
      };
      
      const handleError = (e) => {
        const error = e.target.error;
        const errorCode = error?.code || 'UNKNOWN';
        const errorMsg = error?.message || 'Unknown error';
        console.error(`❌ Playback failed - Code: ${errorCode}, Message: ${errorMsg}`);
        setIsPlaying(false);
        hasTrackedPlay.current = false;
      };
      
      // Reset tracking for new track
      hasTrackedPlay.current = false;
      
      audio.addEventListener('play', handlePlayStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      
      // Set source and force load
      audio.src = track.preview;
      audio.load(); // Explicitly load the audio
      
      // Play immediately
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {})
          .catch(err => {
            console.error('❌ Playback failed:', err.message);
            setIsPlaying(false);
          });
      }
      
      setIsPlaying(true);
      setIsPanelOpen(true);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.muted = false;
      audio.volume = volume;
      audio.play().catch(err => console.error('❌ Resume failed:', err.message));
    }
    setIsPlaying(!isPlaying);
  };

  const pauseTrack = () => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    const audio = audioRef.current;
    if (audio && !isPlaying && currentTrack) {
      audio.muted = false;
      audio.volume = volume;
      audio.play().catch(err => console.error('❌ Resume failed:', err.message));
      setIsPlaying(true);
    }
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (newVolume) => {
    setVolume(newVolume);
  };

  const playTrackWithQueue = (track, queue = [], index = 0) => {
    setTrackQueue(queue);
    setQueueIndex(index);
    playTrack(track);
  };

  const playTrackWithArtist = (track, artistContext = null) => {
    setCurrentArtistContext(artistContext);
    playTrack(track);
  };

  const playTrackWithQueueAndArtist = (track, queue = [], index = 0, artistContext = null) => {
    setTrackQueue(queue);
    setQueueIndex(index);
    setCurrentArtistContext(artistContext);
    playTrack(track);
  };

  const toggleRepeat = () => {
    setRepeatMode(prevMode => {
      if (prevMode === 'off') return 'one';
      if (prevMode === 'one') return 'all';
      return 'off';
    });
  };

  const nextTrack = () => {
    if (trackQueue.length === 0) return;
    
    const nextIndex = queueIndex + 1;
    if (nextIndex >= trackQueue.length) {
      // Loop back to beginning
      playTrack(trackQueue[0]);
      setQueueIndex(0);
    } else {
      playTrack(trackQueue[nextIndex]);
      setQueueIndex(nextIndex);
    }
  };

  const previousTrack = () => {
    if (trackQueue.length === 0) return;
    
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      // Loop to end
      playTrack(trackQueue[trackQueue.length - 1]);
      setQueueIndex(trackQueue.length - 1);
    } else {
      playTrack(trackQueue[prevIndex]);
      setQueueIndex(prevIndex);
    }
  };

  const value = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isPanelOpen,
    setIsPanelOpen,
    trackQueue,
    queueIndex,
    currentArtistContext,
    repeatMode,
    playTrack,
    playTrackWithQueue,
    playTrackWithArtist,
    playTrackWithQueueAndArtist,
    nextTrack,
    previousTrack,
    toggleRepeat,
    togglePlay,
    pauseTrack,
    resumeTrack,
    seek,
    changeVolume,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};
