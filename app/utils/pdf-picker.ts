import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { BASE_URL } from '../constants/api';

export interface PDFUploadResult {
  pdfId: string;
  fileName: string;
  fileSize: number;
}

export const pickAndUploadPDF = async (token: string): Promise<PDFUploadResult | null> => {
  try {
    // Pick PDF file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    
    if (!file) {
      Alert.alert('Error', 'No file selected');
      return null;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size && file.size > maxSize) {
      Alert.alert('Error', 'File size too large. Please select a file smaller than 50MB.');
      return null;
    }

    // Upload PDF to backend
    const formData = new FormData();
    formData.append('pdf_file', {
      uri: file.uri,
      type: file.mimeType || 'application/pdf',
      name: file.name,
    } as any);

    const response = await fetch(`${BASE_URL}/api/evaluation/upload-pdf`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for multipart/form-data
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload PDF');
    }

    const uploadResult = await response.json();
    
    return {
      pdfId: uploadResult.pdf_id,
      fileName: file.name,
      fileSize: file.size || 0,
    };

  } catch (error) {
    console.error('Error picking/uploading PDF:', error);
    Alert.alert('Error', `Failed to upload PDF: ${error}`);
    return null;
  }
};

export const validatePDFFile = (file: DocumentPicker.DocumentPickerAsset): boolean => {
  // Check file type
  if (file.mimeType !== 'application/pdf') {
    Alert.alert('Invalid File', 'Please select a PDF file');
    return false;
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size && file.size > maxSize) {
    Alert.alert('File Too Large', 'Please select a file smaller than 50MB');
    return false;
  }

  return true;
};