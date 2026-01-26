import React, { useState } from 'react';
import { View, Text } from 'react-native';

export const EvaluationScreen: React.FC = () => {
  const [hasRecords] = useState(false);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Empty State */}
      {!hasRecords && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-white rounded-full w-24 h-24 items-center justify-center mb-6 shadow-sm">
            <Text className="text-5xl">📄</Text>
          </View>
          <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
            No evaluation records found
          </Text>
          <Text className="text-gray-500 text-center">
            Upload an answer schema to get started
          </Text>
        </View>
      )}
    </View>
  );
};
