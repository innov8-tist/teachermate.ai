import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className="mb-5">
      {label && (
        <Text className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">
          {label}
        </Text>
      )}
      <TextInput
        className={`bg-white border-2 border-gray-300 rounded-2xl px-5 py-4 text-black text-base font-semibold ${className}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-xs mt-2 font-semibold">{error}</Text>
      )}
    </View>
  );
}
