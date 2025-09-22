import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, AudioMetadata } from '../../shared/types';
import { useApp } from '../../core/providers/AppProvider';
import { useToast } from '../../core/providers/ToastProvider';
import { useTheme } from '../../core/providers/ThemeProvider';
import { apiService } from '../../shared/services/apiService';
import { urlValidator } from '../../shared/utils/urlValidator';
import ThemeToggleButton from '../../shared/components/ThemeToggleButton';
import * as PhosphorIcons from 'phosphor-react-native';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const { width, height } = Dimensions.get('window');

// Search mode types
type SearchMode = 'search' | 'url';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { setError, clearError } = useApp();
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const { theme, themeMode } = useTheme();
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [input, setInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);

  // Handle search mode toggle
  const handleSearchMode = () => {
    if (searchMode === 'search') {
      // Navigate to search screen with parameters
      navigation.navigate('Search', {
        initialQuery: input,
        searchMode: 'search',
        placeholder: 'Search for songs, artists, or albums...',
        autoFocus: !input.trim() // Auto focus only if no initial query
      });
    } else {
      // Handle URL input mode
      handleCheckUrl();
    }
  };

  // Clear input when switching modes for better UX
  useEffect(() => {
    // Clear input when switching between modes
    // setInput('');
    // We're not clearing input automatically to preserve user input during mode switching
  }, [searchMode]);

  // URL validation
  const isValidUrl = (url: string): boolean => {
    return urlValidator.isSupportedURL(url);
  };

  // Handle URL check
  const handleCheckUrl = async (): Promise<void> => {
    if (!input.trim()) {
      showError('Invalid Input', searchMode === 'url' ? 'Please enter a URL' : 'Please enter search terms');
      return;
    }

    if (searchMode === 'url') {
      const validation = urlValidator.validateAndClean(input);
      if (!validation.isValid || !validation.isSupported) {
        showError('Invalid URL', validation.error || 'Please enter a valid YouTube, SoundCloud, or Vimeo URL');
        return;
      }

      try {
        setIsChecking(true);
        clearError();

        const response = await apiService.checkUrl(validation.cleanedUrl);
        
        if (response.success && response.data) {
          // Add to recent URLs
          const newRecentUrls = [input, ...recentUrls.filter(u => u !== input)].slice(0, 5);
          setRecentUrls(newRecentUrls);
          
          // Navigate to info screen
          navigation.navigate('Info', { metadata: response.data });
        } else {
          showError('Check Failed', response.error || 'Failed to check URL');
        }
      } catch (error) {
        console.error('Error checking URL:', error);
        showError('Network Error', 'Please check your connection and try again');
        setError('Network error. Please check your connection.');
      } finally {
        setIsChecking(false);
      }
    }
  };

  // Handle recent URL selection
  const handleRecentUrlSelect = (recentUrl: string): void => {
    setInput(recentUrl);
    setSearchMode('url'); // Switch to URL mode when selecting recent URL
  };

  // Clear recent URLs
  const clearRecentUrls = (): void => {
    setRecentUrls([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.colors.background} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Theme Toggle Button */}
        <View style={styles.themeToggleContainer}>
          <ThemeToggleButton />
        </View>
        
        <KeyboardAvoidingView 
          style={styles.keyboardContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={[styles.logoContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
              <PhosphorIcons.MusicNote size={48} color={theme.colors.primary} weight="fill" />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Music Bag</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Search for music or paste URLs to download your favorites
            </Text>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            {/* Mode Toggle */}
            <View style={[styles.modeToggleContainer, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border 
            }]}>
              <TouchableOpacity
                style={[
                  styles.modeToggle, 
                  searchMode === 'search' && [styles.modeToggleActive, { backgroundColor: theme.colors.primary }]
                ]}
                onPress={() => setSearchMode('search')}
              >
                <PhosphorIcons.MagnifyingGlass 
                  size={16} 
                  color={searchMode === 'search' ? '#fff' : theme.colors.textSecondary} 
                  weight="regular" 
                />
                <Text style={[
                  styles.modeToggleText, 
                  { color: theme.colors.textSecondary },
                  searchMode === 'search' && styles.modeToggleTextActive
                ]}>
                  Search Music
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modeToggle, 
                  searchMode === 'url' && [styles.modeToggleActive, { backgroundColor: theme.colors.primary }]
                ]}
                onPress={() => setSearchMode('url')}
              >
                <PhosphorIcons.Link 
                  size={16} 
                  color={searchMode === 'url' ? '#fff' : theme.colors.textSecondary} 
                  weight="regular" 
                />
                <Text style={[
                  styles.modeToggleText, 
                  { color: theme.colors.textSecondary },
                  searchMode === 'url' && styles.modeToggleTextActive
                ]}>
                  Paste URL
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Container */}
            <View style={[styles.inputContainer, { 
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.colors.border 
            }]}>
              <View style={styles.inputWrapper}>
                <PhosphorIcons.MagnifyingGlass size={20} color={theme.colors.textSecondary} weight="regular" />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={
                    searchMode === 'search' 
                      ? "Search for songs, artists, or albums..."
                      : "Paste YouTube, SoundCloud, or Vimeo URL"
                  }
                  placeholderTextColor={theme.colors.textSecondary}
                  value={input}
                  onChangeText={setInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={searchMode === 'url' ? 'url' : 'default'}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchMode}
                  editable={!isChecking}
                />
              </View>
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: theme.colors.primary }, (!input.trim() || isChecking) && styles.searchButtonDisabled]}
                onPress={handleSearchMode}
                disabled={!input.trim() || isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <PhosphorIcons.ArrowRight size={20} color={input ? '#fff' : theme.colors.primary} weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { 
                backgroundColor: `${theme.colors.primary}10`,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}30` 
              }]}
              onPress={() => {
                navigation.navigate('Search', {
                  initialQuery: input,
                  searchMode: 'search',
                  placeholder: 'Quick search for music...',
                  autoFocus: true
                });
              }}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <PhosphorIcons.MagnifyingGlass size={20} color={theme.colors.primary} weight="fill" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Quick Search</Text>
              <Text style={[styles.quickActionDescription, { color: theme.colors.textSecondary }]}>Find music instantly</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { 
                backgroundColor: `${theme.colors.primary}10`,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}30` 
              }]}
              onPress={() => navigation.navigate('Library')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <PhosphorIcons.Play size={20} color={theme.colors.primary} weight="fill" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>My Library</Text>
              <Text style={[styles.quickActionDescription, { color: theme.colors.textSecondary }]}>Your collection</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
               style={[styles.quickActionButton, { 
                backgroundColor: `${theme.colors.primary}10`,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}30` 
              }]}
              onPress={() => {
                setSearchMode('url');
                setInput('https://www.youtube.com/watch?v=');
              }}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <PhosphorIcons.Link size={20} color={theme.colors.primary} weight="fill" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Paste URL</Text>
              <Text style={[styles.quickActionDescription, { color: theme.colors.textSecondary }]}>Download direct</Text>
            </TouchableOpacity>
          </View>

          {/* Recent URLs */}
          {recentUrls.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Downloads</Text>
              {recentUrls.map((recentUrl, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => handleRecentUrlSelect(recentUrl)}
                >
                  <PhosphorIcons.Clock size={16} color="#8E8E93" weight="regular" />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {recentUrl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Features</Text>
            <View style={styles.featureGrid}>
              <View style={[styles.featureItem, { 
                backgroundColor: `${theme.colors.primary}08`,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}20` 
              }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <PhosphorIcons.MagnifyingGlass size={24} color={theme.colors.primary} weight="fill" />
                </View>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>Search</Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>Find music easily</Text>
              </View>
              <View style={[styles.featureItem, { 
                backgroundColor: `${theme.colors.primary}08`,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}20` 
              }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <PhosphorIcons.Download size={24} color={theme.colors.primary} weight="fill" />
                </View>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>Download</Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>Save audio offline</Text>
              </View>
              <View style={[styles.featureItem, { 
                backgroundColor: `${theme.colors.primary}08`,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}20` 
              }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <PhosphorIcons.Play size={24} color={theme.colors.primary} weight="fill" />
                </View>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>Play</Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>Listen anywhere</Text>
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 100,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Added for mini player spacing
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1D1D1F',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  // Search Section
  searchSection: {
    marginBottom: 30,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 50, // Expo Go style rounded tabs
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    // borderColor will be set via theme
  },
  modeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50, // Expo Go style rounded tabs
    gap: 8,
    backgroundColor: 'transparent',
  },
  modeToggleActive: {
    // backgroundColor will be set via theme
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set via theme
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    paddingVertical: 16,
    paddingLeft: 12,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth:1,
    borderColor:'#C7C7CC'
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionDescription: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },

  // Recent Section
  recentSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  recentText: {
    flex: 1,
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 12,
  },

  // Features Section
  featuresSection: {
    marginBottom: 40,
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureItem: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
  },
});

export default HomeScreen;
