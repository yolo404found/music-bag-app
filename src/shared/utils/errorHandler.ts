import { AppError } from '../types';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  AUDIO = 'AUDIO',
  DOWNLOAD = 'DOWNLOAD',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

// Error codes
export enum ErrorCode {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION = 'NETWORK_CONNECTION',
  NETWORK_SERVER = 'NETWORK_SERVER',
  
  // Storage errors
  STORAGE_READ = 'STORAGE_READ',
  STORAGE_WRITE = 'STORAGE_WRITE',
  STORAGE_DELETE = 'STORAGE_DELETE',
  STORAGE_FULL = 'STORAGE_FULL',
  
  // Audio errors
  AUDIO_LOAD = 'AUDIO_LOAD',
  AUDIO_PLAY = 'AUDIO_PLAY',
  AUDIO_FORMAT = 'AUDIO_FORMAT',
  
  // Download errors
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DOWNLOAD_CANCELLED = 'DOWNLOAD_CANCELLED',
  DOWNLOAD_INVALID_URL = 'DOWNLOAD_INVALID_URL',
  DOWNLOAD_LICENSE = 'DOWNLOAD_LICENSE',
  
  // Validation errors
  VALIDATION_URL = 'VALIDATION_URL',
  VALIDATION_METADATA = 'VALIDATION_METADATA',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

class ErrorHandler {
  // Create standardized error
  createError(
    code: ErrorCode,
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    details?: any
  ): AppError {
    return {
      code,
      message,
      details,
    };
  }

  // Handle network errors
  handleNetworkError(error: any): AppError {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return this.createError(
        ErrorCode.NETWORK_TIMEOUT,
        'Request timed out. Please check your connection.',
        ErrorType.NETWORK
      );
    }

    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return this.createError(
        ErrorCode.NETWORK_CONNECTION,
        'Network error. Please check your internet connection.',
        ErrorType.NETWORK
      );
    }

    if (error.response?.status) {
      return this.createError(
        ErrorCode.NETWORK_SERVER,
        `Server error: ${error.response.status}`,
        ErrorType.NETWORK,
        { status: error.response.status, data: error.response.data }
      );
    }

    return this.createError(
      ErrorCode.NETWORK_CONNECTION,
      'Network error occurred',
      ErrorType.NETWORK,
      error
    );
  }

  // Handle storage errors
  handleStorageError(error: any, operation: 'read' | 'write' | 'delete'): AppError {
    const code = operation === 'read' ? ErrorCode.STORAGE_READ :
                 operation === 'write' ? ErrorCode.STORAGE_WRITE :
                 ErrorCode.STORAGE_DELETE;

    let message = `Storage ${operation} error`;
    
    if (error.message?.includes('quota')) {
      return this.createError(
        ErrorCode.STORAGE_FULL,
        'Storage is full. Please free up space.',
        ErrorType.STORAGE
      );
    }

    return this.createError(
      code,
      message,
      ErrorType.STORAGE,
      error
    );
  }

  // Handle audio errors
  handleAudioError(error: any, operation: 'load' | 'play'): AppError {
    const code = operation === 'load' ? ErrorCode.AUDIO_LOAD : ErrorCode.AUDIO_PLAY;
    
    let message = `Audio ${operation} error`;
    
    if (error.message?.includes('format') || error.message?.includes('codec')) {
      return this.createError(
        ErrorCode.AUDIO_FORMAT,
        'Unsupported audio format',
        ErrorType.AUDIO
      );
    }

    return this.createError(
      code,
      message,
      ErrorType.AUDIO,
      error
    );
  }

  // Handle download errors
  handleDownloadError(error: any): AppError {
    if (error.message?.includes('cancelled') || error.name === 'AbortError') {
      return this.createError(
        ErrorCode.DOWNLOAD_CANCELLED,
        'Download was cancelled',
        ErrorType.DOWNLOAD
      );
    }

    if (error.message?.includes('invalid') || error.message?.includes('URL')) {
      return this.createError(
        ErrorCode.DOWNLOAD_INVALID_URL,
        'Invalid URL provided',
        ErrorType.DOWNLOAD
      );
    }

    if (error.message?.includes('license') || error.message?.includes('restricted')) {
      return this.createError(
        ErrorCode.DOWNLOAD_LICENSE,
        'Download not allowed due to licensing restrictions',
        ErrorType.DOWNLOAD
      );
    }

    return this.createError(
      ErrorCode.DOWNLOAD_FAILED,
      'Download failed',
      ErrorType.DOWNLOAD,
      error
    );
  }

  // Handle validation errors
  handleValidationError(field: string, value: any): AppError {
    if (field === 'url') {
      return this.createError(
        ErrorCode.VALIDATION_URL,
        'Invalid URL format',
        ErrorType.VALIDATION,
        { field, value }
      );
    }

    return this.createError(
      ErrorCode.VALIDATION_METADATA,
      `Invalid ${field}`,
      ErrorType.VALIDATION,
      { field, value }
    );
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case ErrorCode.NETWORK_TIMEOUT:
        return 'Request timed out. Please try again.';
      case ErrorCode.NETWORK_CONNECTION:
        return 'No internet connection. Please check your network.';
      case ErrorCode.NETWORK_SERVER:
        return 'Server error. Please try again later.';
      case ErrorCode.STORAGE_FULL:
        return 'Storage is full. Please free up space.';
      case ErrorCode.STORAGE_READ:
        return 'Failed to read data. Please try again.';
      case ErrorCode.STORAGE_WRITE:
        return 'Failed to save data. Please try again.';
      case ErrorCode.STORAGE_DELETE:
        return 'Failed to delete data. Please try again.';
      case ErrorCode.AUDIO_LOAD:
        return 'Failed to load audio. Please try again.';
      case ErrorCode.AUDIO_PLAY:
        return 'Failed to play audio. Please try again.';
      case ErrorCode.AUDIO_FORMAT:
        return 'Unsupported audio format.';
      case ErrorCode.DOWNLOAD_FAILED:
        return 'Download failed. Please try again.';
      case ErrorCode.DOWNLOAD_CANCELLED:
        return 'Download was cancelled.';
      case ErrorCode.DOWNLOAD_INVALID_URL:
        return 'Invalid URL. Please check the link.';
      case ErrorCode.DOWNLOAD_LICENSE:
        return 'Download not allowed due to licensing restrictions.';
      case ErrorCode.VALIDATION_URL:
        return 'Please enter a valid URL.';
      case ErrorCode.VALIDATION_METADATA:
        return 'Invalid data provided.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Log error for debugging
  logError(error: AppError, context?: string): void {
    const logMessage = context 
      ? `[${context}] ${error.code}: ${error.message}`
      : `${error.code}: ${error.message}`;
    
    console.error(logMessage, error.details);
    
    // In production, you might want to send this to a crash reporting service
    // Example: crashlytics().recordError(error);
  }
}

export const errorHandler = new ErrorHandler();
