import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Folder } from '../../shared/types';
import { useApp } from '../../core/providers/AppProvider';
import { useToast } from '../../core/providers/ToastProvider';
import { useTheme } from '../../core/providers/ThemeProvider';
import * as PhosphorIcons from 'phosphor-react-native';

type FoldersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Library'>;

const { width } = Dimensions.get('window');

const FoldersScreen: React.FC = () => {
  const navigation = useNavigation<FoldersScreenNavigationProp>();
  const { theme } = useTheme();
  const { 
    appState, 
    createFolder,
    updateFolder,
    deleteFolder,
    loadFolders
  } = useApp();
  const { showSuccess, showError } = useToast();
  
  // State management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showFolderOptionsModal, setShowFolderOptionsModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [optionsFolder, setOptionsFolder] = useState<Folder | null>(null);

  // Handle refresh
  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await loadFolders();
    } catch (error) {
      console.error('Error refreshing folders:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Folder management functions
  const handleCreateFolder = async (): Promise<void> => {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowCreateFolderModal(false);
      showSuccess('Folder Created', `"${newFolderName.trim()}" folder has been created`);
    } catch (error) {
      console.error('Error creating folder:', error);
      showError('Create Failed', 'Failed to create folder. Please try again.');
    }
  };

  const handleRenameFolder = async (): Promise<void> => {
    if (!renameFolderId || !renameFolderName.trim()) return;
    
    try {
      await updateFolder(renameFolderId, { name: renameFolderName.trim() });
      setRenameFolderName('');
      setRenameFolderId(null);
      setShowRenameFolderModal(false);
      showSuccess('Folder Renamed', `Folder has been renamed to "${renameFolderName.trim()}"`);
    } catch (error) {
      console.error('Error renaming folder:', error);
      showError('Rename Failed', 'Failed to rename folder. Please try again.');
    }
  };

  const handleDeleteFolder = (folder: Folder): void => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? All audios in this folder will be moved to the Downloads folder.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
              setShowFolderOptionsModal(false);
              showSuccess('Folder Deleted', `"${folder.name}" folder has been deleted`);
            } catch (error) {
              console.error('Error deleting folder:', error);
              showError('Delete Failed', 'Failed to delete folder. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle folder navigation
  const handleFolderPress = useCallback((folderId: string) => {
    navigation.navigate('Playlist', { folderId });
  }, [navigation]);

  // Handle folder long press
  const handleFolderLongPress = useCallback((folder: Folder) => {
    if (!folder.isDefault) {
      setOptionsFolder(folder);
      setShowFolderOptionsModal(true);
    }
  }, []);

  // Render folder item
  const renderFolderItem = ({ item: folder }: { item: Folder }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.folderCard, { 
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border 
      }]}
      onPress={() => handleFolderPress(folder.id)}
      onLongPress={() => handleFolderLongPress(folder)}
    >
      <View style={styles.folderCardContent}>
        <View style={[styles.folderIconContainer, { backgroundColor: theme.colors.card }]}>
          <PhosphorIcons.Folder 
            size={32} 
            color={theme.colors.primary} 
            weight="fill" 
          />
        </View>
        
        <View style={styles.folderCardInfo}>
          <Text style={[styles.folderCardName, { color: theme.colors.text }]}>{folder.name}</Text>
          <Text style={[styles.folderCardCount, { color: theme.colors.textSecondary }]}>
            {folder.audioCount} audio{folder.audioCount !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.folderCardActions}>
          <PhosphorIcons.CaretRight 
            size={20} 
            color={theme.colors.textSecondary} 
            weight="bold" 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PhosphorIcons.Folder size={64} color={theme.colors.textSecondary} weight="light" />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Folders Yet</Text>
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        Create your first folder to organize your audio files
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowCreateFolderModal(true)}
      >
        <PhosphorIcons.Plus size={20} color="#fff" weight="bold" />
        <Text style={styles.emptyStateButtonText}>Create Folder</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.mode === 'light' ? 'dark-content' : 'light-content'} 
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Your Library</Text>
        </View>
        
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setShowCreateFolderModal(true)}
        >
          <PhosphorIcons.Plus size={20} color={theme.colors.text} weight="bold" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Folders List */}
      <FlatList
        data={appState.folders}
        renderItem={renderFolderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.foldersListContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Create Folder Modal */}
      <Modal
        visible={showCreateFolderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border 
          }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create New Folder</Text>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowCreateFolderModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateFolder}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        visible={showRenameFolderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border 
          }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rename Folder</Text>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              value={renameFolderName}
              onChangeText={setRenameFolderName}
              placeholder="Folder name"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowRenameFolderModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={handleRenameFolder}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Folder Options Modal */}
      <Modal
        visible={showFolderOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFolderOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            minHeight: 280,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border 
          }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.card }]}
              onPress={() => setShowFolderOptionsModal(false)}
              accessibilityRole="button"
            >
              <PhosphorIcons.X size={18} color={theme.colors.text} weight="bold" />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Folder Options</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>{optionsFolder?.name}</Text>
            
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.folderOption}
              onPress={() => {
                setRenameFolderId(optionsFolder?.id || null);
                setRenameFolderName(optionsFolder?.name || '');
                setShowFolderOptionsModal(false);
                setShowRenameFolderModal(true);
              }}
            >
              <PhosphorIcons.PencilSimple size={20} color={theme.colors.textSecondary} weight="bold" />
              <Text style={[styles.folderOptionText, { color: theme.colors.text }]}>Rename</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.folderOption}
              onPress={() => {
                if (optionsFolder) {
                  handleDeleteFolder(optionsFolder);
                }
              }}
            >
              <PhosphorIcons.Trash size={20} color={theme.colors.error} weight="bold" />
              <Text style={[styles.folderOptionText, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalButton, { backgroundColor: theme.colors.card }]}
              onPress={() => setShowFolderOptionsModal(false)}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginHorizontal:16,
    marginTop:32,
    paddingVertical: 15,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  foldersListContainer: {
    padding: 20,
    flexGrow: 1,
  },
  folderCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  folderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  folderCardInfo: {
    flex: 1,
  },
  folderCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  folderCardCount: {
    fontSize: 14,
    fontWeight: '400',
  },
  folderCardActions: {
    marginLeft: 12,
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
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    minHeight: 200,
    borderWidth: 1,
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    // backgroundColor will be set via theme
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
  },
  folderOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FoldersScreen;
