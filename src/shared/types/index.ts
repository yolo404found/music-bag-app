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
  folderId: string; // ID of the folder this audio belongs to
}

// Folder/Playlist types
export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean; // true for "Downloads" folder
  audioCount: number; // cached count of audios in this folder
}

// Folder operations
export interface FolderOperation {
  type: 'create' | 'rename' | 'delete' | 'move_audio';
  folderId?: string;
  newName?: string;
  audioIds?: string[];
  targetFolderId?: string;
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

// Search parameters for the Search screen
export interface SearchParams {
  initialQuery?: string;
  searchMode?: 'search' | 'url';
  placeholder?: string;
  autoFocus?: boolean;
}

// Navigation types
export type TabParamList = {
  Home: undefined;
  Search: SearchParams | undefined;
  Library: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Search: SearchParams | undefined;
  Info: { metadata: AudioMetadata };
  Library: undefined;
  Playlist: { folderId: string };
  Player: { audio: DownloadedAudio };
};

// App state types
export interface AppState {
  downloadedAudios: DownloadedAudio[];
  folders: Folder[];
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
  FOLDERS: 'folders',
  PLAYER_POSITION: 'player_position',
  SETTINGS: 'settings',
} as const;

// Search-related types
export interface SearchRequest {
  query: string;
  maxResults?: number;
  region?: string;
}

export interface SearchResultItem {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: string;
  durationSec: number;
  thumbnail: string;
  url: string;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResultItem[];
  totalResults: number;
  nextPageToken?: string;
  error?: string;
}

// API endpoints
export const API_ENDPOINTS = {
  CHECK: '/api/check',
  DOWNLOAD: '/api/download',
  SEARCH: '/api/search',
} as const;

// File system paths
export const FILE_PATHS = {
  AUDIO_DIR: 'audio',
  TEMP_DIR: 'temp',
} as const;
