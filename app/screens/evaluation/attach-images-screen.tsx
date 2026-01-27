import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CroppedSection } from './pdf-cropper-screen';

export interface Question {
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
}

interface AttachImagesScreenProps {
  onBack: () => void;
  onSubmit: () => void;
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  onOpenCropper: (questionId: string) => void;
  pdfUri?: string;
}

export const AttachImagesScreen: React.FC<AttachImagesScreenProps> = ({ 
  onBack, 
  onSubmit,
  questions,
  onQuestionsChange,
  onOpenCropper,
  pdfUri
}) => {
  const handleAddImage = (questionId: string) => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Please upload a PDF first');
      return;
    }
    onOpenCropper(questionId);
  };

  const handleRemoveImage = (questionId: string, sectionIndex: number) => {
    const updatedQuestions = questions.map(q =>
      q.id === questionId
        ? { 
            ...q, 
            croppedSections: (q.croppedSections || []).filter((_, idx) => idx !== sectionIndex) 
          }
        : q
    );
    onQuestionsChange(updatedQuestions);
  };

  const renderImageBox = (question: Question) => {
    const croppedSections = question.croppedSections || [];
    const visibleSections = croppedSections.slice(0, 2);
    const remainingCount = croppedSections.length - 2;

    return (
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        {/* Show up to 2 cropped sections */}
        {visibleSections.map((section, index) => (
          <View key={index} className="relative">
            {section.previewUri ? (
              <Image
                source={{ uri: section.previewUri }}
                style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: 12,
                  backgroundColor: '#E5E7EB',
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: 12,
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name="file-text" size={40} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 mt-2">Page {section.pageNumber}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleRemoveImage(question.id, index)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 4,
              }}
            >
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add button or remaining count */}
        {croppedSections.length < 2 ? (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: '#D1D5DB',
              backgroundColor: '#F9FAFB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={32} color="#9CA3AF" />
          </TouchableOpacity>
        ) : remainingCount > 0 ? (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#E5E7EB',
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text className="text-gray-700 text-2xl font-bold">+{remainingCount}</Text>
            <Text className="text-gray-500 text-xs mt-1">more</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => handleAddImage(question.id)}
            style={{
              width: 90,
              height: 90,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: '#D1D5DB',
              backgroundColor: '#F9FAFB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={32} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onBack} className="mr-4">
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Attach Images</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6 pb-32">
          {questions.map((question, index) => (
            <View
              key={question.id}
              className="mb-5 bg-white rounded-2xl p-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                {question.label}
              </Text>
              {renderImageBox(question)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
