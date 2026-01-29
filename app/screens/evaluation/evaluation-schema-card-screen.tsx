import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';

interface EvaluationSchema {
  evaluation_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  semester: string;
  branch: string;
  ia: string;
  total_questions: number;
  completed_questions: number;
  created_at: string;
}

interface EvaluationSchemaCardScreenProps {
  onViewDetails: (evaluationId: number) => void;
}

export const EvaluationSchemaCardScreen: React.FC<EvaluationSchemaCardScreenProps> = ({ 
  onViewDetails 
}) => {
  const { token, teacher } = useAuth();
  const [schemas, setSchemas] = useState<EvaluationSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchemas();
  }, []);

  const fetchSchemas = async () => {
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
        // Only show schemas where all questions are completed
        const completedSchemas = (data.evaluations || []).filter(
          (schema: EvaluationSchema) => 
            schema.completed_questions === schema.total_questions && 
            schema.total_questions > 0
        );
        setSchemas(completedSchemas);
      }
    } catch (error) {
      console.error('Error fetching schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (schemaId: number, schemaName: string) => {
    Alert.alert(
      'Delete Schema',
      `Are you sure you want to delete ${schemaName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/evaluation/schema/${schemaId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Schema deleted successfully');
                fetchSchemas();
              } else {
                Alert.alert('Error', 'Failed to delete schema');
              }
            } catch (error) {
              console.error('Error deleting schema:', error);
              Alert.alert('Error', 'Failed to delete schema');
            }
          },
        },
      ]
    );
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

          {schemas.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="file-text" size={48} color="#d0d0d0" />
              </View>
              <Text style={styles.emptyTitle}>No completed schemas yet</Text>
              <Text style={styles.emptyText}>
                Complete all questions in a schema to see it here
              </Text>
            </View>
          ) : (
            <View style={styles.schemaList}>
              {schemas.map((schema) => {
                const progressPercentage = 100; // Always 100% since we filter completed ones

                return (
                  <View key={schema.evaluation_id} style={styles.schemaCard}>
                    {/* Header with subject name and delete */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{schema.subject_name}</Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaText}>{schema.subject_code} • {schema.ia}</Text>
                        </View>
                        <Text style={styles.metaText}>Semester {schema.semester}</Text>
                      </View>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(schema.evaluation_id, schema.subject_name)}
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
                          <Text style={styles.statValue}>{schema.total_questions}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Evaluation Progress */}
                    <View style={styles.progressSection}>
                      <Text style={styles.sectionTitle}>EVALUATION PROGRESS</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                        />
                      </View>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {schema.completed_questions}/{schema.total_questions} students
                        </Text>
                        <Text style={styles.progressPercent}>{progressPercentage}% done</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={styles.uploadButton}>
                        <Feather name="upload" size={18} color="#000" />
                        <Text style={styles.uploadButtonText}>Upload</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.resultsButton}
                        onPress={() => onViewDetails(schema.evaluation_id)}
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
  schemaList: {
    gap: 20,
  },
  schemaCard: {
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
});
