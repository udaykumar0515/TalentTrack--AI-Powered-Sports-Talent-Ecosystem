import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCoaches } from '../api/apiClient';

export interface Coach {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface CoachContextType {
  coaches: Coach[];
  addCoach: (coach: Coach) => void;
  getCoachById: (id: string) => Coach | undefined;
  isLoading: boolean;
  error: string | null;
  refreshCoaches: () => Promise<void>;
}

const CoachContext = createContext<CoachContextType | undefined>(undefined);

export const useCoaches = () => {
  const context = useContext(CoachContext);
  if (context === undefined) {
    throw new Error('useCoaches must be used within a CoachProvider');
  }
  return context;
};

interface CoachProviderProps {
  children: ReactNode;
}

const API_BASE = "/api";

export const CoachProvider: React.FC<CoachProviderProps> = ({ children }) => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load coaches from backend API on mount
  const fetchCoaches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const coachesData = await getCoaches();
      setCoaches(coachesData);
    } catch (error: any) {
      setError(error.message || 'Error loading coaches');
      console.error('Error loading coaches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const addCoach = (coach: Coach) => {
    setCoaches(prevCoaches => [...prevCoaches, coach]);
  };

  const getCoachById = (id: string): Coach | undefined => {
    return coaches.find(coach => coach.id === id);
  };

  const refreshCoaches = async () => {
    await fetchCoaches();
  };

  return (
    <CoachContext.Provider value={{
      coaches,
      addCoach,
      getCoachById,
      isLoading,
      error,
      refreshCoaches
    }}>
      {children}
    </CoachContext.Provider>
  );
};