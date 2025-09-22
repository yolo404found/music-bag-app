import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, DownloadedAudio, PlayerState, AppError, Folder } from '../../shared/types';
import { storageService } from '../../shared/services/storageService';
import { AudioProvider } from './AudioProvider';
import { ToastProvider } from './ToastProvider';

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DOWNLOADED_AUDIOS'; payload: DownloadedAudio[] }
  | { type: 'ADD_DOWNLOADED_AUDIO'; payload: DownloadedAudio }
  | { type: 'UPDATE_DOWNLOADED_AUDIO'; payload: DownloadedAudio }
  | { type: 'REMOVE_DOWNLOADED_AUDIO'; payload: string }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: Folder }
  | { type: 'REMOVE_FOLDER'; payload: string }
  | { type: 'CLEAR_ERROR' };

type PlayerAction =
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_POSITION'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_CURRENT_AUDIO'; payload: DownloadedAudio | null }
  | { type: 'SET_BUFFERING'; payload: boolean }
  | { type: 'RESET_PLAYER' };

// Initial states
const initialAppState: AppState = {
  downloadedAudios: [],
  folders: [],
  isLoading: false,
  error: null,
};

const initialPlayerState: PlayerState = {
  isPlaying: false,
  position: 0,
  duration: 0,
  currentAudio: null,
  isBuffering: false,
};

