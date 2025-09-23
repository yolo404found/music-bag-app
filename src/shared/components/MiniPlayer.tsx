import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAudio } from '../../core/providers/AudioProvider';
import { useToast } from '../../core/providers/ToastProvider';
import { useTheme } from '../../core/providers/ThemeProvider';
import * as PhosphorIcons from 'phosphor-react-native';

type MiniPlayerNavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const MiniPlayer: React.FC = () => {
  const navigation = useNavigation<MiniPlayerNavigationProp>();
  const { 
    currentAudio, 
    isPlaying, 
    position, 
    duration, 
    pauseAudio, 
    resumeAudio, 
    stopAudio 
  } = useAudio();
  const { showInfo } = useToast();
  const { theme } = useTheme();

  // Track current screen name using navigation state
  const [currentScreen, setCurrentScreen] = useState<string>('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (state) {
        const routeName = state.routes[state.index]?.name;
        if (routeName) {
          setCurrentScreen(routeName);
          console.log('🎵 MiniPlayer - Screen changed to:', routeName);
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Animation refs for playing indicator
  const bar1Anim = useRef(new Animated.Value(0.3)).current;
  const bar2Anim = useRef(new Animated.Value(0.5)).current;
  const bar3Anim = useRef(new Animated.Value(0.7)).current;
  const animationRef = useRef<number | null>(null);

  // Animate playing indicator bars
  useEffect(() => {
    const cleanupAnimation = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    
    if (isPlaying) {
      const animateBars = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bar1Anim, {
              toValue: 1,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar2Anim, {
              toValue: 0.3,
              duration: 400 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar3Anim, {
              toValue: 0.8,
              duration: 350 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(bar1Anim, {
              toValue: 0.4,
              duration: 250 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar2Anim, {
              toValue: 1,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar3Anim, {
              toValue: 0.2,
              duration: 400 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished && isPlaying) {
            animationRef.current = requestAnimationFrame(animateBars);
          }
        });
      };
      animationRef.current = requestAnimationFrame(animateBars);
    } else {
      // Clean up any existing animation
      cleanupAnimation();
      
      // Reset bars to default position when paused
      Animated.parallel([
        Animated.timing(bar1Anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(bar2Anim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(bar3Anim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
    
    return () => {
      cleanupAnimation();
    };
  }, [isPlaying, bar1Anim, bar2Anim, bar3Anim]);

  // Don't render if no audio is playing or if we're on the Player screen
  if (!currentAudio || currentScreen === 'Player') {
    // console.log('🎵 MiniPlayer - Not rendering because:', !currentAudio ? 'no audio' : 'on Player screen');
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseAudio();
    } else {
      await resumeAudio();
    }
  };

  const handleStop = async () => {
    await stopAudio();
    // showInfo('Audio Stopped', 'Playback has been stopped');
  };

  const handlePress = () => {
    navigation.navigate('Player', { audio: currentAudio });
  };

  return (
    <View style={[styles.container,{backgroundColor: theme.colors.background}]}>
      {/* Backdrop for better visibility in dark mode */}
      {theme.mode === 'dark' && (
        <View style={[styles.backdrop, { 
          backgroundColor: `${theme.colors.background}B0` 
        }]} />
      )}
      {/* Floating Card */}
      <View style={[styles.floatingCard, { 
        backgroundColor: theme.mode === 'dark' ? `${theme.colors.card}F0` : theme.colors.card,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow
      }]}>
        {/* Main Content */}
        <View style={styles.content}>
          <TouchableOpacity style={styles.trackSection} onPress={handlePress}>
            {/* Album Art with Glow Effect */}
            <View style={styles.albumArtContainer}>
              <View style={styles.albumArtGlow} />
              <View style={styles.albumArt}>
                <Image
                  source={{ uri: currentAudio.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </View>
              {isPlaying && (
                <View style={styles.playingIndicator}>
                  <Animated.View 
                    style={[
                      styles.playingBar, 
                      { 
                        height: bar1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [3, 8],
                        })
                      }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.playingBar, 
                      { 
                        height: bar2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [3, 8],
                        })
                      }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.playingBar, 
                      { 
                        height: bar3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [3, 8],
                        })
                      }
                    ]} 
                  />
                </View>
              )}
            </View>

            {/* Track Info */}
            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {currentAudio.title}
              </Text>
              <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Unknown Artist
              </Text>
              <Text style={[styles.timeInfo, { color: theme.colors.textSecondary }]}>
                {formatTime(position)} / {formatTime(duration)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.playButton, { 
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primary,
                shadowColor: theme.colors.primary
              }]}
              onPress={handlePlayPause}
            >
              {isPlaying ? (
                <PhosphorIcons.Pause size={18} color="#FFFFFF" weight="bold" />
              ) : (
                <PhosphorIcons.Play size={18} color="#FFFFFF" weight="bold" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, { 
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow
              }]}
              onPress={handleStop}
            >
              <PhosphorIcons.X size={16} color="#8E8E93" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}> 
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    // backgroundColor will be set dynamically via theme
  },
  floatingCard: {
    // backgroundColor will be set dynamically via theme with proper opacity
    borderRadius: 20,
    borderWidth: 1,
    // borderColor will be set dynamically via theme
    // shadowColor will be set dynamically via theme
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 72,
  },
  trackSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArtContainer: {
    marginRight: 14,
    position: 'relative',
  },
  albumArtGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    backgroundColor: '#007AFF', // Keep static for visual consistency
    opacity: 0.35,
    shadowColor: '#007AFF', // Keep static for visual consistency
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  albumArt: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF', // Keep static for visual consistency
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#007AFF', // Keep static for visual consistency
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border for better visibility
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  playingBar: {
    width: 2,
    backgroundColor: '#007AFF', // Keep static for visual consistency
    borderRadius: 1,
    minHeight: 2,
  },
  trackInfo: {
    flex: 1,
    marginRight: 14,
  },
  trackTitle: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  trackArtist: {
    // color will be set dynamically via theme
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 2,
  },
  timeInfo: {
    // color will be set dynamically via theme
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor will be set dynamically via theme
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // borderColor will be set dynamically via theme
    // shadowColor will be set dynamically via theme
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  playButton: {
    // backgroundColor, borderColor, shadowColor will be set dynamically via theme
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  progressBar: {
    height: 3.5,
    // backgroundColor will be set dynamically via theme
    borderRadius: 1.75,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    // backgroundColor will be set dynamically via theme
    borderRadius: 1.75,
    // shadowColor will be set dynamically via theme
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2.5,
  },
});

export default MiniPlayer;