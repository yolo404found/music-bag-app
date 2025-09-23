import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { DownloadedAudio } from '../../shared/types';
import { backgroundAudioManager } from '../../shared/services/backgroundAudioManager';
import { audioEnvironment } from '../../shared/utils/audioEnvironment';

interface AudioContextType {
  currentAudio: DownloadedAudio | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
  sound: Audio.Sound | null;
  playlist: DownloadedAudio[];
  currentIndex: number;
  isAutoPlayEnabled: boolean;
  isShuffled: boolean;
  isRepeating: boolean;
  playAudio: (audio: DownloadedAudio, playlistContext?: DownloadedAudio[], explicitIndex?: number) => Promise<void>;
  playPlaylist: (playlist: DownloadedAudio[], startIndex?: number) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setCurrentAudio: (audio: DownloadedAudio | null) => void;
  setPlaylist: (playlist: DownloadedAudio[], startIndex?: number) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleAutoPlay: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [currentAudio, setCurrentAudio] = useState<DownloadedAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playlist, setPlaylistState] = useState<DownloadedAudio[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [originalPlaylist, setOriginalPlaylist] = useState<DownloadedAudio[]>([]);
  
  // Debug logging for playlist state changes
  useEffect(() => {
    console.log('🎵 Playlist state changed, length:', playlist.length, 'current index:', currentIndex);
    if (playlist.length > 0) {
      console.log('🎵 Playlist contents:', playlist.map(a => a.title));
    } else {
      console.log('🎵 Playlist is empty');
    }
  }, [playlist, currentIndex]);

  // Wrap setPlaylistState with debug logging
  const debugSetPlaylistState = (newPlaylist: DownloadedAudio[]) => {
    console.log('🎵 setPlaylistState called with', newPlaylist.length, 'tracks');
    if (newPlaylist.length > 0) {
      console.log('🎵 New playlist contents:', newPlaylist.map(a => a.title));
    } else {
      console.log('🎵 New playlist is empty');
      // Log stack trace to see where this is being called from
      console.trace('Empty playlist set from:');
    }
    setPlaylistState(newPlaylist);
  };
  
  // Wrap setOriginalPlaylist with debug logging
  const debugSetOriginalPlaylist = (newPlaylist: DownloadedAudio[]) => {
    console.log('🎵 setOriginalPlaylist called with', newPlaylist.length, 'tracks');
    if (newPlaylist.length > 0) {
      console.log('🎵 New original playlist contents:', newPlaylist.map(a => a.title));
    } else {
      console.log('🎵 New original playlist is empty');
      // Log stack trace to see where this is being called from
      console.trace('Empty original playlist set from:');
    }
    setOriginalPlaylist(newPlaylist);
  };
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Get audio environment information
  const envInfo = audioEnvironment.getEnvironmentInfo();
  const supportsBackgroundAudio = envInfo.supportsBackgroundAudio;

  // Configure audio session for background playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        const audioConfig = {
          allowsRecordingIOS: false,
          staysActiveInBackground: supportsBackgroundAudio,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true,
        };

        await Audio.setAudioModeAsync(audioConfig);
        
        // Log environment information
        audioEnvironment.logEnvironmentInfo();
        
        // Show warning if background audio is not supported
        const warning = audioEnvironment.getBackgroundAudioWarning();
        if (warning) {
          console.warn('🎵', warning);
        }
        
        console.log('🎵 Audio session configured:', audioConfig);
      } catch (error) {
        console.error('Error configuring audio session:', error);
      }
    };
    
    configureAudio();
  }, [supportsBackgroundAudio]);

  // Playback status update handler
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
      setDuration(status.durationMillis / 1000);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
      
      // Check if audio has finished playing
      if (status.didJustFinish) {
        console.log('🎵 Audio finished, checking repeat mode...');
        console.log('🎵 Current repeat state:', isRepeating);
        if (isRepeating) {
          // If repeating is true, restart the current track
          console.log('🎵 Repeat ON: Restarting current track');
          if (currentAudio) {
            playAudio(currentAudio);
          }
        } else {
          // If repeating is false, play next track in playlist
          console.log('🎵 Repeat OFF: Playing next track');
          playNext();
        }
      }
    }
  };

  // Start position updates
  const startPositionUpdates = () => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
    }
    
    positionUpdateInterval.current = setInterval(async () => {
      if (soundRef.current && isPlaying) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined) {
            setPosition(status.positionMillis / 1000);
          }
          
          // Ensure background playback continues
          if (backgroundAudioManager.getIsPlaying()) {
            console.log('🎵 AudioProvider - Position update: Ensuring background playback');
            await backgroundAudioManager.forceResumeAudio();
          }
        } catch (error) {
          console.error('🎵 AudioProvider - Error updating position:', error);
        }
      }
    }, 1000);
  };

  // Stop position updates
  const stopPositionUpdates = () => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
      positionUpdateInterval.current = null;
    }
  };

  // Play audio - can play single audio, optionally with a playlist context
  const playAudio = async (audio: DownloadedAudio, playlistContext?: DownloadedAudio[], explicitIndex?: number) => {
    try {
      console.log('🎵 AudioProvider - Starting to play audio:', audio.title);
      console.log('🎵 AudioProvider - Playlist context provided:', !!playlistContext, 'Explicit index:', explicitIndex);
      console.log('🎵 AudioProvider - Current playlist state - length:', playlist.length, 'index:', currentIndex);
      
      // Stop current audio if playing
      if (soundRef.current) {
        console.log('🎵 AudioProvider - Unloading previous sound');
        await soundRef.current.unloadAsync();
      }

      setCurrentAudio(audio);
      await backgroundAudioManager.setCurrentAudio(audio);
      
      // If a playlist context is provided, set it
      if (playlistContext && playlistContext.length > 0) {
        console.log('🎵 AudioProvider - Setting playlist context with', playlistContext.length, 'tracks');
        console.log('🎵 AudioProvider - Playlist context contents:', playlistContext.map(a => a.title));
        const audioIndex = explicitIndex !== undefined ? explicitIndex : playlistContext.findIndex(a => a.id === audio.id);
        setOriginalPlaylist([...playlistContext]); // Keep original for shuffle toggle
        setPlaylistState(playlistContext);
        setCurrentIndex(audioIndex >= 0 ? audioIndex : 0);
        console.log('🎵 AudioProvider - Playlist context set successfully, new index:', audioIndex);
      } else {
        // Log when no playlist context is provided
        console.log('🎵 AudioProvider - No playlist context provided, keeping existing playlist');
        console.log('🎵 AudioProvider - Current playlist length:', playlist.length);
        if (playlist.length > 0) {
          console.log('🎵 AudioProvider - Current playlist contents:', playlist.map(a => a.title));
        } else {
          console.log('🎵 AudioProvider - Current playlist is empty');
          console.trace('Empty playlist when playing audio:');
        }
        // If we have an existing playlist, ensure the current audio is in it
        if (playlist.length > 0) {
          const audioIndex = playlist.findIndex(a => a.id === audio.id);
          if (audioIndex >= 0) {
            setCurrentIndex(audioIndex);
            console.log('🎵 AudioProvider - Audio found in playlist at index:', audioIndex);
          } else {
            // If audio is not in playlist, reset playlist
            console.log('🎵 AudioProvider - Audio not in current playlist, resetting playlist');
            setOriginalPlaylist([audio]);
            setPlaylistState([audio]);
            setCurrentIndex(0);
          }
        } else {
          // If no playlist exists, create one with just this audio
          console.log('🎵 AudioProvider - No existing playlist, creating new one');
          setOriginalPlaylist([audio]);
          setPlaylistState([audio]);
          setCurrentIndex(0);
        }
      }
      
      // Start background task
      console.log('🎵 AudioProvider - Starting background task');
      await backgroundAudioManager.startBackgroundTask();
      
      // Create new sound with background support
      console.log('🎵 AudioProvider - Creating new sound object');
      const soundOptions = { 
        shouldPlay: true, 
        isLooping: false,
        volume: 1.0,
        isMuted: false,
        shouldStayActiveInBackground: supportsBackgroundAudio,
      };
      
      console.log('🎵 AudioProvider - Sound options:', soundOptions);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audio.localUri },
        soundOptions,
        onPlaybackStatusUpdate
      );

      console.log('🎵 AudioProvider - Sound created, setting references');
      soundRef.current = sound;
      await backgroundAudioManager.setSound(sound);
      setIsPlaying(true);
      backgroundAudioManager.setIsPlaying(true);
      startPositionUpdates();
      
      console.log('🎵 AudioProvider - Audio started with background support');
      
      // Debug: Check background manager status
      setTimeout(() => {
        backgroundAudioManager.debugStatus();
      }, 1000);
    } catch (error) {
      console.error('🎵 AudioProvider - Error playing audio:', error);
      // Set playing state to false on error
      setIsPlaying(false);
      backgroundAudioManager.setIsPlaying(false);
    }
  };

  // Play a specific playlist
  const playPlaylist = async (newPlaylist: DownloadedAudio[], startIndex: number = 0) => {
    console.log('🎵 Playing playlist with', newPlaylist.length, 'tracks, starting at index', startIndex);
    
    // Set the playlist
    setPlaylistState(newPlaylist);
    setCurrentIndex(startIndex);
    console.log('🎵 Playlist set successfully, starting at index:', startIndex);
    console.log('🎵 Playlist contents:', newPlaylist.map(a => a.title));
    // Play the first track
    if (newPlaylist.length > 0 && startIndex < newPlaylist.length) {
      await playAudio(newPlaylist[startIndex]);
    }
  };

  // Pause audio
  const pauseAudio = async () => {
    if (soundRef.current) {
      try {
        console.log('🎵 AudioProvider - Pausing audio');
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        backgroundAudioManager.setIsPlaying(false);
        stopPositionUpdates();
        console.log('🎵 AudioProvider - Audio paused');
      } catch (error) {
        console.error('🎵 AudioProvider - Error pausing audio:', error);
      }
    }
  };

  // Resume audio
  const resumeAudio = async () => {
    if (soundRef.current) {
      try {
        console.log('🎵 AudioProvider - Resuming audio');
        await soundRef.current.playAsync();
        setIsPlaying(true);
        backgroundAudioManager.setIsPlaying(true);
        startPositionUpdates();
        console.log('🎵 AudioProvider - Audio resumed');
      } catch (error) {
        console.error('🎵 AudioProvider - Error resuming audio:', error);
      }
    }
  };

  // Stop audio
  const stopAudio = async () => {
    try {
      console.log('🎵 Stopping audio, current playlist length:', playlist.length);
      console.log('🎵 Current playlist contents:', playlist.map(a => a.title));
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      // Stop background task
      await backgroundAudioManager.stopBackgroundTask();
      
      // Always clear state, even if no sound object exists
      await backgroundAudioManager.setSound(null);
      setCurrentAudio(null);
      await backgroundAudioManager.setCurrentAudio(null);
      setIsPlaying(false);
      backgroundAudioManager.setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      stopPositionUpdates();
      console.log('🎵 Audio stopped and state cleared');
      console.log('🎵 Playlist after stop:', playlist.map(a => a.title));
    } catch (error) {
      console.error('Error stopping audio:', error);
      // Even if there's an error, clear the state
      setCurrentAudio(null);
      await backgroundAudioManager.setCurrentAudio(null);
      setIsPlaying(false);
      backgroundAudioManager.setIsPlaying(false);
    }
  };

  // Seek to position
  const seekTo = async (newPosition: number) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(newPosition * 1000);
        setPosition(newPosition);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  };

  // Set playlist
  const setPlaylist = (newPlaylist: DownloadedAudio[], startIndex: number = 0) => {
    console.log('🎵 Setting playlist with', newPlaylist.length, 'tracks, starting at index', startIndex);
    if (newPlaylist.length > 0) {
      console.log('🎵 Playlist contents:', newPlaylist.map(a => a.title));
    } else {
      console.log('🎵 Playlist is empty');
      console.trace('Empty playlist set from setPlaylist function:');
    }
    setOriginalPlaylist([...newPlaylist]); // Keep original for shuffle toggle
    setPlaylistState(newPlaylist);
    setCurrentIndex(startIndex);
    console.log('🎵 Playlist set successfully');
  };

  // Toggle shuffle
  const toggleShuffle = () => {
    const newShuffled = !isShuffled;
    setIsShuffled(newShuffled);
    
    if (newShuffled) {
      // Create shuffled playlist
      const shuffled = [...originalPlaylist];
      const currentTrack = shuffled[currentIndex];
      
      // Remove current track
      shuffled.splice(currentIndex, 1);
      
      // Shuffle remaining tracks
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Put current track at the beginning
      shuffled.unshift(currentTrack);
      console.log('🎵 Setting shuffled playlist with', shuffled.length, 'tracks');
      if (shuffled.length > 0) {
        console.log('🎵 Shuffled playlist contents:', shuffled.map(a => a.title));
      } else {
        console.log('🎵 Shuffled playlist is empty');
        console.trace('Empty shuffled playlist set from:');
      }
      setPlaylistState(shuffled);
      setCurrentIndex(0);
    } else {
      // Restore original playlist
      console.log('🎵 Restoring original playlist with', originalPlaylist.length, 'tracks');
      if (originalPlaylist.length > 0) {
        console.log('🎵 Original playlist contents:', originalPlaylist.map(a => a.title));
      } else {
        console.log('🎵 Original playlist is empty');
        console.trace('Empty original playlist restored from:');
      }
      setPlaylistState([...originalPlaylist]);
      // Find the current track in the original playlist
      const currentTrackId = playlist[currentIndex]?.id;
      const newIndex = originalPlaylist.findIndex(track => track.id === currentTrackId);
      setCurrentIndex(newIndex >= 0 ? newIndex : 0);
    }
  };

  // Toggle repeat
  const toggleRepeat = () => {
    const newRepeatState = !isRepeating;
    setIsRepeating(newRepeatState);
    console.log('🎵 Repeat toggled to:', newRepeatState);
  };

  // Play next track - only if we have a playlist
  const playNext = async () => {
    console.log('🎵 playNext called, playlist length:', playlist.length, 'current index:', currentIndex);
    console.log('🎵 Current playlist contents:', playlist.map(a => a.title));
    console.log('🎵 Original playlist contents:', originalPlaylist.map(a => a.title));
    
    if (playlist.length === 0) {
      console.log('🎵 No tracks in playlist, stopping playback');
      await stopAudio();
      return;
    }
    
    const nextIndex = currentIndex + 1;
    console.log('🎵 Next index would be:', nextIndex, 'playlist length:', playlist.length);
    
    if (nextIndex < playlist.length) {
      console.log('🎵 Playing next track at index', nextIndex);
      console.log('🎵 Next track title:', playlist[nextIndex].title);
      // Pass the current playlist context to maintain it and the explicit next index
      await playAudio(playlist[nextIndex], playlist, nextIndex);
    } else {
      // Reached end of playlist, stop playback
      console.log('🎵 Reached end of playlist, stopping playback');
      await stopAudio();
    }
  };

  // Play previous track - only if we have a playlist
  const playPrevious = async () => {
    console.log('🎵 playPrevious called, playlist length:', playlist.length, 'current index:', currentIndex);
    console.log('🎵 Current playlist contents:', playlist.map(a => a.title));
    
    if (playlist.length === 0) {
      console.log('🎵 No tracks in playlist');
      return;
    }
    
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      console.log('🎵 Playing previous track at index', prevIndex);
      console.log('🎵 Previous track title:', playlist[prevIndex].title);
      // Pass the current playlist context to maintain it and the explicit previous index
      await playAudio(playlist[prevIndex], playlist, prevIndex);
    } else {
      console.log('🎵 Already at beginning of playlist');
    }
  };

  // Toggle auto-play
  const toggleAutoPlay = () => {
    setIsAutoPlayEnabled(!isAutoPlayEnabled);
    console.log('🎵 Auto-play', !isAutoPlayEnabled ? 'enabled' : 'disabled');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPositionUpdates();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      backgroundAudioManager.cleanup();
    };
  }, []);

  const value: AudioContextType = {
    currentAudio,
    isPlaying,
    position,
    duration,
    isBuffering,
    sound: soundRef.current,
    playlist,
    currentIndex,
    isAutoPlayEnabled,
    isShuffled,
    isRepeating,
    playAudio,
    playPlaylist,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setCurrentAudio,
    setPlaylist,
    playNext,
    playPrevious,
    toggleAutoPlay,
    toggleShuffle,
    toggleRepeat,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};