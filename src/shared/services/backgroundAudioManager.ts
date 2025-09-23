import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as BackgroundFetch from 'expo-background-fetch';
import { DownloadedAudio } from '../types';

class BackgroundAudioManager {
  private static instance: BackgroundAudioManager;
  private currentAudio: DownloadedAudio | null = null;
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private appStateSubscription: any = null;
  private backgroundTaskId: number | null = null;

  private constructor() {
    this.setupAppStateListener();
  }

  // Check if running in Expo Go vs standalone app
  private isExpoGo(): boolean {
    // Since we can't check Constants, assume we're not in Expo Go
    return false;
  }

  private supportsBackgroundAudio(): boolean {
    // Simplify background audio support check
    return true; // Always allow for now
  }

  public static getInstance(): BackgroundAudioManager {
    if (!BackgroundAudioManager.instance) {
      BackgroundAudioManager.instance = new BackgroundAudioManager();
    }
    return BackgroundAudioManager.instance;
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log('🎵 App state changed to:', nextAppState);
    console.log('🎵 Current state - Sound exists:', !!this.sound, 'IsPlaying:', this.isPlaying);
    
    if (nextAppState === 'background' && this.isPlaying) {
      console.log('🎵 App went to background, maintaining audio playback');
      this.maintainBackgroundPlayback();
    } else if (nextAppState === 'active' && this.isPlaying) {
      console.log('🎵 App became active, checking audio status');
      this.resumeBackgroundPlayback();
    } else if (nextAppState === 'inactive' && this.isPlaying) {
      console.log('🎵 App became inactive, preparing for background');
      this.prepareForBackground();
    }
    
    // Debug status after state change
    setTimeout(() => {
      this.debugStatus();
    }, 500);
  };

  private async prepareForBackground(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        // Ensure audio is ready for background playback
        await this.sound.setIsMutedAsync(false);
        await this.sound.setVolumeAsync(1.0);
        
        console.log('🎵 Audio prepared for background playback');
      }
    } catch (error) {
      console.error('🎵 Error preparing for background:', error);
    }
  }

  private async maintainBackgroundPlayback(): Promise<void> {
    try {
      console.log('🎵 Maintaining background playback...');
      if (this.sound && this.isPlaying) {
        // Ensure audio continues playing in background
        await this.sound.setIsMutedAsync(false);
        await this.sound.setVolumeAsync(1.0);
        
        // Force play the audio
        console.log('🎵 Background maintenance - Force playing audio...');
        await this.sound.playAsync();
        
        // Ensure audio is actually playing
        const status = await this.sound.getStatusAsync();
        console.log('🎵 Background maintenance - Sound status after force play:', status);
        
        if (status.isLoaded && !status.isPlaying) {
          console.log('🎵 Background maintenance - Audio stopped, trying again...');
          // Try multiple times
          for (let i = 0; i < 3; i++) {
            await this.sound.playAsync();
            await new Promise(resolve => setTimeout(resolve, 100));
            const newStatus = await this.sound.getStatusAsync();
            if (newStatus.isLoaded && newStatus.isPlaying) {
              console.log('🎵 Background maintenance - Audio resumed on attempt', i + 1);
              break;
            }
          }
        } else if (status.isLoaded && status.isPlaying) {
          console.log('🎵 Background maintenance - Audio is playing');
        } else {
          console.log('🎵 Background maintenance - Sound not loaded');
        }
        
        console.log('🎵 Background audio playback maintained');
      } else {
        console.log('🎵 Background maintenance - No sound or not playing');
      }
    } catch (error) {
      console.error('🎵 Error maintaining background playback:', error);
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

  public async setCurrentAudio(audio: DownloadedAudio | null): Promise<void> {
    console.log('🎵 Background manager - Setting current audio:', audio?.title || 'null');
    this.currentAudio = audio;
  }

  public async setSound(sound: Audio.Sound | null): Promise<void> {
    console.log('🎵 Background manager - Setting sound object:', !!sound);
    this.sound = sound;
  }

  public setIsPlaying(playing: boolean): void {
    console.log('🎵 Background manager - Setting isPlaying:', playing);
    this.isPlaying = playing;
  }

  public getCurrentAudio(): DownloadedAudio | null {
    return this.currentAudio;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async forceResumeAudio(): Promise<void> {
    try {
      console.log('🎵 Force resume audio - Sound exists:', !!this.sound, 'IsPlaying:', this.isPlaying);
      if (this.sound && this.isPlaying) {
        const status = await this.sound.getStatusAsync();
        console.log('🎵 Force resume - Sound status:', status);
        if (status.isLoaded && !status.isPlaying) {
          console.log('🎵 Force resume - Attempting to play audio...');
          await this.sound.playAsync();
          console.log('🎵 Audio force resumed successfully');
        } else if (status.isLoaded && status.isPlaying) {
          console.log('🎵 Force resume - Audio is already playing');
        } else {
          console.log('🎵 Force resume - Sound not loaded or invalid status');
        }
      } else {
        console.log('🎵 Force resume - No sound object or not playing');
      }
    } catch (error) {
      console.error('🎵 Error force resuming audio:', error);
    }
  }

  public debugStatus(): void {
    console.log('🎵 Background Audio Manager Debug Status:');
    console.log('  - Current Audio:', this.currentAudio?.title || 'null');
    console.log('  - Sound Object:', !!this.sound);
    console.log('  - Is Playing:', this.isPlaying);
    console.log('  - Background Task ID:', this.backgroundTaskId);
    if (this.sound) {
      this.sound.getStatusAsync().then(status => {
        console.log('  - Sound Status:', status);
      }).catch(error => {
        console.log('  - Sound Status Error:', error);
      });
    }
  }

  public async startBackgroundTask(): Promise<void> {
    try {
      this.backgroundTaskId = Date.now();
      console.log('🎵 Background task started');
    } catch (error) {
      console.error('🎵 Error starting background task:', error);
    }
  }

  public async stopBackgroundTask(): Promise<void> {
    try {
      this.backgroundTaskId = null;
      console.log('🎵 Background task stopped');
    } catch (error) {
      console.error('🎵 Error stopping background task:', error);
    }
  }

  public async cleanup(): Promise<void> {
    try {
      console.log('🎵 Cleaning up background audio manager...');
      
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
      
      this.currentAudio = null;
      this.sound = null;
      this.isPlaying = false;
      
      console.log('🎵 Background audio manager cleaned up');
    } catch (error) {
      console.error('🎵 Error during cleanup:', error);
    }
  }
}

export const backgroundAudioManager = BackgroundAudioManager.getInstance();