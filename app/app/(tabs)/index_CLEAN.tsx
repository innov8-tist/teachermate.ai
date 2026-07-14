import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { SplashScreen } from '@/components/splash-screen';
import { Header } from '@/components/shared/header';
import { BottomNavigation, TabType } from '@/components/shared/bottom-navigation';
import { HomeScreen } from '@/screens/home/home-screen';
import { EvaluationScreen } from '@/screens/evaluation/evaluation-screen';
import { EvaluationResultsScreen } from '@/screens/evaluation/evaluation-results-screen';
import { UploadAnswerKeyModal } from '@/screens/evaluation/upload-answer-key-modal';
import { ProfileScreen } from '@/screens/profile/profile-screen';
import { COMapperContainer, COSubScreen } from '@/screens/co-mapper/co-mapper-container';
import { Feather } from '@expo/vector-icons';

type EvaluationSubScreen = 'list' | 'results';

export default function HomeScreenRefactored() {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [coSubScreen, setCoSubScreen] = useState<COSubScreen>('myCOs');
    const [evaluationSubScreen, setEvaluationSubScreen] = useState<EvaluationSubScreen>('list');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedStudentRegNo, setSelectedStudentRegNo] = useState<string | null>(null);
    const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);
    const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);

    // Handle Android back button
    useEffect(() => {
        const backAction = () => {
            if (activeTab === 'co' && coSubScreen !== 'myCOs') {
                setCoSubScreen('myCOs');
                return true;
            }
            if (activeTab === 'evaluation' && evaluationSubScreen === 'results') {
                setEvaluationSubScreen('list');
                return true;
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
            setSelectedEvaluationId(null);
        }
    };

    const handleViewEvaluationResults = (evaluationId: number, subjectName: string, studentRegNo?: string) => {
        console.log('📊 Viewing results for evaluation:', evaluationId, 'Subject:', subjectName, 'Student:', studentRegNo);
        setSelectedEvaluationId(evaluationId);
        setSelectedSubject(subjectName);
        setSelectedStudentRegNo(studentRegNo || null);
        setEvaluationSubScreen('results');
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
                            {evaluationSubScreen === 'list' && (
                                <EvaluationScreen
                                    onViewResults={handleViewEvaluationResults}
                                />
                            )}
                            {evaluationSubScreen === 'results' && selectedEvaluationId && selectedSubject && (
                                <EvaluationResultsScreen
                                    evaluationId={selectedEvaluationId}
                                    subjectName={selectedSubject}
                                    onBack={() => setEvaluationSubScreen('list')}
                                    studentRegNo={selectedStudentRegNo || undefined}
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

                <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />

                {/* FABs for CO Mapper */}
                {activeTab === 'co' && coSubScreen === 'myCOs' && (
                    <View style={fabStyles.fabContainer}>
                        <TouchableOpacity
                            style={fabStyles.fabPrimary}
                            onPress={() => setCoSubScreen('uploadCO' as COSubScreen)}
                            activeOpacity={0.8}
                        >
                            <Feather name="plus" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* FAB for Evaluation */}
                {activeTab === 'evaluation' && evaluationSubScreen === 'list' && (
                    <View style={fabStyles.fabContainer}>
                        <TouchableOpacity
                            style={[fabStyles.fabPrimary, { backgroundColor: '#000000' }]}
                            onPress={() => setShowAnswerKeyModal(true)}
                            activeOpacity={0.8}
                        >
                            <Feather name="plus" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Upload Answer Key Modal */}
                <UploadAnswerKeyModal
                    visible={showAnswerKeyModal}
                    onClose={() => setShowAnswerKeyModal(false)}
                    onSuccess={() => {
                        setShowAnswerKeyModal(false);
                    }}
                />
            </View>
        </View>
    );
}

const fabStyles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        zIndex: 1000,
    },
    fabPrimary: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
});
