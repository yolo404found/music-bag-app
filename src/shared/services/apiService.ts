import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AudioMetadata, CheckResponse, DownloadResponse, SearchRequest, SearchResponse, API_ENDPOINTS } from '../types';
import { APP_CONFIG } from '../config/appConfig';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = APP_CONFIG.api.baseURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: APP_CONFIG.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        console.log('Request data:', config.data);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

      // Add response interceptor for error handling
      this.client.interceptors.response.use(
        (response) => {
          console.log(`API Response: ${response.status} ${response.config.url}`);
          if (response.config.url?.includes('/download')) {
            console.log('📱 MOBILE: Download response received!');
            console.log('📱 MOBILE: Response data type:', typeof response.data);
            console.log('📱 MOBILE: Response constructor:', response.data?.constructor?.name);
            console.log('📱 MOBILE: Is Blob?', response.data instanceof Blob);
            console.log('📱 MOBILE: Response data size:', response.data?.size || 'unknown');
            console.log('📱 MOBILE: Response data size (MB):', response.data?.size ? (response.data.size / 1024 / 1024).toFixed(2) + ' MB' : 'unknown');
            console.log('📱 MOBILE: Response headers:', response.headers);
            console.log('📱 MOBILE: Content-Type:', response.headers['content-type']);
            console.log('📱 MOBILE: Content-Length:', response.headers['content-length']);
          } else {
            console.log('Response data:', response.data);
          }
          return response;
        },
      (error) => {
        console.error('API Response Error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  // Check if URL is valid and get metadata
  async checkUrl(url: string): Promise<CheckResponse> {
    try {
      const response: AxiosResponse<CheckResponse> = await this.client.post(
        API_ENDPOINTS.CHECK,
        { url }
      );
      return response.data;
    } catch (error) {
      console.error('Error checking URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Download audio file
  async downloadAudio(url: string, onProgress?: (progress: number) => void): Promise<DownloadResponse> {
    try {
      console.log('📥 Starting download request to:', this.baseURL + API_ENDPOINTS.DOWNLOAD);
      console.log('📥 Request URL:', url);
      
      const response = await this.client.post(
        API_ENDPOINTS.DOWNLOAD,
        { url },
        {
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log('📥 Download progress:', progress + '%');
              onProgress(progress);
            }
          },
        }
      );

      // Extract filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'audio.mp3';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        success: true,
        data: response.data, // Return the actual blob data
      };
    } catch (error) {
      console.error('Error downloading audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  // Search for music/audio content
  async search(query: string, maxResults: number = 10): Promise<SearchResponse> {
    try {
      const request: SearchRequest = { query, maxResults };
      const response: AxiosResponse<any> = await this.client.post(
        API_ENDPOINTS.SEARCH,
        request
      );
      
      // Handle nested response format from backend if needed
      const data = response.data.data || response.data;
      
      return {
        success: data.success || true,
        results: data.results || [],
        totalResults: data.totalResults || 0,
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      console.error('Error searching:', error);
      return {
        success: false,
        results: [],
        totalResults: 0,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }

  // Get audio stream for streaming playback
  async getAudioStream(url: string): Promise<string> {
    try {
      const response = await this.client.post(
        API_ENDPOINTS.DOWNLOAD,
        { url },
        {
          responseType: 'blob',
        }
      );

      // Convert blob to object URL for streaming
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error getting audio stream:', error);
      throw error;
    }
  }

  // Handle API errors
  private handleError(error: any): Error {
    if (error?.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.data?.message || 'Server error';
      return new Error(`${error.response.status}: ${message}`);
    } else if (error?.request) {
      // Request was made but no response received
      return new Error('Network error: Unable to connect to server');
    } else {
      // Something else happened
      return new Error(error?.message || 'Unknown error occurred');
    }
  }

  // Update base URL (useful for switching between dev/prod)
  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    this.client.defaults.baseURL = newBaseURL;
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL;
  }
}

export const apiService = new ApiService();
