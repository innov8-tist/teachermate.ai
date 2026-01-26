import { API_BASE_URL } from '@/constants/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  teacher_name: string;
  email: string;
  password: string;
  institution?: string;
  pfp?: {
    uri: string;
    name: string;
    type: string;
  };
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

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
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
      formData.append('pfp', data.pfp as any);
    }

    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Signup failed');
    }

    return response.json();
  },
};
