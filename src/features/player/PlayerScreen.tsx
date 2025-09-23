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
import { useTheme } from '../../core/providers/ThemeProvider';
import { storageService } from '../../shared/services/storageService';
import * as PhosphorIcons from 'phosphor-react-native';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Player'>;

interface PlayerScreenParams {
  audio: DownloadedAudio;
  playlist?: DownloadedAudio[];
  playlistIndex?: number;
}

const { width } = Dimensions.get('window');

const PlayerScreen: React.FC = () => {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { audio, playlist: navigationPlaylist, playlistIndex } = route.params as PlayerScreenParams;
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
    playPlaylist: globalPlayPlaylist,
    pauseAudio: globalPauseAudio,
    resumeAudio: globalResumeAudio,
    stopAudio: globalStopAudio,
    seekTo: globalSeekTo,
    setCurrentAudio: setGlobalCurrentAudio,
    playlist: globalPlaylist,
    currentIndex: globalCurrentIndex,
    setPlaylist: globalSetPlaylist,
    playNext: globalPlayNext,
    playPrevious: globalPlayPrevious,
    isAutoPlayEnabled: globalIsAutoPlayEnabled,
    toggleAutoPlay: globalToggleAutoPlay,
    isShuffled: globalIsShuffled,
    isRepeating: globalIsRepeating,
    toggleShuffle: globalToggleShuffle,
    toggleRepeat: globalToggleRepeat
  } = useAudio();
  const { theme, themeMode } = useTheme();
  
  // Remove local sound state to avoid conflicts with global audio provider
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
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

  // Retry initialization when app state changes
  useEffect(() => {
    if (appState.downloadedAudios.length > 0 && playlist.length === 0) {
      console.log('🎵 PlayerScreen - Retrying playlist initialization');
      initializePlaylist();
    }
  }, [appState.downloadedAudios.length]);

  // Debug: Track sound object changes
  // useEffect(() => {
  //   console.log('🎵 Sound object changed:', {
  //     globalSound: !!globalSound,
  //     isLoading,
  //     globalIsBuffering,
  //     globalIsPlaying,
  //     disabled: !globalSound || isLoading || globalIsBuffering
  //   });
  // }, [globalSound, isLoading, globalIsBuffering, globalIsPlaying]);

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

  // Sync local playlist with global playlist changes
  useEffect(() => {
    console.log('🎵 PlayerScreen - Global playlist changed, length:', globalPlaylist.length);
    console.log('🎵 PlayerScreen - Global playlist contents:', globalPlaylist.map(a => a.title));
    if (globalPlaylist.length > 0 && globalPlaylist.length !== playlist.length) {
      console.log('🎵 PlayerScreen - Updating local playlist to match global playlist');
      setPlaylist(globalPlaylist);
      
      // Update current track index
      const newIndex = globalPlaylist.findIndex(a => a.id === currentAudio.id);
      if (newIndex >= 0) {
        setCurrentTrackIndex(newIndex);
      }
    }
  }, [globalPlaylist, currentAudio.id]);

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

  // Initialize playlist and find current track
  const initializePlaylist = (): void => {
    // Use the playlist from navigation params if available, otherwise use all downloaded audios
    const allAudios = navigationPlaylist && navigationPlaylist.length > 0 
      ? navigationPlaylist 
      : appState.downloadedAudios;
      
    console.log('🎵 PlayerScreen - Initializing playlist with', allAudios.length, 'tracks');
    console.log('🎵 PlayerScreen - Navigation playlist provided:', !!navigationPlaylist, 'length:', navigationPlaylist?.length || 0);
    console.log('🎵 PlayerScreen - App state downloaded audios length:', appState.downloadedAudios.length);
    if (allAudios.length > 0) {
      console.log('🎵 PlayerScreen - Playlist contents:', allAudios.map(a => a.title));
    } else {
      console.log('🎵 PlayerScreen - Playlist is empty');
      console.log('🎵 PlayerScreen - App state isLoading:', appState.isLoading);
      if (appState.isLoading) {
        console.log('🎵 PlayerScreen - Still loading audios, will retry when loaded');
        return;
      } else {
        console.trace('Empty playlist initialized in PlayerScreen:');
      }
    }
    setPlaylist(allAudios);
    
    // Find current track index
    const currentIndex = allAudios.findIndex(a => a.id === currentAudio.id);
    console.log('🎵 PlayerScreen - Current audio index:', currentIndex, 'in playlist of length', allAudios.length);
    setCurrentTrackIndex(currentIndex >= 0 ? currentIndex : 0);
    
    // Always set the global playlist to ensure it's not empty
    // This fixes the issue where the playlist gets reset to empty
    console.log('🎵 PlayerScreen - Setting global playlist with', allAudios.length, 'tracks at index', currentIndex);
    globalSetPlaylist(allAudios, currentIndex >= 0 ? currentIndex : 0);
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
      
      // Play the new audio with playlist context
      await globalPlayAudio(newAudio, playlist);
      
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

  // Save position
  const savePosition = async (pos: number): Promise<void> => {
    try {
      await storageService.savePlayerPosition(currentAudio.id, pos);
    } catch (error) {
      console.error('Error saving position:', error);
    }
  };

  // Handle play/pause - play only current audio, not global playlist
  const handlePlayPause = async (): Promise<void> => {
    console.log('🎵 Play button clicked!');
    console.log('🎵 Current state:', { 
      globalIsPlaying,
      isLoading, 
      globalIsBuffering,
      globalSound: !!globalSound,
      audioUri: currentAudio.localUri,
      playlistLength: playlist.length
    });

    try {
      if (globalIsPlaying) {
        console.log('🎵 Pausing audio...');
        await globalPauseAudio();
        console.log('🎵 Audio paused successfully');
      } else {
        // Check if this is the same audio that was paused
        if (globalCurrentAudio && globalCurrentAudio.id === currentAudio.id) {
          console.log('🎵 Resuming paused audio...');
          await globalResumeAudio();
          console.log('🎵 Audio resumed successfully');
        } else {
          console.log('🎵 Playing single audio with playlist context...');
          // Play the current audio with the current playlist as context
          await globalPlayAudio(currentAudio, playlist);
          console.log('🎵 Single audio play command sent with playlist context');
        }
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
    // Volume is now handled by the global audio provider
  };

  // Handle mute toggle
  const handleMuteToggle = async (): Promise<void> => {
    const newMuted = !isMuted;
    console.log('🎵 Mute toggled to:', newMuted);
    setIsMuted(newMuted);
    // Mute is now handled by the global audio provider
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
    setPlaybackRate(rate);
    // Playback rate is now handled by the global audio provider
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
    globalToggleShuffle();
  };

  // Handle repeat toggle
  const handleRepeatToggle = (): void => {
    globalToggleRepeat();
  };

  // Handle previous track
  const handlePrevious = async (): Promise<void> => {
    try {
      await globalPlayPrevious();
    } catch (error) {
      console.error('Error playing previous track:', error);
    }
  };

  // Handle next track
  const handleNext = async (): Promise<void> => {
    try {
      await globalPlayNext();
    } catch (error) {
      console.error('Error playing next track:', error);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.colors.background} 
      />
      
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
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <PhosphorIcons.CaretDown size={20} color={theme.colors.text} weight="bold" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Now Playing</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.equalizerButton, { backgroundColor: theme.colors.surface }]}
        >
          <PhosphorIcons.Equalizer size={20} color={theme.colors.text} weight="bold" />
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
          <View style={[styles.albumArtContainer, {
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }]}>
            <Image
              source={{ uri: currentAudio.thumbnail }}
              style={styles.albumArt}
              resizeMode="cover"
            />
            {/* Album Art Overlay */}
            <View style={styles.albumArtOverlay}>
              <Text style={[styles.albumTitleOverlay, {
                textShadowColor: 'rgba(0, 0, 0, 0.7)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }]}>MUSIC BAG</Text>
            </View>
          </View>
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {currentAudio.title}
          </Text>
          <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            Unknown Artist
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{formatTime(globalPosition)}</Text>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{formatTime(globalDuration)}</Text>
          </View>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={globalDuration || 1}
            value={globalPosition}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
            step={0.1}
            disabled={!globalSound || isLoading || globalIsBuffering}
          />
          {/* Debug Info */}
          {/* <View style={[styles.debugContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Debug Info:</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Local Sound: {sound ? '✅' : '❌'}</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Global Sound: {globalSound ? '✅' : '❌'}</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Loading: {isLoading ? '✅' : '❌'}</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Buffering: {globalIsBuffering ? '✅' : '❌'}</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Playing: {globalIsPlaying ? '✅' : '❌'}</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Position: {globalPosition.toFixed(2)}s</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Duration: {globalDuration.toFixed(2)}s</Text>
            <Text style={[styles.debugText, { color: theme.colors.text }]}>Disabled: {(!globalSound || isLoading || globalIsBuffering) ? '✅' : '❌'}</Text>
          </View> */}
        </View>

          {/* Player Controls */}
      <View style={styles.playerControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleShuffleToggle}
        >
          <PhosphorIcons.Shuffle 
            size={26} 
            color={globalIsShuffled ? theme.colors.primary : theme.colors.textSecondary} 
            weight="bold" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handlePrevious}
        >
          <PhosphorIcons.SkipBack size={26} color={theme.colors.textSecondary} weight="bold" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.playPauseButton, { 
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
            opacity: (!globalSound || isLoading || globalIsBuffering) ? 0.6 : 1
          }]}
          onPress={handlePlayPause}
          disabled={!globalSound || isLoading || globalIsBuffering}
        >
          {(isLoading || globalIsBuffering) ? (
            <PhosphorIcons.CircleNotch 
              size={24} 
              color="#FFFFFF" 
              weight="bold" 
            />
          ) : globalIsPlaying ? (
            <PhosphorIcons.Pause 
              size={24} 
              color="#FFFFFF" 
              weight="bold" 
            />
          ) : (
            <PhosphorIcons.Play 
              size={24} 
              color="#FFFFFF" 
              weight="bold" 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleNext}
        >
          <PhosphorIcons.SkipForward size={26} color={theme.colors.textSecondary} weight="bold" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleRepeatToggle}
        >
          <PhosphorIcons.Repeat 
            size={26} 
            color={globalIsRepeating ? theme.colors.primary : theme.colors.textSecondary} 
            weight="bold" 
          />
        </TouchableOpacity>
      </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}>
            <PhosphorIcons.MusicNote size={22} color={theme.colors.textSecondary} weight="bold" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={handleFavoriteToggle}
          >
            <PhosphorIcons.Heart 
              size={22} 
              color={isFavorite ? theme.colors.error : theme.colors.textSecondary} 
              weight={isFavorite ? "fill" : "regular"} 
            />
          </TouchableOpacity>
        </View>

        {/* Up Next Section */}
        <View style={styles.upNextContainer}>
          <View style={styles.upNextHeader}>
            <Text style={[styles.upNextTitle, { color: theme.colors.textSecondary }]}>UP NEXT</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Library' as never)}>
              <PhosphorIcons.List size={18} color={theme.colors.textSecondary} weight="bold" />
            </TouchableOpacity>
          </View>
          <View style={styles.upNextList}>
            {globalPlaylist.slice(globalCurrentIndex + 1, globalCurrentIndex + 3).map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.upNextItem, { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border 
                }]}
                onPress={async () => {
                  try {
                    // Play the current global playlist from the selected track
                    const newIndex = globalCurrentIndex + index + 1;
                    await globalPlayPlaylist(globalPlaylist, newIndex);
                  } catch (error) {
                    console.error('Error playing selected audio:', error);
                  }
                }}
              >
                <View style={styles.upNextItemInfo}>
                  <Text style={[styles.upNextItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.upNextItemArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    Unknown Artist
                  </Text>
                  <Text style={[styles.upNextItemDuration, { color: theme.colors.textSecondary }]}>
                    {formatTime(item.duration)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {playlist.length <= 1 && (
              <View style={styles.upNextItem}>
                <Text style={[styles.upNextEmptyText, { color: theme.colors.textSecondary }]}>No more tracks in playlist</Text>
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
    // backgroundColor will be set dynamically via theme
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
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor will be set dynamically via theme
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  equalizerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor will be set dynamically via theme
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
    marginTop:16,
    marginBottom: 30,
    alignItems: 'center',
  },
  albumArtContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    // shadow properties will be set dynamically via theme
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
    // color will be set dynamically via theme
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    // color will be set dynamically via theme
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
    // backgroundColor and borderRadius will be set dynamically via theme
    padding: 10,
  },
  debugText: {
    // color will be set dynamically via theme
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
    // color will be set dynamically via theme
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
    // backgroundColor will be set dynamically via theme
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
    marginBottom: 20,
  },
  upNextTitle: {
    // color will be set dynamically via theme
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  upNextList: {
    gap: 12,
  },
  upNextItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight:60,
    // backgroundColor and borderColor will be set dynamically via theme
    borderWidth: 1,
    marginBottom: 8,
  },
  upNextItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upNextItemTitle: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  upNextItemArtist: {
    // color will be set dynamically via theme
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  upNextItemDuration: {
    // color will be set dynamically via theme
    fontSize: 14,
    fontWeight: '400',
  },
  upNextEmptyText: {
    // color will be set dynamically via theme
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
    // backgroundColor and shadowColor will be set dynamically via theme
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
    backgroundColor: '#007AFF', // Keep static for visualization effect
    borderRadius: 2,
    marginHorizontal: 1,
  },
});

export default PlayerScreen;