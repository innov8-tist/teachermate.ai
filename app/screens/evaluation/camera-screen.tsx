import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useImagePicker } from '../../hooks/use-image-picker';
import { CroppedSection } from './pdf-cropper-screen';

interface CameraScreenProps {
  questionId: string;
  onBack: () => void;
  onConfirm: (croppedSection: CroppedSection) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  questionId,
  onBack,
  onConfirm,
}) => {
  const { pickFromCamera } = useImagePicker();

  const handleTakePhoto = async () => {
    try {
      const imageUri = await pickFromCamera();
      
      if (imageUri) {
        // Create a cropped section object for the camera image
        const croppedSection: CroppedSection = {
          questionId,
          pdfUri: '', // Not applicable for camera
          pageNumber: 1,
          crop: { x: 0, y: 0, width: 100, height: 100 }, // Full image
          timestamp: Date.now(),
          previewUri: imageUri,
        };

        onConfirm(croppedSection);
      } else {
        // User cancelled or permission denied
        onBack();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      onBack();
    }
  };

  // Automatically trigger camera when component mounts
  React.useEffect(() => {
    handleTakePhoto();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Take Photo</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="camera" size={64} color="#14B8A6" />
        </View>
        
        <Text style={styles.title}>Camera Opening...</Text>
        <Text style={styles.description}>
          Your camera will open automatically to capture the answer section.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={handleTakePhoto}>
          <Feather name="camera" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Open Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});