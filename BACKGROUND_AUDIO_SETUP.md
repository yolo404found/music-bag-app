# Background Audio Setup Guide

This guide explains how to enable background audio playback in your Music Bag app, including the limitations of Expo Go and how to build a standalone app for full functionality.

## Background Audio Limitations

### Expo Go Limitations
- **iOS**: Background audio playback is NOT available in Expo Go on iOS
- **Android**: Limited background audio support with inconsistent behavior
- **Solution**: Build a standalone app for reliable background audio

### Standalone App Benefits
- Full background audio support on both iOS and Android
- Proper audio session management
- Background task execution
- Media controls integration

## Current Configuration

The app has been configured with the following background audio settings:

### iOS Configuration (app.json)
```json
{
  "ios": {
    "backgroundModes": ["audio", "background-fetch", "background-processing"],
    "infoPlist": {
      "UIBackgroundModes": ["audio", "background-fetch", "background-processing"],
      "AVAudioSessionCategory": "playback",
      "AVAudioSessionCategoryOptions": ["allowBluetooth", "allowBluetoothA2DP", "mixWithOthers"],
      "AVAudioSessionMode": "default",
      "AVAudioSessionCategoryPlayback": true
    }
  }
}
```

### Android Configuration (app.json)
```json
{
  "android": {
    "permissions": [
      "android.permission.WAKE_LOCK",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "android.permission.ACCESS_NOTIFICATION_POLICY",
      "android.permission.MODIFY_AUDIO_SETTINGS"
    ],
    "intentFilters": [
      {
        "action": "android.intent.action.MEDIA_BUTTON",
        "category": "android.intent.category.DEFAULT"
      }
    ]
  }
}
```

## Building a Standalone App

### Prerequisites
1. Install EAS CLI:
   ```bash
   npm install -g @expo/eas-cli
   ```

2. Login to your Expo account:
   ```bash
   eas login
   ```

### Build Commands

#### For Development Build
```bash
# iOS development build
eas build --platform ios --profile development

# Android development build
eas build --platform android --profile development

# Both platforms
eas build --platform all --profile development
```

#### For Production Build
```bash
# iOS production build
eas build --platform ios --profile production

# Android production build
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

### EAS Configuration

Create or update `eas.json` in your project root:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Testing Background Audio

### In Expo Go
- **iOS**: Background audio will NOT work - audio stops when app goes to background
- **Android**: Limited background audio - may work inconsistently

### In Standalone App
- **iOS**: Full background audio support with proper audio session management
- **Android**: Reliable background audio with foreground service

## Code Implementation

The app includes platform detection and graceful fallbacks:

```typescript
import { audioEnvironment } from './src/shared/utils/audioEnvironment';

// Check if background audio is supported
const envInfo = audioEnvironment.getEnvironmentInfo();
if (envInfo.supportsBackgroundAudio) {
  // Enable background audio features
} else {
  // Show warning or disable background features
  const warning = audioEnvironment.getBackgroundAudioWarning();
  console.warn(warning);
}
```

## Audio Configuration

The app uses a complete audio configuration for optimal background playback:

### Audio Session Configuration
```typescript
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: supportsBackgroundAudio,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: true,
});
```

### Sound Creation with Background Support
```typescript
const { sound } = await Audio.Sound.createAsync(
  { uri: audio.localUri },
  { 
    shouldPlay: true,
    shouldStayActiveInBackground: supportsBackgroundAudio,
    isLooping: false,
    volume: 1.0,
    isMuted: false,
  },
  onPlaybackStatusUpdate
);
```

## Troubleshooting

### Common Issues

1. **Audio stops in background on iOS Expo Go**
   - This is expected behavior
   - Build standalone app for background audio

2. **Background audio not working in standalone app**
   - Check Info.plist configuration
   - Verify background modes are enabled
   - Test on physical device (not simulator)

3. **Android background audio inconsistent**
   - Check battery optimization settings
   - Ensure app has proper permissions
   - Test with different Android versions

### Debug Information

The app logs detailed information about audio environment:

```typescript
audioEnvironment.logEnvironmentInfo();
```

This will show:
- Platform information
- Expo Go vs Standalone status
- Background audio support status
- Known limitations

## Next Steps

1. **For Development**: Continue using Expo Go for UI development
2. **For Testing Background Audio**: Build development standalone app
3. **For Production**: Build production standalone app and submit to app stores

## Additional Resources

- [Expo Audio Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [iOS Background Modes](https://developer.apple.com/documentation/backgroundtasks/choosing_background_strategies_for_your_app)
- [Android Foreground Services](https://developer.android.com/guide/components/foreground-services)
