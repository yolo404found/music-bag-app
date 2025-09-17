// Supported platforms and their URL patterns
const SUPPORTED_PLATFORMS = {
  YOUTUBE: {
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
    ],
    name: 'YouTube',
  },
  SOUNDCLOUD: {
    patterns: [
      /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
      /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+/,
    ],
    name: 'SoundCloud',
  },
  VIMEO: {
    patterns: [
      /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
      /^https?:\/\/(www\.)?player\.vimeo\.com\/video\/\d+/,
    ],
    name: 'Vimeo',
  },
} as const;

export type SupportedPlatform = keyof typeof SUPPORTED_PLATFORMS;

class URLValidator {
  // Check if URL is valid
  isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Check if URL is supported
  isSupportedURL(url: string): boolean {
    if (!this.isValidURL(url)) {
      return false;
    }

    return Object.values(SUPPORTED_PLATFORMS).some(platform =>
      platform.patterns.some(pattern => pattern.test(url))
    );
  }

  // Get platform from URL
  getPlatform(url: string): SupportedPlatform | null {
    if (!this.isValidURL(url)) {
      return null;
    }

    for (const [platformName, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
      if (platform.patterns.some(pattern => pattern.test(url))) {
        return platformName as SupportedPlatform;
      }
    }

    return null;
  }

  // Normalize URL
  normalizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove www. prefix
      if (urlObj.hostname.startsWith('www.')) {
        urlObj.hostname = urlObj.hostname.substring(4);
      }
      
      // Ensure https protocol
      if (urlObj.protocol === 'http:') {
        urlObj.protocol = 'https:';
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  // Extract video ID from URL
  extractVideoId(url: string): string | null {
    const platform = this.getPlatform(url);
    
    if (!platform) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      
      switch (platform) {
        case 'YOUTUBE':
          // Extract from youtube.com/watch?v=ID
          if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
          }
          // Extract from youtu.be/ID
          if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.substring(1);
          }
          // Extract from youtube.com/embed/ID
          if (urlObj.pathname.startsWith('/embed/')) {
            return urlObj.pathname.substring(7);
          }
          // Extract from youtube.com/v/ID
          if (urlObj.pathname.startsWith('/v/')) {
            return urlObj.pathname.substring(3);
          }
          break;
          
        case 'SOUNDCLOUD':
          // SoundCloud URLs are more complex, return the full path
          return urlObj.pathname;
          
        case 'VIMEO':
          // Extract from vimeo.com/ID
          const match = urlObj.pathname.match(/\/(\d+)/);
          return match ? match[1] : null;
          
        default:
          return null;
      }
    } catch {
      return null;
    }
    
    return null;
  }

  // Validate and clean URL
  validateAndClean(url: string): {
    isValid: boolean;
    isSupported: boolean;
    platform: SupportedPlatform | null;
    videoId: string | null;
    cleanedUrl: string;
    error?: string;
  } {
    const result = {
      isValid: false,
      isSupported: false,
      platform: null as SupportedPlatform | null,
      videoId: null as string | null,
      cleanedUrl: url,
      error: undefined as string | undefined,
    };

    // Check if URL is valid
    if (!this.isValidURL(url)) {
      result.error = 'Invalid URL format';
      return result;
    }

    result.isValid = true;

    // Check if URL is supported
    if (!this.isSupportedURL(url)) {
      result.error = 'Unsupported platform. Please use YouTube, SoundCloud, or Vimeo.';
      return result;
    }

    result.isSupported = true;

    // Get platform
    result.platform = this.getPlatform(url);

    // Normalize URL
    result.cleanedUrl = this.normalizeURL(url);

    // Extract video ID
    result.videoId = this.extractVideoId(result.cleanedUrl);

    if (!result.videoId) {
      result.error = 'Could not extract video ID from URL';
    }

    return result;
  }

  // Get supported platforms list
  getSupportedPlatforms(): Array<{ name: string; key: SupportedPlatform }> {
    return Object.entries(SUPPORTED_PLATFORMS).map(([key, platform]) => ({
      name: platform.name,
      key: key as SupportedPlatform,
    }));
  }

  // Check if URL is a playlist
  isPlaylistURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // YouTube playlist
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('list')) {
        return true;
      }
      
      // SoundCloud playlist
      if (urlObj.hostname.includes('soundcloud.com') && urlObj.pathname.includes('/sets/')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  // Check if URL is a live stream
  isLiveStreamURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // YouTube live stream
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/live/')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

export const urlValidator = new URLValidator();
