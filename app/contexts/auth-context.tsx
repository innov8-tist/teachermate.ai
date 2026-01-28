import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Teacher {
  id: number;
  teacher_name: string;
  email: string;
  institution?: string;
  pfp_url?: string;
}

interface AuthContextType {
  teacher: Teacher | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, teacher: Teacher) => Promise<void>;
  logout: () => Promise<void>;
  updateTeacher: (teacher: Teacher) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@auth_token';
const TEACHER_KEY = '@teacher_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('🔄 Loading stored auth data...');
      const [storedToken, storedTeacher] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(TEACHER_KEY),
      ]);

      console.log('📦 Stored data retrieved:', {
        hasToken: !!storedToken,
        tokenLength: storedToken?.length || 0,
        hasTeacher: !!storedTeacher
      });

      if (storedToken && storedTeacher) {
        setToken(storedToken);
        setTeacher(JSON.parse(storedTeacher));
        console.log('✅ Auth data loaded successfully');
      } else {
        console.log('⚠️ No stored auth data found');
      }
    } catch (error) {
      console.error('❌ Failed to load auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newTeacher: Teacher) => {
    try {
      console.log('=== Login Debug ===');
      console.log('Token length:', newToken.length);
      console.log('Token (first 100):', newToken.substring(0, 100));
      console.log('Token (last 50):', newToken.substring(newToken.length - 50));
      console.log('==================');
      
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(TEACHER_KEY, JSON.stringify(newTeacher)),
      ]);
      setToken(newToken);
      setTeacher(newTeacher);
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(TEACHER_KEY),
      ]);
      setToken(null);
      setTeacher(null);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw error;
    }
  };

  const updateTeacher = (updatedTeacher: Teacher) => {
    setTeacher(updatedTeacher);
    AsyncStorage.setItem(TEACHER_KEY, JSON.stringify(updatedTeacher));
  };

  return (
    <AuthContext.Provider value={{ teacher, token, isLoading, login, logout, updateTeacher }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
