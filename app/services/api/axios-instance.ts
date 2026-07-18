import axios from 'axios';
import { BASE_URL } from '@/constants/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Store the clearAuth function reference
let clearAuthFunction: (() => Promise<void>) | null = null;

// Function to set the clearAuth callback
export const setAuthClearCallback = (callback: () => Promise<void>) => {
  clearAuthFunction = callback;
};

// Response interceptor to handle 401 errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we get a 401 error and have a clearAuth function, call it
    if (error?.response?.status === 401 && clearAuthFunction) {
      console.log('🔒 401 Unauthorized - Token expired, clearing auth...');
      await clearAuthFunction();
    }
    
    // Re-throw the error so it can still be handled locally if needed
    return Promise.reject(error);
  }
);

export default axiosInstance;
