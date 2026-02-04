import { API_BASE_URL } from '@/constants/api';
import { networkService } from '../network/network-service';

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

export interface UpdateProfileRequest {
  teacher_name?: string;
  institution?: string;
  pfp?: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface UpdateProfileResponse {
  id: number;
  teacher_name: string;
  email: string;
  institution?: string;
  pfp_url?: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 Attempting login for:', data.email);
    
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    try {
      return await networkService.submitForm<AuthResponse>(`${API_BASE_URL}/auth/login`, formData, {
        timeout: 15000, // 15 seconds for auth
        retries: 1, // Only 1 retry for auth
      });
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw new Error(error.message || 'Login failed');
    }
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    console.log('📝 Attempting signup for:', data.email);
    
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

    try {
      return await networkService.submitForm<AuthResponse>(`${API_BASE_URL}/auth/signup`, formData, {
        timeout: 30000, // 30 seconds for signup (may include image upload)
        retries: 1, // Only 1 retry for auth
      });
    } catch (error: any) {
      console.error('❌ Signup failed:', error.message);
      throw new Error(error.message || 'Signup failed');
    }
  },

  async updateProfile(token: string, data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    console.log('✏️ Updating profile');
    
    const formData = new FormData();
    if (data.teacher_name) {
      formData.append('teacher_name', data.teacher_name);
    }
    if (data.institution !== undefined) {
      formData.append('institution', data.institution);
    }
    if (data.pfp) {
      formData.append('pfp', data.pfp as any);
    }

    try {
      const response = await networkService.put(
        `${API_BASE_URL}/auth/me`, 
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000,
          retries: 1,
        }
      );
      return response.json();
    } catch (error: any) {
      console.error('❌ Profile update failed:', error.message);
      throw new Error(error.message || 'Profile update failed');
    }
  },
};
