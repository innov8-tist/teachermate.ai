import { Alert } from '@/utils/alert';
import { BASE_URL } from '../constants/api';

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
    console.log('📁 Opening PDF picker (WEB)...');

    // Create file input for web
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

        console.log('📄 PDF selected:', {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          Alert.alert('Error', 'File size too large. Please select a file smaller than 50MB.');
          resolve(null);
          return;
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
          Alert.alert('Error', 'Please select a valid PDF file.');
          resolve(null);
          return;
        }

        // Upload PDF to backend
        const formData = new FormData();
        formData.append('pdf_file', file, file.name);

        // Add optional parameters if provided
        console.log('📤 Upload options received:', JSON.stringify(options));
        if (options?.evaluationId) {
          console.log('📤 Adding evaluation_id:', options.evaluationId);
          formData.append('evaluation_id', options.evaluationId.toString());
        }
        if (options?.studentRegNo) {
          console.log('📤 Adding student_reg_no:', options.studentRegNo);
          formData.append('student_reg_no', options.studentRegNo);
        }

        console.log('📤 Uploading PDF to backend...');

        try {
          const response = await fetch(`${BASE_URL}/api/evaluation/upload-pdf`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
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

      input.oncancel = () => {
        console.log('📄 PDF selection cancelled');
        resolve(null);
      };

      input.click();
    });
  } catch (error: any) {
    console.error('❌ Error picking/uploading PDF:', error.message);
    Alert.alert('Upload Failed', error.message || 'Failed to upload PDF');
    return null;
  }
};

export const validatePDFFile = (file: File): boolean => {
  // Check file type
  if (file.type !== 'application/pdf') {
    Alert.alert('Invalid File', 'Please select a PDF file');
    return false;
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    Alert.alert('File Too Large', 'Please select a file smaller than 50MB');
    return false;
  }

  return true;
};
