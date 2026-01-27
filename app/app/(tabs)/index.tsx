import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Text, BackHandler, Alert } from 'react-native';
import { SplashScreen } from '@/components/splash-screen';
import { Header } from '@/components/shared/header';
import { BottomNavigation, TabType } from '@/components/shared/bottom-navigation';
import { HomeScreen } from '@/screens/home/home-screen';
import { EvaluationScreen } from '@/screens/evaluation/evaluation-screen';
import { UploadSchemaScreen } from '@/screens/evaluation/upload-schema-screen';
import { AttachImagesScreen, Question } from '@/screens/evaluation/attach-images-screen';
import { PDFCropperScreen, CroppedSection } from '@/screens/evaluation/pdf-cropper-screen';
import { ProfileScreen } from '@/screens/profile/profile-screen';
import { COMapperContainer, COSubScreen } from '@/screens/co-mapper/co-mapper-container';
import { Feather } from '@expo/vector-icons';

type EvaluationSubScreen = 'list' | 'upload' | 'attachImages' | 'pdfCropper';

export default function HomeScreenRefactored() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [coSubScreen, setCoSubScreen] = useState<COSubScreen>('myCOs');
  const [evaluationSubScreen, setEvaluationSubScreen] = useState<EvaluationSubScreen>('list');
  const [pdfUri, setPdfUri] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');

  // Dummy questions - will be fetched from database later
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', label: 'Question 1', images: [], croppedSections: [] },
    { id: '2a', label: 'Question 2(a)', images: [], croppedSections: [] },
    { id: '2b', label: 'Question 2(b)', images: [], croppedSections: [] },
    { id: '3', label: 'Question 3', images: [], croppedSections: [] },
    { id: '4a', label: 'Question 4(a)', images: [], croppedSections: [] },
    { id: '4b', label: 'Question 4(b)', images: [], croppedSections: [] },
    { id: '5', label: 'Question 5', images: [], croppedSections: [] },
    { id: '6', label: 'Question 6', images: [], croppedSections: [] },
  ]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (activeTab === 'co' && coSubScreen !== 'myCOs') {
        setCoSubScreen('myCOs');
        return true;
      }
      if (activeTab === 'evaluation') {
        if (evaluationSubScreen === 'pdfCropper') {
          setEvaluationSubScreen('attachImages');
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
    }
  };

  const handleUploadSchemaSuccess = (uri: string, subject: string) => {
    setPdfUri(uri);
    setSelectedSubject(subject);
    setEvaluationSubScreen('attachImages');
  };

  const handleOpenCropper = (questionId: string) => {
    setCurrentQuestionId(questionId);
    setEvaluationSubScreen('pdfCropper');
  };

  const handleCropConfirm = (croppedSection: CroppedSection) => {
    const updatedQuestions = questions.map(q =>
      q.id === croppedSection.questionId
        ? { 
            ...q, 
            croppedSections: [...(q.croppedSections || []), croppedSection] 
          }
        : q
    );
    setQuestions(updatedQuestions);
    setEvaluationSubScreen('attachImages');
  };

  const handleSubmitImages = () => {
    const questionsWithSections = questions.filter(q => (q.croppedSections?.length || 0) > 0);
    if (questionsWithSections.length === 0) {
      Alert.alert('No Sections', 'Please crop at least one answer section to submit');
      return;
    }
    Alert.alert('Success', 'Answer schema submitted successfully!', [
      { text: 'OK', onPress: () => {
        setEvaluationSubScreen('list');
        setPdfUri('');
        setSelectedSubject('');
        setQuestions(questions.map(q => ({ ...q, croppedSections: [] })));
      }}
    ]);
  };

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-1 bg-white">
        <Header showMenuButton={false} />

        {/* Conditionally render ScrollView - disable for PDF cropper */}
        {evaluationSubScreen === 'pdfCropper' ? (
          <View className="flex-1">
            {activeTab === 'evaluation' && pdfUri && (
              <PDFCropperScreen
                pdfUri={pdfUri}
                questionId={currentQuestionId}
                onBack={() => setEvaluationSubScreen('attachImages')}
                onConfirm={handleCropConfirm}
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
                {evaluationSubScreen === 'list' && <EvaluationScreen />}
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
                    pdfUri={pdfUri}
                  />
                )}
              </>
            )}

            {activeTab === 'co' && (
              <COMapperContainer
                onMenuPress={() => {}}
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
            style={fabStyles.fabSecondary} 
            onPress={() => setCoSubScreen('studentSheet')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>📄</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={fabStyles.fabPrimary} 
            onPress={() => setCoSubScreen('creation')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 28, color: 'white' }}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB for Evaluation - positioned at app level */}
      {activeTab === 'evaluation' && evaluationSubScreen === 'list' && (
        <View style={fabStyles.fabContainer}>
          <TouchableOpacity 
            style={[fabStyles.fabPrimary, { backgroundColor: '#4FD1C5' }]} 
            onPress={() => setEvaluationSubScreen('upload')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 28, color: 'white' }}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit Button for Attach Images Screen */}
      {activeTab === 'evaluation' && evaluationSubScreen === 'attachImages' && (
        <View style={fabStyles.submitButtonContainer}>
          <TouchableOpacity
            onPress={handleSubmitImages}
            style={fabStyles.submitButton}
            activeOpacity={0.8}
          >
            <Text style={fabStyles.submitButtonText}>Submit</Text>
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
