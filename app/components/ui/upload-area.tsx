import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface UploadAreaProps {
  label?: string;
  imageUri: string | null;
  onPress: () => void;
  height?: number;
  className?: string;
}

export function UploadArea({ 
  label, 
  imageUri, 
  onPress, 
  height = 200,
  className = '' 
}: UploadAreaProps) {
  return (
    <View className={`mb-6 ${className}`}>
      {label && (
        <Text className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">
          {label}
        </Text>
      )}
      <TouchableOpacity
        className="bg-white border-2 border-dashed border-gray-300 rounded-3xl overflow-hidden"
        style={{ height }}
        onPress={onPress}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} className="w-full h-full" style={{ resizeMode: 'cover' }} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <View className="w-16 h-16 bg-black rounded-full items-center justify-center mb-3" style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <Text className="text-3xl">📤</Text>
            </View>
            <Text className="text-gray-600 font-semibold text-base">Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
