const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

export interface COCreateRequest {
  subject_name: string;
  sem: number;
  ia_number: number;
  student_count: number;
  co_image: File;
}

export const coAPI = {
  async fetchSubjects(semester: number, token: string): Promise<Subject[]> {
    const response = await fetch(`${API_BASE_URL}/subject_fetch/${semester}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subjects');
    }

    return response.json();
  },

  async fetchMyCOs(teacherId: number, token: string): Promise<CO[]> {
    const response = await fetch(`${API_BASE_URL}/co_fetch/${teacherId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch COs');
    }

    return response.json();
  },

  async createCO(data: COCreateRequest, token: string): Promise<any> {
    const formData = new FormData();
    formData.append('subject_name', data.subject_name);
    formData.append('sem', data.sem.toString());
    formData.append('ia_number', data.ia_number.toString());
    formData.append('student_count', data.student_count.toString());
    formData.append('co_image', data.co_image);

    const response = await fetch(`${API_BASE_URL}/co_creation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create CO');
    }

    return response.json();
  },

  async fetchCODetails(subjectId: number, token: string): Promise<CODetail[]> {
    const response = await fetch(`${API_BASE_URL}/co_fetch_details/${subjectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CO details');
    }

    return response.json();
  },

  async deleteCO(coId: number, token: string): Promise<{ status: string; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/co_delete/${coId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete CO');
    }

    return response.json();
  },

  async downloadExcel(subjectId: number, token: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/co_download_excel/${subjectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download Excel');
    }

    return response.blob();
  },
};
