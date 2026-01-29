import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { BASE_URL } from '../constants/api';
import { networkService } from '../services/network/network-service';

export interface PDFUploadResult {
  pdfId: string;
  fileName: string;
  fileSize: number;
}

export const pickAndUploadPDF = async (token: string): Promise<PDFUploadResult | null> => {
  try {
    console.log('📁 Opening PDF picker...');
    
    // Pick PDF file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      console.log('📄 PDF selection cancelled');
      return null;
    }

    const file = result.assets[0];
    
    if (!file) {
      Alert.alert('Error', 'No file selected');
      return null;
    }

    console.log('📄 PDF selected:', {
      name: file.name,
      size: file.size,
      type: file.mimeType,
    });

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size && file.size > maxSize) {
      Alert.alert('Error', 'File size too large. Please select a file smaller than 50MB.');
      return null;
    }

    // Validate file type
    if (file.mimeType !== 'application/pdf') {
      Alert.alert('Error', 'Please select a valid PDF file.');
      return null;
    }

    // Upload PDF to backend
    const formData = new FormData();
    formData.append('pdf_file', {
      uri: file.uri,
      type: file.mimeType || 'application/pdf',
      name: file.name,
    } as any);

    console.log('📤 Uploading PDF to backend...');
    const uploadResult = await networkService.submitForm<any>(`${BASE_URL}/api/evaluation/upload-pdf`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 120000, // 2 minutes for large PDF uploads
      retries: 2,
      showRetryLogs: true,
    });
    
    console.log('✅ PDF uploaded successfully:', uploadResult);
    
    return {
      pdfId: uploadResult.pdf_id,
      fileName: file.name,
      fileSize: file.size || 0,
    };

  } catch (error: any) {
    console.error('❌ Error picking/uploading PDF:', error.message);
    
    // Provide better error messages
    let errorMessage = 'Failed to upload PDF';
    if (error.isNetworkError) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.isTimeoutError) {
      errorMessage = 'Upload timeout. The file might be too large. Please try again.';
    } else if (error.isServerError) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('Upload Failed', errorMessage);
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