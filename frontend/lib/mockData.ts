import type {
  User,
  Athlete,
  Coach,
  Session,
  GamificationData,
  Goal,
  Message,
  LeaderboardEntry,
} from './types';

// Mock Users
export const mockAthlete: Athlete = {
  id: '1',
  email: 'athlete@example.com',
  name: 'Alex Morgan',
  role: 'athlete',
  coachId: '2',
  createdAt: new Date().toISOString(),
  stats: {
    totalSessions: 42,
    averageFormScore: 87,
    streak: 7,
    xp: 3450,
    level: 12,
  },
};

export const mockCoach: Coach = {
  id: '2',
  email: 'coach@example.com',
  name: 'Jordan Taylor',
  role: 'coach',
  specialization: 'Strength & Conditioning',
  athleteCount: 15,
  createdAt: new Date().toISOString(),
};

// Mock Sessions
export const mockSessions: Session[] = [
  {
    id: '1',
    athleteId: '1',
    exercise: 'Barbell Squat',
    formScore: 92,
    reps: 10,
    duration: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    aiAnalysis: {
      score: 92,
      feedback: 'Excellent depth and bar path. Minor knee valgus on rep 7.',
      keyPoints: ['Great depth', 'Stable core', 'Good bar speed'],
      improvements: ['Watch knee tracking', 'Maintain chest up'],
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: '2',
    athleteId: '1',
    exercise: 'Bench Press',
    formScore: 88,
    reps: 8,
    duration: 38,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    aiAnalysis: {
      score: 88,
      feedback: 'Solid technique overall. Consider wider grip for better chest activation.',
      keyPoints: ['Good leg drive', 'Consistent tempo', 'Full range of motion'],
      improvements: ['Widen grip slightly', 'Keep elbows at 45°'],
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: '3',
    athleteId: '1',
    exercise: 'Deadlift',
    formScore: 95,
    reps: 5,
    duration: 30,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    aiAnalysis: {
      score: 95,
      feedback: 'Nearly perfect form. Excellent hip hinge and back position.',
      keyPoints: ['Perfect setup', 'Strong lockout', 'Neutral spine'],
      improvements: ['Keep improving!'],
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: '4',
    athleteId: '1',
    exercise: 'Overhead Press',
    formScore: 75,
    reps: 12,
    duration: 42,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    aiAnalysis: {
      score: 75,
      feedback: 'Good effort. Work on core stability and avoid excessive back arch.',
      keyPoints: ['Good lockout', 'Decent bar path'],
      improvements: ['Engage core more', 'Reduce back arch', 'Full overhead position'],
      timestamp: new Date().toISOString(),
    },
  },
];

// Mock Gamification Data
export const mockGamification: GamificationData = {
  userId: '1',
  xp: 3450,
  level: 12,
  streak: 7,
  badges: [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first workout',
      icon: '🏅',
      earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: 'Train 7 days in a row',
      icon: '⚡',
      earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    {
      id: '3',
      name: 'Perfect Form',
      description: 'Score 95+ on a session',
      icon: '💯',
      earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ],
  achievements: [
    {
      id: '1',
      title: 'Session Master',
      description: 'Complete 50 training sessions',
      progress: 42,
      target: 50,
      completed: false,
    },
    {
      id: '2',
      title: 'Form Expert',
      description: 'Achieve 90+ form score 10 times',
      progress: 8,
      target: 10,
      completed: false,
    },
  ],
};

// Mock Goals
export const mockGoals: Goal[] = [
  {
    id: '1',
    userId: '1',
    title: 'Squat 300lbs',
    description: 'Work up to a 300lb back squat with proper form',
    target: 300,
    current: 265,
    unit: 'lbs',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: '2',
    userId: '1',
    title: '50 Perfect Sessions',
    description: 'Complete 50 sessions with 90+ form score',
    target: 50,
    current: 23,
    unit: 'sessions',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: '1',
    senderId: '2',
    receiverId: '1',
    content: 'Great progress on your squats this week! Keep it up.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    senderName: 'Jordan Taylor',
    senderRole: 'coach',
  },
  {
    id: '2',
    senderId: '1',
    receiverId: '2',
    content: 'Thanks! Should I increase weight next session?',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    senderName: 'Alex Morgan',
    senderRole: 'athlete',
  },
  {
    id: '3',
    senderId: '2',
    receiverId: '1',
    content: 'Yes, add 5lbs but focus on keeping form score above 85.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    senderName: 'Jordan Taylor',
    senderRole: 'coach',
  },
];

// Mock Leaderboard
export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: '3', name: 'Sarah Chen', xp: 5200, level: 18 },
  { rank: 2, userId: '4', name: 'Mike Rodriguez', xp: 4800, level: 16 },
  { rank: 3, userId: '1', name: 'Alex Morgan', xp: 3450, level: 12 },
  { rank: 4, userId: '5', name: 'Emma Wilson', xp: 3100, level: 11 },
  { rank: 5, userId: '6', name: 'Chris Park', xp: 2900, level: 10 },
];
