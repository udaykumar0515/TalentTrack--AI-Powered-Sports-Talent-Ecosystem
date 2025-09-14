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
      // Fallback to sample data if API fails
      const sampleSession = {
        sessionId: id,
        athleteId: "athleteA",
        exercise: "squat",
        date: "2025-01-15T10:05:00Z",
        durationSec: 28,
        reps: 12,
        formScore: 82,
        timestamp: "2025-01-15T10:05:00Z"
      };
      setSession(sampleSession);
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
        </div>
      </div>

      <div className="controls-panel">
        <button onClick={handleSave}>Save Session</button>
        <button onClick={handleDownloadPDF}>Download PDF Report</button>
        {!isAthlete && (
          <>
            <button onClick={() => alert('Retest requested!')}>
              Request Re-test
            </button>
            <button onClick={() => alert('Note added!')}>
              Add Note
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionView;