import React, { useState } from 'react';
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
import { apiService } from '../../shared/services/apiService';
import { urlValidator } from '../../shared/utils/urlValidator';
import * as PhosphorIcons from 'phosphor-react-native';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { setError, clearError } = useApp();
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const [url, setUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);

  // URL validation
  const isValidUrl = (url: string): boolean => {
    return urlValidator.isSupportedURL(url);
  };

  // Handle URL check
  const handleCheckUrl = async (): Promise<void> => {
    if (!url.trim()) {
      showError('Invalid Input', 'Please enter a URL');
      return;
    }

    const validation = urlValidator.validateAndClean(url);
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
        const newRecentUrls = [url, ...recentUrls.filter(u => u !== url)].slice(0, 5);
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
  };

  // Handle recent URL selection
  const handleRecentUrlSelect = (recentUrl: string): void => {
    setUrl(recentUrl);
  };

  // Clear recent URLs
  const clearRecentUrls = (): void => {
    setRecentUrls([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <SafeAreaView style={styles.safeArea}>
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
            <View style={styles.logoContainer}>
              <PhosphorIcons.MusicNote size={48} color="#4A9EFF" weight="fill" />
            </View>
            <Text style={styles.title}>Music Bag</Text>
            <Text style={styles.subtitle}>Download your favorite music from anywhere</Text>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <PhosphorIcons.MagnifyingGlass size={20} color="#8E8E93" weight="regular" />
                <TextInput
                  style={styles.input}
                  placeholder="Paste YouTube, SoundCloud, or Vimeo URL"
                  placeholderTextColor="#8E8E93"
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="search"
                  onSubmitEditing={handleCheckUrl}
                  editable={!isChecking}
                />
              </View>
              <TouchableOpacity
                style={[styles.searchButton, isChecking && styles.searchButtonDisabled]}
                onPress={handleCheckUrl}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <PhosphorIcons.MagnifyingGlass size={20} color="#fff" weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Library')}
            >
              <PhosphorIcons.Play size={24} color="#4A9EFF" weight="fill" />
              <Text style={styles.quickActionText}>My Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setUrl('https://www.youtube.com/watch?v=')}
            >
              <PhosphorIcons.Download size={24} color="#4A9EFF" weight="fill" />
              <Text style={styles.quickActionText}>YouTube</Text>
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
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featureGrid}>
              <View style={styles.featureItem}>
                <PhosphorIcons.Download size={32} color="#4A9EFF" weight="fill" />
                <Text style={styles.featureTitle}>Download</Text>
                <Text style={styles.featureDescription}>Save audio offline</Text>
              </View>
              <View style={styles.featureItem}>
                <PhosphorIcons.Play size={32} color="#4A9EFF" weight="fill" />
                <Text style={styles.featureTitle}>Play</Text>
                <Text style={styles.featureDescription}>Listen anywhere</Text>
              </View>
              <View style={styles.featureItem}>
                <PhosphorIcons.Heart size={32} color="#4A9EFF" weight="fill" />
                <Text style={styles.featureTitle}>Favorites</Text>
                <Text style={styles.featureDescription}>Save favorites</Text>
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
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
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
    color: '#fff',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#fff',
    paddingVertical: 16,
    paddingLeft: 12,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A9EFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#333',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },

  // Recent Section
  recentSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  featureDescription: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default HomeScreen;
