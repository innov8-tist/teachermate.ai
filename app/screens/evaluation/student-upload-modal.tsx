import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { pickAndUploadPDF } from '../../utils/pdf-picker';
import { useAuth } from '../../contexts/auth-context';
import { API_BASE_URL } from '../../constants/api';

export interface StudentUploadData {
  rollNumber: string;
  uploadMethod: 'pdf' | 'camera';
  progressId?: number; // Progress ID from database
  pdfId?: string; // PDF ID for display
  pdfFileName?: string; // Filename for display
}

interface RecentProgress {
  id: number;
  student_reg_no: string;
  total_questions: number;
  upload_method: string;
  pdf_id?: string;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  student_reg_no: string;
  student_name: string;
  total_questions: number;
  upload_method: string;
  pdf_id?: string;
  last_updated: string;
  progress_id?: number;  // Add progress_id
}

interface StudentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: StudentUploadData) => Promise<void>;
  evaluationId: number;
  onViewResults?: (studentRegNo: string, progressId: number) => void; // New prop for viewing results
}

export const StudentUploadModal: React.FC<StudentUploadModalProps> = ({
  visible,
  onClose,
  onConfirm,
  evaluationId,
  onViewResults
}) => {
  const { token } = useAuth();
  const [rollNumber, setRollNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'pdf' | 'camera' | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<{ pdfId: string; fileName: string } | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [recentProgress, setRecentProgress] = useState<RecentProgress[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [skipSearch, setSkipSearch] = useState(false); // Flag to skip auto-search after selection

  // Fetch recent progress when modal opens and reset state
  useEffect(() => {
    if (visible && evaluationId) {
      // Reset modal state when opening
      setRollNumber('');
      setSelectedMethod(null);
      setUploadedPdf(null);
      setSearchResults([]);
      setShowSearchResults(false);

      fetchRecentProgress();
    }
  }, [visible, evaluationId]);

  // Debounced search
  useEffect(() => {
    console.log(`🔍 Frontend: useEffect triggered with rollNumber: "${rollNumber}", skipSearch: ${skipSearch}`);

    // If skipSearch flag is set, reset it and don't search
    if (skipSearch) {
      setSkipSearch(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (rollNumber.trim().length >= 2) {
        console.log(`🔍 Frontend: Triggering search for: "${rollNumber.trim()}"`);
        searchStudents(rollNumber.trim());
      } else {
        console.log(`🔍 Frontend: Clearing search results (query too short)`);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [rollNumber]);

  const fetchRecentProgress = async () => {
    if (!token || !evaluationId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluation/student-progress/${evaluationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentProgress(data.recent_progress || []);
      }
    } catch (error) {
      console.error('Error fetching recent progress:', error);
    }
  };

  const searchStudents = async (query: string) => {
    if (!token || !evaluationId) return;

    console.log(`🔍 Frontend: Searching for students with query: "${query}"`);
    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluation/search-students/${evaluationId}?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`🔍 Frontend: Search response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Frontend: Search results:`, data);
        setSearchResults(data.students || []);
        setShowSearchResults(true);
      } else {
        console.error(`🔍 Frontend: Search failed with status ${response.status}`);
        const errorText = await response.text();
        console.error(`🔍 Frontend: Error response:`, errorText);
      }
    } catch (error) {
      console.error('🔍 Frontend: Error searching students:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectStudent = (student: SearchResult | RecentProgress) => {
    const regNo = student.student_reg_no;

    console.log('🎯 selectStudent called:', {
      regNo,
      hasId: 'id' in student,
      hasProgressId: 'progress_id' in student,
      uploadMethod: student.upload_method,
      progressId: 'progress_id' in student ? student.progress_id : ('id' in student ? student.id : null),
      student
    });

    // Check if this student has evaluation data
    // For RecentProgress: has 'id' field
    // For SearchResult: has 'progress_id' field
    const progressId = 'id' in student ? student.id : ('progress_id' in student ? student.progress_id : null);
    const hasProgress = progressId != null && student.upload_method && student.upload_method.trim() !== '';

    console.log('🎯 hasProgress:', hasProgress, 'progressId:', progressId, 'onViewResults:', !!onViewResults);

    if (hasProgress && onViewResults) {
      // Navigate directly to results
      console.log('✅ Navigating to results for student:', regNo, 'progressId:', progressId);
      handleClose();
      onViewResults(regNo, progressId);
      return;
    }

    // No progress yet - fill the input and close search (1 click only!)
    console.log('📝 Filling input for new evaluation and closing search');
    setRollNumber(regNo);
    setShowSearchResults(false);
    setSearchResults([]); // Clear search results so dropdown doesn't reappear
    setSkipSearch(true); // Skip the next auto-search triggered by rollNumber change
  };

  const handleMethodSelect = async (method: 'pdf' | 'camera') => {
    setSelectedMethod(method);

    // If PDF method is selected, immediately trigger PDF upload
    if (method === 'pdf') {
      await handlePdfUpload();
    }
  };

  const handlePdfUpload = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    // Check if we have roll number entered
    if (!rollNumber.trim()) {
      Alert.alert('Error', 'Please enter student roll number first');
      setSelectedMethod(null);
      return;
    }

    try {
      setIsUploadingPdf(true);
      console.log('📤 Calling pickAndUploadPDF with:');
      console.log('  - evaluationId:', evaluationId);
      console.log('  - studentRegNo:', rollNumber.trim());

      const uploadResult = await pickAndUploadPDF(token, {
        evaluationId: evaluationId,
        studentRegNo: rollNumber.trim(),
      });

      if (uploadResult) {
        setUploadedPdf({
          pdfId: uploadResult.pdfId,
          fileName: uploadResult.fileName
        });
        console.log('✅ PDF uploaded successfully:', uploadResult);
        if (uploadResult.progressId) {
          console.log('✅ Progress saved to database with ID:', uploadResult.progressId);
          // Store progress ID for evaluation
          setUploadedPdf({
            pdfId: uploadResult.progressId.toString(), // Store progress ID as pdfId
            fileName: uploadResult.fileName
          });
        }
      } else {
        // User cancelled or upload failed
        setSelectedMethod(null);
      }
    } catch (error) {
      console.error('❌ PDF upload failed:', error);
      setSelectedMethod(null);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleConfirm = async () => {
    if (!rollNumber.trim()) {
      Alert.alert('Error', 'Please enter student roll number');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Error', 'Please select an upload method');
      return;
    }

    // For PDF method, ensure PDF is uploaded
    if (selectedMethod === 'pdf' && !uploadedPdf) {
      Alert.alert('Error', 'Please upload a PDF file');
      return;
    }

    try {
      setIsEvaluating(true);

      await onConfirm({
        rollNumber: rollNumber.trim(),
        uploadMethod: selectedMethod,
        progressId: uploadedPdf?.pdfId ? parseInt(uploadedPdf.pdfId) : undefined,
        pdfId: uploadedPdf?.pdfId,
        pdfFileName: uploadedPdf?.fileName
      });

      // Reset form completely after successful evaluation
      setRollNumber('');
      setSelectedMethod(null);
      setUploadedPdf(null);
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (error) {
      console.error('Error during evaluation:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleClose = () => {
    // Don't allow closing during evaluation
    if (isEvaluating) {
      return;
    }

    setRollNumber('');
    setSelectedMethod(null);
    setUploadedPdf(null);
    setSearchResults([]);
    setShowSearchResults(false);
    onClose();
  };

  const renderRecentProgress = () => {
    if (recentProgress.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.label}>Recent Evaluations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentContainer}>
          {recentProgress.slice(0, 3).map((progress) => (
            <TouchableOpacity
              key={progress.id}
              style={styles.recentCard}
              onPress={() => selectStudent(progress)}
              activeOpacity={0.7}
            >
              <View style={styles.recentHeader}>
                <Text style={styles.recentRollNumber}>{progress.student_reg_no}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#000' }]}>
                  <Text style={styles.statusText}>
                    {progress.upload_method.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.recentFooter}>
                <Text style={styles.recentMethod}>
                  {new Date(progress.updated_at).toLocaleDateString()}
                </Text>
                <Feather name="arrow-right" size={12} color="#000" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    return (
      <View style={styles.searchResultsContainer}>
        {isSearching ? (
          <View style={styles.searchLoading}>
            <ActivityIndicator size="small" color="#000" />
            <Text style={styles.searchLoadingText}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <View style={styles.searchResultsList}>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.student_reg_no}
                style={styles.searchResultItem}
                onPress={() => selectStudent(item)}
                activeOpacity={0.7}
              >
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultRoll}>{item.student_reg_no}</Text>
                  <Text style={styles.searchResultName}>{item.student_name}</Text>
                </View>
                {item.upload_method && (
                  <View style={styles.searchResultProgress}>
                    <Text style={styles.searchResultStats}>
                      {item.upload_method.toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : rollNumber.trim().length >= 2 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No students found</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Upload Student Answer Sheet</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={isEvaluating}>
              <Feather name="x" size={24} color={isEvaluating ? "#ccc" : "#666"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Recent Progress */}
            {renderRecentProgress()}

            {/* Roll Number Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Student Roll Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={rollNumber}
                  onChangeText={(text) => {
                    setRollNumber(text);
                    if (text.trim().length < 2) {
                      setShowSearchResults(false);
                    }
                  }}
                  placeholder="Enter roll number (e.g., 21CSE001)"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onFocus={() => {
                    // Only show search results if we have results and the query is long enough
                    if (rollNumber.trim().length >= 2 && searchResults.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                />
                {isSearching && (
                  <View style={styles.searchIcon}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                )}
              </View>
              {renderSearchResults()}
            </View>

            {/* Upload Method Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Upload Method</Text>

              <TouchableOpacity
                style={[
                  styles.methodOption,
                  selectedMethod === 'pdf' && styles.methodOptionSelected,
                  isUploadingPdf && styles.methodOptionUploading
                ]}
                onPress={() => handleMethodSelect('pdf')}
                disabled={isUploadingPdf}
                activeOpacity={0.7}
              >
                <View style={styles.methodIcon}>
                  {isUploadingPdf ? (
                    <ActivityIndicator size={24} color="#000" />
                  ) : (
                    <Feather
                      name="file-text"
                      size={24}
                      color={selectedMethod === 'pdf' ? '#000' : '#666'}
                    />
                  )}
                </View>
                <View style={styles.methodContent}>
                  <Text style={[
                    styles.methodTitle,
                    selectedMethod === 'pdf' && styles.methodTitleSelected
                  ]}>
                    Upload PDF
                  </Text>
                  {isUploadingPdf ? (
                    <Text style={styles.methodDescription}>
                      Uploading PDF file...
                    </Text>
                  ) : uploadedPdf ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.methodDescription, { color: '#000', flex: 1 }]}>
                        ✓ {uploadedPdf.fileName}
                      </Text>
                      <TouchableOpacity
                        onPress={handlePdfUpload}
                        style={{ marginLeft: 8, padding: 4 }}
                      >
                        <Feather name="refresh-cw" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.methodDescription}>
                      Upload student's answer PDF
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.radioButton,
                  selectedMethod === 'pdf' && styles.radioButtonSelected
                ]}>
                  {selectedMethod === 'pdf' && !isUploadingPdf && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.7}
                disabled={isEvaluating}
              >
                <Text style={[styles.cancelButtonText, isEvaluating && { color: '#ccc' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!rollNumber.trim() || !selectedMethod || (selectedMethod === 'pdf' && !uploadedPdf) || isUploadingPdf || isEvaluating) && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={!rollNumber.trim() || !selectedMethod || (selectedMethod === 'pdf' && !uploadedPdf) || isUploadingPdf || isEvaluating}
                activeOpacity={0.7}
              >
                {isEvaluating ? (
                  <>
                    <ActivityIndicator size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Evaluating...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="play" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Start Evaluation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%', // Reduced from 90% to ensure it fits
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18, // Reduced from 20
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1, // Changed from flex: 1
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16, // Reduced from 24/16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12, // Reduced from 14
    paddingRight: 50,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    top: 14, // Adjusted for new padding
  },
  recentContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  recentCard: {
    width: 130, // Reduced from 140
    padding: 10, // Reduced from 12
    marginRight: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6, // Reduced from 8
  },
  recentRollNumber: {
    fontSize: 11, // Reduced from 12
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 4, // Reduced from 6
    paddingVertical: 2,
    borderRadius: 6, // Reduced from 8
  },
  statusText: {
    fontSize: 9, // Reduced from 10
    fontWeight: '600',
    color: '#fff',
  },
  progressBar: {
    height: 3, // Reduced from 4
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginBottom: 6, // Reduced from 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  recentMethod: {
    fontSize: 9, // Reduced from 10
    color: '#666',
  },
  recentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultsContainer: {
    marginTop: 8,
    maxHeight: 150, // Reduced from 200
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12, // Reduced from 16
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  searchResultsList: {
    maxHeight: 150, // Reduced from 200
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10, // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultRoll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  searchResultName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchResultProgress: {
    alignItems: 'flex-end',
  },
  searchResultStats: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  searchResultPercentage: {
    fontSize: 10,
    color: '#666',
  },
  noResults: {
    padding: 12, // Reduced from 16
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14, // Reduced from 16
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    marginBottom: 10, // Reduced from 12
    backgroundColor: '#F9F9F9',
  },
  methodOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#f9f9f9',
  },
  methodOptionUploading: {
    borderColor: '#000',
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  methodIcon: {
    width: 44, // Reduced from 48
    height: 44, // Reduced from 48
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14, // Reduced from 16
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15, // Reduced from 16
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  methodTitleSelected: {
    color: '#000',
  },
  methodDescription: {
    fontSize: 13, // Reduced from 14
    color: '#666',
    lineHeight: 18, // Reduced from 20
  },
  radioButton: {
    width: 22, // Reduced from 24
    height: 22, // Reduced from 24
    borderRadius: 11, // Reduced from 12
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  radioButtonSelected: {
    borderColor: '#000',
  },
  radioButtonInner: {
    width: 10, // Reduced from 12
    height: 10, // Reduced from 12
    borderRadius: 5, // Reduced from 6
    backgroundColor: '#000',
  },
  actions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12, // Reduced from 14
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  cancelButtonText: {
    fontSize: 15, // Reduced from 16
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Reduced from 14
    borderRadius: 12,
    backgroundColor: '#000',
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    fontSize: 15, // Reduced from 16
    fontWeight: '600',
    color: '#fff',
  },
});