// Reducers
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DOWNLOADED_AUDIOS':
      return { ...state, downloadedAudios: action.payload };
    case 'ADD_DOWNLOADED_AUDIO':
      return {
        ...state,
        downloadedAudios: [...state.downloadedAudios, action.payload],
      };
    case 'UPDATE_DOWNLOADED_AUDIO':
      return {
        ...state,
        downloadedAudios: state.downloadedAudios.map(audio =>
          audio.id === action.payload.id ? action.payload : audio
        ),
      };
    case 'REMOVE_DOWNLOADED_AUDIO':
      return {
        ...state,
        downloadedAudios: state.downloadedAudios.filter(audio => audio.id !== action.payload),
      };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'ADD_FOLDER':
      return {
        ...state,
        folders: [...state.folders, action.payload],
      };
    case 'UPDATE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(folder =>
          folder.id === action.payload.id ? action.payload : folder
        ),
      };
    case 'REMOVE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter(folder => folder.id !== action.payload),
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const playerReducer = (state: PlayerState, action: PlayerAction): PlayerState => {
  switch (action.type) {
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_POSITION':
      return { ...state, position: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_CURRENT_AUDIO':
      return { ...state, currentAudio: action.payload };
    case 'SET_BUFFERING':
      return { ...state, isBuffering: action.payload };
    case 'RESET_PLAYER':
      return initialPlayerState;
    default:
      return state;
  }
};

// Context types
interface AppContextType {
  appState: AppState;
  playerState: PlayerState;
  dispatch: React.Dispatch<AppAction>;
  playerDispatch: React.Dispatch<PlayerAction>;
  // App actions
  loadDownloadedAudios: () => Promise<void>;
  addDownloadedAudio: (audio: DownloadedAudio) => Promise<void>;
  updateDownloadedAudio: (audio: DownloadedAudio) => Promise<void>;
  removeDownloadedAudio: (audioId: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
  // Folder actions
  loadFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveAudiosToFolder: (audioIds: string[], targetFolderId: string) => Promise<void>;
  getAudiosByFolder: (folderId: string) => DownloadedAudio[];
  // Player actions
  playAudio: (audio: DownloadedAudio) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  seekTo: (position: number) => void;
  stopAudio: () => void;
}

// Create contexts
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const [playerState, playerDispatch] = useReducer(playerReducer, initialPlayerState);

  // Load downloaded audios and folders on app start
  useEffect(() => {
    loadDownloadedAudios();
    loadFolders();
  }, []);

  // App actions
  const loadDownloadedAudios = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const audios = await storageService.getDownloadedAudios();
      dispatch({ type: 'SET_DOWNLOADED_AUDIOS', payload: audios });
    } catch (error) {
      console.error('Error loading downloaded audios:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load library' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addDownloadedAudio = async (audio: DownloadedAudio): Promise<void> => {
    try {
      await storageService.saveDownloadedAudio(audio);
      dispatch({ type: 'ADD_DOWNLOADED_AUDIO', payload: audio });
    } catch (error) {
      console.error('Error adding downloaded audio:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save audio' });
      throw error;
    }
  };

  const updateDownloadedAudio = async (audio: DownloadedAudio): Promise<void> => {
    try {
      await storageService.saveDownloadedAudio(audio);
      dispatch({ type: 'UPDATE_DOWNLOADED_AUDIO', payload: audio });
    } catch (error) {
      console.error('Error updating downloaded audio:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update audio' });
      throw error;
    }
  };

  const removeDownloadedAudio = async (audioId: string): Promise<void> => {
    try {
      await storageService.removeDownloadedAudio(audioId);
      dispatch({ type: 'REMOVE_DOWNLOADED_AUDIO', payload: audioId });
      
      // Update folder counts after removing audio
      await storageService.updateFolderAudioCounts();
      const folders = await storageService.getFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (error) {
      console.error('Error removing downloaded audio:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove audio' });
      throw error;
    }
  };

  const setError = (error: string | null): void => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Folder actions
  const loadFolders = async (): Promise<void> => {
    try {
      const folders = await storageService.getFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
      
      // Initialize default folder if it doesn't exist
      if (folders.length === 0) {
        const defaultFolder = await storageService.initializeDefaultFolder();
        dispatch({ type: 'ADD_FOLDER', payload: defaultFolder });
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load folders' });
    }
  };

  const createFolder = async (name: string): Promise<Folder> => {
    try {
      const folder = await storageService.createFolder(name);
      dispatch({ type: 'ADD_FOLDER', payload: folder });
      return folder;
    } catch (error) {
      console.error('Error creating folder:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create folder' });
      throw error;
    }
  };

  const updateFolder = async (folderId: string, updates: Partial<Folder>): Promise<void> => {
    try {
      await storageService.updateFolder(folderId, updates);
      const folders = await storageService.getFolders();
      const updatedFolder = folders.find(f => f.id === folderId);
      if (updatedFolder) {
        dispatch({ type: 'UPDATE_FOLDER', payload: updatedFolder });
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update folder' });
      throw error;
    }
  };

  const deleteFolder = async (folderId: string): Promise<void> => {
    try {
      await storageService.deleteFolder(folderId);
      dispatch({ type: 'REMOVE_FOLDER', payload: folderId });
      
      // Reload audios to reflect the folder changes
      await loadDownloadedAudios();
    } catch (error) {
      console.error('Error deleting folder:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete folder' });
      throw error;
    }
  };

  const moveAudiosToFolder = async (audioIds: string[], targetFolderId: string): Promise<void> => {
    try {
      await storageService.moveAudiosToFolder(audioIds, targetFolderId);
      
      // Update the audios in state
      const updatedAudios = appState.downloadedAudios.map(audio =>
        audioIds.includes(audio.id) ? { ...audio, folderId: targetFolderId } : audio
      );
      dispatch({ type: 'SET_DOWNLOADED_AUDIOS', payload: updatedAudios });
      
      // Update folder counts
      await storageService.updateFolderAudioCounts();
      const folders = await storageService.getFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (error) {
      console.error('Error moving audios to folder:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to move audios' });
      throw error;
    }
  };

  const getAudiosByFolder = (folderId: string): DownloadedAudio[] => {
    return appState.downloadedAudios.filter(audio => audio.folderId === folderId);
  };

  // Player actions
  const playAudio = (audio: DownloadedAudio): void => {
    playerDispatch({ type: 'SET_CURRENT_AUDIO', payload: audio });
    playerDispatch({ type: 'SET_PLAYING', payload: true });
    playerDispatch({ type: 'SET_DURATION', payload: audio.duration });
  };

  const pauseAudio = (): void => {
    playerDispatch({ type: 'SET_PLAYING', payload: false });
  };

  const resumeAudio = (): void => {
    playerDispatch({ type: 'SET_PLAYING', payload: true });
  };

  const seekTo = (position: number): void => {
    playerDispatch({ type: 'SET_POSITION', payload: position });
  };

  const stopAudio = (): void => {
    playerDispatch({ type: 'RESET_PLAYER' });
  };

  const contextValue: AppContextType = {
    appState,
    playerState,
    dispatch,
    playerDispatch,
    loadDownloadedAudios,
    addDownloadedAudio,
    updateDownloadedAudio,
    removeDownloadedAudio,
    setError,
    clearError,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveAudiosToFolder,
    getAudiosByFolder,
    playAudio,
    pauseAudio,
    resumeAudio,
    seekTo,
    stopAudio,
  };

  return (
    <ToastProvider>
      <AudioProvider>
        <AppContext.Provider value={contextValue}>
          {children}
        </AppContext.Provider>
      </AudioProvider>
    </ToastProvider>
  );
};

// Custom hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
