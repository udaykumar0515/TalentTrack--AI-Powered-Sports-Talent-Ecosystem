import type {
  User,
  Athlete,
  Coach,
  Session,
  Video,
  Goal,
  TrainingPlan,
  PredictiveAnalytics,
  InjuryAlert,
  CoachMessage,
  LongTermPlan,
  BenchmarkEntry,
  ExerciseStandard,
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
      cache: 'no-store', // Force no caching
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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

  async updateUser(userId: string, updates: Partial<User>) {
    return this.request<User>(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ============================================
  // USERS / COACHES / ATHLETES
  // ============================================
  async getCoaches() {
    return this.request<Coach[]>('/api/coaches', {
      cache: 'no-store'
    });
  }

  async getAthletes() {
    return this.request<Athlete[]>('/api/athletes');
  }

  async getAthlete(athleteId: string) {
    return this.request<Athlete>(`/api/athletes/${encodeURIComponent(athleteId)}`);
  }

  async getCoachStats(coachId: string): Promise<{
    athleteCount: number;
    totalSessionsSupervised: number;
    teamAvgPerformance: number;
    goalsAchieved: number;
    specialization?: string;
  }> {
    return this.request(`/api/coach-stats/${encodeURIComponent(coachId)}`);
  }

  async submitCoachRequest(data: {
    athleteId: string;
    currentCoachId: string | null;
    newCoachId: string;
    reason: string;
  }) {
    return this.request('/api/coach-change-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCoachChangeRequests(coachId: string) {
    return this.request<{ requests: any[] }>(`/api/coach-change-requests/${encodeURIComponent(coachId)}`);
  }

  async getAthleteRequests(athleteId: string) {
    return this.request<{ requests: any[] }>(`/api/athlete-requests/${encodeURIComponent(athleteId)}`);
  }

  async approveCoachRequest(requestId: string, coachId: string) {
    return this.request(`/api/coach-change-requests/${encodeURIComponent(requestId)}/approve?coach_id=${encodeURIComponent(coachId)}`, {
      method: 'POST',
    });
  }

  async rejectCoachRequest(requestId: string, coachId: string, reason?: string) {
    return this.request(`/api/coach-change-requests/${encodeURIComponent(requestId)}/reject?coach_id=${encodeURIComponent(coachId)}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async leaveCoach(athleteId: string, reason?: string) {
    return this.request(`/api/athletes/${encodeURIComponent(athleteId)}/leave-coach`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================
  // SESSIONS
  // ============================================
  async getSessions(params?: {
    athleteId?: string;
    coachId?: string;
    skip?: number;
    limit?: number;
  }): Promise<Session[]> {
    const queryParams = new URLSearchParams();
    if (params?.athleteId) queryParams.append('athleteId', params.athleteId);
    if (params?.coachId) queryParams.append('coachId', params.coachId);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await this.request<{ sessions: Session[]; pagination: any } | Session[]>(`/api/sessions${query}`);
    
    // Handle both paginated response and direct array response
    if (Array.isArray(response)) {
      return response;
    }
    return response.sessions || [];
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

  async updateSessionFeedback(sessionId: string, feedback: string) {
    return this.request<{ success: boolean; message: string }>(`/api/sessions/${encodeURIComponent(sessionId)}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
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
  // STREAK
  // ============================================
  async getStreak(athleteId: string) {
    return this.request<{
      streak: number;
      lastSessionDate: string | null;
      todayCompleted?: boolean;
      message?: string;
    }>(`/api/streak/${encodeURIComponent(athleteId)}`);
  }

  async getActivity(athleteId: string, months: number = 12) {
    return this.request<{
      activity: Record<string, number>;
      totalSessions: number;
      streak: number;
    }>(`/api/activity/${encodeURIComponent(athleteId)}?months=${months}`);
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
  async getTrainingPlan(athleteId: string, source?: string) {
    const url = source 
      ? `/api/training-plans/athlete/${encodeURIComponent(athleteId)}?source=${source}`
      : `/api/training-plans/athlete/${encodeURIComponent(athleteId)}`;
    return this.request<TrainingPlan>(url);
  }

  async getCoachTrainingPlan(athleteId: string) {
    return this.request<TrainingPlan>(`/api/training-plans/coach-plan/${encodeURIComponent(athleteId)}`);
  }

  async generateTrainingPlan(athleteId: string) {
    return this.request<TrainingPlan>(`/api/training-plans/athlete/${encodeURIComponent(athleteId)}/generate`, {
      method: 'POST',
    });
  }

  async analyzeGoal(goal: string) {
    return this.request<{ questions: any[] }>('/api/training-plans/ai/analyze-goal', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    });
  }

  async generateAIPlan(athleteId: string, goal: string, answers: Record<string, any>) {
    return this.request<TrainingPlan>('/api/training-plans/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ athleteId, goal, answers }),
    });
  }

  async assignPlan(athleteId: string, planId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/athletes/${encodeURIComponent(athleteId)}/assign-plan`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  async sendPlanFeedback(planId: string, feedbackData: { coachId: string; athleteId: string; feedback: string; planTitle?: string; planType?: string }) {
    return this.request<{ status: string }>(`/api/training-plans/${encodeURIComponent(planId)}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
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

  async acknowledgeInjuryAlert(alertId: string, coachId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/injury-alerts/${encodeURIComponent(alertId)}/acknowledge?coach_id=${encodeURIComponent(coachId)}`, {
      method: 'PUT',
    });
  }

  async resolveInjuryAlert(alertId: string, coachId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/injury-alerts/${encodeURIComponent(alertId)}/resolve?coach_id=${encodeURIComponent(coachId)}`, {
      method: 'PUT',
    });
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
    return this.request<{ plans: LongTermPlan[] }>(`/api/longterm-plans/athlete/${encodeURIComponent(athleteId)}`)
      .then(res => res.plans || []);
  }

  async createLongTermPlan(planData: Partial<LongTermPlan>) {
    return this.request<LongTermPlan>('/api/longterm-plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async updateLongTermPlan(coachId: string, planId: string, updates: Partial<LongTermPlan>) {
    return this.request<{ success: boolean; message: string }>(`/api/longterm-plans/${encodeURIComponent(coachId)}/${encodeURIComponent(planId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLongTermPlan(coachId: string, planId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/longterm-plans/${encodeURIComponent(coachId)}/${encodeURIComponent(planId)}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // HEALTH CHECK
  // ============================================
  async healthCheck() {
    return this.request<{ status: string }>('/api/health');
  }
}

export const api = new ApiClient(API_BASE_URL);
