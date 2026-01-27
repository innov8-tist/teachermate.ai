'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { coService, CO, CODetail } from '@/services/api/co-service';
import { useAuth } from '@/contexts/auth-context';
import { Feather } from '@expo/vector-icons';
import { useImagePicker } from '@/hooks/use-image-picker';
import { API_BASE_URL } from '@/constants/api';

interface MyCOsScreenProps {
  onCOClick: (coId: number) => void;
  onViewCompletedStudents?: (coId: number, coName: string) => void;
}

interface COWithDetails extends CO {
  questionCount?: number;
  coCount?: number;
  completedStudents?: number;
  totalStudents?: number;
  coDetails?: CODetail[];
}

interface Student {
  regno: string;
}

export const MyCOsScreen: React.FC<MyCOsScreenProps> = ({ 
  onCOClick,
  onViewCompletedStudents
}) => {
  const { teacher } = useAuth();
  const [myCOs, setMyCOs] = useState<COWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [selectedCOForUpload, setSelectedCOForUpload] = useState<number | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedCOForMapping, setSelectedCOForMapping] = useState<COWithDetails | null>(null);
  
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  useEffect(() => {
    if (teacher) {
      fetchCOs();
    }
  }, [teacher]);

  const fetchCOs = async () => {
    setIsLoading(true);
    if (!teacher) return;
    
    const data = await coService.fetchMyCOs(teacher.id);
    
    // Fetch additional details for each CO
    const cosWithDetails = await Promise.all(
      data.map(async (co) => {
        try {
          // Fetch CO details (questions and COs)
          const details = await coService.fetchCODetails(co.id);
          const uniqueCOs = [...new Set(details.map((d: CODetail) => d.co_no))].length;
          
          // Fetch completed students
          const studentsResponse = await fetch(`${API_BASE_URL}/students_by_subject/${co.id}`);
          const students: Student[] = await studentsResponse.json();
          
          // Fetch total students
          const infoResponse = await fetch(`${API_BASE_URL}/co_subject_info/${co.id}`);
          const info = await infoResponse.json();
          
          console.log(`CO ${co.id} (${co.name}) info:`, info);
          console.log(`Student count for ${co.name}:`, info.student_count);
          
          return {
            ...co,
            questionCount: details.length,
            coCount: uniqueCOs,
            completedStudents: students.length,
            totalStudents: info.student_count || 0,
            coDetails: details,
          };
        } catch (error) {
          console.error(`Error fetching details for CO ${co.id}:`, error);
          return {
            ...co,
            questionCount: 0,
            coCount: 0,
            completedStudents: 0,
            totalStudents: 0,
            coDetails: [],
          };
        }
      })
    );
    
    setMyCOs(cosWithDetails);
    setIsLoading(false);
  };

  const handleDelete = (coId: number, coName: string) => {
    Alert.alert('Delete CO', `Are you sure you want to delete ${coName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await coService.deleteCO(coId);
          if (result.status === 'success') {
            Alert.alert('Success', 'CO deleted successfully');
            fetchCOs();
          } else {
            Alert.alert('Error', result.message || 'Failed to delete CO');
          }
        },
      },
    ]);
  };

  const handleUploadClick = (coId: number) => {
    setSelectedCOForUpload(coId);
    setShowImagePicker(true);
  };

  const handlePickFromCamera = async () => {
    const uri = await pickFromCamera();
    if (uri && selectedCOForUpload) {
      setShowImagePicker(false);
      handleSubmit(uri, selectedCOForUpload);
    }
  };

  const handlePickFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri && selectedCOForUpload) {
      setShowImagePicker(false);
      handleSubmit(uri, selectedCOForUpload);
    }
  };

  const handleSubmit = async (imageUri: string, coId: number) => {
    setIsSubmitting(true);
    setProcessingStep('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('subject_id', coId.toString());

      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('student_image', {
        uri: imageUri,
        name: `student_sheet.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      setProcessingStep('Processing image...');

      const response = await fetch(`${API_BASE_URL}/student_sheet_upload`, {
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
          Alert.alert('Success', 'Answer sheet analyzed successfully!');
          setProcessingStep('');
          setSelectedCOForUpload(null);
          // Refresh COs list
          fetchCOs();
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

  const handleResultsClick = (coId: number, coName: string) => {
    onViewCompletedStudents?.(coId, coName);
  };

  const handleShowMapping = (co: COWithDetails) => {
    setSelectedCOForMapping(co);
    setShowMappingModal(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>CO Mappings</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            </View>
          ) : myCOs.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="folder" size={48} color="#d0d0d0" />
              </View>
              <Text style={styles.emptyTitle}>No mappings yet</Text>
              <Text style={styles.emptyText}>Create your first CO mapping to get started</Text>
            </View>
          ) : (
            <View style={styles.coList}>
              {myCOs.map((co) => {
                const progressPercentage = co.totalStudents && co.totalStudents > 0 
                  ? (co.completedStudents! / co.totalStudents) * 100 
                  : 0;

                return (
                  <View key={co.id} style={styles.coCard}>
                    {/* Header with subject name and delete */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{co.name}</Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaText}>Assessment: {co.ia}</Text>
                        </View>
                        <Text style={styles.metaText}>Semester {co.sem}</Text>
                      </View>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(co.id, co.name)}
                      >
                        <Feather name="trash-2" size={18} color="#999" />
                      </Pressable>
                    </View>

                    {/* Mapping Stats */}
                    <View style={styles.statsSection}>
                      <View style={styles.statsSectionHeader}>
                        <Text style={styles.sectionTitle}>MAPPING STATS</Text>
                        <Pressable 
                          style={styles.infoButton}
                          onPress={() => handleShowMapping(co)}
                        >
                          <Feather name="info" size={16} color="#666" />
                        </Pressable>
                      </View>
                      <View style={styles.statsRow}>
                        <Text style={styles.statText}>
                          Total questions: <Text style={styles.statValue}>{co.questionCount || 0}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Evaluation Progress */}
                    <View style={styles.progressSection}>
                      <Text style={styles.sectionTitle}>EVALUATION PROGRESS</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                      </View>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {co.completedStudents || 0}/{co.totalStudents || 0} students
                        </Text>
                        <Text style={styles.progressPercent}>{Math.round(progressPercentage)}% done</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => handleUploadClick(co.id)}
                      >
                        <Feather name="upload" size={18} color="#000" />
                        <Text style={styles.uploadButtonText}>Upload</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.resultsButton}
                        onPress={() => handleResultsClick(co.id, co.name)}
                      >
                        <Feather name="bar-chart-2" size={18} color="#FFF" />
                        <Text style={styles.resultsButtonText}>Results</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Updated timestamp */}
                    <Text style={styles.updatedText}>Updated: Today</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Upload Answer Sheet</Text>
              <Pressable onPress={() => setShowImagePicker(false)}>
                <Feather name="x" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.pickerOptions}>
              <Pressable style={styles.pickerOption} onPress={handlePickFromCamera}>
                <View style={styles.pickerIcon}>
                  <Feather name="camera" size={32} color="#000" />
                </View>
                <Text style={styles.pickerOptionTitle}>Take Picture</Text>
                <Text style={styles.pickerOptionDesc}>Use your camera</Text>
              </Pressable>

              <Pressable style={styles.pickerOption} onPress={handlePickFromGallery}>
                <View style={styles.pickerIcon}>
                  <Feather name="image" size={32} color="#000" />
                </View>
                <Text style={styles.pickerOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.pickerOptionDesc}>Select from device</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal */}
      <Modal
        visible={isSubmitting}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.processingOverlay}>
          <View style={styles.processingModal}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.processingTitle}>Analyzing Answer Sheet</Text>
            <Text style={styles.processingStep}>{processingStep}</Text>
            <View style={styles.processingSteps}>
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
            <Text style={styles.processingNote}>This may take 30-60 seconds</Text>
          </View>
        </View>
      </Modal>

      {/* Question-to-CO Mapping Modal */}
      <Modal
        visible={showMappingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMappingModal(false)}
      >
        <View style={styles.mappingModalOverlay}>
          <View style={styles.mappingModalContent}>
            <View style={styles.mappingModalHeader}>
              <View>
                <Text style={styles.mappingModalTitle}>Question-to-CO Mapping</Text>
                <Text style={styles.mappingModalSubtitle}>{selectedCOForMapping?.name}</Text>
              </View>
              <Pressable onPress={() => setShowMappingModal(false)}>
                <Feather name="x" size={24} color="#666" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.mappingModalScroll} showsVerticalScrollIndicator={false}>
              {selectedCOForMapping?.coDetails && selectedCOForMapping.coDetails.length > 0 ? (
                <View style={styles.mappingList}>
                  {selectedCOForMapping.coDetails.map((detail, index) => (
                    <View key={index} style={styles.mappingItem}>
                      <View style={styles.mappingQuestionBox}>
                        <Text style={styles.mappingLabel}>Question</Text>
                        <Text style={styles.mappingValue}>{detail.q_no}</Text>
                      </View>
                      <View style={styles.mappingArrow}>
                        <Feather name="arrow-right" size={20} color="#999" />
                      </View>
                      <View style={styles.mappingCOBox}>
                        <Text style={styles.mappingLabel}>CO</Text>
                        <Text style={styles.mappingValue}>{detail.co_no}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.mappingEmpty}>
                  <Feather name="inbox" size={48} color="#d0d0d0" />
                  <Text style={styles.mappingEmptyText}>No mappings available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -1,
    fontFamily: 'System',
  },
  coList: {
    gap: 20,
  },
  coCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  subjectName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  metaRow: {
    marginBottom: 2,
  },
  metaText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statsSection: {
    marginBottom: 16,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  infoButton: {
    padding: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  statText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '700',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  statLabel: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  progressPercent: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  resultsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  resultsButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  updatedText: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'left',
    fontWeight: '500',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  loadingSpinner: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  pickerOptions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  pickerOption: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  pickerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  processingStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  processingSteps: {
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
  processingNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  mappingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mappingModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  mappingModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mappingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  mappingModalSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mappingModalScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  mappingList: {
    gap: 12,
    paddingBottom: 20,
  },
  mappingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  mappingQuestionBox: {
    flex: 1,
    alignItems: 'center',
  },
  mappingCOBox: {
    flex: 1,
    alignItems: 'center',
  },
  mappingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mappingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  mappingArrow: {
    marginHorizontal: 16,
  },
  mappingEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  mappingEmptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
  },
});
