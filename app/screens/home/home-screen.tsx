import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

interface HomeScreenProps {
  onNavigateToCO: () => void;
  onNavigateToEvaluation: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToCO,
  onNavigateToEvaluation,
}) => {
  return (
    <View>
      {/* Welcome Section */}
      <View className="mb-6">
        <Text className="text-3xl font-bold text-gray-900 mb-1">Welcome, Teacher</Text>
        <Text className="text-base text-gray-500">Manage your evaluations efficiently</Text>
      </View>

      {/* Stats Cards */}
      <View className="flex-row gap-3 mb-5">
        <Card className="flex-1">
          <CardContent>
            <Text className="text-2xl font-bold text-black mb-1">24</Text>
            <Text className="text-xs text-gray-500 font-medium">Pending</Text>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent>
            <Text className="text-2xl font-bold text-black mb-1">156</Text>
            <Text className="text-xs text-gray-500 font-medium">Completed</Text>
          </CardContent>
        </Card>
      </View>

      {/* Menu Cards */}
      <TouchableOpacity onPress={onNavigateToCO} activeOpacity={0.7}>
        <Card className="mb-4">
          <CardContent className="flex-row items-center">
            <View className="w-14 h-14 bg-gray-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-3xl">☁️</Text>
            </View>
            <View className="flex-1">
              <CardTitle className="mb-1">Upload Answer Schema</CardTitle>
              <CardDescription>Upload the answer key document</CardDescription>
            </View>
            <Text className="text-gray-400 text-xl">›</Text>
          </CardContent>
        </Card>
      </TouchableOpacity>

      <TouchableOpacity onPress={onNavigateToEvaluation} activeOpacity={0.7}>
        <Card className="mb-4">
          <CardContent className="flex-row items-center">
            <View className="w-14 h-14 bg-gray-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-3xl">📷</Text>
            </View>
            <View className="flex-1">
              <CardTitle className="mb-1">Upload Answer Sheets</CardTitle>
              <CardDescription>Capture or upload student answers</CardDescription>
            </View>
            <Text className="text-gray-400 text-xl">›</Text>
          </CardContent>
        </Card>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.7}>
        <Card className="mb-4">
          <CardContent className="flex-row items-center">
            <View className="w-14 h-14 bg-gray-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-3xl">📊</Text>
            </View>
            <View className="flex-1">
              <CardTitle className="mb-1">View Evaluation Results</CardTitle>
              <CardDescription>Check evaluation analytics</CardDescription>
            </View>
            <Text className="text-gray-400 text-xl">›</Text>
          </CardContent>
        </Card>
      </TouchableOpacity>
    </View>
  );
};
