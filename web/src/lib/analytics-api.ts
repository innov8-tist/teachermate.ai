/**
 * Analytics API
 * Handles all analytics-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Context {
  semester: string;
  ia: string;
  branch: string;
  templateId: number;
  subjectName: string;
}

export interface SummaryData {
  totalEvaluations: number;
  totalStudentsEvaluated: number;
  totalSubjects: number;
}

export interface PerformanceData {
  averageScore: number;
  passRate: number;
  totalStudents: number;
  passThreshold: number;
}

export interface ScoreRange {
  range: string;
  count: number;
  label: string;
}

export interface QuestionInsight {
  questionNo: string;
  percentage: number;
  averageMarks: number;
}

export interface QuestionInsightsData {
  averageMarksPerQuestion: number;
  lowestPerforming: QuestionInsight[];
  highestPerforming: QuestionInsight[];
}

export interface COData {
  label: string;
  percentage: number;
  coNo: string;
}

export interface COAttainmentData {
  cos: COData[];
  strongCOs: string[];
  weakCOs: string[];
  coverageComplete: boolean;
}

export interface TrendData {
  label: string;
  value: number;
}

export interface ClassTrendData {
  trend: TrendData[];
  hasData: boolean;
}

export const analyticsAPI = {
  async getContexts(token: string): Promise<{ contexts: Context[] }> {
    const response = await fetch(`${API_BASE_URL}/api/analytics/contexts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch contexts');
    }

    return response.json();
  },

  async getSummary(token: string, params?: { semester?: string; ia?: string; branch?: string }): Promise<SummaryData> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.append('semester', params.semester);
    if (params?.ia) queryParams.append('ia', params.ia);
    if (params?.branch) queryParams.append('branch', params.branch);

    const url = `${API_BASE_URL}/api/analytics/summary${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch summary');
    }

    return response.json();
  },

  async getPerformanceOverview(token: string, params?: { semester?: string; ia?: string; branch?: string }): Promise<PerformanceData> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.append('semester', params.semester);
    if (params?.ia) queryParams.append('ia', params.ia);
    if (params?.branch) queryParams.append('branch', params.branch);

    const url = `${API_BASE_URL}/api/analytics/performance-overview${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch performance overview');
    }

    return response.json();
  },

  async getScoreDistribution(token: string, params?: { semester?: string; ia?: string; branch?: string }): Promise<{ ranges: ScoreRange[] }> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.append('semester', params.semester);
    if (params?.ia) queryParams.append('ia', params.ia);
    if (params?.branch) queryParams.append('branch', params.branch);

    const url = `${API_BASE_URL}/api/analytics/score-distribution${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch score distribution');
    }

    return response.json();
  },

  async getQuestionInsights(token: string, params?: { semester?: string; ia?: string; branch?: string }): Promise<QuestionInsightsData> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.append('semester', params.semester);
    if (params?.ia) queryParams.append('ia', params.ia);
    if (params?.branch) queryParams.append('branch', params.branch);

    const url = `${API_BASE_URL}/api/analytics/question-insights${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch question insights');
    }

    return response.json();
  },

  async getCOAttainment(token: string, params?: { semester?: string; ia?: string; branch?: string }): Promise<COAttainmentData> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.append('semester', params.semester);
    if (params?.ia) queryParams.append('ia', params.ia);
    if (params?.branch) queryParams.append('branch', params.branch);

    const url = `${API_BASE_URL}/api/analytics/co-attainment${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CO attainment');
    }

    return response.json();
  },

  async getClassPerformanceTrend(token: string, params?: { semester?: string; branch?: string }): Promise<ClassTrendData> {
    const queryParams = new URLSearchParams();
    if (params?.semester) queryParams.append('semester', params.semester);
    if (params?.branch) queryParams.append('branch', params.branch);

    const url = `${API_BASE_URL}/api/analytics/class-performance-trend${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch class performance trend');
    }

    return response.json();
  },
};
