import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { Feather } from '@expo/vector-icons';
import { coService, CO } from '@/services/api/co-service';
import { API_BASE_URL } from '@/constants/api';
import { Alert } from '@/utils/alert';

interface StudentSheetScreenProps {
  onViewCompletedStudents: (coId: number, coName: string) => void;
}

export const StudentSheetScreen: React.FC<StudentSheetScreenProps> = ({ onViewCompletedStudents }) => {
  console.log('🌐 Using WEB version of StudentSheetScreen');
  console.log('🌐 WEB VERSION LOADED SUCCESSFULLY!');
  alert('WEB VERSION IS LOADED!'); // This will show a popup
  const { teacher } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [myCOs, setMyCOs] = useState<CO[]>([]);
  const [selectedCO, setSelectedCO] = useState<CO | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

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

  const handlePickImage = (useCamera: boolean = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) {
      input.capture = 'environment';
    }
    
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const handlePickFromCamera = () => handlePickImage(true);
  const handlePickFromGallery = () => handlePickImage(false);

  const handleSubmit = async () => {
    if (!selectedImageFile) {
      Alert.alert('Missing Information', 'Please select or capture an answer sheet image');
      return;
    }
    if (!selectedCO) {
      Alert.alert('Missing Information', 'Please select a CO template');
      return;
    }

    setIsSubmitting(true);
    setProcessingStep('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('subject_id', selectedCO.id.toString());
      formData.append('student_image', selectedImageFile, selectedImageFile.name);

      setProcessingStep('Processing image...');

      const response = await fetch(`${API_BASE_URL}/student_sheet_upload`, {
        method: 'POST',
        body: formData,
      });

      setProcessingStep('Extracting data...');
      const result = await response.json();

      if (result.status === 'success') {
        setProcessingStep('Saving to database...');
        setTimeout(() => {
          Alert.alert('Success', 'Answer sheet analyzed and CO mappings saved successfully!');
          setSelectedImage(null);
          setSelectedImageFile(null);
          setSelectedCO(null);
          setProcessingStep('');
        }, 500);
      } else {
        Alert.alert('Error', result.message || 'Failed to analyze answer sheet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze answer sheet');
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
            <Text style={styles.title}>Analyze Answer Sheet</Text>
            <Text style={styles.subtitle}>Upload student answers to map them to COs</Text>
          </View>

          {/* CO Selection Dropdown */}
          <View style={styles.dropdownSection}>
            <Text style={styles.dropdownLabel}>Select CO Template *</Text>
            <Pressable
              style={[styles.dropdownButton, selectedCO && styles.dropdownButtonSelected]}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={[styles.dropdownText, !selectedCO && styles.dropdownPlaceholder]}>
                {selectedCO ? `${selectedCO.name} - ${selectedCO.ia}` : 'Choose a CO template'}
              </Text>
              <Feather name={showDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </Pressable>

            {showDropdown && (
              <View style={styles.dropdownList}>
                {myCOs.length === 0 ? (
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No CO templates available</Text>
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
                  onPress={() => {
                    setSelectedImage(null);
                    setSelectedImageFile(null);
                  }}
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
                ? 'Analyzing...'
                : !selectedCO
                  ? 'Select CO template first'
                  : !selectedImage
                    ? 'Select an image first'
                    : 'Analyze Answer Sheet'}
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
            <Text style={styles.modalTitle}>Analyzing Answer Sheet</Text>
            <Text style={styles.modalStep}>{processingStep}</Text>
            <View style={styles.modalSteps}>
              <View style={styles.stepItem}>
                <Feather name="upload" size={16} color="#999" />
                <Text style={styles.stepText}>Upload</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <Feather name="scissors" size={16} color="#999" />
                <Text style={styles.stepText}>Segment</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepItem}>
                <Feather name="target" size={16} color="#999" />
                <Text style={styles.stepText}>Map COs</Text>
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
    cursor: 'pointer',
  } as any,
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
    cursor: 'pointer',
  } as any,
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
    cursor: 'pointer',
  } as any,
  submitBtnDisabled: {
    backgroundColor: '#d0d0d0',
    cursor: 'not-allowed',
  } as any,
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
    cursor: 'pointer',
  } as any,
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
    cursor: 'pointer',
  } as any,
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
    cursor: 'pointer',
  } as any,
  viewStudentsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
