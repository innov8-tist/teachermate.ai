const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  teacher_name: string;
  email: string;
  password: string;
  institution?: string;
  pfp?: File;
}

export interface AuthResponse {
  access_token: string;
  teacher: {
    id: number;
    teacher_name: string;
    email: string;
    institution?: string;
    pfp_url?: string;
  };
}

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const authAPI = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || 'Login failed',
        response.status,
        errorData
      );
    }

    return response.json();
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('teacher_name', data.teacher_name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    
    if (data.institution) {
      formData.append('institution', data.institution);
    }
    
    if (data.pfp) {
      formData.append('pfp', data.pfp);
    }

    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || 'Signup failed',
        response.status,
        errorData
      );
    }

    return response.json();
  },
};
