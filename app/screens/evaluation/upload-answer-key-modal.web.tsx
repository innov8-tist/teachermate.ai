import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/auth-context';
import { API_ENDPOINTS } from '../../constants/api';
import { Alert } from '@/utils/alert';

interface COSubject {
  id: number;
  name: string;
  branch: string;
  sem: number;
  ia: string;
}

interface UploadAnswerKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadAnswerKeyModal: React.FC<UploadAnswerKeyModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { token, teacher } = useAuth();
  const [coSubjects, setCoSubjects] = useState<COSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<COSubject | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(false);

  useEffect(() => {
    if (visible && teacher) {
      fetchCOSubjects();
    }
  }, [visible, teacher]);

  const fetchCOSubjects = async () => {
    if (!teacher || !token) return;

    setFetchingSubjects(true);
    try {
      const response = await fetch(API_ENDPOINTS.CO_FETCH(teacher.id), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCoSubjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching CO subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setFetchingSubjects(false);
    }
  };

  const handlePickPDF = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setPdfFile(file);
        setPdfFileName(file.name);
      }
    };
    
    input.click();
  };

  const handleUpload = async () => {
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    if (!pdfFile) {
      Alert.alert('Error', 'Please select a PDF file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('template_id', selectedSubject.id.toString());
      formData.append('answer_key_pdf', pdfFile, pdfFile.name);

      const response = await fetch(API_ENDPOINTS.UPLOAD_EVALUATION_PDF, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        Alert.alert('Success', 'Answer key uploaded successfully!', [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
              onSuccess();
            },
          },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to upload answer key');
      }
    } catch (error) {
      console.error('Error uploading answer key:', error);
      Alert.alert('Error', 'Failed to upload answer key');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSubject(null);
    setPdfFile(null);
    setPdfFileName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Upload Answer Key</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Select Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>Select Subject</Text>
              {fetchingSubjects ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={styles.subjectList}>
                  {coSubjects.map((subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={[
                        styles.subjectCard,
                        selectedSubject?.id === subject.id && styles.subjectCardSelected,
                      ]}
                      onPress={() => setSelectedSubject(subject)}
                    >
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        <Text style={styles.subjectMeta}>
                          {subject.branch} • Sem {subject.sem} • {subject.ia}
                        </Text>
                      </View>
                      {selectedSubject?.id === subject.id && (
                        <Feather name="check-circle" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                  {coSubjects.length === 0 && (
                    <Text style={styles.emptyText}>
                      No CO subjects found. Create a CO mapping first.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Upload PDF */}
            <View style={styles.section}>
              <Text style={styles.label}>Answer Key PDF</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={handlePickPDF}>
                {pdfFile ? (
                  <View style={styles.fileInfo}>
                    <Feather name="file-text" size={24} color="#000" />
                    <Text style={styles.fileName}>{pdfFileName}</Text>
                    <TouchableOpacity onPress={() => {
                      setPdfFile(null);
                      setPdfFileName('');
                    }}>
                      <Feather name="x-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPrompt}>
                    <Feather name="upload" size={32} color="#999" />
                    <Text style={styles.uploadText}>Tap to select PDF</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={loading || !selectedSubject || !pdfFile}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#FFF" />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  closeButton: {
    padding: 4,
    cursor: 'pointer',
  } as any,
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  subjectList: {
    gap: 12,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    cursor: 'pointer',
  } as any,
  subjectCardSelected: {
    backgroundColor: '#F0F0F0',
    borderColor: '#000',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subjectMeta: {
    fontSize: 13,
    color: '#666',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    cursor: 'pointer',
  } as any,
  uploadPrompt: {
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    cursor: 'pointer',
  } as any,
  uploadButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as any,
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
