import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { Alert } from '@/utils/alert';
import { BASE_URL } from '../constants/api';
import { networkService } from '../services/network/network-service';

export interface PDFUploadResult {
  pdfId: string;
  fileName: string;
  fileSize: number;
  progressId?: number;
}

export interface PDFUploadOptions {
  evaluationId?: number;
  studentRegNo?: string;
}

export const pickAndUploadPDF = async (
  token: string,
  options?: PDFUploadOptions
): Promise<PDFUploadResult | null> => {
  try {
    console.log('📁 Opening PDF picker...', 'Platform:', Platform.OS);

    if (Platform.OS === 'web') {
      // Web implementation
      console.log('🌐 Using WEB PDF picker');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,.pdf';

      return new Promise((resolve) => {
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            console.log('📄 PDF selection cancelled');
            resolve(null);
            return;
          }

          console.log('📄 PDF selected:', { name: file.name, size: file.size, type: file.type });

          // Validate
          const maxSize = 50 * 1024 * 1024;
          if (file.size > maxSize) {
            Alert.alert('Error', 'File size too large. Please select a file smaller than 50MB.');
            resolve(null);
            return;
          }

          if (file.type !== 'application/pdf') {
            Alert.alert('Error', 'Please select a valid PDF file.');
            resolve(null);
            return;
          }

          // Upload
          const formData = new FormData();
          formData.append('pdf_file', file, file.name);

          if (options?.evaluationId) {
            formData.append('evaluation_id', options.evaluationId.toString());
          }
          if (options?.studentRegNo) {
            formData.append('student_reg_no', options.studentRegNo);
          }

          console.log('📤 Uploading PDF to backend...');

          try {
            const response = await fetch(`${BASE_URL}/api/evaluation/upload-pdf`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ Upload failed:', errorText);
              throw new Error(`Upload failed: ${response.status}`);
            }

            const uploadResult = await response.json();
            console.log('✅ PDF uploaded successfully:', uploadResult);

            resolve({
              pdfId: uploadResult.pdf_id,
              fileName: file.name,
              fileSize: file.size,
              progressId: uploadResult.progress_id,
            });
          } catch (error: any) {
            console.error('❌ Error uploading PDF:', error.message);
            Alert.alert('Upload Failed', error.message || 'Failed to upload PDF');
            resolve(null);
          }
        };

        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // Mobile implementation
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

    // Add optional parameters if provided
    console.log('📤 Upload options received:', JSON.stringify(options));
    if (options?.evaluationId) {
      console.log('📤 Adding evaluation_id:', options.evaluationId);
      formData.append('evaluation_id', options.evaluationId.toString());
    } else {
      console.log('⚠️ No evaluation_id provided');
    }
    if (options?.studentRegNo) {
      console.log('📤 Adding student_reg_no:', options.studentRegNo);
      formData.append('student_reg_no', options.studentRegNo);
    } else {
      console.log('⚠️ No student_reg_no provided');
    }

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
      progressId: uploadResult.progress_id,
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