// front/src/api/apiClient.ts
// API client for backend communication
const API_BASE_URL = '/api';

// Types for API responses
export interface Session {
  sessionId: string;
  athleteId: string;
  athleteName?: string;
  coachId?: string | null;
  coachName?: string | null;
  exercise: string;
  date?: string;
  timestamp?: string;
  durationSec?: number;
  reps?: number;
  formScore?: number;
  risk?: string; // Risk level: Low, Medium, High
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
  thumbnailUrl?: string;
  videoUrl?: string;
  keypointsUrl?: string;
  keypoints?: any;
  status?: string;
  
  // Enhanced analysis fields
  biomechanical_metrics?: any;
  form_analysis?: any;
  injury_risk_assessment?: any;
  performance_metrics?: any;
  recommendations?: any[];
  session_metadata?: any;
  athlete_profile?: any;
  environmental_data?: any;
  device_info?: any;
  analysis_config?: any;
}



// Enhanced analysis with metadata
export async function analyzeVideoEnhanced(
  videoFile: File, 
  exercise: string, 
  athleteId: string, 
  athleteName: string,
  metadata?: any // Kept for compatibility but not used
): Promise<any> {
  const formData = new FormData();
  formData.append('file', videoFile);
  formData.append('exercise', exercise);
  formData.append('athleteId', athleteId);
  formData.append('athleteName', athleteName);

  // Note: Backend only expects: file, exercise, athleteId, athleteName
  // Metadata fields are ignored as backend doesn't support them

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('analyzeVideoEnhanced error response:', text);
    throw new Error('Video analysis failed');
  }

  return response.json();
}

// Save session (frontend calls this to persist after augmenting with coach)
export async function saveSession(session: any): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(session)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('saveSession error response:', text);
    throw new Error('Failed to save session');
  }
}

// Get sessions (optionally filter by athleteId OR coachId)
export async function getSessions(athleteId?: string, coachId?: string): Promise<any[]> {
  let url = `${API_BASE_URL}/sessions`;
  const params: string[] = [];
  if (athleteId) params.push(`athleteId=${encodeURIComponent(athleteId)}`);
  if (coachId) params.push(`coachId=${encodeURIComponent(coachId)}`);
  if (params.length) url += `?${params.join('&')}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getSessions error response:', text);
    throw new Error('Failed to fetch sessions');
  }
  return response.json();
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('deleteSession error response:', text);
    throw new Error('Failed to delete session');
  }
}

// Get list of athletes (for coach dashboard)
export async function getAthletes(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/athletes`);

  if (!response.ok) {
    throw new Error('Failed to get athletes');
  }

  return response.json();
}


// Get a specific session by ID
export async function getSessionById(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getSessionById error response:', text);
    throw new Error('Failed to fetch session');
  }

  return response.json();
}

// Coach messaging functions
export interface CoachMessage {
  id: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  sessionId: string;
  type: 'retest' | 'feedback' | 'note';
  message: string;
  timestamp: string;
  read: boolean;
}

export async function getAthleteMessages(athleteId: string): Promise<CoachMessage[]> {
  const response = await fetch(`${API_BASE_URL}/coach-messages/${encodeURIComponent(athleteId)}`);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getAthleteMessages error response:', text);
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

export async function getCoachMessages(coachId: string): Promise<CoachMessage[]> {
  const response = await fetch(`${API_BASE_URL}/coach-messages/coach/${encodeURIComponent(coachId)}`);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getCoachMessages error response:', text);
    throw new Error('Failed to fetch coach messages');
  }

  return response.json();
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/coach-messages/${encodeURIComponent(messageId)}/read`, {
    method: 'PUT'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('markMessageAsRead error response:', text);
    throw new Error('Failed to mark message as read');
  }
}



// Upload video file to backend storage
export async function uploadVideo(videoFile: File, sessionData: any): Promise<any> {
  const formData = new FormData();
  formData.append('file', videoFile);
  formData.append('session_data', JSON.stringify(sessionData));

  const response = await fetch(`${API_BASE_URL}/upload-video`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('uploadVideo error response:', text);
    throw new Error('Failed to upload video');
  }

  return response.json();
}

// Benchmarking API functions
export const getLeaderboard = async (exercise: string, coachId?: string) => {
  const url = coachId 
    ? `${API_BASE_URL}/benchmarks/leaderboard/${exercise}?coach_id=${coachId}`
    : `${API_BASE_URL}/benchmarks/leaderboard/${exercise}`;
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  
  return response.json();
};

export const getExerciseStandards = async (exercise: string) => {
  const response = await fetch(`${API_BASE_URL}/benchmarks/standards/${exercise}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch exercise standards');
  }
  
  return response.json();
};

