import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadedAudio, STORAGE_KEYS } from '../types';

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
}

export const storageService = new StorageService();
