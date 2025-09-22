import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, SearchResultItem, SearchParams } from '../../shared/types';
import { useTheme } from '../../core/providers/ThemeProvider';
import SearchComponent from '../../shared/components/SearchComponent';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<SearchScreenRouteProp>();
  const { theme, themeMode } = useTheme();
  
  // Extract parameters from route
  const params = route.params;
  const initialQuery = params?.initialQuery || '';
  const searchMode = params?.searchMode || 'search';
  const placeholder = params?.placeholder || 'Search for music, artists, or songs...';
  const autoFocus = params?.autoFocus !== false; // Default to true

  const handleSelectResult = (result: SearchResultItem) => {
    // Convert SearchResultItem to AudioMetadata format
    const metadata = {
      id: result.videoId,
      title: result.title,
      duration: result.durationSec,
      thumbnail: result.thumbnail,
      isLive: false,
      license: 'standard' as const,
      canDownload: true,
      url: result.url,
    };

    // Navigate to info screen with the selected result
    navigation.navigate('Info', { metadata });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.colors.background} 
      />
      <SafeAreaView style={styles.safeArea}>
        <SearchComponent
          onSelectResult={handleSelectResult}
          onClose={handleClose}
          placeholder={placeholder}
          initialQuery={initialQuery}
          autoFocus={autoFocus}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
});

export default SearchScreen;