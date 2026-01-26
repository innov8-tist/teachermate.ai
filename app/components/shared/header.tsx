import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { Feather } from '@expo/vector-icons';

interface HeaderProps {
  onMenuPress?: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuPress, showMenuButton = true }) => {
  const { teacher } = useAuth();

  return (
    <View className="bg-white px-5 pt-10 pb-3 border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        {showMenuButton ? (
          <TouchableOpacity className="p-2" onPress={onMenuPress}>
            <Text className="text-2xl text-gray-800">☰</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
        
        <Text className="text-lg font-semibold text-gray-900">Teachermate AI</Text>

        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center overflow-hidden border-2 border-gray-300">
          {teacher?.pfp_url ? (
            <Image 
              source={{ uri: teacher.pfp_url }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Feather name="user" size={20} color="#666" />
          )}
        </View>
      </View>
    </View>
  );
};
