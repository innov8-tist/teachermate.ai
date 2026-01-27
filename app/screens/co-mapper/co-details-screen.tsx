'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, ActivityIndicator, Image, Pressable } from 'react-native';
import { coService, CODetail } from '@/services/api/co-service';
import { Feather } from '@expo/vector-icons';
import { useImagePicker } from '@/hooks/use-image-picker';
import { API_BASE_URL } from '@/constants/api';

interface CODetailsScreenProps {
  coId: number;
  onBack: () => void;
  onViewCompletedStudents: (coId: number, coName: string) => void;
}

interface SubjectInfo {
  name: string;
  ia: string;
  branch: string;
  sem: number;
}

interface Student {
  regno: string;
}

export const CODetailsScreen: React.FC<CODetailsScreenProps> = ({ coId, onBack, onViewCompletedStudents }) => {
  const [coDetails, setCoDetails] = useState<CODetail[]>([]);
  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  useEffect(() => {
    fetchDetails();
    fetchSubjectInfo();
    fetchStudents();
    fetchTotalStudents();
  }, [coId]);

  const fetchDetails = async () => {
    const data = await coService.fetchCODetails(coId);
    setCoDetails(data);
  };

  const fetchSubjectInfo = async () => {
    try {
      const info = await coService.fetchSubjectInfo(coId);
      setSubjectInfo(info);
    } catch (error) {
      console.error('Error fetching subject info:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students_by_subject/${coId}`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTotalStudents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/co_subject_info/${coId}`);
      const data = await response.json();
      setTotalStudents(data.student_count || 0);
    } catch (error) {
      console.error('Error fetching total students:', error);
    }
  };

  const handlePickFromCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) {
      setSelectedImage(uri);
      setShowImagePicker(false);
      handleSubmit(uri);
    }
  };

  const handlePickFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      setSelectedImage(uri);
      setShowImagePicker(false);
      handleSubmit(uri);
    }
  };

  const handleSubmit = async (imageUri: string) => {
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
          setSelectedImage(null);
          setProcessingStep('');
          // Refresh students list
          fetchStudents();
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

  const uniqueCOs = [...new Set(coDetails.map(d => d.co_no))].length;
  const completedStudents = students.length;
  const progressPercentage = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Subject Header */}
          <View style={styles.header}>
            <Text style={styles.subjectName}>{subjectInfo?.name || 'Loading...'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Assessment: {subjectInfo?.ia || '...'}</Text>
            </View>
            <Text style={styles.metaText}>Semester {subjectInfo?.sem || '...'}</Text>
          </View>

          {/* Mapping Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>MAPPING STATS</Text>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>{coDetails.length}</Text>
              <Text style={styles.statLabel}>questions</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>{uniqueCOs}</Text>
              <Text style={styles.statLabel}>COs</Text>
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
                {completedStudents}/{totalStudents} students
              </Text>
              <Text style={styles.progressPercent}>{Math.round(progressPercentage)}% done</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setShowImagePicker(true)}
          >
            <Feather name="upload" size={20} color="#000" />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resultsButton}
            onPress={() => onViewCompletedStudents(coId, subjectInfo?.name || 'CO')}
          >
            <Feather name="bar-chart-2" size={20} color="#9333ea" />
            <Text style={styles.resultsButtonText}>Results</Text>
          </TouchableOpacity>

          {/* Updated timestamp */}
          <Text style={styles.updatedText}>Updated: Today</Text>
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
    paddingVertical: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  subjectName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -1,
  },
  metaRow: {
    marginBottom: 4,
  },
  metaText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 40,
    fontWeight: '700',
    color: '#6366f1',
    marginRight: 12,
  },
  statLabel: {
    fontSize: 18,
    color: '#666',
    fontWeight: '400',
  },
  progressSection: {
    marginBottom: 32,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  progressPercent: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e8ff',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  resultsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9333ea',
  },
  updatedText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'left',
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
});
