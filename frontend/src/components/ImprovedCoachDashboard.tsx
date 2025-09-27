import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getSessions, 
  getAthletes, 
  getCoachInjuryAlerts,
  getCoachTrainingPlans,
  getCoachPredictiveAnalytics,
  submitFeedback,
  assignCoach,
  getCoachMessages
} from '../api/apiClient';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  MessageCircle, 
  Settings, 
  Bell, 
  LogOut,
  Eye,
  MessageSquare,
  Target,
  BarChart3,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { ProgressCircle, LineChart, BarChart } from './ChartComponents';
import ChatSidebar from './ChatSidebar';
import AthleteDetailDashboard from './AthleteDetailDashboard';

const ImprovedCoachDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [injuryAlerts, setInjuryAlerts] = useState<any[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [showAthleteDetail, setShowAthleteDetail] = useState(false);
  const [filterAthlete, setFilterAthlete] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [
          athletesData,
          sessionsData,
          alertsData,
          plansData,
          analyticsData,
          messagesData
        ] = await Promise.allSettled([
          getAthletes().catch(err => { console.warn('Athletes failed:', err); return []; }),
          getSessions(undefined, user.id).catch(err => { console.warn('Sessions failed:', err); return []; }),
          getCoachInjuryAlerts(user.id).catch(err => { console.warn('Alerts failed:', err); return []; }),
          getCoachTrainingPlans(user.id).catch(err => { console.warn('Plans failed:', err); return []; }),
          getCoachPredictiveAnalytics(user.id).catch(err => { console.warn('Analytics failed:', err); return null; }),
          getCoachMessages(user.id).catch(err => { console.warn('Messages failed:', err); return []; })
        ]);

        setAthletes(athletesData.status === 'fulfilled' ? athletesData.value : []);
        setSessions(sessionsData.status === 'fulfilled' ? sessionsData.value : []);
        setInjuryAlerts(alertsData.status === 'fulfilled' ? alertsData.value : []);
        setTrainingPlans(plansData.status === 'fulfilled' ? plansData.value : []);
        setPredictiveAnalytics(analyticsData.status === 'fulfilled' ? analyticsData.value : null);
        setMessages(messagesData.status === 'fulfilled' ? messagesData.value : []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Set default values to prevent crashes
        setAthletes([]);
        setSessions([]);
        setInjuryAlerts([]);
        setTrainingPlans([]);
        setPredictiveAnalytics(null);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const totalAthletes = athletes.length;
    const totalSessions = sessions.length;
    const activeAlerts = injuryAlerts.filter(alert => alert.status === 'active').length;
    const avgFormScore = sessions.length > 0 
      ? Math.round(sessions.reduce((sum, session) => sum + (session.formScore || 0), 0) / sessions.length)
      : 0;

    return {
      totalAthletes,
      totalSessions,
      activeAlerts,
      avgFormScore
    };
  };

  const metrics = calculateMetrics();

  // Handle athlete selection
  const handleAthleteSelect = (athlete: any) => {
    setSelectedAthlete(athlete);
    setShowAthleteDetail(true);
  };

  // Handle feedback submission
  const handleSubmitFeedback = async (feedbackData: any) => {
    try {
      await submitFeedback({
        sessionId: selectedSession?.sessionId,
        coachId: user?.id,
        athleteId: selectedSession?.athleteId,
        feedback: feedbackData.message,
        type: feedbackData.type
      });
      setShowFeedbackModal(false);
      setSelectedSession(null);
      // Reload messages
      const updatedMessages = await getCoachMessages(user?.id);
      setMessages(updatedMessages || []);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading coach dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Enhanced Header */}
      <header className="dashboard-header">
        <div className="logo-section">
          <img src="/logo.png" alt="Strength & Strategy" className="logo" />
          <div className="welcome-text">
            <h1>Welcome back, {user?.username}!</h1>
            <p>Strategic coaching through data-driven insights</p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="coach-pill">
            <Users className="w-4 h-4" />
            <span>{metrics.totalAthletes} Athletes</span>
          </div>
          
          <button className="btn-touch bg-white/20 text-white hover:bg-white/30">
            <Bell className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setShowChat(true)}
            className="btn-touch bg-white/20 text-white hover:bg-white/30"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          
          <button className="btn-touch bg-white/20 text-white hover:bg-white/30">
            <Settings className="w-4 h-4" />
          </button>
          
          <button onClick={logout} className="btn-touch bg-red-500 text-white hover:bg-red-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-heading-2 text-neutral-900 mb-6">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6 text-center">
              <ProgressCircle 
                percentage={Math.min((metrics.totalAthletes / 20) * 100, 100)} 
                size={80}
                color="#00A896"
                label="Total Athletes"
                value={metrics.totalAthletes.toString()}
              />
              <p className="text-xs text-neutral-500 mt-2">Goal: 20 athletes</p>
            </div>

            <div className="card p-6 text-center">
              <ProgressCircle 
                percentage={metrics.avgFormScore} 
                size={80}
                color="#4A90E2"
                label="Avg Form Score"
                value={`${metrics.avgFormScore}%`}
              />
              <p className="text-xs text-neutral-500 mt-2">Across all sessions</p>
            </div>

            <div className="card p-6 text-center">
              <ProgressCircle 
                percentage={Math.min((metrics.totalSessions / 100) * 100, 100)} 
                size={80}
                color="#F39C12"
                label="Total Sessions"
                value={metrics.totalSessions.toString()}
              />
              <p className="text-xs text-neutral-500 mt-2">Goal: 100 sessions</p>
            </div>

            <div className="card p-6 text-center">
              <ProgressCircle 
                percentage={metrics.activeAlerts > 0 ? 100 : 0} 
                size={80}
                color="#E74C3C"
                label="Active Alerts"
                value={metrics.activeAlerts.toString()}
              />
              <p className="text-xs text-neutral-500 mt-2">Require attention</p>
            </div>
          </div>
        </div>

        {/* Athletes Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-heading-2 text-neutral-900">Your Athletes</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Filter athletes..."
                value={filterAthlete}
                onChange={(e) => setFilterAthlete(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-coach-expertise focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes
              .filter(athlete => 
                filterAthlete === '' || 
                athlete.username.toLowerCase().includes(filterAthlete.toLowerCase())
              )
              .map((athlete) => {
                const athleteSessions = sessions.filter(s => s.athleteId === athlete.id);
                const avgScore = athleteSessions.length > 0 
                  ? Math.round(athleteSessions.reduce((sum, s) => sum + (s.formScore || 0), 0) / athleteSessions.length)
                  : 0;
                const recentSessions = athleteSessions.slice(0, 3);

                return (
                  <div 
                    key={athlete.id}
                    className="athlete-card-enhanced"
                    onClick={() => handleAthleteSelect(athlete)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-heading-4 text-neutral-900">{athlete.username}</h3>
                        <p className="text-body-small text-neutral-600">{athlete.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-heading-3 text-neutral-900">{avgScore}%</div>
                        <div className="text-body-small text-neutral-600">Avg Score</div>
                      </div>
                    </div>

                    <div className="performance-metrics">
                      <div className="metric-item">
                        <div className="value">{athleteSessions.length}</div>
                        <div>Sessions</div>
                      </div>
                      <div className="metric-item">
                        <div className="value">{recentSessions.length}</div>
                        <div>Recent</div>
                      </div>
                      <div className="metric-item">
                        <div className="value">
                          {athleteSessions.length > 0 ? 
                            new Date(Math.max(...athleteSessions.map(s => new Date(s.timestamp).getTime()))).toLocaleDateString() 
                            : 'Never'
                          }
                        </div>
                        <div>Last Session</div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAthleteSelect(athlete);
                        }}
                        className="btn-primary btn-sm flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(athleteSessions[0]);
                          setShowFeedbackModal(true);
                        }}
                        className="btn-secondary btn-sm"
                        disabled={athleteSessions.length === 0}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="mb-8">
          <h2 className="text-heading-2 text-neutral-900 mb-6">Recent Sessions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sessions.slice(0, 6).map((session, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-heading-4 text-neutral-900">
                      {session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}
                    </h3>
                    <p className="text-body-small text-neutral-600">
                      {athletes.find(a => a.id === session.athleteId)?.username || 'Unknown Athlete'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    (session.formScore || 0) >= 85 ? 'bg-success/10 text-success' : 
                    (session.formScore || 0) >= 70 ? 'bg-warning/10 text-warning' : 
                    'bg-danger/10 text-danger'
                  }`}>
                    {session.formScore || 0}%
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-body-small text-neutral-600">Reps</span>
                    <span className="text-body text-neutral-900">{session.reps || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body-small text-neutral-600">Date</span>
                    <span className="text-body text-neutral-900">
                      {new Date(session.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedSession(session);
                      setShowFeedbackModal(true);
                    }}
                    className="btn-primary btn-sm flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Provide Feedback
                  </button>
                  <button className="btn-secondary btn-sm">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Injury Alerts */}
        {injuryAlerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-heading-2 text-neutral-900 mb-6">Injury Alerts</h2>
            <div className="space-y-4">
              {injuryAlerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="card p-6 border-l-4 border-danger">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-danger" />
                      <div>
                        <h3 className="text-heading-4 text-neutral-900">{alert.type}</h3>
                        <p className="text-body-small text-neutral-600">
                          {athletes.find(a => a.id === alert.athleteId)?.username || 'Unknown Athlete'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-body-small text-neutral-600">
                        {new Date(alert.timestamp).toLocaleDateString()}
                      </div>
                      <span className="px-2 py-1 bg-danger/10 text-danger text-xs rounded-full">
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                  <p className="text-body text-neutral-700 mt-2">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <ChatSidebar 
          onClose={() => setShowChat(false)}
          messages={messages}
          onSendMessage={handleSubmitFeedback}
        />
      )}

      {/* Athlete Detail Modal */}
      {showAthleteDetail && selectedAthlete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading-2 text-neutral-900">
                {selectedAthlete.username} - Detailed Analysis
              </h2>
              <button 
                onClick={() => setShowAthleteDetail(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <AthleteDetailDashboard 
              athlete={selectedAthlete}
              sessions={sessions.filter(s => s.athleteId === selectedAthlete.id)}
              onClose={() => setShowAthleteDetail(false)}
            />
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading-2 text-neutral-900">Provide Feedback</h2>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <FeedbackModal 
              session={selectedSession}
              onSubmit={handleSubmitFeedback}
              onClose={() => setShowFeedbackModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Feedback Modal Component
const FeedbackModal: React.FC<{
  session: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
}> = ({ session, onSubmit, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState<'feedback' | 'retest' | 'note'>('feedback');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ message: feedback, type });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Feedback Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-coach-expertise focus:border-transparent"
        >
          <option value="feedback">General Feedback</option>
          <option value="retest">Request Retest</option>
          <option value="note">Note</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Message
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          required
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-coach-expertise focus:border-transparent"
          placeholder="Provide detailed feedback for the athlete..."
        />
      </div>
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          Send Feedback
        </button>
      </div>
    </form>
  );
};

export default ImprovedCoachDashboard;