// Evaluation Service
import { BASE_URL } from '../../constants/api';
import { networkService } from '../network/network-service';

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
      console.log('📋 Fetching evaluation schemas for teacher:', teacherId);
      return await networkService.requestJson<EvaluationSchema[]>(`${BASE_URL}/evaluation_schemas/${teacherId}`, {
        timeout: 10000,
        retries: 2,
      });
    } catch (error: any) {
      console.error('❌ Error fetching evaluation schemas:', error.message);
      throw error;
    }
  }

  async fetchEvaluationDetails(schemaId: number): Promise<EvaluationDetail[]> {
    try {
      console.log('📄 Fetching evaluation details for schema:', schemaId);
      return await networkService.requestJson<EvaluationDetail[]>(`${BASE_URL}/evaluation_details/${schemaId}`, {
        timeout: 10000,
        retries: 2,
      });
    } catch (error: any) {
      console.error('❌ Error fetching evaluation details:', error.message);
      throw error;
    }
  }

  async uploadAnswerSchema(formData: FormData): Promise<EvaluationSchema> {
    try {
      console.log('📤 Uploading answer schema...');
      return await networkService.submitForm<EvaluationSchema>(`${BASE_URL}/upload_answer_schema`, formData, {
        timeout: 60000, // 60 seconds for file upload
        retries: 2,
        showRetryLogs: true,
      });
    } catch (error: any) {
      console.error('❌ Error uploading answer schema:', error.message);
      throw error;
    }
  }

  async deleteEvaluationSchema(schemaId: number): Promise<void> {
    try {
      console.log('🗑️ Deleting evaluation schema:', schemaId);
      await networkService.delete(`${BASE_URL}/evaluation_schema/${schemaId}`, {
        timeout: 10000,
        retries: 1, // Only 1 retry for delete operations
      });
    } catch (error: any) {
      console.error('❌ Error deleting evaluation schema:', error.message);
      throw error;
    }
  }
}

export const evaluationService = new EvaluationService();
