import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DownloadedAudio } from '../../shared/types';
import { useApp } from '../../core/providers/AppProvider';
import { useAudio } from '../../core/providers/AudioProvider';
import { useToast } from '../../core/providers/ToastProvider';
import { fileSystemService } from '../../shared/services/fileSystemService';
import * as PhosphorIcons from 'phosphor-react-native';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Library'>;

const { width } = Dimensions.get('window');

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const { appState, removeDownloadedAudio, loadDownloadedAudios } = useApp();
  const { 
    currentAudio: globalCurrentAudio, 
    isPlaying: globalIsPlaying,
    playAudio: globalPlayAudio,
    pauseAudio: globalPauseAudio,
    resumeAudio: globalResumeAudio
  } = useAudio();
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'duration'>('date');
  const [filteredAudios, setFilteredAudios] = useState<DownloadedAudio[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter and sort audios
  useEffect(() => {
    let filtered = appState.downloadedAudios;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(audio =>
        audio.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort audios
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    setFilteredAudios(filtered);
  }, [appState.downloadedAudios, searchQuery, sortBy]);

  // Handle refresh
  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await loadDownloadedAudios();
    } catch (error) {
      console.error('Error refreshing library:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle audio play/pause
  const handlePlayAudio = async (audio: DownloadedAudio): Promise<void> => {
    try {
      // If this is the currently playing audio, toggle play/pause
      if (globalCurrentAudio && globalCurrentAudio.id === audio.id) {
        if (globalIsPlaying) {
          await globalPauseAudio();
        } else {
          await globalResumeAudio();
        }
      } else {
        // Play new audio
        await globalPlayAudio(audio);
        navigation.navigate('Player', { audio });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Handle audio delete
  const handleDeleteAudio = (audio: DownloadedAudio): void => {
    Alert.alert(
      'Delete Audio',
      `Are you sure you want to delete "${audio.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from file system
              await fileSystemService.deleteAudioFile(audio.id);
              // Remove from storage
              await removeDownloadedAudio(audio.id);
              
              showSuccess('Audio Deleted', `${audio.title} has been removed from your library`);
            } catch (error) {
              console.error('Error deleting audio:', error);
              showError('Delete Failed', 'Failed to delete audio. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render audio item
  const renderAudioItem = ({ item }: { item: DownloadedAudio }) => {
    const isCurrentlyPlaying = globalCurrentAudio && globalCurrentAudio.id === item.id;
    const isPlaying = isCurrentlyPlaying && globalIsPlaying;
    
    return (
      <TouchableOpacity
        style={[
          styles.audioItem,
          isCurrentlyPlaying && styles.audioItemPlaying
        ]}
        onPress={() => handlePlayAudio(item)}
      >
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        <View style={styles.audioInfo}>
          <Text style={[
            styles.audioTitle,
            isCurrentlyPlaying && styles.audioTitlePlaying
          ]} numberOfLines={2}>
            {item.title}
          </Text>
          
          <View style={styles.audioMetadata}>
            <Text style={styles.metadataText}>
              {formatDuration(item.duration)} • {formatFileSize(item.fileSize)}
            </Text>
            <Text style={styles.metadataText}>
              Added: {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
        
        <View style={styles.audioActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isCurrentlyPlaying && styles.actionButtonPlaying
            ]}
            onPress={() => handlePlayAudio(item)}
          >
            {isPlaying ? (
              <PhosphorIcons.Pause size={18} color="#fff" weight="bold" />
            ) : (
              <PhosphorIcons.Play size={18} color="#4A9EFF" weight="fill" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteAudio(item)}
          >
            <PhosphorIcons.Trash size={18} color="#ff6b6b" weight="bold" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PhosphorIcons.MusicNote size={64} color="#8E8E93" weight="light" />
      <Text style={styles.emptyStateTitle}>No Audio Files</Text>
      <Text style={styles.emptyStateText}>
        Your library is empty. Download some audio files to get started!
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => navigation.navigate('Home')}
      >
        <PhosphorIcons.Plus size={20} color="#fff" weight="bold" />
        <Text style={styles.emptyStateButtonText}>Browse Audio</Text>
      </TouchableOpacity>
    </View>
  );

  // Render sort options
  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <PhosphorIcons.SortAscending size={18} color="#8E8E93" weight="bold" />
      <Text style={styles.sortLabel}>Sort by:</Text>
      {(['title', 'date', 'duration'] as const).map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.sortOption,
            sortBy === option && styles.sortOptionActive
          ]}
          onPress={() => setSortBy(option)}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === option && styles.sortOptionTextActive
          ]}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <PhosphorIcons.ArrowLeft size={20} color="#fff" weight="bold" />
        </TouchableOpacity>
        
        
        
        {/* <View style={styles.headerButton} /> */}
      </SafeAreaView>

      <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Library</Text>
          {/* <Text style={styles.headerTitle} numberOfLines={1}>
            My Library ({filteredAudios.length})
          </Text> */}
        </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <PhosphorIcons.MagnifyingGlass size={20} color="#8E8E93" weight="bold" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your library..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>
      </View>

      {/* Sort Options */}
      {filteredAudios.length > 0 && renderSortOptions()}

      {/* Audio List */}
      <FlatList
        data={filteredAudios}
        renderItem={renderAudioItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4A9EFF']}
            tintColor="#4A9EFF"
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={() => <View style={styles.bottomSpacer} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 8,
    zIndex: 10,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom:8
  },
  headerSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
    gap: 10,
  },
  sortLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortOptionActive: {
    backgroundColor: '#4A9EFF',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#fff',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 16,
  },
  audioItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  audioInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 16,
  },
  audioMetadata: {
    gap: 3,
  },
  metadataText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  audioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioItemPlaying: {
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderColor: 'rgba(74, 158, 255, 0.3)',
    borderWidth: 1.5,
  },
  audioTitlePlaying: {
    color: '#4A9EFF',
    fontWeight: '700',
  },
  actionButtonPlaying: {
    // backgroundColor: '#4A9EFF',
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A9EFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 130, // Spacer for mini player
  },
});

export default LibraryScreen;
