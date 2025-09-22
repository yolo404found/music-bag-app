import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SearchResultItem, SearchResponse } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from '../../core/providers/ToastProvider';
import { useTheme } from '../../core/providers/ThemeProvider';
import * as PhosphorIcons from 'phosphor-react-native';
import { RefreshControl } from 'react-native-gesture-handler';

interface SearchComponentProps {
  onSelectResult: (result: SearchResultItem) => void;
  onClose?: () => void;
  placeholder?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  onSelectResult,
  onClose,
  placeholder = "Search for music...",
  initialQuery = '',
  autoFocus = true
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { showError } = useToast();
  const { theme } = useTheme();
  const searchInputRef = useRef<TextInput>(null);

  console.log('SearchComponent initialized with props:', { onSelectResult, onClose, placeholder, initialQuery, autoFocus });

  // Focus the input when component mounts if autoFocus is true
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Perform initial search if initialQuery is provided
  useEffect(() => {
    if (initialQuery.trim()) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]); // Only run on mount

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      showError('Invalid Input', 'Please enter a search query');
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      
      const response: SearchResponse = await apiService.search(searchQuery.trim(), 20);
      
      if (response.success) {
        setResults(response.results);
        if (response.results.length === 0) {
          // Don't show error for empty results, just show empty state
        }
      } else {
        showError('Search Failed', response.error || 'Failed to search for music');
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      showError('Network Error', 'Please check your connection and try again');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [showError]);

  const handleSearch = useCallback(() => {
    performSearch(query);
  }, [query, performSearch]);

  const formatDuration = (duration: string): string => {
    // If duration is already formatted (e.g., "3:45"), return as is
    if (duration.includes(':')) {
      return duration;
    }
    
    // If duration is in seconds, convert to MM:SS format
    const totalSeconds = parseInt(duration, 10);
    if (isNaN(totalSeconds)) return duration;
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSearchResult = ({ item }: { item: SearchResultItem }) => (
    <TouchableOpacity
      style={[styles.resultItem, { 
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border 
      }]}
      onPress={() => onSelectResult(item)}
    >
      <Image
        source={{ uri: item.thumbnail }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.resultChannel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {item.channelTitle}
        </Text>
        <Text style={[styles.resultDuration, { color: theme.colors.textSecondary }]}>
          {formatDuration(item.duration)}
        </Text>
      </View>
      <PhosphorIcons.CaretRight size={20} color={theme.colors.textSecondary} weight="regular" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isSearching) return null;
    
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <PhosphorIcons.MagnifyingGlass size={64} color={theme.colors.textSecondary} weight="light" />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>Search for Music</Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            Enter a song name, artist, or keywords to find music
          </Text>
        </View>
      );
    }
    
    if (results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <PhosphorIcons.MagnifyingGlass size={64} color={theme.colors.textSecondary} weight="light" />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Results Found</Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            Try different keywords or check your spelling
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.searchContainer, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border 
        }]}>
          <PhosphorIcons.MagnifyingGlass size={20} color={theme.colors.textSecondary} weight="regular" />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <PhosphorIcons.X size={20} color={theme.colors.textSecondary} weight="regular" />
            </TouchableOpacity>
          )}
        </View>
        
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Button */}
      <TouchableOpacity
        style={[
          styles.searchButton, 
          { backgroundColor: theme.colors.primary },
          (!query.trim() || isSearching) && styles.searchButtonDisabled
        ]}
        onPress={handleSearch}
        disabled={!query.trim() || isSearching}
      >
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>

      {/* Results */}
      <FlatList
        data={results}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.videoId}
        contentContainerStyle={styles.resultsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  closeButton: {
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultChannel: {
    fontSize: 14,
    marginBottom: 2,
  },
  resultDuration: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});

export default SearchComponent;