import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface UploadSchemaScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onUpload: () => void;
}

export const UploadSchemaScreen: React.FC<UploadSchemaScreenProps> = ({ onBack, onSuccess, onUpload }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Dummy subjects - will be fetched from database later
  const subjects = [
    'MSS - IA 1',
    'MPMC - IA 1',
    'MSS - IA 2',
    'MPMC - IA 2',
    'DSA - IA 1',
    'OS - IA 1',
  ];

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setShowDropdown(false);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onBack} className="mr-4">
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Upload Answer Schema</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6 pb-32">
          {/* Dropdown Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Subject</Text>
            <TouchableOpacity
              onPress={() => setShowDropdown(!showDropdown)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-4 flex-row items-center justify-between"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text className={selectedSubject ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>
                {selectedSubject || 'Select Subject'}
              </Text>
              <Feather 
                name={showDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>

            {/* Dropdown List */}
            {showDropdown && (
              <View 
                className="bg-white border border-gray-200 rounded-xl mt-2 overflow-hidden"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                  {subjects.map((subject, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSubjectSelect(subject)}
                      className={`px-4 py-4 ${index !== subjects.length - 1 ? 'border-b border-gray-100' : ''}`}
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-900 text-base">{subject}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export { UploadSchemaScreenProps };
