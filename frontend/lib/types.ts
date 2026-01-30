// ============================================
// User Types
// ============================================
export type UserRole = 'athlete' | 'coach';

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  role: UserRole;
  profileImage?: string;
  createdAt?: string;
  created_at?: string;
  age?: number;
  gender?: string;
  weight?: string;
  height?: string;
}

export interface Athlete extends User {
  role: 'athlete';
  coachId?: string;
  coachName?: string;
  sport?: string;
  stats?: {
    totalSessions: number;
    averageFormScore: number;
    streak: number;
    xp: number;
    level: number;
  };
}

export interface Coach extends User {
  role: 'coach';
  specialization?: string;
  athleteCount?: number;
}

// ============================================
// Session Types (matching backend response)
// ============================================
export interface Session {
  id?: string;
  sessionId?: string;
  athleteId: string;
  athleteName?: string;
  coachId?: string | null;
  coachName?: string | null;
  exercise: string;
  date?: string;
  timestamp?: string;
  createdAt?: string;
  durationSec?: number;
  duration?: number;
  reps?: number;
  formScore?: number;
  risk?: 'Low' | 'Medium' | 'High';
  thumbnail?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  keypointsUrl?: string;
  keypoints?: any;
  status?: string;
  coachFeedback?: string;
  feedbackDate?: string;
  
  metrics?: {
    reps?: number;
    avgRepTimeSec?: number;
    formScore?: number;
    symmetryScore?: number;
    waistAngleDeg?: number;
    muscleActivations?: { [key: string]: number };
  };
  
  injuryFlags?: Array<{
    type: string;
    severity: string;
    frameIndex: number;
    message: string;
  }>;
  
  biomechanical_metrics?: any;
  form_analysis?: any;
  injury_risk_assessment?: any;
  performance_metrics?: any;
  recommendations?: string[];
  session_metadata?: any;
  athlete_profile?: any;
  environmental_data?: any;
  device_info?: any;
  analysis_config?: any;
  
  aiAnalysis?: AIAnalysis;
  cheatDetection?: CheatDetection;
  detailedMetrics?: DetailedMetrics;
}

export interface AIAnalysis {
  score: number;
  feedback: string;
  keyPoints: string[];
  improvements: string[];
  timestamp: string;
}

export interface CheatDetection {
  cheatDetected: boolean;
  cheatPercentage: number;
  totalFlags: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  riskExplanation: string;
  riskFactors: string[];
  cheat_flags: {
    too_fast_reps: boolean;
    inconsistent_form: boolean;
    minimal_movement: boolean;
    suspicious_timing: boolean;
    form_deterioration: boolean;
    repetitive_pattern: boolean;
  };
  suspiciousPatterns: string[];
}

export interface DetailedMetrics {
  avgAngle: number;
  minAngle: number;
  maxAngle: number;
  angleRange: number;
  formConsistency: number;
  repFormScores: number[];
  totalFramesAnalyzed: number;
}

// ============================================
// Video Types
// ============================================
export interface Video {
  id: string;
  sessionId: string;
  url: string;
  thumbnail?: string;
  duration: number;
  createdAt: string;
}

// ============================================
// Coach Messaging Types
// ============================================
export interface CoachMessage {
  id: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  sessionId: string;
  type: 'retest' | 'feedback' | 'note' | 'text';
  message: string;
  timestamp: string;
  read: boolean;
  senderId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  senderName?: string;
  senderRole?: UserRole;
}

// ============================================

// ============================================

// ============================================
// Goals Types
// ============================================
export interface Goal {
  id: string;
  goalId?: string;
  userId: string;
  title: string;
  description: string;
  target: number;
  current: number;
  progress?: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  createdAt: string;
  category?: string;
  type?: string;
  milestones?: GoalMilestone[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  target: number;
  achieved: boolean;
  achievedAt?: string;
}

// ============================================
// Training Plan Types
// ============================================
export interface TrainingPlan {
  id: string;
  planId?: string;
  athleteId: string;
  coachId?: string;
  name: string;
  title?: string;
  duration?: string;
  description: string;
  weeks: TrainingWeek[];
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'upcoming' | 'draft';
  generatedAt?: string;
  createdAt?: string;
  focus_areas?: string[];
  difficulty_level?: string;
  // AI Generated Fields
  weekly_schedule?: any[];
  progression_plan?: any[];
  coaching_tips?: string[];
  goal_focus?: string;
}

export interface TrainingWeek {
  weekNumber: number;
  workouts: Workout[];
  focus?: string;
}

export interface Workout {
  id: string;
  day: string;
  exercises: Exercise[];
  completed: boolean;
  notes?: string;
  duration_minutes?: number;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
  rest_seconds?: number;
}

// ============================================
// Analytics & Injury Types
// ============================================
export interface PredictiveAnalytics {
  athleteId: string;
  performanceTrend: 'improving' | 'stable' | 'declining';
  predictedScore: number;
  confidence: number;
  insights: string[];
  recommendations: string[];
  next_session_prediction?: any;
  long_term_projection?: any;
}

export interface InjuryAlert {
  id: string;
  alertId?: string;
  athleteId: string;
  athleteName?: string;
  severity: 'low' | 'medium' | 'high';
  bodyPart: string;
  area?: string;
  description: string;
  recommendations: string[];
  detectedAt: string;
  createdAt?: string;
  status?: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  risk_score?: number;
  contributing_factors?: string[];
}

// ============================================
// Benchmarking Types
// ============================================
export interface BenchmarkEntry {
  rank: number;
  athleteId: string;
  athleteName: string;
  formScore: number;
  bestScore: number;
  averageScore: number;
  sessionCount: number;
  lastSession?: string;
}

export interface ExerciseStandard {
  exercise: string;
  beginner: ScoreRange;
  intermediate: ScoreRange;
  advanced: ScoreRange;
  elite: ScoreRange;
  description?: string;
  tips?: string[];
}

export interface ScoreRange {
  min: number;
  max: number;
  label: string;
}

// ============================================
// Long-term Plans Types
// ============================================
export interface LongTermPlan {
  id: string;
  planId?: string;
  coachId: string;
  athleteId: string;
  athleteName?: string;
  title: string;
  description: string;
  goals: string[];
  phases: PlanPhase[];
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt?: string;
  progress?: number;
}

export interface PlanPhase {
  id: string;
  name: string;
  description: string;
  startWeek: number;
  endWeek: number;
  objectives: string[];
  workouts_per_week?: number;
  focus?: string;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  items?: T[];
  total: number;
  skip: number;
  limit: number;
}
