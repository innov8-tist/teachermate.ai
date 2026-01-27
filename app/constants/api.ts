// API Configuration
// For Android emulator use 10.0.2.2
// For iOS simulator use localhost
// For physical device, replace with your computer's IP (e.g., 192.168.1.5)

// const BASE_URL = 'http://10.0.2.2:8000';
const BASE_URL = 'http://192.168.1.4:8000';

export const API_BASE_URL = BASE_URL;

export const API_ENDPOINTS = {
  SUBJECT_FETCH: (semester: string) => `${BASE_URL}/subject_fetch/${semester}`,
  CO_CREATION: `${BASE_URL}/co_creation`,
  CO_FETCH: (teacherId: number) => `${BASE_URL}/co_fetch/${teacherId}`,
  CO_FETCH_DETAILS: (subjectId: number) => `${BASE_URL}/co_fetch_details/${subjectId}`,
  CO_DELETE: (coId: number) => `${BASE_URL}/co_delete/${coId}`,
  AUTH_LOGIN: `${BASE_URL}/auth/login`,
  AUTH_SIGNUP: `${BASE_URL}/auth/signup`,
  AUTH_ME: `${BASE_URL}/auth/me`,
  PDF_CONVERT: `${BASE_URL}/api/pdf/convert-to-images`,
};

export { BASE_URL };
