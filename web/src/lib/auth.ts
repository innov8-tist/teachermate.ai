import { AuthResponse } from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getUser(): AuthResponse['teacher'] | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  setUser(user: AuthResponse['teacher']): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  saveAuth(authResponse: AuthResponse): void {
    this.setToken(authResponse.access_token);
    this.setUser(authResponse.teacher);
  },

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
