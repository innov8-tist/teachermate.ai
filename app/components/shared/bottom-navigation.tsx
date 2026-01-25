import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export type TabType = 'home' | 'evaluation' | 'co' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, icon: '🏠', label: 'Home' },
    { id: 'evaluation' as TabType, icon: '✓', label: 'Evaluation' },
    { id: 'co' as TabType, icon: '🗺️', label: 'CO Mapper' },
    { id: 'profile' as TabType, icon: '👤', label: 'Profile' },
  ];

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white flex-row py-3 px-2 border-t border-gray-100">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          className="flex-1 items-center py-2"
          onPress={() => onTabChange(tab.id)}
        >
          <Text className={`text-2xl mb-1 ${activeTab === tab.id ? 'opacity-100' : 'opacity-50'}`}>
            {tab.icon}
          </Text>
          <Text className={`text-xs font-medium ${activeTab === tab.id ? 'text-[#4FD1C5]' : 'text-gray-500'}`}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
