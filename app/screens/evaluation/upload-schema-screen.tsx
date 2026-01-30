import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';
import { networkService } from '../../services/network/network-service';

interface COTemplate {
  id: number;
  ia: string;
  name: string;
  branch: string;
  sem: string;
}

interface UploadSchemaScreenProps {
  onBack: () => void;
  onSuccess: (evaluationSchemaId: number, subject: string) => void;
}

const UPLOAD_PROGRESS_KEY = '@evaluation_upload_progress';

interface UploadProgress {
  pdfId: string;
  subject: string;
  subjectId: number;
  timestamp: number;
}

// Export function to clear upload progress when evaluation is completed
export const clearUploadProgress = async () => {
  try {
    await AsyncStorage.removeItem(UPLOAD_PROGRESS_KEY);
    console.log('✅ Upload progress cleared');
  } catch (error) {
    console.error('Error clearing upload progress:', error);
  }
};

export const UploadSchemaScreen: React.FC<UploadSchemaScreenProps> = ({ onBack, onSuccess }) => {
  const { teacher, token } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingCOs, setLoadingCOs] = useState(false);
  const [coTemplates, setCoTemplates] = useState<COTemplate[]>([]);

  // Check for in-progress upload on mount
  useEffect(() => {
    checkInProgressUpload();
  }, []);

  const checkInProgressUpload = async () => {
    try {
      const progressData = await AsyncStorage.getItem(UPLOAD_PROGRESS_KEY);
      if (progressData) {
        const progress: UploadProgress = JSON.parse(progressData);
        // Check if upload is less than 24 hours old
        const hoursSinceUpload = (Date.now() - progress.timestamp) / (1000 * 60 * 60);

        if (hoursSinceUpload < 24) {
          // Keep the progress data, user can continue manually
          console.log(`✅ Found in-progress upload for "${progress.subject}"`);
        } else {
          // Clear old upload data
          await AsyncStorage.removeItem(UPLOAD_PROGRESS_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking in-progress upload:', error);
    }
  };

  const saveUploadProgress = async (pdfId: string, subject: string, subjectId: number) => {
    try {
      const progress: UploadProgress = {
        pdfId,
        subject,
        subjectId,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(UPLOAD_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving upload progress:', error);
    }
  };

  // Fetch CO templates when component mounts
  useEffect(() => {
    fetchCOTemplates();
  }, []);

  const fetchCOTemplates = async () => {
    if (!teacher?.id) {
      Alert.alert('Error', 'Teacher ID not found. Please log in again.');
      return;
    }

    setLoadingCOs(true);
    try {
      console.log('📥 Fetching CO templates for teacher:', teacher.id);
      const data = await networkService.requestJson<COTemplate[]>(`${BASE_URL}/co_fetch/${teacher.id}`, {
        timeout: 10000,
        retries: 2,
      });
      
      console.log('✅ CO templates fetched:', data);
      setCoTemplates(data);
    } catch (error: any) {
      console.error('❌ Error fetching CO templates:', error.message);
      Alert.alert('Error', 'Failed to load subjects. Please try again.');
    } finally {
      setLoadingCOs(false);
    }
  };

  const handleSubjectSelect = (template: COTemplate) => {
    const displayName = `${template.name} - ${template.ia}`;
    setSelectedSubject(displayName);
    setSelectedSubjectId(template.id);
    setShowDropdown(false);
  };

  const handleUploadSchema = async () => {
    if (!selectedSubject) {
      Alert.alert('Select Subject', 'Please select a subject first');
      return;
    }

    try {
      console.log('📁 Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('📄 Document picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('✅ PDF selected:');
        console.log('  - Name:', file.name);
        console.log('  - URI:', file.uri);
        console.log('  - Size:', file.size);
        console.log('  - Type:', file.mimeType);

        // Upload PDF to backend
        setUploading(true);
        try {
          console.log('📤 Uploading PDF to backend...');

          // Create FormData
          const formData = new FormData();
          formData.append('subject', selectedSubject);
          formData.append('subject_id', selectedSubjectId!.toString());

          // For React Native, FormData can handle the file object directly
          const fileBlob = {
            uri: file.uri,
            type: file.mimeType || 'application/pdf',
            name: file.name,
          } as any;

          formData.append('pdf_file', fileBlob);

          console.log('📤 Sending request to:', `${BASE_URL}/api/evaluation/upload-schema-pdf`);
          console.log('📤 File details:', { name: file.name, size: file.size, type: file.mimeType });

          const responseData = await networkService.submitForm<any>(`${BASE_URL}/api/evaluation/upload-schema-pdf`, formData, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            timeout: 60000, // 60 seconds for large files
            retries: 2,
            showRetryLogs: true,
          });

          console.log('📥 Upload response:', responseData);

          if (responseData.success) {
            console.log('✅ PDF uploaded successfully, Evaluation Schema ID:', responseData.evaluation_schema_id);

            // Clear any previous upload progress since we're done
            await clearUploadProgress();
            
            Alert.alert(
              'Success!', 
              'Answer schema uploaded successfully. You can now start evaluating student answers.',
              [
                {
                  text: 'OK',
                  onPress: () => onSuccess(responseData.evaluation_schema_id, selectedSubject)
                }
              ]
            );
          } else {
            throw new Error('Upload failed');
          }
        } catch (uploadError: any) {
          console.error('❌ Upload error:', uploadError);

          // Better error messages based on error type
          let errorMessage = 'Failed to upload PDF';
          if (uploadError.isNetworkError) {
            errorMessage = 'Network error. Please check:\n\n1. Backend server is running\n2. Your internet connection\n3. Try again';
          } else if (uploadError.isTimeoutError) {
            errorMessage = 'Upload timeout. The file might be too large or connection is slow. Please try again.';
          } else if (uploadError.isServerError) {
            errorMessage = 'Server error. Please try again later.';
          } else if (uploadError.message) {
            errorMessage = uploadError.message;
          }

          Alert.alert(
            'Upload Failed',
            errorMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => handleUploadSchema() }
            ]
          );
        } finally {
          setUploading(false);
        }
      } else {
        console.log('❌ PDF selection canceled or no file selected');
      }
    } catch (error) {
      console.error('❌ Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Answer Schema</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Subject</Text>
          <TouchableOpacity
            onPress={() => setShowDropdown(!showDropdown)}
            style={styles.dropdown}
            activeOpacity={0.7}
          >
            <Text style={selectedSubject ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
              {selectedSubject || 'Select Subject'}
            </Text>
            <Feather
              name={showDropdown ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#666"
            />
          </TouchableOpacity>

          {/* Dropdown List */}
          {showDropdown && (
            <View style={styles.dropdownList}>
              {loadingCOs ? (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.dropdownLoadingText}>Loading subjects...</Text>
                </View>
              ) : coTemplates.length === 0 ? (
                <View style={styles.dropdownEmpty}>
                  <Feather name="inbox" size={32} color="#999" />
                  <Text style={styles.dropdownEmptyText}>No subjects found</Text>
                  <Text style={styles.dropdownEmptySubtext}>Create a CO template first</Text>
                </View>
              ) : (
                coTemplates.map((template, index) => (
                  <TouchableOpacity
                    key={template.id}
                    onPress={() => handleSubjectSelect(template)}
                    style={[
                      styles.dropdownItem,
                      index !== coTemplates.length - 1 && styles.dropdownItemBorder
                    ]}
                    activeOpacity={0.6}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={styles.dropdownItemText}>{template.name} - {template.ia}</Text>
                      <Text style={styles.dropdownItemSubtext}>
                        {template.branch} • Sem {template.sem}
                      </Text>
                    </View>
                    {selectedSubjectId === template.id && (
                      <Feather name="check" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Upload Button */}
        <View style={styles.uploadSection}>
          <TouchableOpacity
            onPress={handleUploadSchema}
            style={[
              styles.uploadButton,
              (!selectedSubject || uploading) && styles.uploadButtonDisabled
            ]}
            activeOpacity={0.8}
            disabled={!selectedSubject || uploading}
          >
            <View style={styles.uploadButtonContent}>
              {uploading ? (
                <>
                  <ActivityIndicator size="large" color="#000" style={{ marginBottom: 20 }} />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                  <Text style={styles.uploadButtonSubtext}>Please wait</Text>
                </>
              ) : (
                <>
                  <View style={[
                    styles.uploadIconContainer,
                    !selectedSubject && styles.uploadIconContainerDisabled
                  ]}>
                    <Feather
                      name="upload-cloud"
                      size={48}
                      color={selectedSubject ? "#000" : "#999"}
                    />
                  </View>
                  <Text style={[
                    styles.uploadButtonText,
                    !selectedSubject && styles.uploadButtonTextDisabled
                  ]}>
                    Upload Answer Schema
                  </Text>
                  <Text style={[
                    styles.uploadButtonSubtext,
                    !selectedSubject && styles.uploadButtonSubtextDisabled
                  ]}>
                    {selectedSubject
                      ? 'Tap to select PDF file'
                      : 'Select a subject first'}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Feather name="info" size={20} color="#000" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>What is an Answer Schema?</Text>
            <Text style={styles.infoText}>
              Upload the official answer key PDF for this assessment. The entire PDF will be saved as your evaluation schema.
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
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownTextSelected: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  dropdownTextPlaceholder: {
    fontSize: 17,
    fontWeight: '500',
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemContent: {
    flex: 1,
    marginRight: 12,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  dropdownItemSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  dropdownLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dropdownEmpty: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownEmptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dropdownEmptySubtext: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  uploadButtonDisabled: {
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  uploadButtonContent: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadIconContainerDisabled: {
    backgroundColor: '#f5f5f5',
  },
  uploadButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  uploadButtonTextDisabled: {
    color: '#999',
  },
  uploadButtonSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  uploadButtonSubtextDisabled: {
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    lineHeight: 20,
  },
});

export { UploadSchemaScreenProps };
