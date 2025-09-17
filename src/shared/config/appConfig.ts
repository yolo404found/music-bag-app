// App configuration
export const APP_CONFIG = {
  // App info
  name: 'Music Bag',
  version: '1.0.0',
  
  // API configuration
  api: {
    baseURL: __DEV__ 
      ? 'http://192.168.100.12:3000'  // Use your actual IP address
      : 'https://your-production-backend-url.com',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  
  // Storage configuration
  storage: {
    maxLibrarySize: 100, // Maximum number of audio files
    maxFileSize: 100 * 1024 * 1024, // 100MB per file
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Download configuration
  download: {
    maxConcurrentDownloads: 3,
    chunkSize: 1024 * 1024, // 1MB chunks
    retryDelay: 5000, // 5 seconds
  },
  
  // Player configuration
  player: {
    positionUpdateInterval: 1000, // 1 second
    positionSaveInterval: 5000, // 5 seconds
    supportedFormats: ['mp3', 'm4a', 'aac', 'wav'],
  },
  
  // UI configuration
  ui: {
    animationDuration: 300,
    debounceDelay: 500,
    maxRecentUrls: 5,
  },
  
  // Feature flags
  features: {
    enableOfflineMode: true,
    enableBackgroundDownload: true,
    enablePlaylistSupport: false,
    enableSharing: true,
    enableFavorites: true,
  },
  
  // Error handling
  error: {
    maxRetries: 3,
    retryDelay: 2000,
    showErrorToasts: true,
  },
} as const;

// Environment configuration
export const ENV_CONFIG = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  platform: Platform.OS,
} as const;

// Platform-specific configuration
export const PLATFORM_CONFIG = {
  ios: {
    audioSessionCategory: 'playback',
    audioSessionMode: 'default',
  },
  android: {
    audioFocusGain: 'AUDIOFOCUS_GAIN',
    audioStreamType: 'STREAM_MUSIC',
  },
} as const;

// Import Platform for type checking
import { Platform } from 'react-native';
