import * as FileSystem from 'expo-file-system/legacy';
import { DownloadedAudio, FILE_PATHS } from '../types';

class FileSystemService {
  private audioDir: string = '';
  private tempDir: string = '';
  private initialized: boolean = false;

  constructor() {
    this.initializeDirectories();
  }

  // Initialize required directories
  private async initializeDirectories(): Promise<void> {
    try {
      // Set the directory paths using FileSystem.documentDirectory
      this.audioDir = `${FileSystem.documentDirectory}${FILE_PATHS.AUDIO_DIR}/`;
      this.tempDir = `${FileSystem.documentDirectory}${FILE_PATHS.TEMP_DIR}/`;

      const audioDirInfo = await FileSystem.getInfoAsync(this.audioDir);
      if (!audioDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.audioDir, { intermediates: true });
      }

      const tempDirInfo = await FileSystem.getInfoAsync(this.tempDir);
      if (!tempDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.tempDir, { intermediates: true });
      }

      this.initialized = true;
      console.log('FileSystem directories initialized:', { audioDir: this.audioDir, tempDir: this.tempDir });
    } catch (error) {
      console.error('Error initializing directories:', error);
    }
  }

  // Ensure service is initialized
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeDirectories();
    }
  }

  // Get audio file path
  getAudioFilePath(videoId: string): string {
    return `${this.audioDir}${videoId}.mp3`;
  }

  // Get temp file path
  getTempFilePath(filename: string): string {
    return `${this.tempDir}${filename}`;
  }

  // Save audio file from URL
  async saveAudioFromUrl(url: string, videoId: string, onProgress?: (progress: number) => void): Promise<string> {
    try {
      await this.ensureInitialized();
      const fileUri = this.getAudioFilePath(videoId);
      
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      if (downloadResult.status === 200) {
        return downloadResult.uri;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error saving audio from URL:', error);
      throw error;
    }
  }

        // Save audio file from blob
        async saveAudioFromBlob(blob: Blob, videoId: string): Promise<string> {
          try {
            console.log('💾 MOBILE: Saving real audio from blob for videoId:', videoId);
            await this.ensureInitialized();
            const fileUri = this.getAudioFilePath(videoId);
            
            console.log('💾 MOBILE: File path:', fileUri);
            console.log('💾 MOBILE: Blob info:', {
              size: blob.size,
              type: blob.type,
              sizeMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB'
            });
            
            // Convert blob to base64
            console.log('💾 MOBILE: Converting blob to base64...');
            const base64 = await this.blobToBase64(blob);
            console.log('💾 MOBILE: Base64 data length:', base64.length);
            console.log('💾 MOBILE: Base64 data length (MB):', (base64.length / 1024 / 1024).toFixed(2) + ' MB');
            
            // Save base64 to file
            console.log('💾 MOBILE: Writing base64 to file...');
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Verify file was created
            console.log('💾 MOBILE: Verifying saved file...');
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            console.log('💾 MOBILE: Real audio file created successfully:', {
              exists: fileInfo.exists,
              size: fileInfo.size,
              sizeMB: fileInfo.size ? (fileInfo.size / 1024 / 1024).toFixed(2) + ' MB' : 'unknown',
              uri: fileInfo.uri
            });

            if (fileInfo.size && fileInfo.size < 10000) {
              console.log('⚠️ MOBILE: WARNING - File size is very small! This might be a problem.');
            }

            return fileUri;
          } catch (error) {
            console.error('💾 MOBILE: Error saving audio from blob:', error);
            throw error;
          }
        }

  // Save mock audio file for testing
  async saveMockAudio(base64Data: string, videoId: string): Promise<string> {
    try {
      console.log('💾 Saving mock audio for videoId:', videoId);
      await this.ensureInitialized();
      const fileUri = this.getAudioFilePath(videoId);
      
      console.log('💾 File path:', fileUri);
      console.log('💾 Base64 data length:', base64Data.length);
      
      // Save base64 to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('💾 File created successfully:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: fileInfo.uri
      });

      return fileUri;
    } catch (error) {
      console.error('💾 Error saving mock audio:', error);
      throw error;
    }
  }

  // Convert blob to base64
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Check if audio file exists
  async audioFileExists(videoId: string): Promise<boolean> {
    try {
      const fileUri = this.getAudioFilePath(videoId);
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking audio file existence:', error);
      return false;
    }
  }

  // Get audio file info
  async getAudioFileInfo(videoId: string): Promise<FileSystem.FileInfo | null> {
    try {
      const fileUri = this.getAudioFilePath(videoId);
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists ? fileInfo : null;
    } catch (error) {
      console.error('Error getting audio file info:', error);
      return null;
    }
  }

  // Delete audio file
  async deleteAudioFile(videoId: string): Promise<void> {
    try {
      const fileUri = this.getAudioFilePath(videoId);
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch (error) {
      console.error('Error deleting audio file:', error);
      throw error;
    }
  }

  // Get all audio files
  async getAllAudioFiles(): Promise<FileSystem.FileInfo[]> {
    try {
      const audioDirInfo = await FileSystem.getInfoAsync(this.audioDir);
      if (!audioDirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(this.audioDir);
      const audioFiles: FileSystem.FileInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const fileUri = `${this.audioDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            audioFiles.push(fileInfo);
          }
        }
      }

      return audioFiles;
    } catch (error) {
      console.error('Error getting all audio files:', error);
      return [];
    }
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    try {
      const audioFiles = await this.getAllAudioFiles();
      const used = audioFiles.reduce((total, file) => total + (file.size || 0), 0);
      
      // Get available space (this is an approximation)
      const available = await FileSystem.getFreeDiskStorageAsync();
      
      return { used, available };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, available: 0 };
    }
  }

  // Clean up temp files
  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDirInfo = await FileSystem.getInfoAsync(this.tempDir);
      if (tempDirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(this.tempDir);
        for (const file of files) {
          const fileUri = `${this.tempDir}${file}`;
          await FileSystem.deleteAsync(fileUri);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Get audio directory path
  getAudioDirectory(): string {
    return this.audioDir;
  }

  // Get temp directory path
  getTempDirectory(): string {
    return this.tempDir;
  }
}

export const fileSystemService = new FileSystemService();
