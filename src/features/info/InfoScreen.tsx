import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, AudioMetadata, DownloadedAudio } from '../../shared/types';
import { useApp } from '../../core/providers/AppProvider';
import { useToast } from '../../core/providers/ToastProvider';
import { useTheme } from '../../core/providers/ThemeProvider';
import { apiService } from '../../shared/services/apiService';
import { fileSystemService } from '../../shared/services/fileSystemService';
import { downloadService } from '../../shared/services/downloadService';
import * as PhosphorIcons from 'phosphor-react-native';

type InfoScreenRouteProp = RouteProp<RootStackParamList, 'Info'>;
type InfoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Info'>;

const { width } = Dimensions.get('window');

const InfoScreen: React.FC = () => {
  const route = useRoute<InfoScreenRouteProp>();
  const navigation = useNavigation<InfoScreenNavigationProp>();
  const { metadata } = route.params;
  
  const { addDownloadedAudio, appState } = useApp();
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const { theme, themeMode } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isAlreadyDownloaded, setIsAlreadyDownloaded] = useState(false);

  // Check if audio is already downloaded
  useEffect(() => {
    checkIfAlreadyDownloaded();
  }, [metadata.id]);

  const checkIfAlreadyDownloaded = async (): Promise<void> => {
    try {
      // Wait a bit for FileSystem to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      const exists = await fileSystemService.audioFileExists(metadata.id);
      setIsAlreadyDownloaded(exists);
    } catch (error) {
      console.error('Error checking if already downloaded:', error);
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

  // Handle download
  const handleDownload = async (): Promise<void> => {
    if (!metadata.canDownload) {
      showWarning('Download Not Available', 'This audio cannot be downloaded due to licensing restrictions.');
      return;
    }

    if (isAlreadyDownloaded) {
      showInfo('Already Downloaded', 'This audio is already in your library.');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // Use download service
      const downloadedAudio = await downloadService.downloadAudio(
        metadata,
        (progress) => {
          setDownloadProgress(progress.progress);
        },
        (audio) => {
          setIsAlreadyDownloaded(true);
          showSuccess('Download Complete', `${audio.title} added to your library!`);
        },
        (error) => {
          showError('Download Failed', error);
        }
      );

      if (downloadedAudio) {
        // Audio was successfully downloaded and saved
        console.log('Download completed:', downloadedAudio.title);
      }
    } catch (error) {
      console.error('Error downloading audio:', error);
      showError('Download Failed', 'Failed to download audio. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
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
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <PhosphorIcons.ArrowLeft size={20} color={theme.colors.text} weight="bold" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Audio Info</Text>
        </View>
        
        <View style={styles.headerRight} />
      </SafeAreaView>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: metadata.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          {metadata.isLive && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={3}>
          {metadata.title}
        </Text>

        {/* Metadata */}
        <View style={[styles.metadataContainer, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border 
        }]}>
          <View style={[styles.metadataItem, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.metadataValue, { color: theme.colors.text }]}>{formatDuration(metadata.duration)}</Text>
          </View>
          
          <View style={[styles.metadataItem, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>License</Text>
            <Text style={[styles.metadataValue, { color: theme.colors.text }]}>{metadata.license}</Text>
          </View>
          
          <View style={[styles.metadataItem,{borderBottomWidth:0}]}>
            <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>Status</Text>
            <Text style={[styles.metadataValue, { color: theme.colors.text }]}>
              {isAlreadyDownloaded ? 'Downloaded' : 'Not Downloaded'}
            </Text>
          </View>
        </View>

        {/* Download Status */}
        {!metadata.canDownload && (
          <View style={[styles.warningContainer, { 
            backgroundColor: `${theme.colors.warning}15`,
            borderColor: `${theme.colors.warning}30` 
          }]}>
            <Text style={[styles.warningText, { color: theme.colors.warning }]}>
              ⚠️ This audio cannot be downloaded due to licensing restrictions.
            </Text>
          </View>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <View style={[styles.progressContainer, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border 
          }]}>
            <Text style={[styles.progressText, { color: theme.colors.text }]}>Downloading... {downloadProgress.toFixed(0)}%</Text>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[styles.progressFill, { backgroundColor: theme.colors.primary, width: `${downloadProgress}%` }]} 
              />
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {metadata.canDownload && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.downloadButton,
                { backgroundColor: theme.colors.primary },
                (isDownloading || isAlreadyDownloaded) && [styles.actionButtonDisabled, { backgroundColor: theme.colors.border }]
              ]}
              onPress={handleDownload}
              disabled={isDownloading || isAlreadyDownloaded}
            >
              {isDownloading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <PhosphorIcons.Download 
                    size={20} 
                    color="#FFFFFF" 
                    weight={isAlreadyDownloaded ? "fill" : "regular"} 
                  />
                  <Text style={styles.actionButtonText}>
                    {isAlreadyDownloaded ? 'Downloaded' : 'Download'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Additional Info */}
        <View style={[styles.additionalInfo, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border 
        }]}>
          <Text style={[styles.additionalInfoTitle, { color: theme.colors.text }]}>About This Audio</Text>
          <Text style={[styles.additionalInfoText, { color: theme.colors.textSecondary }]}>
            {metadata.isLive 
              ? 'This is a live stream. Download may not be available for live content.'
              : 'This audio can be downloaded and played offline in your library.'
            }
          </Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set via theme
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
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerRight: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Added for mini player spacing
  },
  thumbnailContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    height: width * 0.6,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ff0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    lineHeight: 32,
  },
  metadataContainer: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  actionButtons: {
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  playButton: {
    // Styling will be set via theme
  },
  downloadButton: {
    // Styling will be set via theme
  },
  actionButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  additionalInfo: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  additionalInfoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default InfoScreen;
