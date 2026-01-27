// Evaluation Service
import { BASE_URL } from '../../constants/api';

export interface EvaluationSchema {
  id: number;
  subject_name: string;
  question_count: number;
  created_at: string;
  teacher_id: number;
}

export interface EvaluationDetail {
  id: number;
  schema_id: number;
  question_number: number;
  marks: number;
  criteria: string;
}

class EvaluationService {
  async fetchEvaluationSchemas(teacherId: number = 1): Promise<EvaluationSchema[]> {
    try {
      const response = await fetch(`${BASE_URL}/evaluation_schemas/${teacherId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation schemas');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching evaluation schemas:', error);
      throw error;
    }
  }

  async fetchEvaluationDetails(schemaId: number): Promise<EvaluationDetail[]> {
    try {
      const response = await fetch(`${BASE_URL}/evaluation_details/${schemaId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation details');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching evaluation details:', error);
      throw error;
    }
  }

  async uploadAnswerSchema(formData: FormData): Promise<EvaluationSchema> {
    try {
      const response = await fetch(`${BASE_URL}/upload_answer_schema`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload answer schema');
      }
      return await response.json();
    } catch (error) {
      console.error('Error uploading answer schema:', error);
      throw error;
    }
  }

  async deleteEvaluationSchema(schemaId: number): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/evaluation_schema/${schemaId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete evaluation schema');
      }
    } catch (error) {
      console.error('Error deleting evaluation schema:', error);
      throw error;
    }
  }
}

export const evaluationService = new EvaluationService();
