import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, CheckSquare, Map, User } from 'lucide-react-native';

export type TabType = 'home' | 'evaluation' | 'co' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, icon: Home, label: 'Home' },
    { id: 'evaluation' as TabType, icon: CheckSquare, label: 'Evaluation' },
    { id: 'co' as TabType, icon: Map, label: 'CO Mapper' },
    { id: 'profile' as TabType, icon: User, label: 'Profile' },
  ];

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white flex-row py-4 px-4 border-t border-gray-200">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            className="flex-1 items-center"
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View className="items-center">
              <Icon 
                size={24} 
                color={isActive ? '#000000' : '#9CA3AF'} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text className={`text-xs font-semibold mt-1 ${isActive ? 'text-black' : 'text-gray-400'}`}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
