// API client for backend communication
const API_BASE_URL = '/api';

// Types for API responses
export interface Session {
  sessionId: string;
  athleteId: string;
  exercise: string;
  date: string;
  durationSec: number;
  metrics: {
    reps: number;
    avgRepTimeSec?: number;
    formScore: number;
    symmetryScore?: number;
    waistAngleDeg?: number;
    muscleActivations?: { [key: string]: number };
  };
  injuryFlags: Array<{
    type: string;
    severity: string;
    frameIndex: number;
    message: string;
  }>;
  thumbnailUrl?: string;
  videoUrl?: string;
  keypointsUrl?: string;
  keypoints?: any;
}

export interface CoachAction {
  type: 'retest' | 'feedback' | 'note';
  athleteId: string;
  sessionId: string;
  reason?: string;
  notes?: string;
}

// Main analysis function called by VideoRecorder and VideoUploader
export async function analyzeVideo(file: File, exercise: string, athleteId: string): Promise<Session> {
  const form = new FormData();
  form.append('file', file);
  form.append('exercise', exercise);
  form.append('athleteId', athleteId);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    throw new Error('Analysis failed');
  }

  const session = await response.json();
  return session;
}

// Save session data
export async function saveSession(session: Session): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(session)
  });

  if (!response.ok) {
    throw new Error('Failed to save session');
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

// Get sessions for a specific athlete or all sessions
export async function getSessions(athleteId?: string): Promise<any[]> {
  const url = athleteId 
    ? `${API_BASE_URL}/sessions?athleteId=${athleteId}`
    : `${API_BASE_URL}/sessions`;
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to get sessions');
  }

  return response.json();
}

// Coach actions (retest requests, feedback, notes)
export async function postCoachAction(action: CoachAction): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/coachActions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(action)
  });

  if (!response.ok) {
    throw new Error('Failed to post coach action');
  }
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}