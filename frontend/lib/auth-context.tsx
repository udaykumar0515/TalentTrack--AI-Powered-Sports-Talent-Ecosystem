'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Athlete, Coach } from './types';

// Demo users matching actual backend database records
// These IDs match records in backend/data/athletes/athletes.json and coaches.json
const DEMO_ATHLETE: Athlete = {
  id: '53aa59ac-6739-4ff7-bda8-21883bd3ecb3',
  email: 'uday@example.com',
  name: 'Udaykumar H',
  username: 'Udaykumar_H',
  role: 'athlete',
  coachId: 'dcd85641-bfbf-4a80-bf25-633ac9fc22fb',
  coachName: 'Mike',
  createdAt: '2025-12-17T15:47:54.950666',
  stats: {
    totalSessions: 12,
    averageFormScore: 85,
    streak: 5,
    xp: 1250,
    level: 3,
  },
};

const DEMO_COACH: Coach = {
  id: 'dcd85641-bfbf-4a80-bf25-633ac9fc22fb',
  email: 'mike@coach.com',
  name: 'Mike',
  username: 'mike',
  role: 'coach',
  specialization: 'Strength & Conditioning',
  athleteCount: 2,
  createdAt: '2025-12-17T15:49:14.203848',
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'athlete' | 'coach') => Promise<void>;
  logout: () => void;
  isDemoMode: boolean;
  switchDemoRole: () => void;
  setDemoUser: (role: 'athlete' | 'coach') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('talenttrack_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(DEMO_ATHLETE);
        localStorage.setItem('talenttrack_user', JSON.stringify(DEMO_ATHLETE));
      }
    } else {
      setUser(DEMO_ATHLETE);
      localStorage.setItem('talenttrack_user', JSON.stringify(DEMO_ATHLETE));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const selectedUser = email.toLowerCase().includes('coach') 
        ? DEMO_COACH 
        : DEMO_ATHLETE;
      setUser(selectedUser);
      localStorage.setItem('talenttrack_user', JSON.stringify(selectedUser));
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: 'athlete' | 'coach'
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newUser: User = role === 'coach' 
        ? { ...DEMO_COACH, name, email }
        : { ...DEMO_ATHLETE, name, email };
      
      setUser(newUser);
      localStorage.setItem('talenttrack_user', JSON.stringify(newUser));
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('talenttrack_user');
  };

  const switchDemoRole = () => {
    if (!user) return;
    
    const newUser = user.role === 'athlete' ? DEMO_COACH : DEMO_ATHLETE;
    setUser(newUser);
    localStorage.setItem('talenttrack_user', JSON.stringify(newUser));
  };

  const setDemoUser = (role: 'athlete' | 'coach') => {
    const newUser = role === 'coach' ? DEMO_COACH : DEMO_ATHLETE;
    setUser(newUser);
    localStorage.setItem('talenttrack_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        error,
        login, 
        register, 
        logout,
        isDemoMode,
        switchDemoRole,
        setDemoUser,
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

export { DEMO_ATHLETE, DEMO_COACH };
