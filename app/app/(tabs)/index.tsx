import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Text, BackHandler } from 'react-native';
import { SplashScreen } from '@/components/splash-screen';
import { Header } from '@/components/shared/header';
import { BottomNavigation, TabType } from '@/components/shared/bottom-navigation';
import { HomeScreen } from '@/screens/home/home-screen';
import { EvaluationScreen } from '@/screens/evaluation/evaluation-screen';
import { ProfileScreen } from '@/screens/profile/profile-screen';
import { COMapperContainer, COSubScreen } from '@/screens/co-mapper/co-mapper-container';

export default function HomeScreenRefactored() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [coSubScreen, setCoSubScreen] = useState<COSubScreen>('myCOs');

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (activeTab === 'co' && coSubScreen !== 'myCOs') {
        setCoSubScreen('myCOs');
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [activeTab, coSubScreen]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'co') {
      setCoSubScreen('myCOs'); // Always show My COs when tab is clicked
    }
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

        {activeTab === 'evaluation' && <EvaluationScreen />}

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
});
