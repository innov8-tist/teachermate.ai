import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/auth-context';

// Define CroppedSection locally since we removed the PDF cropper
export interface CroppedSection {
  questionId: string;
  pdfUri: string;
  pageNumber: number;
  crop: {
    x: number;
    y: number; 
    width: number;
    height: number;
  };
  timestamp: number;
  previewUri?: string;
}
import { networkService } from '../../services/network/network-service';

export interface Question {
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
  processingState?: 'idle' | 'processing' | 'success' | 'error';
  isSubmitted?: boolean; // Track if question has been submitted
  is_completed?: boolean; // Track if question is already completed in DB
}

interface AttachImagesScreenProps {
  onBack: () => void;
  onSubmit: () => void;
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  onOpenCropper: (questionId: string) => void;
  onOpenCamera?: (questionId: string) => void; // Add camera support
  pdfUri?: string;
  subjectId: number | null;
  evaluationId?: number | null; // Optional: if viewing existing evaluation
}

export const AttachImagesScreen: React.FC<AttachImagesScreenProps> = ({
  onBack,
  onSubmit,
  questions,
  onQuestionsChange,
  onOpenCropper,
  onOpenCamera, // Add camera handler
  pdfUri,
  subjectId,
  evaluationId
}) => {
  const { token, teacher, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [questionsFetched, setQuestionsFetched] = useState(false);

  // Debug: Log props on mount
  useEffect(() => {
    console.log('� AuttachImagesScreen mounted with props:', {
      subjectId,
      evaluationId,
      pdfUri,
      questionCount: questions.length
    });
  }, []);

  // Debug: Log auth state
  useEffect(() => {
    console.log('🔐 Auth State:', {
      authLoading,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
      hasTeacher: !!teacher,
      teacherId: teacher?.id
    });
  }, [token, teacher, authLoading]);

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

      // If evaluationId is provided, fetch with completion status
      const endpoint = evaluationId
        ? `${BASE_URL}/evaluation/${evaluationId}/questions`
        : `${BASE_URL}/co_questions/${subjectId}`;

      const headers: Record<string, string> = {};
      if (evaluationId && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      console.log('✅ Questions fetched:', data);

      // If from evaluation endpoint, questions already have completion status
      if (evaluationId && data.questions) {
        const fetchedQuestions: Question[] = data.questions.map((q: any) => ({
          id: q.id,
          label: q.label,
          images: q.images || [],
          croppedSections: (q.croppedSections || []).map((section: any) => ({
            ...section,
            // S3 URLs are complete, only prepend BASE_URL if it's a relative path
            previewUri: section.previewUri?.startsWith('http')
              ? section.previewUri  // Already a complete URL (S3)
              : section.previewUri?.startsWith('/')
                ? `${BASE_URL}${section.previewUri}`  // Relative path
                : section.previewUri
          })),
          processingState: q.is_completed ? 'success' : 'idle',
          isSubmitted: q.is_completed,
          is_completed: q.is_completed
        }));

        console.log('✅ Loaded questions with completion status:', fetchedQuestions);
        onQuestionsChange(fetchedQuestions);
        setQuestionsFetched(true);
      }
      // Otherwise, transform the API response into Question objects
      else if (data.all_questions && Array.isArray(data.all_questions)) {
        const fetchedQuestions: Question[] = data.all_questions.map((qNo: string) => ({
          id: qNo,
          label: `Question ${qNo}`,
          images: [],
          croppedSections: [],
          processingState: 'idle',
          isSubmitted: false,
          is_completed: false
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
    if (authLoading) {
      Alert.alert('Please Wait', 'Authentication is loading...');
      return;
    }

    if (!token || !subjectId) {
      console.error('❌ Missing auth or subject:', { hasToken: !!token, subjectId });
      Alert.alert('Authentication Required', 'Please log in again to submit questions.');
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
      console.error('❌ Missing required data:', {
        hasSubjectId: !!subjectId,
        hasCroppedSections: !!question.croppedSections,
        sectionCount: question.croppedSections?.length || 0,
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      Alert.alert('Error', 'Missing authentication or data. Please log in again.');
      return;
    }

    try {
      console.log(`📤 Submitting question ${question.id} to backend...`);
      console.log(`🔑 Token present: ${token ? 'Yes' : 'No'}, Length: ${token?.length || 0}`);

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

      const response = await networkService.submitForm<any>(`${BASE_URL}/extract_answer_schema`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 60000, // 60 seconds for image processing
        retries: 2,
        showRetryLogs: true,
      });

      console.log(`✅ Question ${question.id} submitted successfully:`, response);

      // Update state to success and mark as submitted
      const successQuestions = questions.map(q =>
        q.id === question.id
          ? { ...q, processingState: 'success' as const, isSubmitted: true }
          : q
      );
      onQuestionsChange(successQuestions);

      // Check if all questions are now submitted
      const allSubmitted = successQuestions.every(q => q.isSubmitted);
      if (allSubmitted) {
        console.log('✅ All questions submitted! Clearing upload progress...');
        // Import and call the cleanup function
        const { clearUploadProgress } = await import('./upload-schema-screen');
        await clearUploadProgress();
      }

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
    // Show options for PDF cropper or camera
    Alert.alert(
      'Add Image',
      'Choose how to add an image for this question',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'From PDF',
          onPress: () => {
            if (!pdfUri) {
              Alert.alert('No PDF', 'Please upload a PDF first');
              return;
            }
            onOpenCropper(questionId);
          },
        },
        {
          text: 'Take Photo',
          onPress: () => {
            if (onOpenCamera) {
              onOpenCamera(questionId);
            } else {
              Alert.alert('Camera Not Available', 'Camera functionality is not available in this context');
            }
          },
        },
      ]
    );
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
                  backgroundColor: '#f0f0f0',
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  backgroundColor: '#f0f0f0',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name="file-text" size={40} color="#999" />
                <Text className="text-xs text-gray-500 mt-2">Page {section.pageNumber}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleRemoveImage(question.id, index)}
              disabled={question.is_completed || question.isSubmitted}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 4,
                opacity: question.is_completed || question.isSubmitted ? 0.5 : 1,
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
            disabled={question.is_completed || question.isSubmitted}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: question.is_completed || question.isSubmitted ? '#e0e0e0' : '#d0d0d0',
              backgroundColor: question.is_completed || question.isSubmitted ? '#f9f9f9' : '#f9f9f9',
              opacity: question.is_completed || question.isSubmitted ? 0.5 : 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={32} color="#999" />
          </TouchableOpacity>
        ) : remainingCount > 0 ? (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#e0e0e0',
              backgroundColor: '#f5f5f5',
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
              borderColor: '#d0d0d0',
              backgroundColor: '#f9f9f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={32} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-black">Attach Images</Text>
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
              <Feather name="inbox" size={64} color="#999" />
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
                  borderWidth: 1,
                  borderColor: '#f0f0f0',
                }}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold text-black">
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
                      <Feather name="check" size={16} color="#fff" strokeWidth={2.5} />
                    ) : (
                      <Feather name="check" size={16} color="#000" strokeWidth={2.5} />
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
