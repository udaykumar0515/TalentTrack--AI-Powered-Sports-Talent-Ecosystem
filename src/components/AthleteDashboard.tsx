import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';
import VideoRecorder from './VideoRecorder';
import VideoUploader from './VideoUploader';
import SessionView from './SessionView';

const AthleteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { coaches } = useCoaches();
  const [selectedCoach, setSelectedCoach] = useState('none');
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  const exercises = [
    { value: 'squat', label: 'Squat' },
    { value: 'jumping_jack', label: 'Jumping Jack' },
    { value: 'pushup', label: 'Push-up' }
  ];

  // Load sessions from localStorage on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    try {
      const storedSessions = localStorage.getItem(`sessions_${user?.id}`) || '[]';
      setSessions(JSON.parse(storedSessions));
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleVideoAnalyzed = (session: any) => {
    const sessionWithCoach = {
      ...session,
      athleteId: user?.id,
      athleteName: user?.username,
      coachId: selectedCoach !== 'none' ? selectedCoach : null,
      coachName: selectedCoach !== 'none' ? coaches.find(c => c.id === selectedCoach)?.username : null,
      timestamp: new Date().toISOString()
    };
    
    setCurrentSession(sessionWithCoach);
    setIsAnalyzing(false);
    
    // Save session to localStorage
    const updatedSessions = [...sessions, sessionWithCoach];
    setSessions(updatedSessions);
    localStorage.setItem(`sessions_${user?.id}`, JSON.stringify(updatedSessions));
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
          <h1>Athlete Dashboard</h1>
          <p>Welcome, {user?.username}!</p>
        </div>
        <div className="header-right">
          <div className="coach-select">
            <label htmlFor="coach-dropdown">Select a Coach:</label>
            <select 
              id="coach-dropdown"
              value={selectedCoach}
              onChange={(e) => setSelectedCoach(e.target.value)}
            >
              <option value="none">No Coach Selected</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>
                  {coach.username}
                </option>
              ))}
            </select>
          </div>
          <button onClick={logout} className="logout-btn">
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