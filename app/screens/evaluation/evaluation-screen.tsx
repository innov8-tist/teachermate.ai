import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useImagePicker } from '@/hooks/use-image-picker';

export const EvaluationScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  const handlePickFromCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) setSelectedImage(uri);
  };

  const handlePickFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) setSelectedImage(uri);
  };

  const handleSubmit = () => {
    if (!selectedImage) {
      Alert.alert('Missing Information', 'Please select or capture an image');
      return;
    }
    Alert.alert('Success', 'Student image submitted successfully!');
  };

  return (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Upload Answer Sheets</Text>

      <TouchableOpacity onPress={handlePickFromCamera} activeOpacity={0.7}>
        <Card className="mb-5">
          <CardContent className="items-center py-6">
            <View className="w-16 h-16 bg-[#B8E6E1] rounded-full items-center justify-center mb-3">
              <Text className="text-4xl">📷</Text>
            </View>
            <Text className="text-base font-semibold text-gray-900 text-center">Take Picture</Text>
          </CardContent>
        </Card>
      </TouchableOpacity>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionCard, { flex: 0, width: '100%' }]}
          onPress={handlePickFromGallery}
        >
          <View style={styles.actionIconCircle}>
            <Text style={styles.actionIcon}>📁</Text>
          </View>
          <Text style={styles.actionText}>Upload from Gallery</Text>
        </TouchableOpacity>
      </View>

      {selectedImage && (
        <Card className="mb-5">
          <CardContent className="p-0">
            <Image source={{ uri: selectedImage }} className="w-full h-72 rounded-xl" resizeMode="cover" />
          </CardContent>
        </Card>
      )}

      <Button onPress={handleSubmit} size="lg">
        Submit Answer Sheet
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    backgroundColor: '#B8E6E1',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
});
