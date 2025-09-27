import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, registerUser, googleLogin as apiGoogleLogin, getAthletes, getCoaches } from '../api/apiClient';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'athlete' | 'coach';
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, expectedRole?: 'athlete' | 'coach') => Promise<boolean>;
  googleLogin: (email: string, name: string, role: 'athlete' | 'coach') => Promise<boolean>;
  register: (email: string, password: string, username: string, role: 'athlete' | 'coach') => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  getAllUsers: () => Promise<{ athletes: User[], coaches: User[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE = "/api";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // 🔹 Login using backend
  const login = async (email: string, password: string, expectedRole?: 'athlete' | 'coach'): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const userData = await loginUser({ email, password, role: expectedRole });
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Google Login using backend
  const googleLogin = async (email: string, name: string, role: 'athlete' | 'coach'): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const googleToken = `google_${Date.now()}`; // Mock Google token for demo
      const userData = await apiGoogleLogin(googleToken);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    } catch (error: any) {
      console.error('Google login error:', error);
      setError(error.message || 'Google login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Register using backend
  const register = async (email: string, password: string, username: string, role: 'athlete' | 'coach'): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const userData = await registerUser({ email, password, username, role });
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    console.log('User logged out');
  };

  // 🔹 Fetch all users (for admin/debugging)
  const getAllUsers = async (): Promise<{ athletes: User[], coaches: User[] }> => {
    try {
      const [athletes, coaches] = await Promise.all([
        getAthletes(),
        getCoaches()
      ]);
      return { athletes, coaches };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { athletes: [], coaches: [] };
    }
  };

  const value: AuthContextType = {
    user,
    login,
    googleLogin,
    register,
    logout,
    isLoading,
    error,
    getAllUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
