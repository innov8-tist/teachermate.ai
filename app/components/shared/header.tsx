import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface HeaderProps {
  onMenuPress?: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuPress, showMenuButton = true }) => {
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

        <TouchableOpacity>
          <Avatar>
            <AvatarFallback>
              <Text className="text-xl">👤</Text>
            </AvatarFallback>
          </Avatar>
        </TouchableOpacity>
      </View>
    </View>
  );
};
