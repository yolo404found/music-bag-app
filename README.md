# Music Bag - Mobile App

A React Native mobile application for downloading and managing audio content from various platforms.

## Features

- **Multi-Platform Support**: Download audio from YouTube, SoundCloud, and Vimeo
- **Offline Library**: Store and manage downloaded audio files locally
- **Audio Player**: Built-in player with play/pause, seek, and playback speed controls
- **Smart Storage**: Efficient file management with metadata storage
- **Modern UI**: Clean, intuitive interface with Material Design principles

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Context + useReducer
- **Storage**: AsyncStorage for metadata, Expo FileSystem for files
- **Audio**: Expo AV for playback
- **HTTP Client**: Axios
- **Architecture**: Feature-Sliced Design (FSD)

## Project Structure

```
src/
├── app/                    # App-level configuration
│   ├── navigation/         # Navigation setup
│   └── providers/          # Context providers
├── features/               # Feature modules
│   ├── home/              # Home screen
│   ├── info/              # Audio info screen
│   ├── library/           # Library screen
│   └── player/            # Audio player screen
└── shared/                # Shared utilities
    ├── config/            # App configuration
    ├── services/          # API and storage services
    ├── types/             # TypeScript types
    └── utils/             # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd music_bag_app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Configuration

### Backend API

Update the API base URL in `src/shared/config/appConfig.ts`:

```typescript
api: {
  baseURL: __DEV__ 
    ? 'http://localhost:3000' 
    : 'https://your-production-backend-url.com',
}
```

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_NAME=Music Bag
```

## Features Overview

### Home Screen
- URL input with validation
- Recent URLs history
- Quick access to library
- Supported platforms information

### Info Screen
- Audio metadata display
- Download progress tracking
- Play button (if downloaded)
- License information

### Library Screen
- List of downloaded audio files
- Search and sort functionality
- File management (delete, play)
- Storage usage information

### Player Screen
- Full-screen audio player
- Play/pause, seek controls
- Playback speed adjustment
- Shuffle and repeat modes
- Position saving

## API Integration

The app communicates with the backend API for:

- **URL Validation**: `POST /api/check`
- **Audio Download**: `POST /api/download`

### API Endpoints

#### Check URL
```typescript
POST /api/check
{
  "url": "https://youtube.com/watch?v=..."
}

Response:
{
  "success": true,
  "data": {
    "id": "video_id",
    "title": "Video Title",
    "duration": 180,
    "thumbnail": "https://...",
    "isLive": false,
    "license": "youtube",
    "canDownload": true,
    "url": "https://..."
  }
}
```

#### Download Audio
```typescript
POST /api/download
{
  "url": "https://youtube.com/watch?v=..."
}

Response: Audio file stream (audio/mpeg)
```

## Storage

### File System
- Audio files stored in `FileSystem.documentDirectory/audio/`
- Files named as `{videoId}.mp3`
- Automatic cleanup of temporary files

### Metadata Storage
- Audio metadata stored in AsyncStorage
- Includes title, duration, thumbnail, file size, etc.
- Playback position tracking
- Favorites management

## Error Handling

Comprehensive error handling with:
- Network error recovery
- Storage error management
- Audio playback error handling
- User-friendly error messages
- Automatic retry mechanisms

## Performance Optimizations

- Lazy loading of audio files
- Efficient memory management
- Background download support
- Position caching
- Image optimization

## Testing

Run tests with:
```bash
npm test
```

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the repository or contact the development team.
