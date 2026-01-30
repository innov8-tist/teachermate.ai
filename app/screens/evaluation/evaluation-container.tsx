import React, { useState } from 'react';
import { EvaluationScreen } from './evaluation-screen';
import { StudentAnswerSheetScreen, StudentQuestion } from './student-answer-sheet-screen';
import { CameraScreen, CroppedSection } from './camera-screen';
import { EvaluationResultsScreen } from './evaluation-results-screen';
import { StudentUploadData } from './student-upload-modal';
import { Alert } from 'react-native';
import { pickAndUploadPDF } from '../../utils/pdf-picker';
import { useAuth } from '../../contexts/auth-context';

type Screen = 
  | 'evaluation-list'
  | 'student-answer-sheet'
  | 'camera'
  | 'results';

interface EvaluationContainerProps {
  onViewDetails: (evaluationId: number) => void;
}

export const EvaluationContainer: React.FC<EvaluationContainerProps> = ({ onViewDetails }) => {
  const { token } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('evaluation-list');
  const [studentData, setStudentData] = useState<StudentUploadData | null>(null);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
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

  const handleViewResults = (evalId: number, evalSubjectName: string) => {
    setEvaluationId(evalId);
    setSubjectName(evalSubjectName);
    setCurrentScreen('results');
  };

  const handleBackToEvaluationList = () => {
    console.log('🔙 Going back to evaluation list, resetting state');
    setCurrentScreen('evaluation-list');
    setStudentData(null);
    setEvaluationId(null);
    setSubjectName('');
    setPdfUri('');
    setQuestions([]);
  };

  const handleOpenCropper = async (questionId: string) => {
    // PDF cropping functionality has been removed
    // For now, just show an alert that this feature is no longer available
    Alert.alert(
      'Feature Simplified',
      'PDF cropping has been simplified. The entire PDF is now used as the answer schema.',
      [{ text: 'OK' }]
    );
  };

  const handleOpenCamera = (questionId: string) => {
    setCurrentQuestionId(questionId);
    setCurrentScreen('camera');
  };

  const handleCameraBack = () => {
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
          onViewResults={handleViewResults}
        />
      );

    case 'student-answer-sheet':
      if (!evaluationId || !studentData) {
        return (
          <EvaluationScreen
            onViewDetails={onViewDetails}
            onStartStudentUpload={handleStartStudentUpload}
            onViewResults={handleViewResults}
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

    case 'camera':
      return (
        <CameraScreen
          questionId={currentQuestionId}
          onBack={handleCameraBack}
          onConfirm={handleCameraConfirm}
        />
      );

    case 'results':
      if (!evaluationId) {
        return (
          <EvaluationScreen
            onViewDetails={onViewDetails}
            onStartStudentUpload={handleStartStudentUpload}
            onViewResults={handleViewResults}
          />
        );
      }
      return (
        <EvaluationResultsScreen
          evaluationId={evaluationId}
          subjectName={subjectName}
          onBack={handleBackToEvaluationList}
        />
      );

    default:
      return (
        <EvaluationScreen
          onViewDetails={onViewDetails}
          onStartStudentUpload={handleStartStudentUpload}
          onViewResults={handleViewResults}
        />
      );
  }
};