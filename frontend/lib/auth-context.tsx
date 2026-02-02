'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'athlete' | 'coach') => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('talenttrack_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('talenttrack_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const userData = await response.json();
      
      // Map backend fields to frontend User type
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.username, // Backend uses username as name
        username: userData.username,
        role: userData.role,
        createdAt: userData.created_at,
        age: userData.age,
        gender: userData.gender,
        weight: userData.weight,
        height: userData.height,
      };
      
      // Add athlete-specific fields if present
      if (userData.coachId) {
        (mappedUser as import('./types').Athlete).coachId = userData.coachId;
        (mappedUser as import('./types').Athlete).coachName = userData.coachName;
      }
      
      setUser(mappedUser);
      localStorage.setItem('talenttrack_user', JSON.stringify(mappedUser));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'athlete' | 'coach'
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username: name, // Use name as username for simplicity
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Registration failed');
      }

      const userData = await response.json();
      
      // Map backend fields to frontend User type
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.username,
        username: userData.username,
        role: userData.role,
        createdAt: userData.created_at,
        age: userData.age,
        gender: userData.gender,
        weight: userData.weight,
        height: userData.height,
      };
      
      setUser(mappedUser);
      localStorage.setItem('talenttrack_user', JSON.stringify(mappedUser));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('talenttrack_user');
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    
    // Optimistic update
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('talenttrack_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        error,
        login, 
        register, 
        updateUser,
        logout,
      }}
    >
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
