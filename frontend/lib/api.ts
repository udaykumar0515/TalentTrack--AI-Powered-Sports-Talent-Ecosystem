import type {
  User,
  Athlete,
  Coach,
  Session,
  Video,
  GamificationData,
  Goal,
  TrainingPlan,
  PredictiveAnalytics,
  InjuryAlert,
  CoachMessage,
  LongTermPlan,
  BenchmarkEntry,
  ExerciseStandard,
  LeaderboardEntry,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // AUTH
  // ============================================
  async register(email: string, password: string, username: string, role: 'athlete' | 'coach') {
    return this.request<User>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, role }),
    });
  }

  async login(email: string, password: string, role?: 'athlete' | 'coach') {
    return this.request<User>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  }

  // ============================================
  // USERS / COACHES / ATHLETES
  // ============================================
  async getCoaches() {
    return this.request<Coach[]>('/api/coaches');
  }

  async getAthletes() {
    return this.request<Athlete[]>('/api/athletes');
  }

  async getAthlete(athleteId: string) {
    return this.request<Athlete>(`/api/athletes/${encodeURIComponent(athleteId)}`);
  }

  // ============================================
  // SESSIONS
  // ============================================
  async getSessions(params?: {
    athleteId?: string;
    coachId?: string;
    skip?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.athleteId) queryParams.append('athleteId', params.athleteId);
    if (params?.coachId) queryParams.append('coachId', params.coachId);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<Session[]>(`/api/sessions${query}`);
  }

  async getSession(sessionId: string) {
    return this.request<Session>(`/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  async saveSession(session: Partial<Session>) {
    return this.request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  async deleteSession(sessionId: string) {
    return this.request<void>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // VIDEO ANALYSIS & UPLOAD
  // ============================================
  async analyzeVideo(
    videoFile: File,
    exercise: string,
    athleteId: string,
    athleteName: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('exercise', exercise);
    formData.append('athleteId', athleteId);
    formData.append('athleteName', athleteName);

    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('analyzeVideo error response:', text);
      throw new Error('Video analysis failed');
    }

    return response.json();
  }

  async getVideo(sessionId: string) {
    return this.request<Video>(`/api/videos/${sessionId}`);
  }

  // ============================================
  // COACH MESSAGING
  // ============================================
  async getAthleteMessages(athleteId: string) {
    return this.request<CoachMessage[]>(`/api/coach-messages/${encodeURIComponent(athleteId)}`);
  }

  async getCoachMessages(coachId: string) {
    return this.request<CoachMessage[]>(`/api/coach-messages/coach/${encodeURIComponent(coachId)}`);
  }

  async sendCoachMessage(message: Partial<CoachMessage>) {
    return this.request<CoachMessage>('/api/coach-messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async markMessageAsRead(messageId: string) {
    return this.request<void>(`/api/coach-messages/${encodeURIComponent(messageId)}/read`, {
      method: 'PUT',
    });
  }

  // ============================================
  // GAMIFICATION
  // ============================================
  async getGamificationData(userId: string) {
    return this.request<GamificationData>(`/api/gamification/user/${encodeURIComponent(userId)}`);
  }

  async getLeaderboard(category: string = 'total_points', limit: number = 10) {
    return this.request<LeaderboardEntry[]>(`/api/gamification/leaderboard?category=${category}&limit=${limit}`);
  }

  // ============================================
  // GOALS
  // ============================================
  async createGoal(goalData: Partial<Goal>) {
    return this.request<Goal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  async getGoals(userId: string, status?: string) {
    const url = status 
      ? `/api/goals/${encodeURIComponent(userId)}?status=${status}` 
      : `/api/goals/${encodeURIComponent(userId)}`;
    return this.request<Goal[]>(url);
  }

  async updateGoal(userId: string, goalId: string, updates: Partial<Goal>) {
    return this.request<Goal>(`/api/goals/${encodeURIComponent(userId)}/${encodeURIComponent(goalId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteGoal(userId: string, goalId: string) {
    return this.request<any>(`/api/goals/${encodeURIComponent(userId)}/${encodeURIComponent(goalId)}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // TRAINING PLANS
  // ============================================
  async getTrainingPlan(athleteId: string) {
    return this.request<TrainingPlan>(`/api/training-plans/athlete/${encodeURIComponent(athleteId)}`);
  }

  async generateTrainingPlan(athleteId: string) {
    return this.request<TrainingPlan>(`/api/training-plans/athlete/${encodeURIComponent(athleteId)}/generate`, {
      method: 'POST',
    });
  }

  // ============================================
  // PREDICTIVE ANALYTICS
  // ============================================
  async getPredictiveAnalytics(athleteId: string) {
    return this.request<PredictiveAnalytics>(`/api/predictive-analytics/athlete/${encodeURIComponent(athleteId)}`);
  }

  // ============================================
  // INJURY ALERTS
  // ============================================
  async getInjuryAlerts(athleteId: string) {
    return this.request<InjuryAlert[]>(`/api/injury-alerts/athlete/${encodeURIComponent(athleteId)}`);
  }

  async getCoachInjuryAlerts(coachId: string) {
    return this.request<InjuryAlert[]>(`/api/injury-alerts/coach/${encodeURIComponent(coachId)}`);
  }

  // ============================================
  // BENCHMARKING
  // ============================================
  async getBenchmarkLeaderboard(exercise: string, coachId?: string) {
    const url = coachId
      ? `/api/benchmarks/leaderboard/${encodeURIComponent(exercise)}?coach_id=${coachId}`
      : `/api/benchmarks/leaderboard/${encodeURIComponent(exercise)}`;
    return this.request<BenchmarkEntry[]>(url);
  }

  async getExerciseStandards(exercise: string) {
    return this.request<ExerciseStandard>(`/api/benchmarks/standards/${encodeURIComponent(exercise)}`);
  }

  // ============================================
  // LONG-TERM PLANS
  // ============================================
  async getCoachPlans(coachId: string, status?: string) {
    const url = status
      ? `/api/longterm-plans/coach/${encodeURIComponent(coachId)}?status=${status}`
      : `/api/longterm-plans/coach/${encodeURIComponent(coachId)}`;
    return this.request<LongTermPlan[]>(url);
  }

  async getAthletePlans(athleteId: string) {
    return this.request<LongTermPlan[]>(`/api/longterm-plans/athlete/${encodeURIComponent(athleteId)}`);
  }

  // ============================================
  // HEALTH CHECK
  // ============================================
  async healthCheck() {
    return this.request<{ status: string }>('/api/health');
  }
}

export const api = new ApiClient(API_BASE_URL);
