import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { DownloadedAudio } from '../types';

class BackgroundTaskService {
  private static instance: BackgroundTaskService;
  private isBackgroundTaskActive: boolean = false;
  private backgroundTaskId: number | null = null;

  private constructor() {}

  public static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  public async startBackgroundTask(audio: DownloadedAudio): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // For Android, we need to ensure the audio session is properly configured
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        
        console.log('🎵 Background task started for Android');
        this.isBackgroundTaskActive = true;
      } else {
        // iOS handles background audio through app.json configuration
        console.log('🎵 Background audio configured for iOS');
        this.isBackgroundTaskActive = true;
      }
    } catch (error) {
      console.error('🎵 Error starting background task:', error);
    }
  }

  public async stopBackgroundTask(): Promise<void> {
    try {
      if (this.backgroundTaskId) {
        // Clean up background task if needed
        this.backgroundTaskId = null;
      }
      
      this.isBackgroundTaskActive = false;
      console.log('🎵 Background task stopped');
    } catch (error) {
      console.error('🎵 Error stopping background task:', error);
    }
  }

  public isActive(): boolean {
    return this.isBackgroundTaskActive;
  }

  public async ensureBackgroundPlayback(sound: Audio.Sound | null): Promise<void> {
    try {
      if (sound && this.isBackgroundTaskActive) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await sound.playAsync();
          console.log('🎵 Background playback ensured');
        }
      }
    } catch (error) {
      console.error('🎵 Error ensuring background playback:', error);
    }
  }
}

export const backgroundTaskService = BackgroundTaskService.getInstance();
