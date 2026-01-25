'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useImagePicker } from '@/hooks/use-image-picker';
import { Feather } from '@expo/vector-icons';

export const StudentSheetScreen: React.FC = () => {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Student Answer Sheet</Text>
          <Text style={styles.subtitle}>Capture or upload student responses</Text>
        </View>

        {/* Image Actions */}
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionCard} onPress={handlePickFromCamera}>
            <View style={styles.actionIcon}>
              <Feather name="camera" size={28} color="#000" />
            </View>
            <Text style={styles.actionTitle}>Take Picture</Text>
            <Text style={styles.actionDesc}>Use your camera</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={handlePickFromGallery}>
            <View style={styles.actionIcon}>
              <Feather name="image" size={28} color="#000" />
            </View>
            <Text style={styles.actionTitle}>Upload File</Text>
            <Text style={styles.actionDesc}>From your device</Text>
          </Pressable>
        </View>

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Selected Image</Text>
              <Pressable
                onPress={() => setSelectedImage(null)}
                style={styles.removeBtn}
              >
                <Feather name="x" size={18} color="#999" />
              </Pressable>
            </View>
            <View style={styles.previewBox}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewOverlay}>
                <Feather name="check-circle" size={40} color="#fff" />
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          style={[styles.submitBtn, !selectedImage && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedImage}
        >
          <Feather name="upload-cloud" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.submitText}>
            {selectedImage ? 'Submit Answer Sheet' : 'Select an image first'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  removeBtn: {
    padding: 6,
  },
  previewBox: {
    height: 280,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#d0d0d0',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