export const getAthletePredictiveAnalytics = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/predictive-analytics/athlete/${athleteId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch athlete predictive analytics');
  }
  
  return response.json();
};

export const getCoachPredictiveAnalytics = async (coachId: string) => {
  const response = await fetch(`${API_BASE_URL}/predictive-analytics/coach/${coachId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch coach predictive analytics');
  }
  
  return response.json();
};

export const getAthleteTrainingPlan = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/training-plans/athlete/${athleteId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch athlete training plan');
  }
  
  return response.json();
};

export const generateAthleteTrainingPlan = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/training-plans/athlete/${athleteId}/generate`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate training plan');
  }
  
  return response.json();
};

export const createCoachTrainingPlan = async (athleteId: string, planData: any) => {
  const response = await fetch(`${API_BASE_URL}/training-plans/coach/${athleteId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(planData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create coach training plan');
  }
  
  return response.json();
};

export const updateAthleteTrainingPlan = async (athleteId: string, updates: any) => {
  const response = await fetch(`${API_BASE_URL}/training-plans/athlete/${athleteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error('Failed to update training plan');
  }
  
  return response.json();
};

export const getCoachTrainingPlans = async (coachId: string) => {
  const response = await fetch(`${API_BASE_URL}/training-plans/coach/${coachId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch coach training plans');
  }
  
  return response.json();
};

export const getAthleteInjuryAnalysis = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/injury-alerts/athlete/${athleteId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch athlete injury analysis');
  }
  
  return response.json();
};

export const getCoachInjuryAlerts = async (coachId: string) => {
  const response = await fetch(`${API_BASE_URL}/injury-alerts/coach/${coachId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch coach injury alerts');
  }
  
  return response.json();
};

export const analyzeAthleteInjuryRisk = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/injury-alerts/athlete/${athleteId}/analyze`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error('Failed to analyze athlete injury risk');
  }
  
  return response.json();
};

export const acknowledgeInjuryAlert = async (alertId: string, coachId: string) => {
  const response = await fetch(`${API_BASE_URL}/injury-alerts/${alertId}/acknowledge`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ coach_id: coachId })
  });
  
  if (!response.ok) {
    throw new Error('Failed to acknowledge injury alert');
  }
  
  return response.json();
};

export const resolveInjuryAlert = async (alertId: string, coachId: string) => {
  const response = await fetch(`${API_BASE_URL}/injury-alerts/${alertId}/resolve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ coach_id: coachId })
  });
  
  if (!response.ok) {
    throw new Error('Failed to resolve injury alert');
  }
  
  return response.json();
};

export const runBulkInjuryAnalysis = async () => {
  const response = await fetch(`${API_BASE_URL}/injury-alerts/bulk-analysis`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error('Failed to run bulk injury analysis');
  }
  
  return response.json();
};

// Gamification API functions
export const getUserGamificationStats = async (userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/gamification/user/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get user gamification stats');
  }
  return response.json();
};

export const getGamificationLeaderboard = async (category: string = 'total_points', limit: number = 10): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/gamification/leaderboard?category=${category}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get gamification leaderboard');
  }
  return response.json();
};

export const getAllAchievements = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/gamification/achievements`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get achievements');
  }
  return response.json();
};

export const getAllBadges = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/gamification/badges`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get badges');
  }
  return response.json();
};

// Goal Setting API functions
export const createGoal = async (goalData: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/goals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goalData),
  });
  if (!response.ok) {
    throw new Error('Failed to create goal');
  }
  return response.json();
};

