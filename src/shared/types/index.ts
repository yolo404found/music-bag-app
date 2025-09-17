// Audio metadata types
export interface AudioMetadata {
  id: string;
  title: string;
  duration: number; // in seconds
  thumbnail: string;
  isLive: boolean;
  license: string;
  canDownload: boolean;
  url: string;
}

// Downloaded audio file metadata
export interface DownloadedAudio {
  id: string;
  title: string;
  localUri: string;
  duration: number;
  thumbnail: string;
  createdAt: string;
  lastPlayed?: string;
  position: number; // playback position in seconds
  favorite: boolean;
  fileSize: number;
}

// API response types
export interface CheckResponse {
  success: boolean;
  data?: AudioMetadata;
  error?: string;
}

export interface DownloadResponse {
  success: boolean;
  data?: {
    filename: string;
    size: number;
  };
  error?: string;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Info: { metadata: AudioMetadata };
  Library: undefined;
  Player: { audio: DownloadedAudio };
};

// App state types
export interface AppState {
  downloadedAudios: DownloadedAudio[];
  isLoading: boolean;
  error: string | null;
}

// Player state types
export interface PlayerState {
  isPlaying: boolean;
  position: number;
  duration: number;
  currentAudio: DownloadedAudio | null;
  isBuffering: boolean;
}

// Download progress types
export interface DownloadProgress {
  videoId: string;
  progress: number; // 0-100
  status: 'downloading' | 'converting' | 'saving' | 'completed' | 'error';
  error?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Storage keys
export const STORAGE_KEYS = {
  DOWNLOADED_AUDIOS: 'downloaded_audios',
  PLAYER_POSITION: 'player_position',
  SETTINGS: 'settings',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  CHECK: '/api/check',
  DOWNLOAD: '/api/download',
} as const;

// File system paths
export const FILE_PATHS = {
  AUDIO_DIR: 'audio',
  TEMP_DIR: 'temp',
} as const;
