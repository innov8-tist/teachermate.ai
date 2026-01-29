import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Text, BackHandler, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen } from '@/components/splash-screen';
import { Header } from '@/components/shared/header';
import { BottomNavigation, TabType } from '@/components/shared/bottom-navigation';
import { HomeScreen } from '@/screens/home/home-screen';
import { EvaluationScreen } from '@/screens/evaluation/evaluation-screen';
import { UploadSchemaScreen } from '@/screens/evaluation/upload-schema-screen';
import { AttachImagesScreen, Question } from '@/screens/evaluation/attach-images-screen';
import { PDFCropperScreen, CroppedSection } from '@/screens/evaluation/pdf-cropper-screen';
import { StudentUploadData } from '@/screens/evaluation/student-upload-modal';
import { ProfileScreen } from '@/screens/profile/profile-screen';
import { COMapperContainer, COSubScreen } from '@/screens/co-mapper/co-mapper-container';
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

import { StudentAnswerSheetScreen } from '@/screens/evaluation/student-answer-sheet-screen';

import { CameraScreen } from '@/screens/evaluation/camera-screen';

type EvaluationSubScreen = 'list' | 'upload' | 'attachImages' | 'pdfCropper' | 'details' | 'studentAnswerSheet' | 'camera';

const UPLOAD_PROGRESS_KEY = '@evaluation_upload_progress';

