const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface EvaluationSchema {
  evaluation_id: number
  subject_id: number
  subject_name: string
  subject_code: string
  semester: string
  branch: string
  ia: string
  total_questions: number
  completed_questions: number
  total_students: number
  completed_students: number
  status: string
  created_at: string
  updated_at: string
}

export interface EvaluationResponse {
  success: boolean
  evaluations: EvaluationSchema[]
}

export const evaluationAPI = {
  async fetchEvaluationSchemas(teacherId: number, token: string): Promise<EvaluationSchema[]> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${teacherId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch evaluation schemas')
    }

    const data: EvaluationResponse = await response.json()
    return data.evaluations
  },

  async uploadAnswerKey(templateId: number, file: File, token: string): Promise<{ status: string; message: string }> {
    const formData = new FormData()
    formData.append('template_id', templateId.toString())
    formData.append('answer_key_pdf', file)

    const response = await fetch(`${API_BASE_URL}/upload_evaluation_pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Failed to upload answer key')
    }

    return response.json()
  },

  async deleteEvaluationSchema(schemaId: number, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/evaluation/${schemaId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to delete evaluation schema')
    }
  },
}
