import { Alert } from 'react-native';
import { API_ENDPOINTS, TEACHER_ID } from '@/constants/api';

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

  async createCO(data: COCreationData): Promise<{ status: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('subject_name', data.subject_name);
      formData.append('sem', data.sem);
      formData.append('ia_number', data.ia_number);
      formData.append('co_image', data.co_image as any);

      const response = await fetch(API_ENDPOINTS.CO_CREATION, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return await response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async fetchMyCOs(): Promise<CO[]> {
    try {
      const response = await fetch(API_ENDPOINTS.CO_FETCH(TEACHER_ID));
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
