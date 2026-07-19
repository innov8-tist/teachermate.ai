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

export interface StudentRegno {
  regno: string
}

export interface SearchedStudent {
  student_reg_no: string
  student_name: string
  total_questions: number
  upload_method: string
  progress_id: number | null
}

export interface RecentProgress {
  id: number
  student_reg_no: string
  total_questions: number
  upload_method: string
  pdf_id: string
  created_at: string
  updated_at: string
}

export const evaluationAPI = {
  async fetchStudentsBySubject(subjectId: number, token: string): Promise<StudentRegno[]> {
    const response = await fetch(`${API_BASE_URL}/students_by_subject/${subjectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch students')
    }

    return response.json()
  },

  async searchStudents(schemaId: number, query: string, token: string): Promise<SearchedStudent[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/evaluation/search-students/${schemaId}?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error('Failed to search students')
    }

    const data = await response.json()
    return data.students || []
  },

  async fetchRecentProgress(schemaId: number, token: string): Promise<RecentProgress[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/evaluation/student-progress/${schemaId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error('Failed to fetch recent progress')
    }

    const data = await response.json()
    return data.recent_progress || []
  },

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

  async uploadStudentPdf(
    pdfFile: File,
    evaluationId: number,
    studentRegNo: string,
    token: string,
  ): Promise<{ success: boolean; pdf_id: string; progress_id: number | null }> {
    const formData = new FormData()
    formData.append('pdf_file', pdfFile)
    formData.append('evaluation_id', evaluationId.toString())
    formData.append('student_reg_no', studentRegNo)

    const response = await fetch(`${API_BASE_URL}/api/evaluation/upload-pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Failed to upload student PDF')
    }

    return response.json()
  },

  async startEvaluation(progressId: number, token: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/evaluation/start-evaluation/${progressId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Failed to start evaluation')
    }

    return response.json()
  },
}
