import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function Input({ 
  label, 
  error, 
  className, 
  containerClassName,
  ...props 
}: InputProps) {
  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'bg-white border-2 border-[#B8E6E1] rounded-xl px-4 py-3.5 text-gray-900 text-base font-medium',
          error && 'border-red-500',
          className
        )}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-xs mt-1.5 font-medium">{error}</Text>
      )}
    </View>
  );
}
