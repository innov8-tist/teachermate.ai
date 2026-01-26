'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from '@/constants/api';

interface CompletedStudentsScreenProps {
  subjectId: number;
  subjectName: string;
  onBack: () => void;
}

interface Student {
  regno: string;
  totalMarks?: number;
}

interface StudentMark {
  question_no: string;
  mark: string;
  ia_id: number;
}

export const CompletedStudentsScreen: React.FC<CompletedStudentsScreenProps> = ({
  subjectId,
  subjectName,
  onBack,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [subjectId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students_by_subject/${subjectId}`);
      const data = await response.json();

      // Fetch total marks for each student
      const studentsWithMarks = await Promise.all(
        data.map(async (student: Student) => {
          try {
            const marksResponse = await fetch(`${API_BASE_URL}/student_marks/${subjectId}/${student.regno}`);
            const marks = await marksResponse.json();
            const total = marks.reduce((sum: number, mark: StudentMark) => sum + parseFloat(mark.mark || '0'), 0);
            return { ...student, totalMarks: total };
          } catch (error) {
            return { ...student, totalMarks: 0 };
          }
        })
      );

      setStudents(studentsWithMarks);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentMarks = async (regno: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/student_marks/${subjectId}/${regno}`);
      const data = await response.json();
      setStudentMarks(data);
      setSelectedStudent(regno);
    } catch (error) {
      console.error('Error fetching student marks:', error);
    }
  };

  const handleDeleteStudent = (regno: string) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete all marks for ${regno}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/student_marks/${subjectId}/${regno}`, {
                method: 'DELETE',
              });
              const result = await response.json();

              if (result.status === 'success') {
                Alert.alert('Success', 'Student marks deleted successfully');
                // Refresh the students list
                fetchStudents();
                // If we're viewing this student's marks, go back to list
                if (selectedStudent === regno) {
                  setSelectedStudent(null);
                  setStudentMarks([]);
                }
              } else {
                Alert.alert('Error', result.message || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete student marks');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  if (selectedStudent) {
    const totalMarks = studentMarks.reduce((sum, mark) => sum + parseFloat(mark.mark || '0'), 0);

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
                <Text style={styles.headerTotalText}>{totalMarks.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>{subjectName}</Text>
          </View>
        </View>

        {/* Marks Table */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Question</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Mark</Text>
            </View>
            {studentMarks.map((mark, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{mark.question_no}</Text>
                <View style={[styles.markBadge, { flex: 1 }]}>
                  <Text style={styles.markText}>{mark.mark}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Total Marks */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Marks</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalValue}>
                {studentMarks.reduce((sum, mark) => sum + parseFloat(mark.mark || '0'), 0).toFixed(1)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#000" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Completed Students</Text>
          <Text style={styles.headerSubtitle}>{subjectName}</Text>
        </View>
      </View>

      {/* Students List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="user-x" size={64} color="#d0d0d0" />
            </View>
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptyText}>No students answer sheets submited</Text>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {students.map((student, index) => (
              <Pressable
                key={index}
                style={styles.studentCard}
                onPress={() => fetchStudentMarks(student.regno)}
              >
                <View style={styles.studentIconContainer}>
                  <Feather name="user" size={24} color="#000" />
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentRegno}>{student.regno}</Text>
                  <Text style={styles.studentLabel}>Registration Number</Text>
                </View>
                <View style={styles.totalMarksBadge}>
                  <Text style={styles.totalMarksText}>
                    {student.totalMarks?.toFixed(1) || '0.0'}
                  </Text>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteStudent(student.regno);
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
    padding: 8,
    marginRight: 12,
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
    marginBottom: 2,
  },
  studentLabel: {
    fontSize: 12,
    color: '#999',
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
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  tableCell: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  markBadge: {
    alignItems: 'flex-end',
  },
  markText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  totalMarksBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  totalMarksText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
});
