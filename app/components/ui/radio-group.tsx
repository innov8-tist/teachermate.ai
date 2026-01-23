import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  className?: string;
}

export function RadioGroup({ label, options, value, onValueChange, className = '' }: RadioGroupProps) {
  return (
    <View className={`mb-5 ${className}`}>
      {label && (
        <Text className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">
          {label}
        </Text>
      )}
      <View className="flex-row gap-3">
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            className={`flex-1 flex-row items-center justify-center gap-3 py-4 px-5 rounded-2xl border-2 ${
              value === option.value ? 'bg-black border-black' : 'bg-white border-gray-300'
            }`}
            onPress={() => onValueChange(option.value)}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: value === option.value ? 0.2 : 0.05,
              shadowRadius: 8,
              elevation: value === option.value ? 6 : 2,
            }}
          >
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              value === option.value ? 'border-white bg-black' : 'border-gray-400 bg-white'
            }`}>
              {value === option.value && (
                <View className="w-3 h-3 rounded-full bg-white" />
              )}
            </View>
            <Text className={`text-lg font-bold ${
              value === option.value ? 'text-white' : 'text-black'
            }`}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
