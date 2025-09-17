import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface AudioEnvironmentInfo {
  isExpoGo: boolean;
  isStandalone: boolean;
  supportsBackgroundAudio: boolean;
  platform: 'ios' | 'android' | 'web';
  backgroundAudioLimitations: string[];
}

/**
 * Utility to detect audio environment and capabilities
 */
export class AudioEnvironment {
  private static instance: AudioEnvironment;
  private environmentInfo: AudioEnvironmentInfo;

  private constructor() {
    this.environmentInfo = this.detectEnvironment();
  }

  public static getInstance(): AudioEnvironment {
    if (!AudioEnvironment.instance) {
      AudioEnvironment.instance = new AudioEnvironment();
    }
    return AudioEnvironment.instance;
  }

  private detectEnvironment(): AudioEnvironmentInfo {
    const isExpoGo = Constants.appOwnership === 'expo';
    const isStandalone = !isExpoGo;
    const platform = Platform.OS as 'ios' | 'android' | 'web';
    
    let supportsBackgroundAudio = false;
    const limitations: string[] = [];

    if (isExpoGo) {
      if (platform === 'ios') {
        supportsBackgroundAudio = false;
        limitations.push('iOS Expo Go does not support background audio playback');
        limitations.push('Audio will stop when app goes to background');
        limitations.push('Build standalone app for full background audio support');
      } else if (platform === 'android') {
        supportsBackgroundAudio = true;
        limitations.push('Android Expo Go has limited background audio support');
        limitations.push('Background audio may be inconsistent');
        limitations.push('Build standalone app for reliable background audio');
      }
    } else {
      // Standalone app
      supportsBackgroundAudio = true;
      if (platform === 'ios') {
        limitations.push('Requires proper Info.plist configuration (already configured)');
        limitations.push('May need user permission for background audio');
      } else if (platform === 'android') {
        limitations.push('Requires proper Android permissions (already configured)');
        limitations.push('May need to handle battery optimization settings');
      }
    }

    return {
      isExpoGo,
      isStandalone,
      supportsBackgroundAudio,
      platform,
      backgroundAudioLimitations: limitations,
    };
  }

  public getEnvironmentInfo(): AudioEnvironmentInfo {
    return this.environmentInfo;
  }

  public logEnvironmentInfo(): void {
    const info = this.environmentInfo;
    console.log('🎵 Audio Environment Information:');
    console.log(`  - Platform: ${info.platform}`);
    console.log(`  - Expo Go: ${info.isExpoGo}`);
    console.log(`  - Standalone: ${info.isStandalone}`);
    console.log(`  - Background Audio Supported: ${info.supportsBackgroundAudio}`);
    console.log('  - Limitations:');
    info.backgroundAudioLimitations.forEach(limitation => {
      console.log(`    • ${limitation}`);
    });
  }

  public getBackgroundAudioWarning(): string | null {
    if (!this.environmentInfo.supportsBackgroundAudio) {
      if (this.environmentInfo.isExpoGo && this.environmentInfo.platform === 'ios') {
        return 'Background audio is not available in Expo Go on iOS. Build a standalone app for full background audio support.';
      }
      return 'Background audio may have limitations in this environment.';
    }
    return null;
  }

  public shouldShowBackgroundAudioWarning(): boolean {
    return !this.environmentInfo.supportsBackgroundAudio;
  }
}

export const audioEnvironment = AudioEnvironment.getInstance();
