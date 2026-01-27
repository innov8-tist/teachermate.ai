import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

interface UploadSchemaScreenProps {
  onBack: () => void;
  onSuccess: (pdfUri: string, subject: string) => void;
}

export const UploadSchemaScreen: React.FC<UploadSchemaScreenProps> = ({ onBack, onSuccess }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [pdfUri, setPdfUri] = useState<string>('');
  const [pdfName, setPdfName] = useState<string>('');

  // Dummy subjects - will be fetched from database later
  const subjects = [
    'MSS - IA 1',
    'MPMC - IA 1',
    'MSS - IA 2',
  ];

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setShowDropdown(false);
  };

  const handleUploadSchema = async () => {
    if (!selectedSubject) {
      Alert.alert('Select Subject', 'Please select a subject first');
      return;
    }

    try {
      console.log('📁 Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('📄 Document picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('✅ PDF selected:');
        console.log('  - Name:', file.name);
        console.log('  - URI:', file.uri);
        console.log('  - Size:', file.size);
        console.log('  - Type:', file.mimeType);
        
        setPdfUri(file.uri);
        setPdfName(file.name);
        
        // Automatically proceed after successful upload
        console.log('✅ Calling onSuccess with:', file.uri, selectedSubject);
        onSuccess(file.uri, selectedSubject);
      } else {
        console.log('❌ PDF selection canceled or no file selected');
      }
    } catch (error) {
      console.error('❌ Error picking PDF:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Answer Schema</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Subject</Text>
          <TouchableOpacity
            onPress={() => setShowDropdown(!showDropdown)}
            style={styles.dropdown}
            activeOpacity={0.7}
          >
            <Text style={selectedSubject ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
              {selectedSubject || 'Select Subject'}
            </Text>
            <Feather 
              name={showDropdown ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#6B7280" 
            />
          </TouchableOpacity>

          {/* Dropdown List */}
          {showDropdown && (
            <View style={styles.dropdownList}>
              {subjects.map((subject, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSubjectSelect(subject)}
                  style={[
                    styles.dropdownItem,
                    index !== subjects.length - 1 && styles.dropdownItemBorder
                  ]}
                  activeOpacity={0.6}
                >
                  <Text style={styles.dropdownItemText}>{subject}</Text>
                  {selectedSubject === subject && (
                    <Feather name="check" size={20} color="#14B8A6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Upload Button */}
        <View style={styles.uploadSection}>
          <TouchableOpacity
            onPress={handleUploadSchema}
            style={[
              styles.uploadButton,
              !selectedSubject && styles.uploadButtonDisabled
            ]}
            activeOpacity={0.8}
            disabled={!selectedSubject}
          >
            <View style={styles.uploadButtonContent}>
              <View style={[
                styles.uploadIconContainer,
                !selectedSubject && styles.uploadIconContainerDisabled
              ]}>
                <Feather 
                  name="upload-cloud" 
                  size={48} 
                  color={selectedSubject ? "#14B8A6" : "#9CA3AF"} 
                />
              </View>
              <Text style={[
                styles.uploadButtonText,
                !selectedSubject && styles.uploadButtonTextDisabled
              ]}>
                Upload Answer Schema
              </Text>
              <Text style={[
                styles.uploadButtonSubtext,
                !selectedSubject && styles.uploadButtonSubtextDisabled
              ]}>
                {selectedSubject 
                  ? 'Tap to select PDF file' 
                  : 'Select a subject first'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Feather name="info" size={20} color="#14B8A6" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>What is an Answer Schema?</Text>
            <Text style={styles.infoText}>
              Upload the official answer key PDF for this assessment. You'll be able to crop specific sections for each question.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownTextSelected: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownTextPlaceholder: {
    fontSize: 17,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#14B8A6',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  uploadButtonDisabled: {
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  uploadButtonContent: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadIconContainerDisabled: {
    backgroundColor: '#F3F4F6',
  },
  uploadButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  uploadButtonTextDisabled: {
    color: '#9CA3AF',
  },
  uploadButtonSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: '#14B8A6',
  },
  uploadButtonSubtextDisabled: {
    color: '#9CA3AF',
  },
  infoCard: {
    backgroundColor: '#E0F2F1',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#14B8A6',
    lineHeight: 20,
  },
});

export { UploadSchemaScreenProps };
