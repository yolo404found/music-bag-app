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
  playAudio: (audio: DownloadedAudio) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setCurrentAudio: (audio: DownloadedAudio | null) => void;
  setPlaylist: (playlist: DownloadedAudio[], startIndex?: number) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleAutoPlay: () => void;
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
      if (status.didJustFinish && isAutoPlayEnabled && playlist.length > 0) {
        console.log('🎵 Audio finished, checking for next track...');
        playNext();
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

  // Play audio
  const playAudio = async (audio: DownloadedAudio) => {
    try {
      console.log('🎵 AudioProvider - Starting to play audio:', audio.title);
      
      // Stop current audio if playing
      if (soundRef.current) {
        console.log('🎵 AudioProvider - Unloading previous sound');
        await soundRef.current.unloadAsync();
      }

      setCurrentAudio(audio);
      await backgroundAudioManager.setCurrentAudio(audio);
      
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
    setPlaylistState(newPlaylist);
    setCurrentIndex(startIndex);
  };

  // Play next track
  const playNext = async () => {
    if (playlist.length === 0) return;
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < playlist.length) {
      console.log('🎵 Playing next track at index', nextIndex);
      setCurrentIndex(nextIndex);
      await playAudio(playlist[nextIndex]);
    } else {
      console.log('🎵 Reached end of playlist');
      // Optionally loop back to beginning
      // setCurrentIndex(0);
      // await playAudio(playlist[0]);
    }
  };

  // Play previous track
  const playPrevious = async () => {
    if (playlist.length === 0) return;
    
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      console.log('🎵 Playing previous track at index', prevIndex);
      setCurrentIndex(prevIndex);
      await playAudio(playlist[prevIndex]);
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
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setCurrentAudio,
    setPlaylist,
    playNext,
    playPrevious,
    toggleAutoPlay,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};