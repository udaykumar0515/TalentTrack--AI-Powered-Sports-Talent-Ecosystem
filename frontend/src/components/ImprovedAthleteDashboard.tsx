import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';
import { 
  getSessions, 
  getUserGamificationStats, 
  getGamificationLeaderboard,
  getUserGoals,
  getGoalAnalytics,
  getAthleteTrainingPlan
} from '../api/apiClient';
import { 
  Play, 
  BarChart3, 
  Target, 
  Trophy, 
  TrendingUp, 
  Calendar,
  MessageCircle,
  Settings,
  Bell,
  ChevronRight,
  Activity,
  Award,
  Clock,
  Users,
  Camera,
  Upload,
  Zap,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  ProgressCircle, 
  LineChart, 
  BarChart, 
  PerformanceTrend, 
  ExerciseDistribution, 
  WeeklyProgress 
} from './ChartComponents';
import VideoRecorder from './VideoRecorder';
import VideoUploader from './VideoUploader';
import SessionView from './SessionView';
import GoalSettingModal from './GoalSettingModal';

const ImprovedAthleteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { coaches } = useCoaches();
  
  // State management
  const [sessions, setSessions] = useState<any[]>([]);
  const [gamificationStats, setGamificationStats] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalAnalytics, setGoalAnalytics] = useState<any>(null);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState('none');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Load data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        // Load data with individual error handling to prevent one failure from breaking everything
        const [sessionsData, statsData, goalsData, analyticsData, planData, leaderboardData] = await Promise.allSettled([
          getSessions(user.id).catch(err => { console.warn('Sessions failed:', err); return []; }),
          getUserGamificationStats(user.id).catch(err => { console.warn('Stats failed:', err); return null; }),
          getUserGoals(user.id).catch(err => { console.warn('Goals failed:', err); return { goals: [] }; }),
          getGoalAnalytics(user.id).catch(err => { console.warn('Analytics failed:', err); return null; }),
          getAthleteTrainingPlan(user.id).catch(err => { console.warn('Training plan failed:', err); return null; }),
          getGamificationLeaderboard('total_points', 10).catch(err => { console.warn('Leaderboard failed:', err); return { leaderboard: [] }; })
        ]);

        setSessions(sessionsData.status === 'fulfilled' ? sessionsData.value : []);
        setGamificationStats(statsData.status === 'fulfilled' ? statsData.value : null);
        setGoals(goalsData.status === 'fulfilled' ? (goalsData.value?.goals || []) : []);
        setGoalAnalytics(analyticsData.status === 'fulfilled' ? analyticsData.value : null);
        setTrainingPlan(planData.status === 'fulfilled' ? planData.value : null);
        setLeaderboard(leaderboardData.status === 'fulfilled' ? (leaderboardData.value?.leaderboard || []) : []);
        
        // Show onboarding for new users
        const currentSessions = sessionsData.status === 'fulfilled' ? sessionsData.value : [];
        if (currentSessions.length === 0 && !localStorage.getItem(`onboarding_completed_${user.id}`)) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values to prevent crashes
        setSessions([]);
        setGamificationStats(null);
        setGoals([]);
        setGoalAnalytics(null);
        setTrainingPlan(null);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  // Calculate performance insights
  const calculatePerformanceInsights = () => {
    if (sessions.length === 0) return null;

    const validSessions = sessions.filter(session => session.formScore && session.reps);
    if (validSessions.length === 0) return null;

    const avgFormScore = validSessions.reduce((sum, session) => sum + (session.formScore || 0), 0) / validSessions.length;
    const avgReps = validSessions.reduce((sum, session) => sum + (session.reps || 0), 0) / validSessions.length;
    const totalSessions = validSessions.length;
    const bestFormScore = Math.max(...validSessions.map(s => s.formScore || 0));

    // Calculate weekly progress
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentSessions = validSessions.filter(s => new Date(s.timestamp) > oneWeekAgo);
    const weeklyProgress = recentSessions.length;

    return {
      avgFormScore: Math.round(avgFormScore),
      avgReps: Math.round(avgReps),
      totalSessions,
      bestFormScore,
      weeklyProgress,
      improvement: avgFormScore > 75 ? 'excellent' : avgFormScore > 60 ? 'good' : 'needs_work'
    };
  };

  const performanceInsights = calculatePerformanceInsights();

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (user?.id) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
  };

  // Button click handlers
  const handleRecordSession = () => {
    setShowVideoRecorder(true);
  };

  const handleUploadVideo = () => {
    setShowVideoUploader(true);
  };

  const handleSetGoals = () => {
    setShowGoalModal(true);
  };

  const handleViewSession = (session: any) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      // Reload sessions
      const updatedSessions = await getSessions(user?.id);
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleShareSession = async (session: any) => {
    try {
      // Create shareable link
      const shareUrl = `${window.location.origin}/session/${session.sessionId}`;
      
      // Try to use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `My ${session.exercise} Session - ${session.formScore}% Form Score`,
          text: `Check out my workout session with ${session.formScore}% form score!`,
          url: shareUrl
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Session link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share session:', error);
      // Fallback: copy to clipboard
      try {
        const shareUrl = `${window.location.origin}/session/${session.sessionId}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Session link copied to clipboard!');
      } catch (clipboardError) {
        alert('Unable to share session. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-athlete-energy to-neutral-800 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Strength & Strategy" className="h-10 w-auto" />
              <div>
                <h1 className="text-heading-3 text-white">Welcome back, {user?.username}!</h1>
                <p className="text-body-small text-white/80">Where strength meets strategy</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Coach Selection Pill */}
              <div className="bg-white/20 rounded-full px-4 py-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <select 
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="bg-transparent text-white text-sm border-none outline-none"
                >
                  <option value="none" className="text-neutral-800">No Coach</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id} className="text-neutral-800">
                      {coach.username}
                    </option>
                  ))}
                </select>
              </div>
              
              <button className="btn-touch bg-white/20 text-white hover:bg-white/30">
                <Bell className="w-4 h-4" />
              </button>
              <button className="btn-touch bg-white/20 text-white hover:bg-white/30">
                <MessageCircle className="w-4 h-4" />
              </button>
              <button className="btn-touch bg-white/20 text-white hover:bg-white/30">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className="btn-touch bg-red-500 text-white hover:bg-red-600">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions - Enhanced */}
        <div className="mb-8">
          <h2 className="text-heading-2 text-neutral-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={handleRecordSession}
              className="card p-6 text-left hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-athlete-energy/10 rounded-xl group-hover:bg-athlete-energy/20 transition-colors">
                  <Camera className="w-6 h-6 text-athlete-energy" />
                </div>
                <div className="flex-1">
                  <h3 className="text-heading-4 text-neutral-900">Record Session</h3>
                  <p className="text-body-small text-neutral-600">Start a new workout</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" />
              </div>
            </button>

            <button 
              onClick={handleUploadVideo}
              className="card p-6 text-left hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-coach-expertise/10 rounded-xl group-hover:bg-coach-expertise/20 transition-colors">
                  <Upload className="w-6 h-6 text-coach-expertise" />
                </div>
                <div className="flex-1">
                  <h3 className="text-heading-4 text-neutral-900">Upload Video</h3>
                  <p className="text-body-small text-neutral-600">Analyze existing footage</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" />
              </div>
            </button>

            <button 
              onClick={handleSetGoals}
              className="card p-6 text-left hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-accent/10 rounded-xl group-hover:bg-brand-accent/20 transition-colors">
                  <Target className="w-6 h-6 text-brand-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-heading-4 text-neutral-900">Set Goals</h3>
                  <p className="text-body-small text-neutral-600">Track your progress</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" />
              </div>
            </button>
          </div>
        </div>

        {/* Performance Overview - Enhanced with Charts */}
        {performanceInsights && (
          <div className="mb-8">
            <h2 className="text-heading-2 text-neutral-900 mb-6">Performance Overview</h2>
            
            {/* Key Metrics with Progress Circles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card p-6 text-center">
                <ProgressCircle 
                  percentage={performanceInsights.avgFormScore} 
                  size={80}
                  color="#4A90E2"
                  label="Average Form Score"
                  value={`${performanceInsights.avgFormScore}%`}
                />
                <div className="flex items-center justify-center gap-1 mt-2">
                  {performanceInsights.improvement === 'excellent' ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : performanceInsights.improvement === 'good' ? (
                    <AlertCircle className="w-4 h-4 text-warning" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-danger" />
                  )}
                  <span className="text-xs text-neutral-500 capitalize">{performanceInsights.improvement}</span>
                </div>
              </div>

              <div className="card p-6 text-center">
                <ProgressCircle 
                  percentage={Math.min((performanceInsights.totalSessions / 20) * 100, 100)} 
                  size={80}
                  color="#00A896"
                  label="Total Sessions"
                  value={performanceInsights.totalSessions.toString()}
                />
                <p className="text-xs text-neutral-500 mt-2">Goal: 20 sessions</p>
              </div>

              <div className="card p-6 text-center">
                <ProgressCircle 
                  percentage={performanceInsights.bestFormScore} 
                  size={80}
                  color="#F39C12"
                  label="Best Form Score"
                  value={`${performanceInsights.bestFormScore}%`}
                />
                <p className="text-xs text-neutral-500 mt-2">Personal best</p>
              </div>

              <div className="card p-6 text-center">
                <ProgressCircle 
                  percentage={Math.min((performanceInsights.weeklyProgress / 5) * 100, 100)} 
                  size={80}
                  color="#3498DB"
                  label="This Week"
                  value={`${performanceInsights.weeklyProgress}`}
                />
                <p className="text-xs text-neutral-500 mt-2">Goal: 5 sessions/week</p>
              </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Score Trend */}
              {sessions.length > 0 && (
                <PerformanceTrend sessions={sessions} />
              )}
              
              {/* Exercise Distribution */}
              {sessions.length > 0 && (
                <ExerciseDistribution sessions={sessions} />
              )}
            </div>
          </div>
        )}

        {/* Gamification Stats - Enhanced */}
        {gamificationStats && (
          <div className="mb-8">
            <h2 className="text-heading-2 text-neutral-900 mb-6">Your Progress</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-heading-4 text-neutral-900">Level & Points</h3>
                  <Trophy className="w-6 h-6 text-warning" />
                </div>
                <div className="space-y-4">
                  {/* Level Progress */}
                  <div className="text-center">
                    <ProgressCircle 
                      percentage={((gamificationStats.total_points || 0) % 1000) / 10} 
                      size={60}
                      color="#F39C12"
                      label="Level Progress"
                      value={`${gamificationStats.level || 1}`}
                    />
                    <p className="text-xs text-neutral-500 mt-1">Level {gamificationStats.level || 1}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-body text-neutral-600">Total Points</span>
                      <span className="text-heading-4 text-neutral-900">{gamificationStats.total_points || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-body text-neutral-600">Current Streak</span>
                      <span className="text-heading-4 text-neutral-900">{gamificationStats.current_streak || 0} days</span>
                    </div>
                    
                    {/* Points Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Progress to next level</span>
                        <span>{((gamificationStats.total_points || 0) % 1000)}/1000</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-athlete-energy to-coach-expertise h-2 rounded-full transition-all duration-500"
                          style={{ width: `${((gamificationStats.total_points || 0) % 1000) / 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-heading-4 text-neutral-900">Achievements</h3>
                  <Award className="w-6 h-6 text-athlete-energy" />
                </div>
                <div className="space-y-3">
                  {gamificationStats.achievements && gamificationStats.achievements.length > 0 ? (
                    gamificationStats.achievements.slice(0, 3).map((achievement: any, index: number) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div>
                          <p className="text-body text-neutral-900">{achievement.name}</p>
                          <p className="text-body-small text-neutral-600">+{achievement.points} points</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-body text-neutral-600">No achievements yet</p>
                  )}
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-heading-4 text-neutral-900">Leaderboard</h3>
                  <Users className="w-6 h-6 text-success" />
                </div>
                <div className="space-y-3">
                  {leaderboard.slice(0, 3).map((user: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-body font-medium text-neutral-600">#{index + 1}</span>
                        <span className="text-body text-neutral-900">{user.user_id}</span>
                      </div>
                      <span className="text-body-small text-neutral-600">{user.total_points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sessions - Enhanced */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-heading-2 text-neutral-900">Recent Sessions</h2>
            <button className="btn-secondary btn-sm">View All</button>
          </div>
          
          {sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.slice(0, 6).map((session, index) => (
                <div 
                  key={index} 
                  className="card p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => handleViewSession(session)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-heading-4 text-neutral-900">
                      {session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      (session.formScore || 0) >= 85 ? 'bg-success/10 text-success' : 
                      (session.formScore || 0) >= 70 ? 'bg-warning/10 text-warning' : 
                      'bg-danger/10 text-danger'
                    }`}>
                      {session.formScore || 0}%
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-body-small text-neutral-600">Reps</span>
                      <span className="text-body text-neutral-900">{session.reps || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-small text-neutral-600">Duration</span>
                      <span className="text-body text-neutral-900">
                        {session.durationSec ? `${Math.floor(session.durationSec)}s` : '--'}
                      </span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSession(session);
                      }}
                      className="btn-primary btn-sm flex-1"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareSession(session);
                      }}
                      className="btn-secondary btn-sm"
                    >
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Activity className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-heading-3 text-neutral-900 mb-2">No sessions yet</h3>
              <p className="text-body text-neutral-600 mb-6">Start your first workout to see your progress here</p>
              <button 
                onClick={handleRecordSession}
                className="btn-primary btn-lg"
              >
                Start Your First Session
              </button>
            </div>
          )}
        </div>

        {/* Goals Overview - Enhanced */}
        {goals.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-2 text-neutral-900">Your Goals</h2>
              <button className="btn-secondary btn-sm">Manage Goals</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.slice(0, 4).map((goal) => (
                <div key={goal.id} className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-heading-4 text-neutral-900">{goal.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      goal.status === 'active' ? 'bg-success/10 text-success' : 
                      goal.status === 'paused' ? 'bg-warning/10 text-warning' : 
                      'bg-danger/10 text-danger'
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  
                  <p className="text-body text-neutral-600 mb-4">{goal.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-body-small">
                      <span className="text-neutral-600">Progress</span>
                      <span className="text-neutral-900">{goal.progress_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-athlete-energy to-success h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${goal.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-body-small">
                      <span className="text-neutral-600">{goal.current_value || 0} / {goal.target_value} {goal.unit}</span>
                      {goal.target_date && (
                        <span className="text-neutral-600">
                          Due: {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-athlete-energy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-athlete-energy" />
              </div>
              <h2 className="text-heading-2 text-neutral-900 mb-2">Welcome to Strength & Strategy!</h2>
              <p className="text-body text-neutral-600">
                Let's get you started with your first session. This will only take 2 minutes.
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-athlete-energy/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-athlete-energy">1</span>
                </div>
                <span className="text-body text-neutral-700">Choose your exercise</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-athlete-energy/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-athlete-energy">2</span>
                </div>
                <span className="text-body text-neutral-700">Record your form</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-athlete-energy/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-athlete-energy">3</span>
                </div>
                <span className="text-body text-neutral-700">Get instant AI feedback</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleOnboardingComplete}
                className="btn-secondary flex-1"
              >
                Skip for now
              </button>
              <button 
                onClick={handleOnboardingComplete}
                className="btn-primary flex-1"
              >
                Start First Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Recorder Modal */}
      {showVideoRecorder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading-2 text-neutral-900">Record New Session</h2>
              <button 
                onClick={() => setShowVideoRecorder(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <VideoRecorder 
              onClose={() => setShowVideoRecorder(false)}
              onSessionComplete={(session) => {
                setSessions(prev => [session, ...prev]);
                setShowVideoRecorder(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Video Uploader Modal */}
      {showVideoUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading-2 text-neutral-900">Upload Video for Analysis</h2>
              <button 
                onClick={() => setShowVideoUploader(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <VideoUploader 
              onClose={() => setShowVideoUploader(false)}
              onUploadComplete={(session) => {
                setSessions(prev => [session, ...prev]);
                setShowVideoUploader(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Goal Setting Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading-2 text-neutral-900">Set New Goal</h2>
              <button 
                onClick={() => setShowGoalModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <GoalSettingModal 
              onClose={() => setShowGoalModal(false)}
              onGoalCreated={(goal) => {
                setGoals(prev => [goal, ...prev]);
                setShowGoalModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Session View Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading-2 text-neutral-900">Session Analysis</h2>
              <button 
                onClick={() => setShowSessionModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <SessionView 
              session={selectedSession}
              onClose={() => setShowSessionModal(false)}
              onDelete={() => {
                handleDeleteSession(selectedSession.sessionId);
                setShowSessionModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedAthleteDashboard;