export default function HomeScreenRefactored() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [coSubScreen, setCoSubScreen] = useState<COSubScreen>('myCOs');
  const [evaluationSubScreen, setEvaluationSubScreen] = useState<EvaluationSubScreen>('list');
  const [pdfUri, setPdfUri] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);
  const [viewingEvaluationId, setViewingEvaluationId] = useState<number | null>(null);
  const [studentUploadData, setStudentUploadData] = useState<StudentUploadData | null>(null);

  // Questions will be fetched from the API based on selected subject
  const [questions, setQuestions] = useState<Question[]>([]);

  // Check for in-progress upload on mount
  useEffect(() => {
    checkInProgressUpload();
  }, []);

  const checkInProgressUpload = async () => {
    try {
      const progressData = await AsyncStorage.getItem(UPLOAD_PROGRESS_KEY);
      if (progressData) {
        const progress = JSON.parse(progressData);
        // Check if upload is less than 24 hours old
        const hoursSinceUpload = (Date.now() - progress.timestamp) / (1000 * 60 * 60);

        if (hoursSinceUpload < 24) {
          Alert.alert(
            'Resume Upload',
            `You have an incomplete upload for "${progress.subject}". Would you like to continue?`,
            [
              {
                text: 'Start New',
                style: 'destructive',
                onPress: async () => {
                  await AsyncStorage.removeItem(UPLOAD_PROGRESS_KEY);
                }
              },
              {
                text: 'Resume',
                onPress: () => {
                  // Restore the state
                  setPdfUri(progress.pdfId);
                  setSelectedSubject(progress.subject);
                  setSelectedSubjectId(progress.subjectId);
                  setActiveTab('evaluation');
                  setEvaluationSubScreen('attachImages');
                }
              }
            ]
          );
        } else {
          // Clear old upload data
          await AsyncStorage.removeItem(UPLOAD_PROGRESS_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking in-progress upload:', error);
    }
  };

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (activeTab === 'co' && coSubScreen !== 'myCOs') {
        setCoSubScreen('myCOs');
        return true;
      }
      if (activeTab === 'evaluation') {
        if (evaluationSubScreen === 'pdfCropper') {
          // Check if we came from student answer sheet or regular attach images
          if (studentUploadData) {
            setEvaluationSubScreen('studentAnswerSheet');
          } else {
            setEvaluationSubScreen('attachImages');
          }
          return true;
        }
        if (evaluationSubScreen === 'camera') {
          // Check if we came from student answer sheet or regular attach images
          if (studentUploadData) {
            setEvaluationSubScreen('studentAnswerSheet');
          } else {
            setEvaluationSubScreen('attachImages');
          }
          return true;
        }
        if (evaluationSubScreen === 'attachImages') {
          setEvaluationSubScreen('upload');
          return true;
        }
        if (evaluationSubScreen === 'upload') {
          setEvaluationSubScreen('list');
          return true;
        }
        if (evaluationSubScreen === 'details') {
          setEvaluationSubScreen('list');
          return true;
        }
        if (evaluationSubScreen === 'studentAnswerSheet') {
          setEvaluationSubScreen('list');
          setStudentUploadData(null);
          setSelectedEvaluationId(null);
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeTab, coSubScreen, evaluationSubScreen]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'co') {
      setCoSubScreen('myCOs');
    }
    if (tab === 'evaluation') {
      setEvaluationSubScreen('list');
      // Reset evaluation state when switching tabs
      setSelectedEvaluationId(null);
      setPdfUri('');
      setQuestions([]);
    }
  };

  const handleStartStudentUpload = async (evaluationId: number, studentData: StudentUploadData) => {
    console.log('🎯 Starting student upload for evaluation:', evaluationId, 'Student:', studentData);
    
    try {
      // First, fetch the evaluation details to get the subject_id (template_id)
      const response = await fetch(`${API_BASE_URL}/evaluation/${evaluationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch evaluation details');
      }

      const data = await response.json();
      const evaluation = data.evaluation;

      console.log('✅ Evaluation data for student upload:', evaluation);
      
      // Check if this is a resume (student already has progress in database)
      // We need to check the database, not just if pdfId exists
      let isResume = false;
      
      if (studentData.pdfId && studentData.uploadMethod === 'pdf') {
        // Check if student progress already exists in database
        try {
          const checkProgressResponse = await fetch(`${API_BASE_URL}/api/evaluation/student-progress/${evaluationId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (checkProgressResponse.ok) {
            const progressData = await checkProgressResponse.json();
            const existingProgress = progressData.recent_progress?.find(
              (p: any) => p.student_reg_no === studentData.rollNumber
            );
            isResume = !!existingProgress;
            console.log(`🔍 Checking if resume: ${isResume ? 'YES' : 'NO'} for student ${studentData.rollNumber}`);
          }
        } catch (error) {
          console.error('Error checking existing progress:', error);
          isResume = false;
        }
      }
      
      if (!isResume) {
        // Create or update student progress for new evaluation
        console.log(`📝 Creating new student progress for ${studentData.rollNumber}`);
        const progressFormData = new FormData();
        progressFormData.append('evaluation_id', evaluationId.toString());
        progressFormData.append('student_reg_no', studentData.rollNumber);
        progressFormData.append('upload_method', studentData.uploadMethod);
        if (studentData.pdfId) {
          progressFormData.append('pdf_id', studentData.pdfId);
          console.log(`📝 Including PDF ID: ${studentData.pdfId}`);
        }
        if (studentData.pdfFileName) {
          progressFormData.append('pdf_filename', studentData.pdfFileName);
          console.log(`📝 Including PDF filename: ${studentData.pdfFileName}`);
        }

        const progressResponse = await fetch(`${API_BASE_URL}/api/evaluation/student-progress`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: progressFormData,
        });

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          console.log('✅ Student progress created/updated:', progressData);
        } else {
          const errorText = await progressResponse.text();
          console.error('❌ Failed to create student progress:', errorText);
        }
      } else {
        console.log('🔄 Resuming existing evaluation for student:', studentData.rollNumber);
        
        // For resume, we need to load existing questions and their completion status
        try {
          const questionsResponse = await fetch(`${API_BASE_URL}/evaluation/${evaluationId}/questions`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            
            // Get student progress to see which questions are completed
            const progressResponse = await fetch(`${API_BASE_URL}/api/evaluation/student-progress/${evaluationId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            // Get completed evaluations for this student
            const evaluationsResponse = await fetch(`${API_BASE_URL}/api/evaluation/student-evaluations/${evaluationId}/${studentData.rollNumber}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (progressResponse.ok && questionsData.questions) {
              const progressData = await progressResponse.json();
              const studentProgress = progressData.recent_progress?.find(
                (p: any) => p.student_reg_no === studentData.rollNumber
              );

              let completedEvaluations: any[] = [];
              if (evaluationsResponse.ok) {
                const evaluationData = await evaluationsResponse.json();
                completedEvaluations = evaluationData.evaluations || [];
                console.log('📊 Completed evaluations data:', completedEvaluations);
              }

              if (studentProgress) {
                // Load questions with completion status and images
                const questionsWithStatus = questionsData.questions.map((q: any) => {
                  const completedEvaluation = completedEvaluations.find((evaluation: any) => evaluation.question_no === q.id);
                  const isCompleted = !!completedEvaluation;
                  
                  // If completed, create mock cropped sections from the evaluation data
                  let croppedSections: any[] = [];
                  if (isCompleted && completedEvaluation && completedEvaluation.student_image_paths) {
                    console.log('📸 Loading images for completed question:', q.id, completedEvaluation.student_image_paths);
                    
                    // Convert student image paths to cropped sections for display
                    croppedSections = completedEvaluation.student_image_paths.map((imagePath: string, index: number) => {
                      // S3 URLs should already be complete, no need to modify them
                      console.log(`  📷 Image ${index + 1}: ${imagePath}`);
                      
                      return {
                        questionId: q.id,
                        pdfUri: '',
                        pageNumber: 1,
                        crop: { x: 0, y: 0, width: 100, height: 100 },
                        timestamp: Date.now(),
                        previewUri: imagePath, // Use the S3 URL directly
                      };
                    });
                  }
                  
                  return {
                    id: q.id,
                    label: `Question ${q.id}`,
                    images: [],
                    croppedSections: croppedSections,
                    processingState: isCompleted ? 'success' as const : 'idle' as const,
                    isSubmitted: isCompleted,
                  };
                });

                console.log('✅ Loaded questions for resume with completion status:', questionsWithStatus);
                console.log('✅ Completed evaluations:', completedEvaluations);
                setQuestions(questionsWithStatus);
              }
            }
          }
        } catch (resumeError) {
          console.warn('⚠️ Could not load resume data, starting fresh:', resumeError);
        }
      }
      
      // Set the state with the correct subject_id
      setSelectedSubjectId(evaluation.template_id); // This is the subject ID!
      setSelectedEvaluationId(evaluationId);
      setStudentUploadData(studentData);
      
      // If PDF was uploaded in the modal, set it here (but not for resume)
      if (studentData.pdfId && studentData.pdfId !== 'existing_pdf') {
        setPdfUri(studentData.pdfId);
      } else if (isResume) {
        // For resume, we might need to set a different PDF URI or handle differently
        setPdfUri(''); // Clear PDF URI for camera mode resume
      }
      
      setEvaluationSubScreen('studentAnswerSheet');
    } catch (error) {
      console.error('❌ Error loading evaluation for student upload:', error);
      Alert.alert('Error', 'Failed to load evaluation details');
    }
  };

  const handleViewEvaluationDetails = async (evaluationId: number) => {
    try {
      console.log('📥 Fetching evaluation details for ID:', evaluationId);

      // Fetch evaluation details
      const response = await fetch(`${API_BASE_URL}/evaluation/${evaluationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch evaluation details');
      }

      const data = await response.json();
      const evaluation = data.evaluation;

      console.log('✅ Evaluation data:', evaluation);
      console.log('  - template_id (subject ID):', evaluation.template_id);
      console.log('  - pdf_id:', evaluation.pdf_id);

      // Set the state - template_id is the subject ID
      setSelectedSubjectId(evaluation.template_id); // This is the subject ID!
      setSelectedEvaluationId(evaluation.template_id); // Keep for compatibility
      setViewingEvaluationId(evaluationId); // Store the evaluation ID
      // Use pdf_id instead of full pdf_uri
      setPdfUri(evaluation.pdf_id); // Just the PDF ID, not the full URL
      setEvaluationSubScreen('details');
    } catch (error) {
      console.error('❌ Error loading evaluation:', error);
      Alert.alert('Error', 'Failed to load evaluation details');
    }
  };

  const handleUploadSchemaSuccess = (pdfId: string, subject: string, subjectId: number) => {
    setPdfUri(pdfId); // Now this is a PDF ID, not a file URI
    setSelectedSubject(subject);
    setSelectedSubjectId(subjectId);
    setEvaluationSubScreen('attachImages');
  };

  const handleOpenCropper = (questionId: string) => {
    setCurrentQuestionId(questionId);
    setEvaluationSubScreen('pdfCropper');
  };

  const handleCropConfirm = (croppedSection: CroppedSection) => {
    console.log('🎯 handleCropConfirm called');
    console.log('📦 Cropped section:', croppedSection);
    console.log('📋 Current questions:', questions);

    const updatedQuestions = questions.map(q =>
      q.id === croppedSection.questionId
        ? {
          ...q,
          croppedSections: [...(q.croppedSections || []), croppedSection]
        }
        : q
    );

    console.log('✅ Updated questions:', updatedQuestions);
    setQuestions(updatedQuestions);
    
    // Navigate back to the correct screen
    if (studentUploadData) {
      setEvaluationSubScreen('studentAnswerSheet');
    } else {
      setEvaluationSubScreen('attachImages');
    }
  };

  const handleCameraConfirm = (croppedSection: CroppedSection) => {
    console.log('📸 handleCameraConfirm called');
    console.log('📦 Camera image:', croppedSection);
    console.log('📋 Current questions:', questions);

    const updatedQuestions = questions.map(q =>
      q.id === croppedSection.questionId
        ? {
          ...q,
          croppedSections: [...(q.croppedSections || []), croppedSection]
        }
        : q
    );

    console.log('✅ Updated questions with camera image:', updatedQuestions);
    setQuestions(updatedQuestions);
    
    // Navigate back to the correct screen
    if (studentUploadData) {
      setEvaluationSubScreen('studentAnswerSheet');
    } else {
      setEvaluationSubScreen('attachImages');
    }
  };

  const handleSubmitImages = () => {
    const questionsWithSections = questions.filter(q => (q.croppedSections?.length || 0) > 0);
    if (questionsWithSections.length === 0) {
      Alert.alert('No Sections', 'Please crop at least one answer section to submit');
      return;
    }
    Alert.alert('Success', 'Answer schema submitted successfully!', [
      {
        text: 'OK', onPress: () => {
          setEvaluationSubScreen('list');
          setPdfUri('');
          setSelectedSubject('');
          setSelectedSubjectId(null);
          setQuestions([]);
        }
      }
    ]);
  };

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-1 bg-white">
        <Header showMenuButton={false} />

        {/* Conditionally render ScrollView - disable for PDF cropper and camera */}
        {(evaluationSubScreen === 'pdfCropper' || evaluationSubScreen === 'camera') ? (
          <View className="flex-1">
            {activeTab === 'evaluation' && evaluationSubScreen === 'pdfCropper' && pdfUri && (
              <PDFCropperScreen
                pdfUri={pdfUri}
                questionId={currentQuestionId}
                onBack={() => {
                  // Check if we came from student answer sheet or regular attach images
                  if (studentUploadData) {
                    setEvaluationSubScreen('studentAnswerSheet');
                  } else {
                    setEvaluationSubScreen('attachImages');
                  }
                }}
                onConfirm={handleCropConfirm}
              />
            )}
            {activeTab === 'evaluation' && evaluationSubScreen === 'camera' && (
              <CameraScreen
                questionId={currentQuestionId}
                onBack={() => {
                  // Check if we came from student answer sheet or regular attach images
                  if (studentUploadData) {
                    setEvaluationSubScreen('studentAnswerSheet');
                  } else {
                    setEvaluationSubScreen('attachImages');
                  }
                }}
                onConfirm={handleCameraConfirm}
              />
            )}
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerClassName="p-5 pb-24">
            {activeTab === 'home' && (
              <HomeScreen
                onNavigateToCO={() => setActiveTab('co')}
                onNavigateToEvaluation={() => setActiveTab('evaluation')}
              />
            )}

            {activeTab === 'evaluation' && (
              <>
                {evaluationSubScreen === 'list' && (
                  <EvaluationScreen
                    onViewDetails={handleViewEvaluationDetails}
                    onStartStudentUpload={handleStartStudentUpload}
                  />
                )}
                {evaluationSubScreen === 'upload' && (
                  <UploadSchemaScreen
                    onBack={() => setEvaluationSubScreen('list')}
                    onSuccess={handleUploadSchemaSuccess}
                  />
                )}
                {evaluationSubScreen === 'attachImages' && (
                  <AttachImagesScreen
                    onBack={() => setEvaluationSubScreen('upload')}
                    onSubmit={handleSubmitImages}
                    questions={questions}
                    onQuestionsChange={setQuestions}
                    onOpenCropper={handleOpenCropper}
                    onOpenCamera={(questionId) => {
                      setCurrentQuestionId(questionId);
                      setEvaluationSubScreen('camera');
                    }}
                    pdfUri={pdfUri}
                    subjectId={selectedSubjectId}
                  />
                )}
                {evaluationSubScreen === 'details' && selectedEvaluationId && (
                  <AttachImagesScreen
                    onBack={() => setEvaluationSubScreen('list')}
                    onSubmit={handleSubmitImages}
                    questions={questions}
                    onQuestionsChange={setQuestions}
                    onOpenCropper={handleOpenCropper}
                    onOpenCamera={(questionId) => {
                      setCurrentQuestionId(questionId);
                      setEvaluationSubScreen('camera');
                    }}
                    pdfUri={pdfUri}
                    subjectId={selectedSubjectId}
                    evaluationId={viewingEvaluationId}
                  />
                )}
                {evaluationSubScreen === 'studentAnswerSheet' && selectedEvaluationId && studentUploadData && (
                  <StudentAnswerSheetScreen
                    evaluationId={selectedEvaluationId}
                    rollNumber={studentUploadData.rollNumber}
                    uploadMethod={studentUploadData.uploadMethod}
                    onBack={() => {
                      setEvaluationSubScreen('list');
                      setStudentUploadData(null);
                      setSelectedEvaluationId(null);
                    }}
                    onSubmit={() => {
                      Alert.alert('Success', 'Student answer sheet evaluated successfully!', [
                        { text: 'OK', onPress: () => {
                          setEvaluationSubScreen('list');
                          setStudentUploadData(null);
                          setSelectedEvaluationId(null);
                        }}
                      ]);
                    }}
                    questions={questions}
                    onQuestionsChange={setQuestions}
                    onOpenCropper={handleOpenCropper}
                    onOpenCamera={(questionId) => {
                      setCurrentQuestionId(questionId);
                      setEvaluationSubScreen('camera');
                    }}
                    pdfUri={pdfUri}
                    pdfFileName={studentUploadData.pdfFileName}
                    subjectId={selectedSubjectId}
                  />
                )}
              </>
            )}

            {activeTab === 'co' && (
              <COMapperContainer
                onMenuPress={() => { }}
                initialSubScreen={coSubScreen}
                onSubScreenChange={setCoSubScreen}
              />
            )}

            {activeTab === 'profile' && <ProfileScreen />}
          </ScrollView>
        )}

        {/* FABs for CO Mapper - positioned at app level */}
        {activeTab === 'co' && coSubScreen === 'myCOs' && (
          <View style={fabStyles.fabContainer}>
            <TouchableOpacity
              style={fabStyles.fabPrimary}
              onPress={() => setCoSubScreen('creation')}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* FAB for Evaluation - positioned at app level */}
        {activeTab === 'evaluation' && evaluationSubScreen === 'list' && (
          <View style={fabStyles.fabContainer}>
            <TouchableOpacity
              style={[fabStyles.fabPrimary, { backgroundColor: '#000000' }]}
              onPress={() => setEvaluationSubScreen('upload')}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Completed Button for Attach Images Screen */}
        {activeTab === 'evaluation' && evaluationSubScreen === 'attachImages' && (
          <View style={fabStyles.submitButtonContainer}>
            <TouchableOpacity
              onPress={() => setEvaluationSubScreen('list')}
              style={fabStyles.submitButton}
              activeOpacity={0.8}
            >
              <Text style={fabStyles.submitButtonText}>Completed</Text>
            </TouchableOpacity>
          </View>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 90, // Just above bottom navigation
    right: 20,
    flexDirection: 'column',
    gap: 12,
    zIndex: 9999,
  },
  fabPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  submitButtonContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 9999,
  },
  submitButton: {
    backgroundColor: '#4FD1C5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#4FD1C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
