import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';

interface EvaluationResultsScreenProps {
  evaluationId: number;
  subjectName: string;
  onBack: () => void;
}

interface StudentResult {
  student_reg_no: string;
  completed_questions: number;
  total_questions: number;
  total_marks: number;
  max_possible_marks: number;
}

interface StudentDetailedResult {
  question_no: string;
  mark_score: number;
  total_mark: number;
  feedback: string[];
}

export const EvaluationResultsScreen: React.FC<EvaluationResultsScreenProps> = ({
  evaluationId,
  subjectName,
  onBack,
}) => {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetailedResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStudentResults();
  }, [evaluationId]);

  const fetchStudentResults = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      console.log('📊 Fetching evaluation results for evaluation:', evaluationId);
      
      const response = await fetch(`${BASE_URL}/api/evaluation/${evaluationId}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch evaluation results');
      }

      const data = await response.json();
      console.log('✅ Evaluation results fetched:', data);
      
      setStudents(data.students || []);
    } catch (error) {
      console.error('❌ Error fetching evaluation results:', error);
      Alert.alert('Error', 'Failed to load evaluation results. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetails = async (studentRegNo: string) => {
    if (!token) return;
    
    setIsLoadingDetails(true);
    try {
      console.log('📋 Fetching detailed results for student:', studentRegNo);
      
      const response = await fetch(`${BASE_URL}/api/evaluation/${evaluationId}/student/${studentRegNo}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student details');
      }

      const data = await response.json();
      console.log('✅ Student details fetched:', data);
      
      setStudentDetails(data.results || []);
      setSelectedStudent(studentRegNo);
      setExpandedFeedback(new Set()); // Reset expanded state for new student
    } catch (error) {
      console.error('❌ Error fetching student details:', error);
      Alert.alert('Error', 'Failed to load student details. Please try again.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const toggleFeedback = (questionNo: string) => {
    setExpandedFeedback(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionNo)) {
        newSet.delete(questionNo);
      } else {
        newSet.add(questionNo);
      }
      return newSet;
    });
  };

  const handleDeleteStudent = (studentRegNo: string) => {
    Alert.alert(
      'Delete Student Results',
      `Are you sure you want to delete all evaluation results for ${studentRegNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/evaluation/${evaluationId}/student/${studentRegNo}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Student results deleted successfully');
                fetchStudentResults();
                if (selectedStudent === studentRegNo) {
                  setSelectedStudent(null);
                  setStudentDetails([]);
                }
              } else {
                Alert.alert('Error', 'Failed to delete student results');
              }
            } catch (error) {
              console.error('Error deleting student results:', error);
              Alert.alert('Error', 'Failed to delete student results');
            }
          },
        },
      ]
    );
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getMarksPercentage = (earned: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((earned / total) * 100);
  };

  // Detailed view for selected student
  if (selectedStudent) {
    const student = students.find(s => s.student_reg_no === selectedStudent);
    
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => setSelectedStudent(null)}>
            <Feather name="arrow-left" size={24} color="#000" />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{selectedStudent}</Text>
              <View style={styles.headerTotalBadge}>
                <Text style={styles.headerTotalText}>
                  {student?.total_marks.toFixed(1) || '0.0'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Results Table */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoadingDetails ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Question</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Total</Text>
                  <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>F/B</Text>
                </View>
                {studentDetails.map((result, index) => {
                  const hasFeedback = result.mark_score < result.total_mark && result.feedback && result.feedback.length > 0;
                  const isExpanded = expandedFeedback.has(result.question_no);
                  
                  return (
                    <View key={index}>
                      <View style={styles.tableRow}>
                        <View style={styles.questionColumn}>
                          <Text style={styles.tableCell}>Q{result.question_no}</Text>
                        </View>
                        <View style={[styles.scoreContainer, { flex: 1 }]}>
                          <Text style={styles.scoreText}>{result.mark_score.toFixed(1)}</Text>
                        </View>
                        <View style={[styles.totalContainer, { flex: 1 }]}>
                          <Text style={styles.totalText}>{result.total_mark}</Text>
                        </View>
                        <View style={[styles.feedbackColumn, { flex: 0.8 }]}>
                          {hasFeedback ? (
                            <Pressable
                              style={styles.feedbackToggle}
                              onPress={() => toggleFeedback(result.question_no)}
                            >
                              <Feather 
                                name="info" 
                                size={16} 
                                color={isExpanded ? "#e74c3c" : "#666"} 
                              />
                            </Pressable>
                          ) : (
                            <Text style={styles.noFeedbackText}>N/A</Text>
                          )}
                        </View>
                      </View>
                      {hasFeedback && isExpanded && (
                        <View style={styles.feedbackContainer}>
                          {result.feedback.map((feedbackItem, feedbackIndex) => (
                            <View key={feedbackIndex} style={styles.feedbackItem}>
                              <Text style={styles.feedbackBullet}>•</Text>
                              <Text style={styles.feedbackText}>{feedbackItem}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Questions Completed</Text>
                  <Text style={styles.summaryValue}>
                    {student?.completed_questions}/{student?.total_questions}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Marks</Text>
                  <Text style={styles.summaryValue}>
                    {student?.total_marks.toFixed(1)}/{student?.max_possible_marks}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Percentage</Text>
                  <Text style={styles.summaryValue}>
                    {getMarksPercentage(student?.total_marks || 0, student?.max_possible_marks || 0)}%
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // Main results list view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Evaluation Results</Text>
        </View>
      </View>

      {/* Students List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading results...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="bar-chart-2" size={64} color="#d0d0d0" />
            </View>
            <Text style={styles.emptyTitle}>No results yet</Text>
            <Text style={styles.emptyText}>No student evaluations have been completed</Text>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {students.map((student, index) => (
              <Pressable
                key={index}
                style={styles.studentCard}
                onPress={() => fetchStudentDetails(student.student_reg_no)}
              >
                <View style={styles.studentIconContainer}>
                  <Feather name="user" size={24} color="#000" />
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentRegno}>{student.student_reg_no}</Text>
                  <Text style={styles.studentMeta}>
                    Answered: {student.completed_questions}/{student.total_questions}
                  </Text>
                </View>
                <View style={styles.progressInfo}>
                  <View style={styles.totalMarksBadge}>
                    <Text style={styles.totalMarksText}>
                      {student.total_marks.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteStudent(student.student_reg_no);
                  }}
                >
                  <Feather name="trash-2" size={18} color="#999" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerTotalBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  studentsList: {
    gap: 12,
    paddingBottom: 20,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  studentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentRegno: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressInfo: {
    alignItems: 'flex-end',
  },
  totalMarksBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalMarksText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginLeft: 12,
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  questionColumn: {
    flex: 2,
  },
  tableCell: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  feedbackColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackToggle: {
    padding: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noFeedbackText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  feedbackContainer: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#fef7f7',
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  feedbackBullet: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '700',
    marginRight: 6,
    marginTop: 1,
  },
  feedbackText: {
    fontSize: 11,
    color: '#e74c3c',
    lineHeight: 16,
    flex: 1,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976d2',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalContainer: {
    alignItems: 'center',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});