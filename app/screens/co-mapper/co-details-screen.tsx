'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { coService, CODetail } from '@/services/api/co-service';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

interface CODetailsScreenProps {
  coId: number;
  onBack: () => void;
}

interface SubjectInfo {
  name: string;
  ia: string;
  branch: string;
  sem: number;
}

export const CODetailsScreen: React.FC<CODetailsScreenProps> = ({ coId, onBack }) => {
  const [coDetails, setCoDetails] = useState<CODetail[]>([]);
  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchDetails();
    fetchSubjectInfo();
  }, [coId]);

  const fetchDetails = async () => {
    const data = await coService.fetchCODetails(coId);
    setCoDetails(data);
  };

  const fetchSubjectInfo = async () => {
    try {
      console.log('Fetching subject info for coId:', coId);
      const info = await coService.fetchSubjectInfo(coId);
      console.log('Subject info received:', info);
      setSubjectInfo(info);
    } catch (error) {
      console.error('Error fetching subject info:', error);
      Alert.alert('Error', 'Failed to fetch subject information');
    }
  };

  const handleDownloadExcel = async () => {
    if (coDetails.length === 0) {
      Alert.alert('No Data', 'There are no mappings to download');
      return;
    }

    setIsDownloading(true);
    try {
      console.log('Starting Excel download for subject:', coId);

      // Call API to generate Excel file
      const base64Data = await coService.downloadCOExcel(coId);
      console.log('Received base64 data, length:', base64Data.length);

      // Create file name and path
      const fileName = `CO_Mapping_${subjectInfo?.name || coId}_${subjectInfo?.ia || ''}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      console.log('Writing file to:', fileUri);

      // Write base64 data to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File saved to cache');

      // Try to save to Downloads using MediaLibrary
      if (Platform.OS === 'android') {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          console.log('Permission status:', status);

          if (status === 'granted') {
            // Use documentDirectory instead of cacheDirectory
            const docFileUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(docFileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const asset = await MediaLibrary.createAssetAsync(docFileUri);
            console.log('Asset created:', asset.id);

            Alert.alert(
              'Success!',
              'Excel file saved to Downloads folder.\n\nOpen Files app > Downloads to view it.',
              [{ text: 'OK' }]
            );
          } else {
            // Fallback to share
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Save Excel File',
                UTI: 'com.microsoft.excel.xlsx',
              });
            }
          }
        } catch (error) {
          console.error('MediaLibrary error:', error);
          // Fallback to share
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              dialogTitle: 'Save Excel File',
              UTI: 'com.microsoft.excel.xlsx',
            });
          }
        }
      } else {
        // iOS - use share dialog
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Save Excel File',
            UTI: 'com.microsoft.excel.xlsx',
          });
        }
      }
    } catch (error: any) {
      console.error('Download error:', error);
      const errorMessage = error.message || 'Failed to download Excel file';
      Alert.alert('Download Error', errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header with IA Badge */}
          <View style={styles.header}>
            <Text style={styles.title}>Question-to-CO Mapping</Text>
            {subjectInfo && (
              <>
                <View style={styles.subjectInfoRow}>
                  <Text style={styles.subjectName}>{subjectInfo.name}</Text>
                  <View style={styles.iaBadge}>
                    <Text style={styles.iaBadgeText}>{subjectInfo.ia}</Text>
                  </View>
                </View>
              </>
            )}
            {!subjectInfo && (
              <Text style={styles.subtitle}>Loading subject info...</Text>
            )}
          </View>

          {coDetails.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="inbox" size={48} color="#d0d0d0" />
              </View>
              <Text style={styles.emptyTitle}>No mappings yet</Text>
              <Text style={styles.emptyText}>Create your first CO mapping to get started</Text>
            </View>
          ) : (
            <>
              {/* Mappings Container */}
              <View style={styles.mappingsContainer}>
                <View style={styles.containerHeader}>
                  <Text style={styles.containerLabel}>Mapped Questions</Text>
                  <Text style={styles.containerCount}>
                    {coDetails.length} {coDetails.length === 1 ? 'mapping' : 'mappings'}
                  </Text>
                </View>

                <View style={styles.mappingsList}>
                  {coDetails.map((detail, index) => (
                    <View key={index} style={styles.mappingCard}>
                      <View style={styles.questionSection}>
                        <Text style={styles.labelSmall}>Question</Text>
                        <View style={styles.questionBox}>
                          <Text style={styles.questionNumber}>{detail.q_no}</Text>
                        </View>
                      </View>

                      <View style={styles.arrowSection}>
                        <View style={styles.divider} />
                        <Feather name="arrow-right" size={20} color="#d0d0d0" />
                        <View style={styles.divider} />
                      </View>

                      <View style={styles.coSection}>
                        <Text style={styles.labelSmall}>CO</Text>
                        <View style={styles.coBox}>
                          <Text style={styles.coValue}>{detail.co_no}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Download Excel Button - Outside Container */}
              <TouchableOpacity
                style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
                onPress={handleDownloadExcel}
                disabled={isDownloading}
              >
                <Feather
                  name={isDownloading ? "loader" : "download"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.downloadButtonText}>
                  {isDownloading ? 'Downloading...' : 'Download Excel'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderRadius: 8,
    width: 80,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subjectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  iaBadge: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginLeft: 12,
  },
  iaBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mappingsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 20,
  },
  containerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  containerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  containerCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  mappingsList: {
    gap: 12,
  },
  mappingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 10,
  },
  questionSection: {
    flex: 1,
    alignItems: 'center',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionBox: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 60,
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  arrowSection: {
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 8,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
  },
  coSection: {
    flex: 1,
    alignItems: 'center',
  },
  coBox: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  coValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 10,
  },
  downloadButtonDisabled: {
    backgroundColor: '#999',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
