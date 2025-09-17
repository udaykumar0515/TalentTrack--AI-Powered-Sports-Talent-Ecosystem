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

export interface CoachAction {
  type: 'retest' | 'feedback' | 'note';
  athleteId: string;
  sessionId: string;
  reason?: string;
  notes?: string;
}

// Analyze video: sends form-data, returns Session
export async function analyzeVideo(file: File | Blob, exercise: string, athleteId: string): Promise<Session> {
  const form = new FormData();
  form.append('file', file as any);
  form.append('exercise', exercise);
  form.append('athleteId', athleteId);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('analyzeVideo error response:', text);
    throw new Error('Analysis failed');
  }

  const session = await response.json();
  return session;
}

// Enhanced analysis with metadata
export async function analyzeVideoEnhanced(
  videoFile: File, 
  exercise: string, 
  athleteId: string, 
  athleteName: string,
  metadata?: {
    session_metadata?: any;
    athlete_profile?: any;
    environmental_data?: any;
    device_info?: any;
    analysis_config?: any;
  }
): Promise<any> {
  const formData = new FormData();
  formData.append('file', videoFile);
  formData.append('exercise', exercise);
  formData.append('athleteId', athleteId);
  formData.append('athleteName', athleteName);

  // Add metadata if provided
  if (metadata?.session_metadata) {
    formData.append('session_metadata', JSON.stringify(metadata.session_metadata));
  }
  if (metadata?.athlete_profile) {
    formData.append('athlete_profile', JSON.stringify(metadata.athlete_profile));
  }
  if (metadata?.environmental_data) {
    formData.append('environmental_data', JSON.stringify(metadata.environmental_data));
  }
  if (metadata?.device_info) {
    formData.append('device_info', JSON.stringify(metadata.device_info));
  }
  if (metadata?.analysis_config) {
    formData.append('analysis_config', JSON.stringify(metadata.analysis_config));
  }

  const response = await fetch(`${API_BASE_URL}/analyze/enhanced`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('analyzeVideoEnhanced error response:', text);
    throw new Error('Enhanced video analysis failed');
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

// Get list of athletes (for coach dashboard)
export async function getAthletes(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/athletes`);

  if (!response.ok) {
    throw new Error('Failed to get athletes');
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
    const text = await response.text().catch(() => '');
    console.error('postCoachAction error response:', text);
    throw new Error('Failed to post coach action');
  }
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

// Delete a session
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('deleteSession error response:', text);
    throw new Error('Failed to delete session');
  }
}

// Enhanced reporting functions
export async function getAthleteReport(athleteId: string, reportType: string = "comprehensive", timePeriod: string = "30d"): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/reports/athlete/${encodeURIComponent(athleteId)}?report_type=${reportType}&time_period=${timePeriod}`);
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getAthleteReport error response:', text);
    throw new Error('Failed to fetch athlete report');
  }
  
  return response.json();
}

export async function getCoachDashboard(coachId: string, timePeriod: string = "30d"): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/reports/coach/${encodeURIComponent(coachId)}?time_period=${timePeriod}`);
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getCoachDashboard error response:', text);
    throw new Error('Failed to fetch coach dashboard');
  }
  
  return response.json();
}

export async function compareSessions(athleteId: string, exercise: string, timePeriod: string = "30d"): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/compare/${encodeURIComponent(athleteId)}?exercise=${exercise}&time_period=${timePeriod}`);
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('compareSessions error response:', text);
    throw new Error('Failed to compare sessions');
  }
  
  return response.json();
}

export async function getExerciseBenchmarks(exercise: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/benchmarks/${encodeURIComponent(exercise)}`);
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('getExerciseBenchmarks error response:', text);
    throw new Error('Failed to fetch exercise benchmarks');
  }
  
  return response.json();
}
