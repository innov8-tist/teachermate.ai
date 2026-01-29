import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';
import { StudentUploadModal, StudentUploadData } from './student-upload-modal';

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
  onViewDetails: (evaluationId: number) => void;
  onStartStudentUpload: (evaluationId: number, studentData: StudentUploadData) => void;
  onViewResults: (evaluationId: number, subjectName: string) => void;
}

export const EvaluationScreen: React.FC<EvaluationScreenProps> = ({ onViewDetails, onStartStudentUpload, onViewResults }) => {
  const { token, teacher } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    if (!token || !teacher) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/evaluations/${teacher.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
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

  const handleUploadModalConfirm = (studentData: StudentUploadData) => {
    if (selectedEvaluationId) {
      setShowUploadModal(false);
      onStartStudentUpload(selectedEvaluationId, studentData);
      setSelectedEvaluationId(null);
    }
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setSelectedEvaluationId(null);
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

  // Separate completed and in-progress evaluations
  const completedEvaluations = evaluations.filter(
    e => e.completed_questions === e.total_questions && e.total_questions > 0
  );
  const inProgressEvaluations = evaluations.filter(
    e => e.completed_questions < e.total_questions || e.total_questions === 0
  );

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
              {/* Show completed evaluations in card format */}
              {completedEvaluations.map((evaluation) => {
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

                    {/* Mapping Stats */}
                    <View style={styles.statsSection}>
                      <View style={styles.statsSectionHeader}>
                        <Text style={styles.sectionTitle}>MAPPING STATS</Text>
                        <Pressable style={styles.infoButton}>
                          <Feather name="info" size={16} color="#666" />
                        </Pressable>
                      </View>
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

              {/* Show in-progress evaluations in old format */}
              {inProgressEvaluations.map((evaluation) => {
                const progress = getProgressPercentage(
                  evaluation.completed_questions,
                  evaluation.total_questions
                );

                return (
                  <TouchableOpacity
                    key={evaluation.evaluation_id}
                    style={styles.oldCard}
                    activeOpacity={0.7}
                    onPress={() => onViewDetails(evaluation.evaluation_id)}
                  >
                    {/* Header */}
                    <View style={styles.oldCardHeader}>
                      <Text style={styles.oldSubjectName}>{evaluation.subject_name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: '#dbeafe' }]}>
                        <Text style={[styles.statusText, { color: '#3b82f6' }]}>
                          In Progress
                        </Text>
                      </View>
                    </View>

                    <View style={styles.oldMetaRow}>
                      <Text style={styles.oldMetaText}>{evaluation.subject_code}</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.oldMetaText}>Semester {evaluation.semester}</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.oldMetaText}>{evaluation.ia}</Text>
                    </View>

                    {/* Progress */}
                    <View style={styles.oldProgressSection}>
                      <Text style={styles.sectionTitle}>PROGRESS</Text>
                      <View style={styles.oldProgressBar}>
                        <View
                          style={[
                            styles.oldProgressFill,
                            { width: `${progress}%`, backgroundColor: '#3b82f6' }
                          ]}
                        />
                      </View>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {evaluation.completed_questions}/{evaluation.total_questions} questions
                        </Text>
                        <Text style={styles.progressPercent}>{progress}% done</Text>
                      </View>
                    </View>

                    {/* Questions Grid */}
                    <View style={styles.questionsSection}>
                      <Text style={styles.sectionTitle}>QUESTIONS</Text>
                      <View style={styles.questionsGrid}>
                        {Array.from({ length: evaluation.total_questions }, (_, i) => {
                          const questionNum = i + 1;
                          const isCompleted = questionNum <= evaluation.completed_questions;

                          return (
                            <View
                              key={i}
                              style={[
                                styles.questionBox,
                                { backgroundColor: isCompleted ? '#10b981' : '#f3f4f6' }
                              ]}
                            >
                              {isCompleted ? (
                                <Feather name="check" size={16} color="#fff" strokeWidth={3} />
                              ) : (
                                <Text style={styles.questionNumber}>{questionNum}</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.footerText}>ID: {evaluation.created_at}</Text>
                      <View style={styles.viewDetails}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <Feather name="arrow-right" size={16} color="#6366f1" />
                      </View>
                    </View>
                  </TouchableOpacity>
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
    color: '#6366f1',
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
