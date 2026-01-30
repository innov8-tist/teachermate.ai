import { Alert } from 'react-native';
import { API_ENDPOINTS } from '@/constants/api';
import { networkService } from '../network/network-service';

export interface Subject {
  name: string;
}

export interface CO {
  id: number;
  ia: string;
  name: string;
  branch: string;
  sem: number;
}

export interface CODetail {
  q_no: string;
  co_no: string;
}

export interface COCreationData {
  subject_name: string;
  sem: string;
  ia_number: string;
  student_count: number;
  co_image: {
    uri: string;
    name: string;
    type: string;
  };
}

export const coService = {
  async fetchSubjects(semester: string): Promise<Subject[]> {
    try {
      console.log('📚 Fetching subjects for semester:', semester);
      return await networkService.requestJson<Subject[]>(API_ENDPOINTS.SUBJECT_FETCH(semester), {
        timeout: 10000,
        retries: 2,
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch subjects:', error.message);
      Alert.alert('Connection Error', 'Make sure backend is running on port 8000');
      throw error;
    }
  },

  async createCO(data: COCreationData, token: string): Promise<{ status: string; message?: string }> {
    console.log('🎯 Creating CO with data:', {
      subject_name: data.subject_name,
      sem: data.sem,
      ia_number: data.ia_number,
      student_count: data.student_count,
    });

    const formData = new FormData();
    formData.append('subject_name', data.subject_name);
    formData.append('sem', data.sem);
    formData.append('ia_number', data.ia_number);
    formData.append('student_count', data.student_count.toString());
    formData.append('co_image', {
      uri: data.co_image.uri,
      name: data.co_image.name,
      type: data.co_image.type,
    } as any);

    try {
      return await networkService.submitForm<{ status: string; message?: string }>(
        API_ENDPOINTS.CO_CREATION,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: 60000, // 60 seconds for image upload
          retries: 2,
          showRetryLogs: true,
        }
      );
    } catch (error: any) {
      console.error('❌ CO creation failed:', error.message);
      
      // Provide better error messages
      let errorMessage = error.message;
      if (error.isTimeoutError) {
        errorMessage = 'Upload timeout - please try again with a smaller image or better connection';
      } else if (error.isNetworkError) {
        errorMessage = 'Network error - please check your connection and try again';
      } else if (error.isServerError) {
        errorMessage = 'Server error - please try again later';
      }
      
      throw new Error(errorMessage);
    }
  },

  async fetchMyCOs(teacherId: number): Promise<CO[]> {
    try {
      console.log('📋 Fetching COs for teacher:', teacherId);
      return await networkService.requestJson<CO[]>(API_ENDPOINTS.CO_FETCH(teacherId), {
        timeout: 10000,
        retries: 2,
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch COs:', error.message);
      Alert.alert('Error', 'Failed to fetch CO list');
      throw error;
    }
  },

  async fetchCODetails(subjectId: number): Promise<CODetail[]> {
    try {
      console.log('📄 Fetching CO details for subject:', subjectId);
      return await networkService.requestJson<CODetail[]>(API_ENDPOINTS.CO_FETCH_DETAILS(subjectId), {
        timeout: 10000,
        retries: 2,
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch CO details:', error.message);
      Alert.alert('Error', 'Failed to fetch CO details');
      throw error;
    }
  },

  async fetchSubjectInfo(subjectId: number): Promise<{ name: string; ia: string; branch: string; sem: number }> {
    try {
      console.log('ℹ️ Fetching subject info for:', subjectId);
      return await networkService.requestJson<{ name: string; ia: string; branch: string; sem: number }>(
        API_ENDPOINTS.CO_SUBJECT_INFO(subjectId),
        {
          timeout: 10000,
          retries: 2,
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to fetch subject info:', error.message);
      throw error;
    }
  },

  async fetchCOWithStudentCount(subjectId: number): Promise<{ name: string; ia: string; branch: string; sem: number; student_count: number }> {
    try {
      console.log('👥 Fetching CO with student count for:', subjectId);
      return await networkService.requestJson<{ name: string; ia: string; branch: string; sem: number; student_count: number }>(
        API_ENDPOINTS.CO_SUBJECT_INFO(subjectId),
        {
          timeout: 10000,
          retries: 2,
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to fetch CO info:', error.message);
      throw error;
    }
  },

  async deleteCO(coId: number): Promise<{ status: string; message?: string }> {
    try {
      console.log('🗑️ Deleting CO:', coId);
      return await networkService.requestJson<{ status: string; message?: string }>(
        API_ENDPOINTS.CO_DELETE(coId),
        {
          method: 'DELETE',
          timeout: 10000,
          retries: 1, // Only 1 retry for delete operations
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to delete CO:', error.message);
      Alert.alert('Error', 'Failed to delete CO');
      throw error;
    }
  },

  async downloadCOExcel(subjectId: number): Promise<string> {
    try {
      console.log('📊 Downloading Excel for subject:', subjectId);
      
      const response = await networkService.get(API_ENDPOINTS.CO_DOWNLOAD_EXCEL(subjectId), {
        timeout: 30000, // 30 seconds for file download
        retries: 2,
      });
      
      console.log('📥 Excel download response received');
      
      // Convert response to blob and then to base64
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data URL prefix to get just the base64 string
          const base64 = base64data.split(',')[1];
          console.log('✅ Excel converted to base64');
          resolve(base64);
        };
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          reject(new Error('Failed to convert Excel file'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      console.error('❌ Download Excel error:', error.message);
      throw error;
    }
  },
};
