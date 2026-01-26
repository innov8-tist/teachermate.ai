import { Alert } from 'react-native';
import axios from 'axios';
import { API_ENDPOINTS } from '@/constants/api';

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
  co_image: {
    uri: string;
    name: string;
    type: string;
  };
}

export const coService = {
  async fetchSubjects(semester: string): Promise<Subject[]> {
    try {
      const response = await fetch(API_ENDPOINTS.SUBJECT_FETCH(semester));
      const data = await response.json();
      return data;
    } catch (error) {
      Alert.alert('Connection Error', 'Make sure backend is running on port 8000');
      console.error(error);
      throw error;
    }
  },

  async createCO(data: COCreationData, token: string, retryCount = 0): Promise<{ status: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('subject_name', data.subject_name);
      formData.append('sem', data.sem);
      formData.append('ia_number', data.ia_number);
      formData.append('co_image', {
        uri: data.co_image.uri,
        name: data.co_image.name,
        type: data.co_image.type,
      } as any);

      console.log(`Sending CO creation (attempt ${retryCount + 1})`);

      const response = await axios.post(API_ENDPOINTS.CO_CREATION, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 60000,
        transformRequest: (data, headers) => {
          return data;
        },
      });

      console.log('CO creation success:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`CO creation error (attempt ${retryCount + 1}):`, error.response?.data || error.message);
      
      // Retry on network error (max 2 retries)
      if (error.message === 'Network Error' && retryCount < 2) {
        console.log(`Retrying... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.createCO(data, token, retryCount + 1);
      }
      
      if (error.response) {
        throw new Error(error.response.data?.detail || error.response.data?.message || 'Failed to create CO');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      throw new Error(error.message || 'Network request failed');
    }
  },

  async fetchMyCOs(teacherId: number): Promise<CO[]> {
    try {
      const response = await fetch(API_ENDPOINTS.CO_FETCH(teacherId));
      const data = await response.json();
      return data;
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch CO list');
      console.error(error);
      throw error;
    }
  },

  async fetchCODetails(subjectId: number): Promise<CODetail[]> {
    try {
      const response = await fetch(API_ENDPOINTS.CO_FETCH_DETAILS(subjectId));
      const data = await response.json();
      return data;
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch CO details');
      console.error(error);
      throw error;
    }
  },

  async deleteCO(coId: number): Promise<{ status: string; message?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.CO_DELETE(coId), {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete CO');
      console.error(error);
      throw error;
    }
  },
};
