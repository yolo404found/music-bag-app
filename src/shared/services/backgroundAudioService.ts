import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import Constants from 'expo-constants';
import { DownloadedAudio } from '../types';

class BackgroundAudioService {
  private static instance: BackgroundAudioService;
  private currentAudio: DownloadedAudio | null = null;
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private appStateSubscription: any = null;

  private constructor() {
    this.setupAppStateListener();
  }

  // Check if running in Expo Go vs standalone app
  private isExpoGo(): boolean {
    return Constants.appOwnership === 'expo';
  }

  private supportsBackgroundAudio(): boolean {
    return !this.isExpoGo() || Platform.OS === 'android';
  }

  public static getInstance(): BackgroundAudioService {
    if (!BackgroundAudioService.instance) {
      BackgroundAudioService.instance = new BackgroundAudioService();
    }
    return BackgroundAudioService.instance;
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log('🎵 App state changed to:', nextAppState);
    console.log('🎵 Background audio supported:', this.supportsBackgroundAudio());
    
    if (!this.supportsBackgroundAudio()) {
      console.log('🎵 Background audio not supported - skipping background handling');
      return;
    }
    
    if (nextAppState === 'background' && this.isPlaying) {
      console.log('🎵 App went to background, maintaining audio playback');
      this.maintainBackgroundPlayback();
    } else if (nextAppState === 'active' && this.isPlaying) {
      console.log('🎵 App became active, audio should still be playing');
      this.resumeBackgroundPlayback();
    } else if (nextAppState === 'inactive' && this.isPlaying) {
      console.log('🎵 App became inactive, preparing for background playback');
      this.prepareForBackground();
    }
  };

  private async maintainBackgroundPlayback(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        // Ensure audio continues playing in background
        await this.sound.setIsMutedAsync(false);
        await this.sound.setVolumeAsync(1.0);
        
        // Configure for background playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: this.supportsBackgroundAudio(),
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true,
        });
        
        console.log('🎵 Background audio playback maintained');
      }
    } catch (error) {
      console.error('🎵 Error maintaining background playback:', error);
    }
  }

  private async prepareForBackground(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        // Prepare audio for background playback
        await this.sound.setIsMutedAsync(false);
        await this.sound.setVolumeAsync(1.0);
        console.log('🎵 Audio prepared for background playback');
      }
    } catch (error) {
      console.error('🎵 Error preparing for background:', error);
    }
  }

  private async resumeBackgroundPlayback(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        // Ensure audio is still playing when app becomes active
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await this.sound.playAsync();
          console.log('🎵 Background audio resumed');
        }
      }
    } catch (error) {
      console.error('🎵 Error resuming background playback:', error);
    }
  }

  public async setCurrentAudio(audio: DownloadedAudio | null): void {
    this.currentAudio = audio;
  }

  public async setSound(sound: Audio.Sound | null): void {
    this.sound = sound;
  }

  public setIsPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  public getCurrentAudio(): DownloadedAudio | null {
    return this.currentAudio;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async cleanup(): Promise<void> {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('🎵 Error cleaning up background audio:', error);
      }
    }
  }
}

export const backgroundAudioService = BackgroundAudioService.getInstance();