export const getUserGoals = async (userId: string, status?: string): Promise<any> => {
  const url = status ? `${API_BASE_URL}/goals/${userId}?status=${status}` : `${API_BASE_URL}/goals/${userId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get user goals');
  }
  return response.json();
};

export const updateGoal = async (userId: string, goalId: string, updates: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/goals/${userId}/${goalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update goal');
  }
  return response.json();
};

export const deleteGoal = async (userId: string, goalId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/goals/${userId}/${goalId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to delete goal');
  }
  return response.json();
};

export const getGoalAnalytics = async (userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/goals/${userId}/analytics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get goal analytics');
  }
  return response.json();
};

export const getGoalRecommendations = async (userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/goals/${userId}/recommendations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get goal recommendations');
  }
  return response.json();
};

// Long-term Plans API functions
export const createLongTermPlan = async (planData: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(planData),
  });
  if (!response.ok) {
    throw new Error('Failed to create long-term plan');
  }
  return response.json();
};

export const getCoachPlans = async (coachId: string, status?: string): Promise<any> => {
  const url = status ? `${API_BASE_URL}/longterm-plans/coach/${coachId}?status=${status}` : `${API_BASE_URL}/longterm-plans/coach/${coachId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get coach plans');
  }
  return response.json();
};

export const getAthletePlans = async (athleteId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/athlete/${athleteId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get athlete plans');
  }
  return response.json();
};

export const updateLongTermPlan = async (coachId: string, planId: string, updates: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/${coachId}/${planId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update long-term plan');
  }
  return response.json();
};

export const deleteLongTermPlan = async (coachId: string, planId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/${coachId}/${planId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to delete long-term plan');
  }
  return response.json();
};

export const getPlanAnalytics = async (coachId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/${coachId}/analytics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get plan analytics');
  }
  return response.json();
};

export const getPlanRecommendations = async (coachId: string, athleteId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/${coachId}/recommendations/${athleteId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get plan recommendations');
  }
  return response.json();
};

export const createPlanTemplate = async (templateData: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templateData),
  });
  if (!response.ok) {
    throw new Error('Failed to create plan template');
  }
  return response.json();
};

export const getPlanTemplates = async (coachId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/longterm-plans/templates/${coachId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get plan templates');
  }
  return response.json();
};

// Offline Video API functions
export const storeOfflineVideo = async (videoData: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/offline-videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(videoData),
  });
  if (!response.ok) {
    throw new Error('Failed to store offline video');
  }
  return response.json();
};

export const getUserOfflineVideos = async (userId: string, status?: string): Promise<any> => {
  const url = status ? `${API_BASE_URL}/offline-videos/${userId}?status=${status}` : `${API_BASE_URL}/offline-videos/${userId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get offline videos');
  }
  return response.json();
};

export const analyzeOfflineVideo = async (userId: string, videoId: string, analysisRequest: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/offline-videos/${userId}/${videoId}/analyze`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(analysisRequest),
  });
  if (!response.ok) {
    throw new Error('Failed to analyze offline video');
  }
  return response.json();
};

export const deleteOfflineVideo = async (userId: string, videoId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/offline-videos/${userId}/${videoId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to delete offline video');
  }
  return response.json();
};

export const getOfflineVideoStats = async (userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/offline-videos/${userId}/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get offline video stats');
  }
  return response.json();
};

export const getPendingAnalysisVideos = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/offline-videos/pending`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get pending analysis videos');
  }
  return response.json();
};

// Coach management functions
export const getAthlete = async (athleteId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/athletes/${athleteId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get athlete');
  }
  return response.json();
};

export const assignCoach = async (athleteId: string, coachId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/assign-coach?athlete_id=${athleteId}&coach_id=${coachId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to assign coach');
  }
  return response.json();
};

export const submitCoachChangeRequest = async (request: {
  athleteId: string;
  currentCoachId: string;
  newCoachId: string;
  reason: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/coach-change-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error('Failed to submit coach change request');
  }
  return response.json();
};