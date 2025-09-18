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
  const response = await fetch(`${API_BASE_URL}/api/predictive-analytics/athlete/${athleteId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch athlete predictive analytics');
  }
  
  return response.json();
};

export const getCoachPredictiveAnalytics = async (coachId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/predictive-analytics/coach/${coachId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch coach predictive analytics');
  }
  
  return response.json();
};

export const getAthleteTrainingPlan = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/training-plans/athlete/${athleteId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch athlete training plan');
  }
  
  return response.json();
};

export const generateAthleteTrainingPlan = async (athleteId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/training-plans/athlete/${athleteId}/generate`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate training plan');
  }
  
  return response.json();
};

export const updateAthleteTrainingPlan = async (athleteId: string, updates: any) => {
  const response = await fetch(`${API_BASE_URL}/api/training-plans/athlete/${athleteId}`, {
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
  const response = await fetch(`${API_BASE_URL}/api/training-plans/coach/${coachId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch coach training plans');
  }
  
  return response.json();
};
