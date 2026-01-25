'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, Image, Alert, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useImagePicker } from '@/hooks/use-image-picker';
import { useAuth } from '@/contexts/auth-context';
import { Feather } from '@expo/vector-icons';
import { coService, CO } from '@/services/api/co-service';

interface StudentSheetScreenProps {
  onViewCompletedStudents: (coId: number, coName: string) => void;
}

export const StudentSheetScreen: React.FC<StudentSheetScreenProps> = ({ onViewCompletedStudents }) => {
  const { teacher } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [myCOs, setMyCOs] = useState<CO[]>([]);
  const [selectedCO, setSelectedCO] = useState<CO | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  useEffect(() => {
    if (teacher) {
      fetchCOs();
    }
  }, [teacher]);

  const fetchCOs = async () => {
    if (!teacher) return;
    const data = await coService.fetchMyCOs(teacher.id);
    setMyCOs(data);
  };

  const handleViewStudents = () => {
    if (selectedCO) {
      onViewCompletedStudents(selectedCO.id, selectedCO.name);
    }
  };

  const handlePickFromCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) setSelectedImage(uri);
  };

  const handlePickFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) setSelectedImage(uri);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      Alert.alert('Missing Information', 'Please select or capture an image');
      return;
    }
    if (!selectedCO) {
      Alert.alert('Missing Information', 'Please select a CO mapping');
      return;
    }

    setIsSubmitting(true);
    setProcessingStep('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('subject_id', selectedCO.id.toString());

      const uriParts = selectedImage.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('student_image', {
        uri: selectedImage,
        name: `student_sheet.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      setProcessingStep('Processing image...');

      const response = await fetch('http://10.0.2.2:8000/student_sheet_upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProcessingStep('Extracting data...');
      const result = await response.json();

      if (result.status === 'success') {
        setProcessingStep('Saving to database...');
        setTimeout(() => {
          Alert.alert('Success', 'Student answer sheet processed and saved successfully!');
          setSelectedImage(null);
          setSelectedCO(null);
          setProcessingStep('');
        }, 500);
      } else {
        Alert.alert('Error', result.message || 'Failed to upload');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload student answer sheet');
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setProcessingStep('');
    }
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Student Answer Sheet</Text>
            <Text style={styles.subtitle}>Capture or upload student Answer</Text>
          </View>

          {/* CO Selection Dropdown */}
          <View style={styles.dropdownSection}>
            <Text style={styles.dropdownLabel}>Select CO Mapping *</Text>
            <Pressable
              style={[styles.dropdownButton, selectedCO && styles.dropdownButtonSelected]}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={[styles.dropdownText, !selectedCO && styles.dropdownPlaceholder]}>
                {selectedCO ? `${selectedCO.name} - ${selectedCO.ia}` : 'Choose a CO mapping'}
              </Text>
              <Feather name={showDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </Pressable>

            {showDropdown && (
              <View style={styles.dropdownList}>
                {myCOs.length === 0 ? (
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No CO mappings available</Text>
                  </View>
                ) : (
                  myCOs.map((co) => (
                    <Pressable
                      key={co.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedCO(co);
                        setShowDropdown(false);
                      }}
                    >
                      <View style={styles.dropdownItemContent}>
                        <Text style={styles.dropdownItemTitle}>{co.name}</Text>
                        <View style={styles.dropdownItemMeta}>
                          <Text style={styles.dropdownItemMetaText}>{co.branch} • Sem {co.sem} • {co.ia}</Text>
                        </View>
                      </View>
                      {selectedCO?.id === co.id && (
                        <Feather name="check" size={18} color="#000" />
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          {/* View Students Button */}
          {selectedCO && (
            <Pressable style={styles.viewStudentsBtn} onPress={handleViewStudents}>
              <Feather name="users" size={18} color="#000" />
              <Text style={styles.viewStudentsText}>View Completed Students</Text>
            </Pressable>
          )}

          {/* Image Actions */}
          <View style={styles.actionsGrid}>
            <Pressable style={styles.actionCard} onPress={handlePickFromCamera}>
              <View style={styles.actionIcon}>
                <Feather name="camera" size={28} color="#000" />
              </View>
              <Text style={styles.actionTitle}>Take Picture</Text>
              <Text style={styles.actionDesc}>Use your camera</Text>
            </Pressable>

            <Pressable style={styles.actionCard} onPress={handlePickFromGallery}>
              <View style={styles.actionIcon}>
                <Feather name="image" size={28} color="#000" />
              </View>
              <Text style={styles.actionTitle}>Upload File</Text>
              <Text style={styles.actionDesc}>From your device</Text>
            </Pressable>
          </View>

          {/* Image Preview */}
          {selectedImage && (
            <View style={styles.previewSection}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Selected Image</Text>
                <Pressable
                  onPress={() => setSelectedImage(null)}
                  style={styles.removeBtn}
                >
                  <Feather name="x" size={18} color="#999" />
                </Pressable>
              </View>
              <View style={styles.previewBox}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewOverlay}>
                  <Feather name="check-circle" size={40} color="#fff" />
                </View>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[styles.submitBtn, (!selectedImage || !selectedCO || isSubmitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedImage || !selectedCO || isSubmitting}
          >
            <Feather name="upload-cloud" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.submitText}>
              {isSubmitting
                ? 'Uploading...'
                : !selectedCO
                  ? 'Select CO mapping first'
                  : !selectedImage
                    ? 'Select an image first'
                    : 'Submit Answer Sheet'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Processing Modal */}
      <Modal
        visible={isSubmitting}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.modalTitle}>Processing Answer Sheet</Text>
            <Text style={styles.modalStep}>{processingStep}</Text>
            <View style={styles.modalSteps}>
              <View style={styles.stepItem}>
                <Feather name="upload" size={16} color="#999" />
                <Text style={styles.stepText}>Upload</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <Feather name="scissors" size={16} color="#999" />
                <Text style={styles.stepText}>Process</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <Feather name="eye" size={16} color="#999" />
                <Text style={styles.stepText}>Extract</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <Feather name="database" size={16} color="#999" />
                <Text style={styles.stepText}>Save</Text>
              </View>
            </View>
            <Text style={styles.modalNote}>This may take 30-60 seconds</Text>
          </View>
        </View>
      </Modal>
    </>
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
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  removeBtn: {
    padding: 6,
  },
  previewBox: {
    height: 280,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#d0d0d0',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownSection: {
    marginBottom: 24,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownButtonSelected: {
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    maxHeight: 240,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  dropdownItemMeta: {
    flexDirection: 'row',
  },
  dropdownItemMetaText: {
    fontSize: 11,
    color: '#999',
  },
  dropdownEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 13,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  modalStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  modalSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  stepDivider: {
    width: 20,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  modalNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  viewStudentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  viewStudentsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
