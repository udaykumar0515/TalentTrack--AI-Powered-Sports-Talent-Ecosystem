import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';
import VideoRecorder from './VideoRecorder';
import VideoUploader from './VideoUploader';
import SessionView from './SessionView';
import { saveSession, getAthleteMessages, markMessageAsRead, CoachMessage } from '../api/apiClient';

const AthleteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { coaches } = useCoaches();
  const [selectedCoach, setSelectedCoach] = useState('none');
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [showMessages, setShowMessages] = useState(false);

  const exercises = [
    { value: 'squat', label: 'Squat' },
    { value: 'jumping_jack', label: 'Jumping Jack' },
    { value: 'pushup', label: 'Push-up' }
  ];

  // Load sessions and messages on component mount
  useEffect(() => {
    loadSessions();
    loadMessages();
  }, [user?.id]);

  // Load messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        loadMessages();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadSessions = () => {
    try {
      const storedSessions = localStorage.getItem(`sessions_${user?.id}`) || '[]';
      setSessions(JSON.parse(storedSessions));
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadMessages = async () => {
    if (!user?.id) return;
    
    try {
      const athleteMessages = await getAthleteMessages(user.id);
      setMessages(athleteMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };


  const handleVideoAnalyzed = async (session: any) => {
    // existing logic: augment with athlete and coach
    const sessionWithCoach = {
      ...session,
      athleteId: user?.id,
      athleteName: user?.username,
      coachId: selectedCoach !== 'none' ? selectedCoach : null,
      coachName: selectedCoach !== 'none' ? coaches.find(c => c.id === selectedCoach)?.username : null,
      // ensure sessionId exists
      sessionId: session.sessionId || `sess_${Math.random().toString(36).slice(2,10)}`
    };
  
    // Save locally for UI immediacy (existing behavior)
    setCurrentSession(sessionWithCoach);
    const newSessions = [sessionWithCoach, ...sessions];
    setSessions(newSessions);
    try {
      localStorage.setItem(`sessions_${user?.id}`, JSON.stringify(newSessions));
    } catch (e) {
      console.error('Could not persist to localStorage', e);
    }
  
    // NEW: persist to backend
    try {
      await saveSession(sessionWithCoach);
      console.info('Session saved to backend with coach:', sessionWithCoach.coachName || 'No coach selected');
    } catch (err) {
      console.error('Failed to save session to backend:', err);
      // Optionally show a UI toast to the user
    }
    
    // Reset analysis state
    setIsAnalyzing(false);
  };
  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
  };

  // Helper functions for formatting and status
  const getStatusClass = (formScore: number) => {
    if (formScore >= 85) return 'green';
    if (formScore >= 70) return 'yellow';
    return 'red';
  };

  const getStatusText = (formScore: number) => {
    if (formScore >= 85) return 'Excellent';
    if (formScore >= 70) return 'Good';
    if (formScore >= 50) return 'Fair';
    return 'Poor';
  };

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (durationSec: number) => {
    if (!durationSec) return '0s';
    const minutes = Math.floor(durationSec / 60);
    const seconds = Math.floor(durationSec % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (currentSession) {
    return (
      <SessionView 
        session={currentSession} 
        onBack={() => setCurrentSession(null)}
        isAthlete={true}
      />
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <img src="/logo.png" alt="AI Sports Platform" className="logo" />
            <div className="welcome-text">
              <h1>Welcome back, {user?.username}!</h1>
              <p>Track your performance and improve your form</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="coach-select">
            <select 
              id="coach-dropdown"
              value={selectedCoach}
              onChange={(e) => setSelectedCoach(e.target.value)}
              className="coach-dropdown"
            >
              <option value="none">Select Coach</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>
                  {coach.username}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setShowMessages(!showMessages)} 
            className="messages-btn"
          >
            <span className="message-icon">💬</span>
            Messages {messages.filter(m => !m.read).length > 0 && <span className="unread-count">({messages.filter(m => !m.read).length})</span>}
          </button>
          <button onClick={logout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </header>

      <div className="exercise-select">
        <label htmlFor="exercise-dropdown">Select Exercise:</label>
        <select 
          id="exercise-dropdown"
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
        >
          {exercises.map(exercise => (
            <option key={exercise.value} value={exercise.value}>
              {exercise.label}
            </option>
          ))}
        </select>
      </div>

      <section className="video-actions">
        <VideoRecorder 
          exercise={selectedExercise}
          onVideoAnalyzed={handleVideoAnalyzed}
          onStartAnalysis={handleStartAnalysis}
          isAnalyzing={isAnalyzing}
        />
        <VideoUploader 
          exercise={selectedExercise}
          
          onVideoAnalyzed={handleVideoAnalyzed}
          onStartAnalysis={handleStartAnalysis}
          isAnalyzing={isAnalyzing}
        />
      </section>

      {isAnalyzing && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing your video...</p>
        </div>
      )}

      {showMessages && (
        <section className="messages-section">
          <h2>Messages from Coach</h2>
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages from your coach yet.</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message-card ${message.read ? 'read' : 'unread'}`}
                  onClick={() => !message.read && handleMarkAsRead(message.id)}
                >
                  <div className="message-header">
                    <h3>
                      {message.type === 'retest' ? '🔄 Retest Request' : 
                       message.type === 'feedback' ? '💬 Feedback' : '📝 Note'}
                    </h3>
                    <span className="message-time">
                      {new Date(message.timestamp).toLocaleDateString()} {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="message-content">{message.message}</p>
                  <div className="message-footer">
                    <span className="coach-name">From: {message.coachName}</span>
                    {!message.read && <span className="unread-indicator">New</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="activity-feed">
        <h2>Your Recent Activity</h2>
        <div id="metrics-container">
          {sessions.length === 0 ? (
            <div className="no-activity">
              <p>No sessions recorded yet. Start your first workout!</p>
            </div>
          ) : (
            sessions.slice().reverse().map((session, index) => (
              <div key={index} className={`metric-card ${getStatusClass(session.formScore)}`}>
                <h3>{session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}</h3>
                <p><strong>Reps:</strong> {session.reps || 0}</p>
                <p><strong>Form Score:</strong> {session.formScore || 0}%</p>
                <p><strong>Status:</strong> <span className={`risk-level ${getStatusClass(session.formScore)}`}>
                  {getStatusText(session.formScore)}
                </span></p>
                <p><strong>Date:</strong> {formatDateTime(session.timestamp)}</p>
                <p><strong>Duration:</strong> {formatDuration(session.durationSec)}</p>
                {session.coachName && (
                  <p><strong>Coach:</strong> {session.coachName}</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default AthleteDashboard;