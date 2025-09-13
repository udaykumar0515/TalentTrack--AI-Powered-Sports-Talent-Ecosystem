import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

export const CoachProvider: React.FC<CoachProviderProps> = ({ children }) => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load coaches from localStorage on mount
  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = () => {
    try {
      const storedCoaches = localStorage.getItem('registeredCoaches');
      if (storedCoaches) {
        setCoaches(JSON.parse(storedCoaches));
      }
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  };

  const addCoach = (coach: Coach) => {
    setCoaches(prevCoaches => {
      const updatedCoaches = [...prevCoaches, coach];
      localStorage.setItem('registeredCoaches', JSON.stringify(updatedCoaches));
      return updatedCoaches;
    });
  };

  const getCoachById = (id: string): Coach | undefined => {
    return coaches.find(coach => coach.id === id);
  };

  return (
    <CoachContext.Provider value={{
      coaches,
      addCoach,
      getCoachById,
      isLoading
    }}>
      {children}
    </CoachContext.Provider>
  );
};
