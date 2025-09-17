import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as BackgroundFetch from 'expo-background-fetch';
import Constants from 'expo-constants';
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
    this.setupBackgroundFetch();
  }

  // Check if running in Expo Go vs standalone app
  private isExpoGo(): boolean {
    return Constants.appOwnership === 'expo';
  }

  private supportsBackgroundAudio(): boolean {
    return !this.isExpoGo() || Platform.OS === 'android';
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

  private setupBackgroundFetch(): void {
    try {
      // Only setup background fetch if background audio is supported
      if (this.supportsBackgroundAudio()) {
        BackgroundFetch.registerTaskAsync('background-audio-task', {
          minimumInterval: 1000, // 1 second
          stopOnTerminate: false,
          startOnBoot: true,
        });
        
        BackgroundFetch.setMinimumIntervalAsync(1000);
        console.log('🎵 Background fetch configured for audio');
      } else {
        console.log('🎵 Background fetch not configured - running in Expo Go on iOS');
      }
    } catch (error) {
      console.error('🎵 Error setting up background fetch:', error);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log('🎵 App state changed to:', nextAppState);
    console.log('🎵 Current state - Sound exists:', !!this.sound, 'IsPlaying:', this.isPlaying);
    console.log('🎵 Background audio supported:', this.supportsBackgroundAudio());
    
    if (!this.supportsBackgroundAudio()) {
      console.log('🎵 Background audio not supported - skipping background handling');
      return;
    }
    
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
        
        // Configure audio session for background
        await this.configureAudioSession();
        
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
        // Force audio session configuration multiple times
        await this.configureAudioSession();
        
        // Ensure audio continues playing in background
        await this.sound.setIsMutedAsync(false);
        await this.sound.setVolumeAsync(1.0);
        
        // Force play the audio
        console.log('🎵 Background maintenance - Force playing audio...');
        await this.sound.playAsync();
        
        // Reconfigure audio session again
        await this.configureAudioSession();
        
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
        
        // Start a continuous background task to keep audio playing
        this.startContinuousBackgroundTask();
        
        console.log('🎵 Background audio playback maintained');
      } else {
        console.log('🎵 Background maintenance - No sound or not playing');
      }
    } catch (error) {
      console.error('🎵 Error maintaining background playback:', error);
    }
  }

  private startContinuousBackgroundTask(): void {
    // Clear any existing interval
    if (this.backgroundTaskId) {
      clearInterval(this.backgroundTaskId as any);
    }
    
    // Start a continuous task to maintain audio
    this.backgroundTaskId = setInterval(async () => {
      try {
        if (this.sound && this.isPlaying) {
          const status = await this.sound.getStatusAsync();
          console.log('🎵 Continuous task - Checking audio status:', status.isPlaying);
          
          if (status.isLoaded && !status.isPlaying) {
            console.log('🎵 Continuous task - Audio stopped, resuming...');
            
            // Force audio session configuration
            await this.configureAudioSession();
            
            // Try to resume multiple times
            let success = false;
            for (let i = 0; i < 5; i++) {
              try {
                await this.sound.playAsync();
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const newStatus = await this.sound.getStatusAsync();
                if (newStatus.isLoaded && newStatus.isPlaying) {
                  console.log('🎵 Continuous task - Audio resumed on attempt', i + 1);
                  success = true;
                  break;
                } else {
                  console.log('🎵 Continuous task - Attempt', i + 1, 'failed, trying again...');
                }
              } catch (playError) {
                console.error('🎵 Continuous task - Play attempt', i + 1, 'error:', playError);
              }
            }
            
            // If normal attempts failed, try emergency restart
            if (!success) {
              console.log('🎵 Continuous task - Normal attempts failed, trying emergency restart...');
              await this.emergencyRestart();
            }
          } else if (status.isLoaded && status.isPlaying) {
            console.log('🎵 Continuous task - Audio is playing normally');
          } else {
            console.log('🎵 Continuous task - Sound not loaded or invalid status');
          }
        } else {
          console.log('🎵 Continuous task - No sound or not playing');
        }
      } catch (error) {
        console.error('🎵 Continuous background task error:', error);
      }
    }, 1000); // Check every 1 second for more aggressive monitoring
    
    console.log('🎵 Continuous background task started (1 second intervals)');
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

  private async configureAudioSession(): Promise<void> {
    try {
      console.log('🎵 Configuring audio session for background playback...');
      const audioConfig = {
        allowsRecordingIOS: false,
        staysActiveInBackground: this.supportsBackgroundAudio(),
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
      };
      
      await Audio.setAudioModeAsync(audioConfig);
      
      // Additional configuration for iOS background audio
      if (Platform.OS === 'ios' && this.supportsBackgroundAudio()) {
        console.log('🎵 Configuring iOS-specific audio settings...');
        // Force audio session to be active with same config
        await Audio.setAudioModeAsync(audioConfig);
      }
      
      console.log('🎵 Audio session configured successfully:', audioConfig);
    } catch (error) {
      console.error('🎵 Error configuring audio session:', error);
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

  public async forceRestartAudio(): Promise<void> {
    try {
      console.log('🎵 Force restarting audio...');
      if (this.sound && this.isPlaying) {
        // Stop current audio
        await this.sound.stopAsync();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reconfigure audio session
        await this.configureAudioSession();
        
        // Start again
        await this.sound.playAsync();
        console.log('🎵 Audio force restarted');
      }
    } catch (error) {
      console.error('🎵 Error force restarting audio:', error);
    }
  }

  public async emergencyRestart(): Promise<void> {
    try {
      console.log('🎵 Emergency restart - Attempting to restart audio session...');
      
      // Force reconfigure audio session
      await this.configureAudioSession();
      
      if (this.sound && this.isPlaying) {
        // Try to stop and restart
        try {
          await this.sound.stopAsync();
        } catch (e) {
          console.log('🎵 Emergency restart - Stop failed, continuing...');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force play multiple times
        for (let i = 0; i < 10; i++) {
          try {
            await this.sound.playAsync();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const status = await this.sound.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              console.log('🎵 Emergency restart - Success on attempt', i + 1);
              return;
            }
          } catch (e) {
            console.log('🎵 Emergency restart - Attempt', i + 1, 'failed:', e);
          }
        }
        
        console.log('🎵 Emergency restart - All attempts failed');
      }
    } catch (error) {
      console.error('🎵 Error in emergency restart:', error);
    }
  }

  public async startBackgroundTask(): Promise<void> {
    try {
      await this.configureAudioSession();
      this.backgroundTaskId = Date.now();
      
      // Register background task handler
      BackgroundFetch.registerTaskAsync('background-audio-task', async () => {
        try {
          console.log('🎵 Background task executing...');
          if (this.sound && this.isPlaying) {
            const status = await this.sound.getStatusAsync();
            console.log('🎵 Background task - Sound status:', status);
            
            if (status.isLoaded && !status.isPlaying) {
              await this.sound.playAsync();
              console.log('🎵 Background audio resumed via background task');
            } else if (status.isLoaded && status.isPlaying) {
              console.log('🎵 Background audio is already playing');
            }
          } else {
            console.log('🎵 Background task - No sound or not playing');
          }
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('🎵 Background task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
      
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
      
      // Clear continuous background task
      if (this.backgroundTaskId) {
        clearInterval(this.backgroundTaskId as any);
        this.backgroundTaskId = null;
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
