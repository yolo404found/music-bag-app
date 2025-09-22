import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadedAudio, Folder, STORAGE_KEYS } from '../types';

class StorageService {
  // Get all downloaded audios
  async getDownloadedAudios(): Promise<DownloadedAudio[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_AUDIOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting downloaded audios:', error);
      return [];
    }
  }

  // Save downloaded audio
  async saveDownloadedAudio(audio: DownloadedAudio): Promise<void> {
    try {
      const audios = await this.getDownloadedAudios();
      const existingIndex = audios.findIndex(a => a.id === audio.id);
      
      if (existingIndex >= 0) {
        audios[existingIndex] = audio;
      } else {
        audios.push(audio);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AUDIOS, JSON.stringify(audios));
    } catch (error) {
      console.error('Error saving downloaded audio:', error);
      throw error;
    }
  }

  // Remove downloaded audio
  async removeDownloadedAudio(audioId: string): Promise<void> {
    try {
      const audios = await this.getDownloadedAudios();
      const filteredAudios = audios.filter(a => a.id !== audioId);
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AUDIOS, JSON.stringify(filteredAudios));
    } catch (error) {
      console.error('Error removing downloaded audio:', error);
      throw error;
    }
  }

  // Update audio metadata
  async updateAudioMetadata(audioId: string, updates: Partial<DownloadedAudio>): Promise<void> {
    try {
      const audios = await this.getDownloadedAudios();
      const audioIndex = audios.findIndex(a => a.id === audioId);
      
      if (audioIndex >= 0) {
        audios[audioIndex] = { ...audios[audioIndex], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AUDIOS, JSON.stringify(audios));
      }
    } catch (error) {
      console.error('Error updating audio metadata:', error);
      throw error;
    }
  }

  // Get audio by ID
  async getAudioById(audioId: string): Promise<DownloadedAudio | null> {
    try {
      const audios = await this.getDownloadedAudios();
      return audios.find(a => a.id === audioId) || null;
    } catch (error) {
      console.error('Error getting audio by ID:', error);
      return null;
    }
  }

  // Save player position
  async savePlayerPosition(audioId: string, position: number): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.PLAYER_POSITION}_${audioId}`;
      await AsyncStorage.setItem(key, position.toString());
    } catch (error) {
      console.error('Error saving player position:', error);
    }
  }

  // Get player position
  async getPlayerPosition(audioId: string): Promise<number> {
    try {
      const key = `${STORAGE_KEYS.PLAYER_POSITION}_${audioId}`;
      const position = await AsyncStorage.getItem(key);
      return position ? parseFloat(position) : 0;
    } catch (error) {
      console.error('Error getting player position:', error);
      return 0;
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.DOWNLOADED_AUDIOS,
        STORAGE_KEYS.FOLDERS,
        STORAGE_KEYS.PLAYER_POSITION,
        STORAGE_KEYS.SETTINGS,
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{ totalAudios: number; totalSize: number }> {
    try {
      const audios = await this.getDownloadedAudios();
      const totalSize = audios.reduce((sum, audio) => sum + audio.fileSize, 0);
      return {
        totalAudios: audios.length,
        totalSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalAudios: 0, totalSize: 0 };
    }
  }

  // Folder management functions
  async getFolders(): Promise<Folder[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting folders:', error);
      return [];
    }
  }

  async saveFolders(folders: Folder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    } catch (error) {
      console.error('Error saving folders:', error);
      throw error;
    }
  }

  async createFolder(name: string): Promise<Folder> {
    try {
      const folders = await this.getFolders();
      const newFolder: Folder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
        audioCount: 0,
      };
      
      folders.push(newFolder);
      await this.saveFolders(folders);
      return newFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
    try {
      const folders = await this.getFolders();
      const folderIndex = folders.findIndex(f => f.id === folderId);
      
      if (folderIndex >= 0) {
        folders[folderIndex] = { 
          ...folders[folderIndex], 
          ...updates, 
          updatedAt: new Date().toISOString() 
        };
        await this.saveFolders(folders);
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      const folders = await this.getFolders();
      const folder = folders.find(f => f.id === folderId);
      
      if (folder?.isDefault) {
        throw new Error('Cannot delete default folder');
      }
      
      // Move all audios in this folder to Downloads folder
      const audios = await this.getDownloadedAudios();
      const downloadsFolder = folders.find(f => f.isDefault);
      
      if (downloadsFolder) {
        const updatedAudios = audios.map(audio => 
          audio.folderId === folderId ? { ...audio, folderId: downloadsFolder.id } : audio
        );
        await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AUDIOS, JSON.stringify(updatedAudios));
      }
      
      // Remove folder
      const filteredFolders = folders.filter(f => f.id !== folderId);
      await this.saveFolders(filteredFolders);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  async moveAudiosToFolder(audioIds: string[], targetFolderId: string): Promise<void> {
    try {
      const audios = await this.getDownloadedAudios();
      const updatedAudios = audios.map(audio => 
        audioIds.includes(audio.id) ? { ...audio, folderId: targetFolderId } : audio
      );
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AUDIOS, JSON.stringify(updatedAudios));
      
      // Update folder audio counts
      await this.updateFolderAudioCounts();
    } catch (error) {
      console.error('Error moving audios to folder:', error);
      throw error;
    }
  }

  async updateFolderAudioCounts(): Promise<void> {
    try {
      const folders = await this.getFolders();
      let audios = await this.getDownloadedAudios();
      
      // Check for duplicate audio IDs and clean them up
      const audioIds = audios.map(a => a.id);
      const uniqueAudioIds = [...new Set(audioIds)];
      if (audioIds.length !== uniqueAudioIds.length) {
        console.warn('⚠️ Found duplicate audio IDs in storage! Cleaning up...');
        
        // Remove duplicates by keeping only the first occurrence
        const seenIds = new Set();
        audios = audios.filter(audio => {
          if (seenIds.has(audio.id)) {
            return false;
          }
          seenIds.add(audio.id);
          return true;
        });
        
        // Save cleaned audios back to storage
        await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AUDIOS, JSON.stringify(audios));
        console.log('✅ Duplicate audios removed from storage');
      }
      
      const updatedFolders = folders.map(folder => {
        const folderAudios = audios.filter(audio => audio.folderId === folder.id);
        
        return {
          ...folder,
          audioCount: folderAudios.length,
        };
      });
      
      await this.saveFolders(updatedFolders);
    } catch (error) {
      console.error('Error updating folder audio counts:', error);
      throw error;
    }
  }

  async getAudiosByFolder(folderId: string): Promise<DownloadedAudio[]> {
    try {
      const audios = await this.getDownloadedAudios();
      return audios.filter(audio => audio.folderId === folderId);
    } catch (error) {
      console.error('Error getting audios by folder:', error);
      return [];
    }
  }

  async initializeDefaultFolder(): Promise<Folder> {
    try {
      const folders = await this.getFolders();
      let downloadsFolder = folders.find(f => f.isDefault);
      
      if (!downloadsFolder) {
        downloadsFolder = {
          id: 'downloads_default',
          name: 'Downloads',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true,
          audioCount: 0,
        };
        folders.push(downloadsFolder);
        await this.saveFolders(folders);
      }
      
      return downloadsFolder;
    } catch (error) {
      console.error('Error initializing default folder:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
