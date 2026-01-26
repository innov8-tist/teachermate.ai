import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Text, BackHandler, Alert } from 'react-native';
import { SplashScreen } from '@/components/splash-screen';
import { Header } from '@/components/shared/header';
import { BottomNavigation, TabType } from '@/components/shared/bottom-navigation';
import { HomeScreen } from '@/screens/home/home-screen';
import { EvaluationScreen } from '@/screens/evaluation/evaluation-screen';
import { UploadSchemaScreen } from '@/screens/evaluation/upload-schema-screen';
import { AttachImagesScreen, Question } from '@/screens/evaluation/attach-images-screen';
import { ProfileScreen } from '@/screens/profile/profile-screen';
import { COMapperContainer, COSubScreen } from '@/screens/co-mapper/co-mapper-container';
import { Feather } from '@expo/vector-icons';
import { useImagePicker } from '@/hooks/use-image-picker';

type EvaluationSubScreen = 'list' | 'upload' | 'attachImages';

export default function HomeScreenRefactored() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [coSubScreen, setCoSubScreen] = useState<COSubScreen>('myCOs');
  const [evaluationSubScreen, setEvaluationSubScreen] = useState<EvaluationSubScreen>('list');
  const { pickFromGallery } = useImagePicker();

  // Dummy questions - will be fetched from database later
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', label: 'Question 1', images: [] },
    { id: '2a', label: 'Question 2(a)', images: [] },
    { id: '2b', label: 'Question 2(b)', images: [] },
    { id: '3', label: 'Question 3', images: [] },
    { id: '4a', label: 'Question 4(a)', images: [] },
    { id: '4b', label: 'Question 4(b)', images: [] },
    { id: '5', label: 'Question 5', images: [] },
    { id: '6', label: 'Question 6', images: [] },
  ]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (activeTab === 'co' && coSubScreen !== 'myCOs') {
        setCoSubScreen('myCOs');
        return true; // Prevent default back action
      }
      if (activeTab === 'evaluation' && evaluationSubScreen !== 'list') {
        setEvaluationSubScreen('list');
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [activeTab, coSubScreen, evaluationSubScreen]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'co') {
      setCoSubScreen('myCOs'); // Always show My COs when tab is clicked
    }
    if (tab === 'evaluation') {
      setEvaluationSubScreen('list'); // Always show list when tab is clicked
    }
  };

  const handleUploadSchema = async () => {
    // Navigate to attach images screen instead of directly uploading
    setEvaluationSubScreen('attachImages');
  };

  const handleSubmitImages = () => {
    const questionsWithImages = questions.filter(q => q.images.length > 0);
    if (questionsWithImages.length === 0) {
      Alert.alert('No Images', 'Please attach at least one image to submit');
      return;
    }
    Alert.alert('Success', 'Images submitted successfully!', [
      { text: 'OK', onPress: () => setEvaluationSubScreen('list') }
    ]);
  };

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-1 bg-white">
        <Header showMenuButton={false} />

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
                onSuccess={() => setEvaluationSubScreen('list')}
                onUpload={handleUploadSchema}
              />
            )}
            {evaluationSubScreen === 'attachImages' && (
              <AttachImagesScreen
                onBack={() => setEvaluationSubScreen('upload')}
                onSubmit={() => setEvaluationSubScreen('list')}
                questions={questions}
                onQuestionsChange={setQuestions}
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

      {/* FABs for CO Mapper - positioned at app level */}
      {activeTab === 'co' && coSubScreen === 'myCOs' && (
        <View style={fabStyles.fabContainer}>
          <TouchableOpacity 
            style={fabStyles.fabSecondary} 
            onPress={() => setCoSubScreen('studentSheet')}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={24} color="#000000" />
          </TouchableOpacity>
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

      {/* Upload Button for Evaluation Upload Screen */}
      {activeTab === 'evaluation' && evaluationSubScreen === 'upload' && (
        <View style={fabStyles.uploadButtonContainer}>
          {/* Guidelines above button */}
          <View 
            style={fabStyles.guidelinesCard}
          >
            <Feather name="info" size={22} color="#3B82F6" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={fabStyles.guidelinesTitle}>
                Upload Guidelines
              </Text>
              <Text style={fabStyles.guidelinesText}>
                • Select the subject for the answer schema{'\n'}
                • Upload a clear image or PDF of the schema{'\n'}
                • Ensure all questions are visible
              </Text>
            </View>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUploadSchema}
            style={fabStyles.uploadButton}
            activeOpacity={0.8}
          >
            <Feather name="upload-cloud" size={24} color="#fff" />
            <Text style={fabStyles.uploadButtonText}>Upload Answer Schema</Text>
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
  guidelinesCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
    opacity: 0.5,
  },
  guidelinesTitle: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  guidelinesText: {
    color: '#1D4ED8',
    fontSize: 14,
    lineHeight: 22,
  },
  uploadButton: {
    backgroundColor: '#4FD1C5',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4FD1C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
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
