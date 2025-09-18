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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <PhosphorIcons.ArrowLeft size={20} color="#fff" weight="bold" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Audio Info</Text>
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
        <Text style={styles.title} numberOfLines={3}>
          {metadata.title}
        </Text>

        {/* Metadata */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Duration</Text>
            <Text style={styles.metadataValue}>{formatDuration(metadata.duration)}</Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>License</Text>
            <Text style={styles.metadataValue}>{metadata.license}</Text>
          </View>
          
          <View style={[styles.metadataItem,{borderBottomWidth:0}]}>
            <Text style={[styles.metadataLabel,{}]}>Status</Text>
            <Text style={styles.metadataValue}>
              {isAlreadyDownloaded ? 'Downloaded' : 'Not Downloaded'}
            </Text>
          </View>
        </View>

        {/* Download Status */}
        {!metadata.canDownload && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ This audio cannot be downloaded due to licensing restrictions.
            </Text>
          </View>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Downloading... {downloadProgress.toFixed(0)}%</Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${downloadProgress}%` }]} 
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
                (isDownloading || isAlreadyDownloaded) && styles.actionButtonDisabled
              ]}
              onPress={handleDownload}
              disabled={isDownloading || isAlreadyDownloaded}
            >
              {isDownloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <PhosphorIcons.Download 
                    size={20} 
                    color="#fff" 
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
        <View style={styles.additionalInfo}>
          <Text style={styles.additionalInfoTitle}>About This Audio</Text>
          <Text style={styles.additionalInfoText}>
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
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
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
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    lineHeight: 32,
  },
  metadataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  warningText: {
    color: '#FFC107',
    fontSize: 14,
    textAlign: 'center',
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playButton: {
    // backgroundColor: 'rgba(74, 158, 255, 0.2)',
    // borderColor: 'rgba(74, 158, 255, 0.5)',
  },
  downloadButton: {
    // backgroundColor: 'rgba(74, 158, 255, 0.2)',
    // borderColor: 'rgba(74, 158, 255, 0.5)',
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  additionalInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

export default InfoScreen;
