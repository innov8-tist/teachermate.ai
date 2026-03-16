import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';
import { StudentUploadModal, StudentUploadData } from './student-upload-modal';
import { UploadAnswerKeyModal } from './upload-answer-key-modal';
import { Alert } from '@/utils/alert';

interface EvaluationRecord {
  evaluation_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  semester: string;
  branch: string;
  ia: string;
  total_questions: number;
  completed_questions: number;
  total_students: number;
  completed_students: number;
  created_at: string;
}

interface EvaluationScreenProps {
  onViewResults: (evaluationId: number, subjectName: string, studentRegNo?: string) => void;
  onNavigateToCOMapper?: (studentRegNo: string) => void; // Navigate to CO Mapper
  refreshTrigger?: number; // Increment this to trigger refresh
}

export const EvaluationScreen: React.FC<EvaluationScreenProps> = ({ onViewResults, onNavigateToCOMapper, refreshTrigger }) => {
  const { token, teacher } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);

  useEffect(() => {
    fetchEvaluations();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const fetchEvaluations = async () => {
    if (!token || !teacher) {
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${BASE_URL}/evaluations/${teacher.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
      } else {
        console.error('Failed to fetch evaluations:', response.status);
        Alert.alert('Error', 'Failed to load evaluations. Please try again.');
      }
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Request took too long. Please check your connection and try again.');
      } else if (error.message?.includes('Network')) {
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to load evaluations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (evaluationId: number, evaluationName: string) => {
    Alert.alert(
      'Delete Evaluation',
      `Are you sure you want to delete ${evaluationName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/evaluation/${evaluationId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Evaluation deleted successfully');
                fetchEvaluations();
              } else {
                Alert.alert('Error', 'Failed to delete evaluation');
              }
            } catch (error) {
              console.error('Error deleting evaluation:', error);
              Alert.alert('Error', 'Failed to delete evaluation');
            }
          },
        },
      ]
    );
  };

  const handleUploadClick = (evaluationId: number) => {
    setSelectedEvaluationId(evaluationId);
    setShowUploadModal(true);
  };

  const handleUploadModalConfirm = async (studentData: StudentUploadData) => {
    if (selectedEvaluationId && studentData.progressId) {
      // DON'T close modal yet - let it show loading state

      // Call the start evaluation endpoint
      try {
        console.log('🚀 Starting evaluation for progress_id:', studentData.progressId);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for evaluation

        const response = await fetch(`${BASE_URL}/api/evaluation/start-evaluation/${studentData.progressId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Evaluation completed:', result);

          // NOW close the modal after success
          setShowUploadModal(false);
          setSelectedEvaluationId(null);

          Alert.alert('Success', `Evaluation completed! Score: ${result.data.total_marks_obtained}/${result.data.total_marks_possible}`);
          fetchEvaluations(); // Refresh the list
        } else {
          const errorText = await response.text();
          console.error('❌ Evaluation failed:', errorText);

          // Close modal on error too
          setShowUploadModal(false);
          setSelectedEvaluationId(null);

          Alert.alert('Error', 'Evaluation failed. Please try again.');
        }
      } catch (error: any) {
        console.error('❌ Error starting evaluation:', error);

        // Close modal on error
        setShowUploadModal(false);
        setSelectedEvaluationId(null);

        if (error.name === 'AbortError') {
          Alert.alert('Timeout', 'Evaluation took too long. The file might be too large or the server is busy. Please try again.');
        } else if (error.message?.includes('Network')) {
          Alert.alert('Network Error', 'Please check your internet connection and try again.');
        } else {
          Alert.alert('Error', 'Failed to start evaluation. Please try again.');
        }
      }
    } else {
      // No progress ID - this shouldn't happen with the new flow
      console.error('❌ No progress ID found after evaluation');
      setShowUploadModal(false);
      setSelectedEvaluationId(null);
      Alert.alert('Error', 'Failed to complete evaluation');
    }
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setSelectedEvaluationId(null);
  };

  const handleViewStudentResults = (studentRegNo: string, progressId: number) => {
    // Navigate to results view for this specific student
    console.log(`📊 Viewing results for student ${studentRegNo}, progress ID: ${progressId}`);
    if (selectedEvaluationId) {
      const evaluation = evaluations.find(e => e.evaluation_id === selectedEvaluationId);
      if (evaluation) {
        // Pass the student reg no as the third parameter to filter results
        onViewResults(selectedEvaluationId, evaluation.subject_name, studentRegNo);
      }
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Evaluation Schemas</Text>
          </View>

          {evaluations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="file-text" size={48} color="#d0d0d0" />
              </View>
              <Text style={styles.emptyTitle}>No evaluations yet</Text>
              <Text style={styles.emptyText}>
                Upload an answer schema to get started
              </Text>
            </View>
          ) : (
            <View style={styles.evaluationList}>
              {/* Show all evaluations in card format */}
              {evaluations.map((evaluation) => {
                const studentProgressPercentage = evaluation.total_students > 0
                  ? Math.round((evaluation.completed_students / evaluation.total_students) * 100)
                  : 0;

                return (
                  <View key={evaluation.evaluation_id} style={styles.evaluationCard}>
                    {/* Header with subject name and delete */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{evaluation.subject_name}</Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaText}>{evaluation.subject_code} • {evaluation.ia}</Text>
                        </View>
                        <Text style={styles.metaText}>Semester {evaluation.semester}</Text>
                      </View>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(evaluation.evaluation_id, evaluation.subject_name)}
                      >
                        <Feather name="trash-2" size={18} color="#999" />
                      </Pressable>
                    </View>

                    {/* Evaluation Stats */}
                    <View style={styles.statsSection}>
                      <Text style={styles.sectionTitle}>EVALUATION STATS</Text>
                      <View style={styles.statsRow}>
                        <Text style={styles.statText}>
                          Total questions:{' '}
                          <Text style={styles.statValue}>{evaluation.total_questions}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Evaluation Progress */}
                    <View style={styles.progressSection}>
                      <Text style={styles.sectionTitle}>EVALUATION PROGRESS</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[styles.progressFill, { width: `${studentProgressPercentage}%` }]}
                        />
                      </View>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {evaluation.completed_students}/{evaluation.total_students} students
                        </Text>
                        <Text style={styles.progressPercent}>{studentProgressPercentage}% done</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => handleUploadClick(evaluation.evaluation_id)}
                      >
                        <Feather name="upload" size={18} color="#000" />
                        <Text style={styles.uploadButtonText}>Upload</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.resultsButton}
                        onPress={() => onViewResults(evaluation.evaluation_id, evaluation.subject_name)}
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

      {/* Student Upload Modal */}
      <StudentUploadModal
        visible={showUploadModal}
        onClose={handleUploadModalClose}
        onConfirm={handleUploadModalConfirm}
        evaluationId={selectedEvaluationId || 0}
        onViewResults={handleViewStudentResults}
        onNavigateToCOMapper={onNavigateToCOMapper}
      />

      {/* Upload Answer Key Modal */}
      <UploadAnswerKeyModal
        visible={showAnswerKeyModal}
        onClose={() => setShowAnswerKeyModal(false)}
        onSuccess={() => {
          fetchEvaluations();
        }}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  evaluationList: {
    gap: 20,
  },
  // New card styles (for completed evaluations)
  evaluationCard: {
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
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
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
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 0,
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
  // Old card styles (for in-progress evaluations)
  oldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  oldCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  oldSubjectName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  oldMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  oldMetaText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  oldProgressSection: {
    marginBottom: 24,
  },
  oldProgressBar: {
    height: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  oldProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  questionsSection: {
    marginBottom: 20,
  },
  questionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  questionBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
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
});
