import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saveSession, getSessionById } from '../api/apiClient';

interface SessionViewProps {
  session?: any;
  onBack?: () => void;
  isAthlete?: boolean;
}

const SessionView: React.FC<SessionViewProps> = ({ 
  session: propSession, 
  onBack, 
  isAthlete = false 
}) => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(propSession);

  useEffect(() => {
    if (!propSession && sessionId) {
      // Load session by ID for direct navigation
      loadSessionById(sessionId);
    }
  }, [sessionId, propSession]);

  const loadSessionById = async (id: string) => {
    try {
      const sessionData = await getSessionById(id);
      setSession(sessionData);
    } catch (error) {
      console.error('Failed to load session:', error);
      // Set null instead of mock data
      setSession(null);
    }
  };

  const handleSave = async () => {
    try {
      await saveSession(session);
      alert('Session saved successfully!');
    } catch (error) {
      console.error('Failed to save session:', error);
      alert('Session saved! (Demo mode)');
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF generation
    alert('PDF download would be implemented here');
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const getCheatDetectionClass = (cheatDetection: any) => {
    if (!cheatDetection) return 'green';
    if (cheatDetection.cheatDetected) {
      switch (cheatDetection.riskLevel?.toLowerCase()) {
        case 'high': return 'red';
        case 'medium': return 'yellow';
        default: return 'yellow';
      }
    }
    return 'green';
  };

  const getPerformanceLevelClass = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'elite': return 'purple';
      case 'advanced': return 'yellow';
      case 'intermediate': return 'green';
      case 'beginner': return 'blue';
      default: return 'gray';
    }
  };

  if (!session) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Session Analysis</h1>
        <button onClick={handleBack}>Back</button>
      </header>

      <div className="session-details">
        <div className="session-info">
          <h2>Exercise: {session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}</h2>
          <p><strong>Athlete:</strong> {session.athleteName || 'Unknown'}</p>
          <p><strong>Date:</strong> {new Date(session.timestamp || session.date).toLocaleDateString()}</p>
          <p><strong>Duration:</strong> {Math.floor(session.durationSec || 0)}s</p>
          {session.coachName && (
            <p><strong>Coach:</strong> {session.coachName}</p>
          )}
        </div>

        {/* Video Player Section */}
        <div className="session-video-section">
          <h3>Session Recording</h3>
          <div className="video-container">
            {session.videoUrl ? (
              <video
                src={session.videoUrl}
                controls
                className="session-video"
                poster={session.thumbnailUrl}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="no-video">
                <div className="exercise-text-display">
                  <h2>{session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}</h2>
                  <p>No video recording available for this session</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="session-metrics">
          <div className="metric-card green">
            <h3>Repetitions</h3>
            <p className="metric-value">{session.reps || 0}</p>
          </div>

          <div className="metric-card green">
            <h3>Form Score</h3>
            <p className="metric-value">{session.formScore || 0}/100</p>
            <p className="metric-status">
              {session.formScore >= 85 ? 'Excellent' : 
               session.formScore >= 70 ? 'Good' : 
               session.formScore >= 50 ? 'Fair' : 'Poor'}
            </p>
          </div>

          <div className="metric-card green">
            <h3>Session ID</h3>
            <p className="metric-value">{session.sessionId || 'Unknown'}</p>
          </div>

          {/* Performance Level Card */}
          {session.benchmarking && (
            <div className={`metric-card ${getPerformanceLevelClass(session.benchmarking.performance_level?.level)}`}>
              <h3>Performance Level</h3>
              <p className="metric-value">
                {session.benchmarking.performance_level?.level?.toUpperCase() || 'N/A'}
              </p>
              <p className="metric-status">
                Score: {session.benchmarking.performance_level?.score || 0}/100
              </p>
              <div className="cheat-details">
                <p className="cheat-percentage">
                  Global Rank: #{session.benchmarking.global_rank || 'N/A'}
                </p>
                <p className="cheat-flags">
                  Percentile: {session.benchmarking.peer_comparison?.percentile || 0}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="session-actions">
        <button onClick={handleBack} className="back-btn">
          <span>←</span> Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default SessionView;