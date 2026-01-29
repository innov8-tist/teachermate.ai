import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CroppedSection } from './pdf-cropper-screen';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';

export interface StudentQuestion {
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
  processingState?: 'idle' | 'processing' | 'success' | 'error';
  isSubmitted?: boolean;
}

interface StudentAnswerSheetScreenProps {
  onBack: () => void;
  onSubmit: () => void;
  evaluationId: number;
  rollNumber: string;
  uploadMethod: 'pdf' | 'camera';
  onOpenCropper?: (questionId: string) => void;
  onOpenCamera?: (questionId: string) => void;
  pdfUri?: string;
  questions: StudentQuestion[];
  onQuestionsChange: (questions: StudentQuestion[]) => void;
  pdfFileName?: string; // Add filename for display
  subjectId?: number; // Add subject_id for evaluation
}

export const StudentAnswerSheetScreen: React.FC<StudentAnswerSheetScreenProps> = ({
  onBack,
  onSubmit,
  evaluationId,
  rollNumber,
  uploadMethod,
  onOpenCropper,
  onOpenCamera,
  pdfUri,
  questions,
  onQuestionsChange,
  pdfFileName,
  subjectId
}) => {
  const { token, teacher } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (questions.length === 0) {
      fetchQuestions();
    } else {
      setLoading(false);
    }
  }, [evaluationId, rollNumber, questions.length]); // Add rollNumber to dependencies

  const fetchQuestions = async () => {
    if (!evaluationId) {
      Alert.alert('Error', 'Evaluation ID not found');
      return;
    }

    setLoading(true);
    try {
      console.log('📥 Fetching questions for evaluation:', evaluationId);

      const response = await fetch(`${BASE_URL}/evaluation/${evaluationId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      console.log('✅ Questions fetched:', data);

      if (data.questions) {
        const fetchedQuestions: StudentQuestion[] = data.questions.map((q: any) => ({
          id: q.id,
          label: `Question ${q.id}`,
          images: [],
          croppedSections: [],
          processingState: 'idle',
          isSubmitted: false,
        }));

        console.log('✅ Loaded questions for student:', fetchedQuestions);
        onQuestionsChange(fetchedQuestions);
      }
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      Alert.alert('Error', 'Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (question: StudentQuestion) => {
    if (!token || !evaluationId) {
      Alert.alert('Authentication Required', 'Please log in again to evaluate questions.');
      return;
    }

    if ((question.croppedSections?.length || 0) === 0) {
      Alert.alert('No Images', 'Please add images to this question before evaluation.');
      return;
    }

    if (question.isSubmitted) {
      Alert.alert('Already Evaluated', 'This question has already been evaluated.');
      return;
    }

    // Set question to processing state
    const updatedQuestions = questions.map(q =>
      q.id === question.id ? { ...q, processingState: 'processing' as const } : q
    );
    onQuestionsChange(updatedQuestions);

    await submitQuestion(question);
  };

  const submitQuestion = async (question: StudentQuestion) => {
    if (!evaluationId || !question.croppedSections || question.croppedSections.length === 0 || !token) {
      console.error('❌ Missing required data for submission');
      Alert.alert('Error', 'Missing authentication or data. Please log in again.');
      return;
    }

    try {
      console.log(`📤 Evaluating student answer for question ${question.id}...`);

      const formData = new FormData();
      formData.append('question_no', question.id);
      formData.append('subject_id', (subjectId || evaluationId).toString()); // Use subjectId if available, fallback to evaluationId
      formData.append('reg_no', rollNumber);

      // Add all cropped images for this question
      for (let i = 0; i < question.croppedSections.length; i++) {
        const section = question.croppedSections[i];
        if (section.previewUri) {
          formData.append('answer_images', {
            uri: section.previewUri,
            type: 'image/png',
            name: `${rollNumber}_question_${question.id}_${i}.png`,
          } as any);
        }
      }

      const response = await fetch(`${BASE_URL}/evaluate-student-answer`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to evaluate answer');
      }

      const result = await response.json();
      console.log(`✅ Student answer ${question.id} evaluated successfully:`, result);

      // Update state to success and mark as submitted
      const successQuestions = questions.map(q =>
        q.id === question.id
          ? { ...q, processingState: 'success' as const, isSubmitted: true }
          : q
      );
      onQuestionsChange(successQuestions);

      // Update progress in backend
      try {
        // Get the progress ID from the evaluation and student
        const progressResponse = await fetch(`${BASE_URL}/api/evaluation/student-progress/${evaluationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          const studentProgress = progressData.recent_progress?.find(
            (p: any) => p.student_reg_no === rollNumber
          );

          if (studentProgress) {
            // Mark question as completed
            const completeFormData = new FormData();
            completeFormData.append('question_no', question.id);

            await fetch(`${BASE_URL}/api/evaluation/student-progress/${studentProgress.id}/complete-question`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              body: completeFormData,
            });

            console.log(`✅ Question ${question.id} marked as completed in progress`);
          }
        }
      } catch (progressError) {
        console.warn('⚠️ Failed to update progress, but evaluation succeeded:', progressError);
      }

      // Check if all questions are now submitted
      const allSubmitted = successQuestions.every(q => q.isSubmitted);
      if (allSubmitted) {
        Alert.alert('Success', 'All answers evaluated successfully!', [
          { text: 'OK', onPress: onSubmit }
        ]);
      }

    } catch (error) {
      console.error(`❌ Error evaluating student answer ${question.id}:`, error);

      // Update state to error
      const errorQuestions = questions.map(q =>
        q.id === question.id ? { ...q, processingState: 'error' as const } : q
      );
      onQuestionsChange(errorQuestions);

      Alert.alert('Evaluation Error', `Failed to evaluate ${question.label}: ${error}`);
    }
  };

  const handleAddImage = (questionId: string) => {
    if (uploadMethod === 'pdf') {
      if (!pdfUri) {
        Alert.alert('No PDF', 'Please upload a PDF first');
        return;
      }
      onOpenCropper?.(questionId);
    } else if (uploadMethod === 'camera') {
      onOpenCamera?.(questionId);
    }
  };

  const handleRemoveImage = (questionId: string, sectionIndex: number) => {
    const updatedQuestions = questions.map(q =>
      q.id === questionId
        ? {
          ...q,
          croppedSections: (q.croppedSections || []).filter((_, idx) => idx !== sectionIndex),
          processingState: 'idle' as const,
          isSubmitted: false
        }
        : q
    );
    onQuestionsChange(updatedQuestions);
  };

  const renderImageBox = (question: StudentQuestion) => {
    const croppedSections = question.croppedSections || [];
    const visibleSections = croppedSections.slice(0, 2);
    const remainingCount = croppedSections.length - 2;

    return (
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        {/* Show up to 2 cropped sections */}
        {visibleSections.map((section, index) => (
          <View key={index} className="relative">
            {section.previewUri ? (
              <Image
                source={{ uri: section.previewUri }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  backgroundColor: '#E5E7EB',
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name={uploadMethod === 'camera' ? 'camera' : 'file-text'} size={40} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 mt-2">
                  {uploadMethod === 'camera' ? 'Photo' : `Page ${section.pageNumber}`}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleRemoveImage(question.id, index)}
              disabled={question.isSubmitted}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 4,
                opacity: question.isSubmitted ? 0.5 : 1,
              }}
            >
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add button or remaining count */}
        {croppedSections.length < 2 ? (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            disabled={question.isSubmitted}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: question.isSubmitted ? '#E5E7EB' : '#D1D5DB',
              backgroundColor: question.isSubmitted ? '#F9FAFB' : '#F9FAFB',
              opacity: question.isSubmitted ? 0.5 : 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Feather name={uploadMethod === 'camera' ? 'camera' : 'plus'} size={32} color="#9CA3AF" />
          </TouchableOpacity>
        ) : remainingCount > 0 ? (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#E5E7EB',
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text className="text-gray-700 text-2xl font-bold">+{remainingCount}</Text>
            <Text className="text-gray-500 text-xs mt-1">more</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: '#D1D5DB',
              backgroundColor: '#F9FAFB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Feather name={uploadMethod === 'camera' ? 'camera' : 'plus'} size={32} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-4 border-b border-gray-100">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={onBack} className="mr-4">
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 flex-1">Student Answer Sheet</Text>
        </View>
        <View className="flex-row items-center">
          <View className="bg-gray-100 px-3 py-1 rounded-full mr-3">
            <Text className="text-black font-semibold text-sm">Roll: {rollNumber}</Text>
          </View>
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-800 font-semibold text-sm capitalize">
              {uploadMethod === 'camera' ? 'Camera Mode' : 'PDF Mode'}
            </Text>
          </View>
          {uploadMethod === 'pdf' && pdfFileName && (
            <View className="bg-purple-100 px-3 py-1 rounded-full ml-2">
              <Text className="text-purple-800 font-semibold text-xs">
                📄 {pdfFileName.length > 15 ? `${pdfFileName.substring(0, 15)}...` : pdfFileName}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6 pb-32">
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#000" />
              <Text className="text-gray-600 text-base mt-4 font-medium">Loading questions...</Text>
            </View>
          ) : questions.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Feather name="inbox" size={64} color="#D1D5DB" />
              <Text className="text-gray-600 text-lg mt-4 font-semibold">No questions found</Text>
              <Text className="text-gray-500 text-sm mt-2">Please check the evaluation</Text>
            </View>
          ) : (
            questions.map((question) => (
              <View
                key={question.id}
                className="mb-5 bg-white rounded-2xl p-5"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold text-gray-900">
                    {question.label}
                  </Text>

                  {/* Evaluation button */}
                  <TouchableOpacity
                    onPress={() => handleSubmitQuestion(question)}
                    disabled={question.processingState === 'processing' || question.isSubmitted}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: question.isSubmitted ? '#000' : '#000',
                      backgroundColor: question.isSubmitted ? '#000' : '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: question.processingState === 'processing' ? 0.6 : 1,
                    }}
                    activeOpacity={0.7}
                  >
                    {question.processingState === 'processing' ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : question.isSubmitted ? (
                      <Feather name="check-circle" size={18} color="#fff" strokeWidth={2.5} />
                    ) : (
                      <Feather name="zap" size={18} color="#000" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>
                {renderImageBox(question)}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};