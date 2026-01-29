import React, { useState } from 'react';
import { EvaluationScreen } from './evaluation-screen';
import { StudentAnswerSheetScreen, StudentQuestion } from './student-answer-sheet-screen';
import { PDFCropperScreen, CroppedSection } from './pdf-cropper-screen';
import { CameraScreen } from './camera-screen';
import { StudentUploadData } from './student-upload-modal';
import { Alert } from 'react-native';
import { pickAndUploadPDF } from '../../utils/pdf-picker';
import { useAuth } from '../../contexts/auth-context';

type Screen = 
  | 'evaluation-list'
  | 'student-answer-sheet'
  | 'pdf-cropper'
  | 'camera';

interface EvaluationContainerProps {
  onViewDetails: (evaluationId: number) => void;
}

export const EvaluationContainer: React.FC<EvaluationContainerProps> = ({ onViewDetails }) => {
  const { token } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('evaluation-list');
  const [studentData, setStudentData] = useState<StudentUploadData | null>(null);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [pdfUri, setPdfUri] = useState<string>('');
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);

  const handleStartStudentUpload = (evalId: number, data: StudentUploadData) => {
    console.log('🔄 Starting student upload:', {
      evalId,
      rollNumber: data.rollNumber,
      uploadMethod: data.uploadMethod,
      pdfId: data.pdfId,
      previousQuestionsCount: questions.length
    });
    
    setEvaluationId(evalId);
    setStudentData(data);
    
    // Reset questions state for new student
    setQuestions([]);
    
    // If resuming with existing PDF, set the PDF URI
    if (data.pdfId && data.uploadMethod === 'pdf') {
      setPdfUri(data.pdfId);
    } else {
      // Clear PDF URI for new student without existing PDF
      setPdfUri('');
    }
    
    setCurrentScreen('student-answer-sheet');
  };

  const handleBackToEvaluationList = () => {
    console.log('🔙 Going back to evaluation list, resetting state');
    setCurrentScreen('evaluation-list');
    setStudentData(null);
    setEvaluationId(null);
    setPdfUri('');
    setQuestions([]);
  };

  const handleOpenCropper = async (questionId: string) => {
    if (!pdfUri && studentData?.uploadMethod === 'pdf') {
      // Upload PDF first (only if we don't have an existing PDF ID)
      if (!studentData.pdfId) {
        if (!token) {
          Alert.alert('Error', 'Authentication required');
          return;
        }

        try {
          const uploadResult = await pickAndUploadPDF(token);
          if (uploadResult) {
            setPdfUri(uploadResult.pdfId);
            setCurrentQuestionId(questionId);
            setCurrentScreen('pdf-cropper');
          }
        } catch (error) {
          console.error('PDF upload failed:', error);
        }
        return;
      } else {
        // We have an existing PDF ID, use it
        setPdfUri(studentData.pdfId);
      }
    }
    
    // Ensure we have a valid PDF URI before opening cropper
    const finalPdfUri = pdfUri || studentData?.pdfId;
    if (!finalPdfUri) {
      Alert.alert('Error', 'No PDF available for cropping. Please upload a PDF first.');
      return;
    }
    
    setCurrentQuestionId(questionId);
    setCurrentScreen('pdf-cropper');
  };

  const handleOpenCamera = (questionId: string) => {
    setCurrentQuestionId(questionId);
    setCurrentScreen('camera');
  };

  const handleCropperBack = () => {
    setCurrentScreen('student-answer-sheet');
    setCurrentQuestionId('');
  };

  const handleCameraBack = () => {
    setCurrentScreen('student-answer-sheet');
    setCurrentQuestionId('');
  };

  const handleCropConfirm = (croppedSection: CroppedSection) => {
    // Update the question with the cropped section
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === currentQuestionId 
          ? { 
              ...q, 
              croppedSections: [...(q.croppedSections || []), croppedSection],
              processingState: 'idle' as const,
              isSubmitted: false
            }
          : q
      )
    );
    
    setCurrentScreen('student-answer-sheet');
    setCurrentQuestionId('');
  };

  const handleCameraConfirm = (croppedSection: CroppedSection) => {
    // Update the question with the camera image
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === currentQuestionId 
          ? { 
              ...q, 
              croppedSections: [...(q.croppedSections || []), croppedSection],
              processingState: 'idle' as const,
              isSubmitted: false
            }
          : q
      )
    );
    
    setCurrentScreen('student-answer-sheet');
    setCurrentQuestionId('');
  };

  const handleStudentSubmit = () => {
    Alert.alert(
      'Success',
      'Student answer sheet submitted successfully!',
      [{ text: 'OK', onPress: handleBackToEvaluationList }]
    );
  };

  // Render current screen
  switch (currentScreen) {
    case 'evaluation-list':
      return (
        <EvaluationScreen
          onViewDetails={onViewDetails}
          onStartStudentUpload={handleStartStudentUpload}
        />
      );

    case 'student-answer-sheet':
      if (!evaluationId || !studentData) {
        return (
          <EvaluationScreen
            onViewDetails={onViewDetails}
            onStartStudentUpload={handleStartStudentUpload}
          />
        );
      }
      
      return (
        <StudentAnswerSheetScreen
          evaluationId={evaluationId}
          rollNumber={studentData.rollNumber}
          uploadMethod={studentData.uploadMethod}
          onBack={handleBackToEvaluationList}
          onSubmit={handleStudentSubmit}
          onOpenCropper={handleOpenCropper}
          onOpenCamera={handleOpenCamera}
          pdfUri={pdfUri}
          questions={questions}
          onQuestionsChange={setQuestions}
        />
      );

    case 'pdf-cropper':
      return (
        <PDFCropperScreen
          pdfUri={pdfUri}
          questionId={currentQuestionId}
          onBack={handleCropperBack}
          onConfirm={handleCropConfirm}
        />
      );

    case 'camera':
      return (
        <CameraScreen
          questionId={currentQuestionId}
          onBack={handleCameraBack}
          onConfirm={handleCameraConfirm}
        />
      );

    default:
      return (
        <EvaluationScreen
          onViewDetails={onViewDetails}
          onStartStudentUpload={handleStartStudentUpload}
        />
      );
  }
};