import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CroppedSection } from './pdf-cropper-screen';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';

export interface Question {
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
  processingState?: 'idle' | 'processing' | 'success' | 'error';
  isSubmitted?: boolean; // Track if question has been submitted
}

interface AttachImagesScreenProps {
  onBack: () => void;
  onSubmit: () => void;
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  onOpenCropper: (questionId: string) => void;
  pdfUri?: string;
  subjectId: number | null;
}

export const AttachImagesScreen: React.FC<AttachImagesScreenProps> = ({ 
  onBack, 
  onSubmit,
  questions,
  onQuestionsChange,
  onOpenCropper,
  pdfUri,
  subjectId
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [questionsFetched, setQuestionsFetched] = useState(false);

  // Debug: Log when questions prop changes
  useEffect(() => {
    console.log('📋 AttachImagesScreen - questions updated:', questions);
  }, [questions]);

  // Fetch questions only once when component mounts with a valid subjectId
  useEffect(() => {
    if (subjectId && !questionsFetched && questions.length === 0) {
      fetchQuestions();
    }
  }, [subjectId, questionsFetched, questions.length]);

  const fetchQuestions = async () => {
    if (!subjectId) {
      Alert.alert('Error', 'Subject ID not found');
      return;
    }

    setLoading(true);
    try {
      console.log('📥 Fetching questions for subject:', subjectId);
      const response = await fetch(`${BASE_URL}/co_questions/${subjectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      console.log('✅ Questions fetched:', data);

      // Transform the API response into Question objects
      if (data.all_questions && Array.isArray(data.all_questions)) {
        const fetchedQuestions: Question[] = data.all_questions.map((qNo: string) => ({
          id: qNo,
          label: `Question ${qNo}`,
          images: [],
          croppedSections: [],
          processingState: 'idle',
          isSubmitted: false
        }));
        
        console.log('✅ Transformed questions:', fetchedQuestions);
        onQuestionsChange(fetchedQuestions);
        setQuestionsFetched(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      Alert.alert('Error', 'Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (question: Question) => {
    if (!token || !subjectId) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    if ((question.croppedSections?.length || 0) === 0) {
      Alert.alert('No Images', 'Please add images to this question before submitting.');
      return;
    }

    if (question.isSubmitted) {
      Alert.alert('Already Submitted', 'This question has already been submitted.');
      return;
    }

    // Set question to processing state
    const updatedQuestions = questions.map(q =>
      q.id === question.id ? { ...q, processingState: 'processing' as const } : q
    );
    onQuestionsChange(updatedQuestions);

    await submitQuestion(question);
  };

  const submitQuestion = async (question: Question) => {
    if (!subjectId || !question.croppedSections || question.croppedSections.length === 0 || !token) {
      return;
    }

    try {
      console.log(`📤 Submitting question ${question.id} to backend...`);
      
      const formData = new FormData();
      formData.append('question_no', question.id);
      formData.append('subject_id', subjectId.toString());

      // Add all cropped images for this question
      for (let i = 0; i < question.croppedSections.length; i++) {
        const section = question.croppedSections[i];
        if (section.previewUri) {
          formData.append('answer_images', {
            uri: section.previewUri,
            type: 'image/png',
            name: `question_${question.id}_${i}.png`,
          } as any);
        }
      }

      const response = await fetch(`${BASE_URL}/extract_answer_schema`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit question');
      }

      const result = await response.json();
      console.log(`✅ Question ${question.id} submitted successfully:`, result);

      // Update state to success and mark as submitted
      const successQuestions = questions.map(q =>
        q.id === question.id 
          ? { ...q, processingState: 'success' as const, isSubmitted: true } 
          : q
      );
      onQuestionsChange(successQuestions);

    } catch (error) {
      console.error(`❌ Error submitting question ${question.id}:`, error);
      
      // Update state to error
      const errorQuestions = questions.map(q =>
        q.id === question.id ? { ...q, processingState: 'error' as const } : q
      );
      onQuestionsChange(errorQuestions);
      
      Alert.alert('Submission Error', `Failed to submit ${question.label}: ${error}`);
    }
  };
  const handleAddImage = (questionId: string) => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Please upload a PDF first');
      return;
    }
    onOpenCropper(questionId);
  };

  const handleRemoveImage = (questionId: string, sectionIndex: number) => {
    const updatedQuestions = questions.map(q =>
      q.id === questionId
        ? { 
            ...q, 
            croppedSections: (q.croppedSections || []).filter((_, idx) => idx !== sectionIndex),
            processingState: 'idle' as const, // Reset state when images change
            isSubmitted: false // Allow resubmission
          }
        : q
    );
    onQuestionsChange(updatedQuestions);
  };

  const hasImages = (question: Question) => {
    return (question.croppedSections?.length || 0) > 0;
  };

  const renderImageBox = (question: Question) => {
    const croppedSections = question.croppedSections || [];
    console.log(`🖼️ Rendering question ${question.id}, cropped sections:`, croppedSections);
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
                <Feather name="file-text" size={40} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 mt-2">Page {section.pageNumber}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleRemoveImage(question.id, index)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 4,
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
            <Feather name="plus" size={32} color="#9CA3AF" />
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
            <Feather name="plus" size={32} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Attach Images</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6 pb-32">
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text className="text-gray-600 text-base mt-4 font-medium">Loading questions...</Text>
            </View>
          ) : questions.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Feather name="inbox" size={64} color="#D1D5DB" />
              <Text className="text-gray-600 text-lg mt-4 font-semibold">No questions found</Text>
              <Text className="text-gray-500 text-sm mt-2">Please check your CO template</Text>
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
                  
                  {/* Much smaller checkbox submit button */}
                  <TouchableOpacity
                    onPress={() => handleSubmitQuestion(question)}
                    disabled={question.processingState === 'processing' || question.isSubmitted}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: question.isSubmitted ? '#10B981' : '#14B8A6',
                      backgroundColor: question.isSubmitted ? '#10B981' : '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: question.processingState === 'processing' ? 0.6 : 1,
                    }}
                    activeOpacity={0.7}
                  >
                    {question.processingState === 'processing' ? (
                      <ActivityIndicator size="small" color="#14B8A6" />
                    ) : question.isSubmitted ? (
                      <Feather name="check" size={16} color="#fff" strokeWidth={2.5} />
                    ) : (
                      <Feather name="check" size={16} color="#14B8A6" strokeWidth={2.5} />
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
