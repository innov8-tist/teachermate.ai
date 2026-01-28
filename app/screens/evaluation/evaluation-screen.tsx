import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';

interface EvaluationRecord {
  evaluation_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  semester: string;
  total_questions: number;
  completed_questions: number;
  created_at: string;
}

interface EvaluationScreenProps {
  onViewDetails: (evaluationId: number) => void;
}

export const EvaluationScreen: React.FC<EvaluationScreenProps> = ({ onViewDetails }) => {
  const { token, teacher } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      {evaluations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>No evaluations yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload an answer schema to get started
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {evaluations.map((evaluation) => {
              const progress = getProgressPercentage(
                evaluation.completed_questions,
                evaluation.total_questions
              );
              const isComplete = evaluation.completed_questions === evaluation.total_questions;

              return (
                <TouchableOpacity
                  key={evaluation.evaluation_id}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => onViewDetails(evaluation.evaluation_id)}
                >
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.subjectName}>{evaluation.subject_name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isComplete ? '#d1fae5' : '#dbeafe' }
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: isComplete ? '#10b981' : '#3b82f6' }
                        ]}
                      >
                        {isComplete ? '✓ Complete' : 'In Progress'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{evaluation.subject_code}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>Semester {evaluation.semester}</Text>
                  </View>

                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <Text style={styles.sectionTitle}>PROGRESS</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: isComplete ? '#10b981' : '#3b82f6'
                          }
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
                              {
                                backgroundColor: isCompleted ? '#10b981' : '#f3f4f6'
                              }
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
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subjectName: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  metaText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  progressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  progressPercent: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
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
});
