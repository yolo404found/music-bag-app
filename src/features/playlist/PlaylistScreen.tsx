import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, DownloadedAudio, Folder } from '../../shared/types';
import { useApp } from '../../core/providers/AppProvider';
import { useAudio } from '../../core/providers/AudioProvider';
import { useToast } from '../../core/providers/ToastProvider';
import { useTheme } from '../../core/providers/ThemeProvider';
import { fileSystemService } from '../../shared/services/fileSystemService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as PhosphorIcons from 'phosphor-react-native';

type PlaylistScreenRouteProp = RouteProp<RootStackParamList, 'Playlist'>;
type PlaylistScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Playlist'>;

const { width } = Dimensions.get('window');

const PlaylistScreen: React.FC = () => {
  const route = useRoute<PlaylistScreenRouteProp>();
  const navigation = useNavigation<PlaylistScreenNavigationProp>();
  const { folderId } = route.params;
  
  const { 
    appState, 
    removeDownloadedAudio,
    loadDownloadedAudios,
    loadFolders,
    getAudiosByFolder,
    moveAudiosToFolder
  } = useApp();
  const { 
    currentAudio: globalCurrentAudio, 
    isPlaying: globalIsPlaying,
    playAudio: globalPlayAudio,
    pauseAudio: globalPauseAudio,
    resumeAudio: globalResumeAudio,
    setPlaylist: globalSetPlaylist,
    playNext: globalPlayNext,
    playPrevious: globalPlayPrevious,
    isAutoPlayEnabled: globalIsAutoPlayEnabled,
    toggleAutoPlay: globalToggleAutoPlay
  } = useAudio();
  const { showSuccess, showError } = useToast();
  const { theme, themeMode } = useTheme();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'duration'>('title');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([]);
  
  // Modal states
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);

  // Get current folder
  const currentFolder = appState.folders.find(f => f.id === folderId);

  // Get current folder's audios - memoized to prevent unnecessary recalculations
  const currentFolderAudios = useMemo(() => {
    return getAudiosByFolder(folderId);
  }, [folderId, appState.downloadedAudios, getAudiosByFolder]);

  // Filter and sort audios - memoized to prevent unnecessary re-processing
  const filteredAudios = useMemo(() => {
    let filtered = [...currentFolderAudios]; // Create a copy to avoid mutating original

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

    return filtered;
  }, [currentFolderAudios, searchQuery, sortBy]);

  // Load sort preference on component mount
  useEffect(() => {
    const loadSortPreference = async () => {
      try {
        const savedSort = await AsyncStorage.getItem('playlist_sort_preference');
        if (savedSort && ['title', 'date', 'duration'].includes(savedSort)) {
          setSortBy(savedSort as 'title' | 'date' | 'duration');
        }
      } catch (error) {
        console.error('Error loading sort preference:', error);
      }
    };
    loadSortPreference();
  }, []);

  // Save sort preference when it changes
  const handleSortChange = async (newSort: 'title' | 'date' | 'duration') => {
    setSortBy(newSort);
    try {
      await AsyncStorage.setItem('playlist_sort_preference', newSort);
    } catch (error) {
      console.error('Error saving sort preference:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await loadDownloadedAudios();
      await loadFolders();
    } catch (error) {
      console.error('Error refreshing playlist:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Multi-select functions
  const toggleMultiSelectMode = (): void => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedAudioIds([]);
  };

  const toggleAudioSelection = (audioId: string): void => {
    setSelectedAudioIds(prev => 
      prev.includes(audioId) 
        ? prev.filter(id => id !== audioId)
        : [...prev, audioId]
    );
  };

  const selectAllAudios = (): void => {
    setSelectedAudioIds(filteredAudios.map(audio => audio.id));
  };

  const clearSelection = (): void => {
    setSelectedAudioIds([]);
  };

  const handleMoveSelectedToFolder = (targetFolderId: string): void => {
    if (selectedAudioIds.length === 0) return;
    
    try {
      moveAudiosToFolder(selectedAudioIds, targetFolderId);
      setSelectedAudioIds([]);
      setIsMultiSelectMode(false);
      setShowMoveToFolderModal(false);
      showSuccess('Moved', `${selectedAudioIds.length} audio(s) moved successfully`);
    } catch (error) {
      console.error('Error moving audios:', error);
      showError('Move Failed', 'Failed to move audios. Please try again.');
    }
  };

  // Handle delete selected audios
  const handleDeleteSelectedAudios = (): void => {
    if (selectedAudioIds.length === 0) return;
    
    Alert.alert(
      'Delete Selected Audios',
      `Are you sure you want to delete ${selectedAudioIds.length} audio(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const selectedAudios = filteredAudios.filter(audio => selectedAudioIds.includes(audio.id));
              
              // Delete from file system and storage for each audio
              for (const audio of selectedAudios) {
                await fileSystemService.deleteAudioFile(audio.id);
                await removeDownloadedAudio(audio.id);
              }
              
              setSelectedAudioIds([]);
              setIsMultiSelectMode(false);
              showSuccess('Audios Deleted', `${selectedAudios.length} audio(s) have been removed from your library`);
            } catch (error) {
              console.error('Error deleting audios:', error);
              showError('Delete Failed', 'Failed to delete audios. Please try again.');
            }
          },
        },
      ]
    );
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
        // Set the current folder's audios as playlist and find the current index
        const currentPlaylist = filteredAudios;
        const audioIndex = currentPlaylist.findIndex(a => a.id === audio.id);
        
        // Set playlist with current audio index
        globalSetPlaylist(currentPlaylist, audioIndex);
        
        // Play the selected audio
        await globalPlayAudio(audio);
        navigation.navigate('Player', { audio });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
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
    const isSelected = selectedAudioIds.includes(item.id);
    
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.audioItem,
          { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border 
          },
          isCurrentlyPlaying && { 
            backgroundColor: `${theme.colors.primary}15`,
            borderColor: theme.colors.primary 
          },
          isSelected && { 
            backgroundColor: `${theme.colors.primary}20`,
            borderColor: theme.colors.primary 
          }
        ]}
        onPress={() => {
          if (isMultiSelectMode) {
            toggleAudioSelection(item.id);
          } else {
            handlePlayAudio(item);
          }
        }}
        onLongPress={() => {
          if (!isMultiSelectMode) {
            setIsMultiSelectMode(true);
            toggleAudioSelection(item.id);
          }
        }}
        delayLongPress={500}
      >
        <View style={styles.audioItemContent}>
          {isMultiSelectMode && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.selectionIndicator,
                { borderColor: theme.colors.textSecondary },
                isSelected && { 
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary 
                }
              ]}
              onPress={() => toggleAudioSelection(item.id)}
            >
              <PhosphorIcons.Check 
                size={16} 
                color={isSelected ? "#fff" : "transparent"} 
                weight="bold" 
              />
            </TouchableOpacity>
          )}
          
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          
          <View style={styles.audioInfo}>
            <Text style={[
              styles.audioTitle,
              { color: theme.colors.text },
              isCurrentlyPlaying && { color: theme.colors.primary }
            ]} numberOfLines={2}>
              {item.title}
            </Text>
            
            <View style={styles.audioMetadata}>
              <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
                {formatDuration(item.duration)} • {formatFileSize(item.fileSize)}
              </Text>
              <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
                Added: {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          
          {!isMultiSelectMode && (
            <View style={styles.audioActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.surface },
                  isCurrentlyPlaying && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => handlePlayAudio(item)}
              >
                {isPlaying ? (
                  <PhosphorIcons.Pause size={18} color="#FFFFFF" weight="bold" />
                ) : (
                  <PhosphorIcons.Play size={18} color={theme.colors.text} weight="fill" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyStateIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
        <PhosphorIcons.MusicNote size={48} color={theme.colors.primary} weight="light" />
      </View>
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Audio in Folder</Text>
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        This folder is empty. Download some audio files to get started.
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, { 
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.primary 
        }]}
        onPress={() => navigation.navigate('Home')}
      >
        <PhosphorIcons.Plus size={20} color="#fff" weight="bold" />
        <Text style={styles.emptyStateButtonText}>Browse Audio</Text>
      </TouchableOpacity>
    </View>
  );

  // Render sort options
  const renderSortOptions = () => {
    const sortOptions = [
      { key: 'title', label: 'Title' },
      { key: 'date', label: 'Date' },
      { key: 'duration', label: 'Duration' }
    ];

    return (
      <View style={styles.sortContainer}>
        <PhosphorIcons.SortAscending size={18} color={theme.colors.textSecondary} weight="bold" />
        <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>Sort by:</Text>
        {sortOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortOption,
              { backgroundColor: theme.colors.surface },
              sortBy === option.key && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => handleSortChange(option.key as 'title' | 'date' | 'duration')}
          >
            <Text style={[
              styles.sortOptionText,
              { color: theme.colors.text },
              sortBy === option.key && { color: '#FFFFFF' }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <PhosphorIcons.ArrowLeft size={20} color={theme.colors.text} weight="bold" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {currentFolder?.name || 'Playlist'}
          </Text>
        </View>
        
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
          onPress={toggleMultiSelectMode}
        >
          {isMultiSelectMode ? (
            <PhosphorIcons.X size={20} color={theme.colors.text} weight="bold" />
          ) : (
            <PhosphorIcons.Selection size={20} color={theme.colors.text} weight="bold" />
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {/* Multi-select toolbar */}
      {isMultiSelectMode && (
        <View style={[styles.multiSelectToolbar, { 
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border 
        }]}>
          <Text style={[styles.multiSelectText, { color: theme.colors.primary }]}>
            {selectedAudioIds.length} selected
          </Text>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
              onPress={selectAllAudios}
            >
              <PhosphorIcons.CheckSquare size={18} color={theme.colors.primary} weight="bold" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
              onPress={clearSelection}
            >
              <PhosphorIcons.Square size={18} color={theme.colors.textSecondary} weight="bold" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
              onPress={() => setShowMoveToFolderModal(true)}
              disabled={selectedAudioIds.length === 0}
            >
              <PhosphorIcons.FolderPlus size={18} color={selectedAudioIds.length > 0 ? theme.colors.primary : theme.colors.textSecondary} weight="bold" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.toolbarButton, { backgroundColor: theme.colors.card }]}
              onPress={handleDeleteSelectedAudios}
              disabled={selectedAudioIds.length === 0}
            >
              <PhosphorIcons.Trash size={18} color={selectedAudioIds.length > 0 ? theme.colors.error : theme.colors.textSecondary} weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { 
          backgroundColor: `${theme.colors.surface}80`,
          borderColor: theme.colors.border,
          borderWidth: 1 
        }]}>
          <PhosphorIcons.MagnifyingGlass size={20} color={theme.colors.textSecondary} weight="bold" />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search audios..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </View>

      {/* Sort Options */}
      {filteredAudios.length > 0 && renderSortOptions()}

      {/* Audio List */}
      {isNavigating ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAudios}
          renderItem={renderAudioItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={() => <View style={styles.bottomSpacer} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Move to Folder Modal */}
      <Modal
        visible={showMoveToFolderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoveToFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border 
          }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Move to Folder</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Move {selectedAudioIds.length} audio(s) to:
            </Text>
            <FlatList
              data={appState.folders.filter(f => f.id !== folderId)}
              renderItem={({ item: folder }) => (
                <TouchableOpacity
                  style={styles.folderOption}
                  onPress={() => handleMoveSelectedToFolder(folder.id)}
                >
                  <PhosphorIcons.Folder size={20} color={theme.colors.primary} weight="regular" />
                  <Text style={[styles.folderOptionText, { color: theme.colors.text }]}>{folder.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => setShowMoveToFolderModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set dynamically via theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal:16,
    marginTop:32,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor will be set dynamically via theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    // color will be set dynamically via theme
    fontSize: 18,
    fontWeight: '600',
  },
  multiSelectToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    // backgroundColor and borderBottomColor will be set dynamically via theme
    borderBottomWidth: 1,
  },
  multiSelectText: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '600',
  },
  multiSelectActions: {
    flexDirection: 'row',
    gap: 12,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor will be set dynamically via theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor and borderColor will be set dynamically via theme
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    // color will be set dynamically via theme
    fontSize: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  sortLabel: {
    // color will be set dynamically via theme
    fontSize: 14,
    fontWeight: '500',
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    // backgroundColor will be set dynamically via theme
  },
  sortOptionText: {
    // color will be set dynamically via theme
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  audioItem: {
    // backgroundColor and borderColor will be set dynamically via theme
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  audioItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    // borderColor will be set dynamically via theme
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metadataText: {
    // color will be set dynamically via theme
    fontSize: 12,
    fontWeight: '400',
  },
  audioMetadata: {
    gap: 2,
  },
  audioActions: {
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor will be set dynamically via theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    // color will be set dynamically via theme
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    // color will be set dynamically via theme
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor will be set dynamically via theme
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 130, // Spacer for mini player
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    // backgroundColor and borderColor will be set dynamically via theme
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    minHeight: 200,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    // color will be set dynamically via theme
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    // color will be set dynamically via theme
    fontSize: 16,
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    // backgroundColor will be set dynamically via theme
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '600',
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
  },
  folderOptionText: {
    // color will be set dynamically via theme
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PlaylistScreen;
