# Music Bag App - Search Feature Implementation

This document describes the search feature implementation in the Music Bag React Native application.

## Overview

The search feature allows users to search for music tracks without needing to provide a specific URL. Users can search by song title, artist name, or keywords, and the app will return a list of matching results that can be selected for download.

## Implementation Details

### 1. Types and Interfaces

**File:** `src/shared/types/index.ts`

Added search-related TypeScript interfaces:

```typescript
// Search request payload
export interface SearchRequest {
  query: string;
  maxResults?: number;
  region?: string;
}

// Individual search result item
export interface SearchResultItem {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: string;
  durationSec: number;
  thumbnail: string;
  url: string;
}

// Search API response
export interface SearchResponse {
  success: boolean;
  results: SearchResultItem[];
  totalResults: number;
  nextPageToken?: string;
  error?: string;
}
```

### 2. API Service Integration

**File:** `src/shared/services/apiService.ts`

Added search method to the existing API service:

```typescript
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
```

**Features:**
- Error handling with graceful fallbacks
- Support for backend response format adaptation
- Configurable maximum results
- Comprehensive logging

### 3. Search Component

**File:** `src/shared/components/SearchComponent.tsx`

Reusable search component with the following features:

- **Real-time search input** with search/cancel buttons
- **Results display** with thumbnails, titles, channels, and durations
- **Loading states** with activity indicators
- **Empty states** for no results and initial state
- **Error handling** with toast notifications
- **Duration formatting** for both seconds and MM:SS formats

**Key Functions:**
- `handleSearch()`: Performs the search API call
- `formatDuration()`: Converts duration to human-readable format
- `renderSearchResult()`: Renders individual search result items
- `renderEmptyState()`: Handles empty/loading states

### 4. Search Screen

**File:** `src/features/search/SearchScreen.tsx`

Dedicated full-screen search interface:

- Uses the reusable SearchComponent
- Handles result selection and navigation to Info screen
- Converts SearchResultItem to AudioMetadata format
- Provides close/back navigation

### 5. Navigation Integration

**Updated Files:**
- `src/shared/types/index.ts` - Added Search to RootStackParamList
- `src/core/navigation/AppNavigator.tsx` - Added Search screen to stack navigator
- `src/features/home/HomeScreen.tsx` - Added search button to quick actions

### 6. Home Screen Enhancement

**File:** `src/features/home/HomeScreen.tsx`

Updated the home screen to include:
- **Search Music** button in quick actions
- Updated subtitle to mention search functionality
- Better layout for the action buttons

## API Endpoint

The search feature connects to the backend API endpoint:

```
POST /api/search
```

**Request Body:**
```json
{
  \"query\": \"search terms\",
  \"maxResults\": 10
}
```

**Response Format:**
```json
{
  \"success\": true,
  \"results\": [
    {
      \"videoId\": \"abc123\",
      \"title\": \"Song Title\",
      \"channelTitle\": \"Artist Name\",
      \"duration\": \"3:45\",
      \"durationSec\": 225,
      \"thumbnail\": \"https://example.com/thumb.jpg\",
      \"url\": \"https://example.com/video\"
    }
  ],
  \"totalResults\": 100,
  \"nextPageToken\": \"optional_token\"
}
```

## Usage Flow

1. **Home Screen:** User taps \"Search Music\" button
2. **Search Screen:** User enters search query and taps \"Search\"
3. **API Call:** App sends search request to backend
4. **Results Display:** Search results are displayed with thumbnails and metadata
5. **Selection:** User taps on a result
6. **Info Screen:** User is navigated to the Info screen with selected track metadata
7. **Download:** User can proceed with download as usual

## Error Handling

- **Network Errors:** Display toast with connectivity message
- **API Errors:** Show specific error messages from backend
- **Empty Results:** Show \"No Results Found\" state with suggestions
- **Invalid Input:** Validate search query before making API calls

## Testing

Use the included test script to verify search functionality:

```bash
node test-search.js
```

This script tests the search API integration without requiring the full React Native environment.

## Integration with Existing Features

The search feature seamlessly integrates with existing app functionality:

- **Search results** → **Info screen** → **Download flow**
- **Toast notifications** for user feedback
- **Navigation system** for screen transitions
- **Existing API service** for backend communication
- **App theming** and styling consistency

## Future Enhancements

- **Search history:** Store and display recent search queries
- **Filters:** Add genre, duration, or quality filters
- **Infinite scroll:** Load more results with pagination
- **Offline search:** Cache popular search results
- **Voice search:** Add speech-to-text functionality
- **Search suggestions:** Auto-complete and search suggestions