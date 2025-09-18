import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList, DownloadedAudio } from '../../shared/types';
import { useApp } from '../../core/providers/AppProvider';
import { useAudio } from '../../core/providers/AudioProvider';
import { storageService } from '../../shared/services/storageService';
import * as PhosphorIcons from 'phosphor-react-native';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Player'>;

const { width, height } = Dimensions.get('window');

const PlayerScreen: React.FC = () => {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { audio } = route.params;
  console.log('audio', audio);
  
  const { updateDownloadedAudio, appState } = useApp();
  const { 
    currentAudio: globalCurrentAudio,
    isPlaying: globalIsPlaying,
    position: globalPosition,
    duration: globalDuration,
    isBuffering: globalIsBuffering,
    sound: globalSound,
    playAudio: globalPlayAudio,
    pauseAudio: globalPauseAudio,
    resumeAudio: globalResumeAudio,
    stopAudio: globalStopAudio,
    seekTo: globalSeekTo,
    setCurrentAudio: setGlobalCurrentAudio
  } = useAudio();
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(audio.favorite);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isSeekInProgress, setIsSeekInProgress] = useState(false);
  const [playlist, setPlaylist] = useState<DownloadedAudio[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<DownloadedAudio>(audio);

  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio visualization animations
  const [visualizationBars, setVisualizationBars] = useState<Animated.Value[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved position on mount
  useEffect(() => {
    loadSavedPosition();
    initializePlaylist();
    initializeVisualization();
    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // Debug: Track sound object changes
  useEffect(() => {
    console.log('🎵 Sound object changed:', {
      localSound: !!sound,
      globalSound: !!globalSound,
      isLoading,
      globalIsBuffering,
      globalIsPlaying,
      disabled: !globalSound || isLoading || globalIsBuffering
    });
  }, [sound, globalSound, isLoading, globalIsBuffering, globalIsPlaying]);

  // Sync local currentAudio with global currentAudio changes
  useEffect(() => {
    if (globalCurrentAudio && globalCurrentAudio.id !== currentAudio.id) {
      console.log('🎵 Global audio changed, updating local state');
      setCurrentAudio(globalCurrentAudio);
      setIsFavorite(globalCurrentAudio.favorite);
      
      // Update current track index
      const newIndex = playlist.findIndex(a => a.id === globalCurrentAudio.id);
      if (newIndex >= 0) {
        setCurrentTrackIndex(newIndex);
      }
    }
  }, [globalCurrentAudio, currentAudio.id, playlist]);

  // Initialize visualization bars
  const initializeVisualization = (): void => {
    const bars = Array.from({ length: 20 }, () => new Animated.Value(0.1));
    setVisualizationBars(bars);
  };

  // Start audio visualization animation
  const startVisualization = (): void => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    if (visualizationBars.length === 0) {
      console.log('🎵 Visualization bars not initialized, skipping animation');
      return;
    }
    
    animationRef.current = setInterval(() => {
      visualizationBars.forEach((bar, index) => {
        if (bar && typeof bar.interpolate === 'function') {
          const randomHeight = Math.random() * 0.8 + 0.2; // Random height between 0.2 and 1.0
          Animated.timing(bar, {
            toValue: randomHeight,
            duration: 150 + Math.random() * 100, // Random duration between 150-250ms
            useNativeDriver: false,
          }).start();
        }
      });
    }, 100);
  };

  // Stop audio visualization animation
  const stopVisualization = (): void => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    
    // Animate bars to minimum height
    if (visualizationBars.length > 0) {
      visualizationBars.forEach((bar) => {
        if (bar && typeof bar.interpolate === 'function') {
          Animated.timing(bar, {
            toValue: 0.1,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      });
    }
  };

  // Fallback position update for progress bar
  useEffect(() => {
    if (globalIsPlaying && sound) {
      positionUpdateInterval.current = setInterval(() => {
        if (sound && !isSeeking) {
          sound.getStatusAsync().then((status: any) => {
            if (status.isLoaded && status.positionMillis !== undefined) {
              const newPosition = status.positionMillis / 1000;
              console.log('🎵 Fallback position update:', newPosition);
            }
          });
        }
      }, 1000); // Update every second
    } else {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    }

    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [globalIsPlaying, sound, isSeeking]);

  // Initialize playlist and find current track
  const initializePlaylist = (): void => {
    const allAudios = appState.downloadedAudios;
    setPlaylist(allAudios);
    
    // Find current track index
    const currentIndex = allAudios.findIndex(a => a.id === currentAudio.id);
    setCurrentTrackIndex(currentIndex >= 0 ? currentIndex : 0);
  };

  // Change current audio and update UI
  const changeCurrentAudio = async (newAudio: DownloadedAudio): Promise<void> => {
    try {
      console.log('🎵 Changing current audio to:', newAudio.title);
      
      // Update local state
      setCurrentAudio(newAudio);
      setIsFavorite(newAudio.favorite);
      
      // Update global audio state
      setGlobalCurrentAudio(newAudio);
      
      // Play the new audio
      await globalPlayAudio(newAudio);
      
      console.log('🎵 Audio changed successfully');
    } catch (error) {
      console.error('🎵 Error changing audio:', error);
    }
  };

  // Load saved position
  const loadSavedPosition = async (): Promise<void> => {
    try {
      const savedPosition = await storageService.getPlayerPosition(currentAudio.id);
      // Position will be managed by global audio context
      console.log('🎵 Loaded saved position:', savedPosition);
    } catch (error) {
      console.error('Error loading saved position:', error);
    }
  };

  // Load and prepare audio
  const loadAudio = async (): Promise<void> => {
    try {
      console.log('🎵 Starting audio load process...');
      setIsLoading(true);
      console.log('🎵 Loading audio from:', currentAudio.localUri);
      console.log('🎵 Audio metadata:', {
        id: currentAudio.id,
        title: currentAudio.title,
        duration: currentAudio.duration,
        fileSize: currentAudio.fileSize
      });
      
      // Configure audio session for playback
      console.log('🎵 Configuring audio session...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('🎵 Audio session configured');
      
      // Unload previous sound
      if (sound) {
        console.log('🎵 Unloading previous sound object...');
        await sound.unloadAsync();
        console.log('🎵 Previous sound unloaded');
      }

      // Check if file exists
      console.log('🎵 Checking if audio file exists...');
      const fileInfo = await FileSystem.getInfoAsync(currentAudio.localUri);
      console.log('🎵 File info:', {
        exists: fileInfo.exists,
        size: 'size' in fileInfo ? fileInfo.size : 'unknown',
        uri: fileInfo.uri,
        isDirectory: fileInfo.isDirectory
      });

      if (!fileInfo.exists) {
        throw new Error(`Audio file does not exist at: ${currentAudio.localUri}`);
      }

      if ('size' in fileInfo && fileInfo.size === 0) {
        throw new Error('Audio file is empty (0 bytes)');
      }

      console.log('🎵 Audio file exists, size:', 'size' in fileInfo ? fileInfo.size : 'unknown');

      // Load new sound
      console.log('🎵 Creating Audio.Sound object...');
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentAudio.localUri },
        { 
          shouldPlay: false, 
          positionMillis: globalPosition * 1000,
          isLooping: false,
          volume: 1.0,
          isMuted: false,
        },
        onPlaybackStatusUpdate
      );

      console.log('🎵 Audio.Sound object created successfully');
      setSound(newSound);
      setIsLoading(false);
      console.log('🎵 Audio loaded successfully - ready to play!');
      
      // Auto-play if this was triggered by play button
      if (!globalIsPlaying) {
        try {
          await newSound.setVolumeAsync(volume);
          await newSound.setIsMutedAsync(isMuted);
          await newSound.playAsync();
          console.log('🎵 Auto-playing after load');
        } catch (error) {
          console.error('🎵 Error auto-playing after load:', error);
        }
      }
    } catch (error) {
      console.error('🎵 Error loading audio:', error);
      console.error('🎵 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        audioUri: currentAudio.localUri
      });
      setIsLoading(false);
      Alert.alert('Error', `Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Playback status update handler
  const onPlaybackStatusUpdate = async (status: any): Promise<void> => {
    console.log('🎵 Playback status update:', {
      isLoaded: status.isLoaded,
      isPlaying: status.isPlaying,
      isBuffering: status.isBuffering,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis,
      error: status.error,
      volume: status.volume,
      isMuted: status.isMuted,
      shouldPlay: status.shouldPlay,
      didJustFinish: status.didJustFinish
    });

    if (status.isLoaded) {
      console.log('🎵 Status updated:', {
        position: status.positionMillis / 1000,
        duration: status.durationMillis / 1000,
        isPlaying: status.isPlaying,
        isBuffering: status.isBuffering,
        volume: status.volume,
        isMuted: status.isMuted,
        shouldPlay: status.shouldPlay
      });
      
      // Check if audio is actually playing
      if (status.isPlaying) {
        console.log('🎵 AUDIO IS PLAYING - Position:', status.positionMillis / 1000, 'Duration:', status.durationMillis / 1000);
      } else if (status.shouldPlay && !status.isPlaying) {
        console.log('🎵 WARNING - Audio should be playing but is not!');
      }
      
      // Handle track completion
      if (status.didJustFinish) {
        console.log('🎵 Track finished, moving to next track');
        if (isRepeating) {
          // Restart current track
          if (sound) {
            await sound.setPositionAsync(0);
            await sound.playAsync();
          }
        } else {
          // Go to next track
          handleNext();
        }
      }
      
      // Save position every 5 seconds
      if (status.positionMillis % 5000 < 100) {
        savePosition(status.positionMillis / 1000);
      }
    } else if (status.error) {
      console.error('🎵 Playback error:', status.error);
    }
  };

  // Save position
  const savePosition = async (pos: number): Promise<void> => {
    try {
      await storageService.savePlayerPosition(currentAudio.id, pos);
    } catch (error) {
      console.error('Error saving position:', error);
    }
  };

  // Handle play/pause
  const handlePlayPause = async (): Promise<void> => {
    console.log('🎵 Play button clicked!');
    console.log('🎵 Current state:', { 
      globalIsPlaying,
      isLoading, 
      globalIsBuffering,
      localSound: !!sound,
      globalSound: !!globalSound,
      audioUri: currentAudio.localUri 
    });

    try {
      if (globalIsPlaying) {
        console.log('🎵 Pausing audio...');
        await globalPauseAudio();
        // stopVisualization();
        console.log('🎵 Audio paused successfully');
      } else {
        console.log('🎵 Playing audio...');
        await globalPlayAudio(currentAudio);
        // startVisualization();
        console.log('🎵 Audio play command sent');
      }
    } catch (error) {
      console.error('🎵 Error toggling playback:', error);
      console.error('🎵 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  // Handle volume change
  const handleVolumeChange = async (newVolume: number): Promise<void> => {
    console.log('🎵 Volume changed to:', newVolume);
    setVolume(newVolume);
    if (sound) {
      try {
        await sound.setVolumeAsync(newVolume);
        console.log('🎵 Volume set successfully');
      } catch (error) {
        console.error('🎵 Error setting volume:', error);
      }
    }
  };

  // Handle mute toggle
  const handleMuteToggle = async (): Promise<void> => {
    const newMuted = !isMuted;
    console.log('🎵 Mute toggled to:', newMuted);
    setIsMuted(newMuted);
    if (sound) {
      try {
        await sound.setIsMutedAsync(newMuted);
        console.log('🎵 Mute set successfully');
      } catch (error) {
        console.error('🎵 Error setting mute:', error);
      }
    }
  };

  // Handle seek start (when user starts dragging)
  const handleSeekStart = (): void => {
    console.log('🎵 Seek started');
    setIsSeeking(true);
    // Clear any existing seek timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
  };

  // Handle seek change (while dragging)
  const handleSeekChange = (newPosition: number): void => {
    // Update position during dragging for visual feedback
    console.log('🎵 Seeking to position:', newPosition);
  };

  // Handle seek complete (when user stops dragging)
  const handleSeekComplete = async (newPosition: number): Promise<void> => {
    if (isSeekInProgress) return;

    try {
      console.log('🎵 Seek completed at position:', newPosition);
      
      // Clear any pending seek operations
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }

      // Set seek in progress to prevent multiple operations
      setIsSeekInProgress(true);

      // Use global seek function
      await globalSeekTo(newPosition);

      setIsSeeking(false);
      setIsSeekInProgress(false);
      console.log('🎵 Seek completed successfully');
    } catch (error) {
      console.error('Error seeking:', error);
      setIsSeeking(false);
      setIsSeekInProgress(false);
    }
  };

  // Handle playback rate change
  const handlePlaybackRateChange = async (rate: number): Promise<void> => {
    if (!sound) return;

    try {
      await sound.setRateAsync(rate, true);
      setPlaybackRate(rate);
    } catch (error) {
      console.error('Error changing playback rate:', error);
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async (): Promise<void> => {
    try {
      const updatedAudio = { ...currentAudio, favorite: !isFavorite };
      await updateDownloadedAudio(updatedAudio);
      setCurrentAudio(updatedAudio);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle shuffle toggle
  const handleShuffleToggle = (): void => {
    const newShuffled = !isShuffled;
    setIsShuffled(newShuffled);
    
    if (newShuffled && playlist.length > 1) {
      // Shuffle the playlist
      const shuffledPlaylist = [...playlist];
      const currentTrack = shuffledPlaylist[currentTrackIndex];
      
      // Remove current track from shuffle
      shuffledPlaylist.splice(currentTrackIndex, 1);
      
      // Shuffle the rest
      for (let i = shuffledPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlaylist[i], shuffledPlaylist[j]] = [shuffledPlaylist[j], shuffledPlaylist[i]];
      }
      
      // Put current track at the beginning
      shuffledPlaylist.unshift(currentTrack);
      setPlaylist(shuffledPlaylist);
      setCurrentTrackIndex(0);
    } else if (!newShuffled) {
      // Restore original order
      initializePlaylist();
    }
  };

  // Handle repeat toggle
  const handleRepeatToggle = (): void => {
    setIsRepeating(!isRepeating);
  };

  // Handle previous track
  const handlePrevious = (): void => {
    if (playlist.length === 0) return;
    
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
      newIndex = playlist.length - 1; // Loop to last track
    }
    
    const previousAudio = playlist[newIndex];
    setCurrentTrackIndex(newIndex);
    changeCurrentAudio(previousAudio);
  };

  // Handle next track
  const handleNext = (): void => {
    if (playlist.length === 0) return;
    
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= playlist.length) {
      newIndex = 0; // Loop to first track
    }
    
    const nextAudio = playlist[newIndex];
    setCurrentTrackIndex(newIndex);
    changeCurrentAudio(nextAudio);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Audio Visualization Background */}
      {/* {globalIsPlaying && visualizationBars.length > 0 && (
        <View style={styles.visualizationContainer} pointerEvents="none">
          {visualizationBars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.visualizationBar,
                {
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 200],
                  }),
                  opacity: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8],
                  }),
                },
              ]}
            />
          ))}
        </View>
      )} */}
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <PhosphorIcons.CaretDown size={20} color="#fff" weight="bold" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Now Playing</Text>
        </View>
        
        <TouchableOpacity
          style={styles.equalizerButton}
        >
          <PhosphorIcons.Equalizer size={20} color="#fff" weight="bold" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Main Content */}
      <ScrollView 
        style={styles.mainContent} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {/* Album Art Section */}
        <View style={styles.albumSection}>
          <View style={styles.albumArtContainer}>
            <Image
              source={{ uri: currentAudio.thumbnail }}
              style={styles.albumArt}
              resizeMode="cover"
            />
            {/* Album Art Overlay */}
            <View style={styles.albumArtOverlay}>
              {/* <View style={styles.artistOverlay}>
                <PhosphorIcons.User size={12} color="#fff" weight="bold" />
                <Text style={styles.artistOverlayText}>WILLIAM BLACK</Text>
              </View> */}
              <Text style={styles.albumTitleOverlay}>MUSIC BAG</Text>
            </View>
          </View>
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentAudio.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            Unknown Artist
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(globalPosition)}</Text>
            <Text style={styles.timeText}>{formatTime(globalDuration)}</Text>
          </View>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={globalDuration || 1}
            value={globalPosition}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor="#4A9EFF"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#4A9EFF"
            step={0.1}
            disabled={!globalSound || isLoading || globalIsBuffering}
          />
          {/* Debug Info */}
          {/* <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Debug Info:</Text>
            <Text style={styles.debugText}>Local Sound: {sound ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Global Sound: {globalSound ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Loading: {isLoading ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Buffering: {globalIsBuffering ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Playing: {globalIsPlaying ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Position: {globalPosition.toFixed(2)}s</Text>
            <Text style={styles.debugText}>Duration: {globalDuration.toFixed(2)}s</Text>
            <Text style={styles.debugText}>Disabled: {(!globalSound || isLoading || globalIsBuffering) ? '✅' : '❌'}</Text>
          </View> */}
        </View>

          {/* Player Controls */}
      <View style={styles.playerControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleShuffleToggle}
        >
          <PhosphorIcons.Shuffle 
            size={20} 
            color={isShuffled ? "#4A9EFF" : "#fff"} 
            weight="bold" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handlePrevious}
        >
          <PhosphorIcons.SkipBack size={20} color="#fff" weight="bold" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.playPauseButton}
          onPress={handlePlayPause}
        >
          {globalIsPlaying ? (
            <PhosphorIcons.Pause 
              size={24} 
              color="#000" 
              weight="bold" 
            />
          ) : (
            <PhosphorIcons.Play 
              size={24} 
              color="#000" 
              weight="bold" 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleNext}
        >
          <PhosphorIcons.SkipForward size={20} color="#fff" weight="bold" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleRepeatToggle}
        >
          <PhosphorIcons.Repeat 
            size={20} 
            color={isRepeating ? "#4A9EFF" : "#fff"} 
            weight="bold" 
          />
        </TouchableOpacity>
      </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <PhosphorIcons.MusicNote size={22} color="#fff" weight="bold" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleFavoriteToggle}
          >
            <PhosphorIcons.Heart 
              size={22} 
              color={isFavorite ? "#ff6b6b" : "#fff"} 
              weight={isFavorite ? "fill" : "regular"} 
            />
          </TouchableOpacity>
        </View>

        {/* Up Next Section */}
        <View style={styles.upNextContainer}>
          <View style={styles.upNextHeader}>
            <Text style={styles.upNextTitle}>UP NEXT</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Library')}>
              <PhosphorIcons.List size={18} color="#8E8E93" weight="bold" />
            </TouchableOpacity>
          </View>
          <View style={styles.upNextList}>
            {playlist.slice(currentTrackIndex + 1, currentTrackIndex + 3).map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.upNextItem}
                onPress={() => {
                  const newIndex = currentTrackIndex + index + 1;
                  setCurrentTrackIndex(newIndex);
                  changeCurrentAudio(item);
                }}
              >
                <View style={styles.upNextItemInfo}>
                  <Text style={styles.upNextItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.upNextItemArtist} numberOfLines={1}>
                    Unknown Artist
                  </Text>
                  <Text style={styles.upNextItemDuration}>
                    {formatTime(item.duration)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {playlist.length <= 1 && (
              <View style={styles.upNextItem}>
                <Text style={styles.upNextEmptyText}>No more tracks in playlist</Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional spacing for better scrolling */}
        {/* <View style={styles.scrollSpacer} /> */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal:8,
    zIndex: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  equalizerButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  scrollSpacer: {
    height: 100,
  },
  albumSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  albumArtContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 20,
  },
  albumArt: {
    width: width * 0.85,
    height: 300, // Fixed height
    borderRadius: 8,
  },
  albumArtOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    padding: 16,
    justifyContent: 'space-between',
  },
  artistOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 16,
    left: 16,
  },
  artistOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  albumTitleOverlay: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    position: 'absolute',
    left: 16,
    bottom: 16,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '400',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressSlider: {
    height: 40,
    marginBottom: 8,
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextContainer: {
    marginBottom: 16,
  },
  upNextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  upNextTitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  upNextList: {
    gap: 12,
  },
  upNextItem: {
    paddingVertical: 8,
  },
  upNextItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upNextItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  upNextItemArtist: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  upNextItemDuration: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
  },
  upNextEmptyText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  controlButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 100,
    zIndex: 1,
  },
  visualizationBar: {
    width: 3,
    backgroundColor: '#4A9EFF',
    borderRadius: 2,
    marginHorizontal: 1,
  },
});

export default PlayerScreen;
