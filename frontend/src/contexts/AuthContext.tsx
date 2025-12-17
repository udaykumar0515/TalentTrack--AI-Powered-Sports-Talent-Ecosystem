import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  register: (email: string, password: string, username: string, role: 'athlete' | 'coach', age?: number, gender?: string) => Promise<boolean>;
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
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: expectedRole }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed'); // ✅ changed to .detail
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
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
      const response = await fetch(`${API_BASE}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          role,
          google_id: `google_${Date.now()}` // Mock Google ID for demo
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Google login failed');
        return false;
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Register using backend
  const register = async (email: string, password: string, username: string, role: 'athlete' | 'coach', age?: number, gender?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, role, age, gender }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed'); // ✅ changed to .detail
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // 🔹 Fetch all users (for admin/debugging)
  const getAllUsers = async (): Promise<{ athletes: User[], coaches: User[] }> => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (response.ok) {
        return await response.json();
      }
      return { athletes: [], coaches: [] };
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
