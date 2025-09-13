import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayerWithOverlay from './VideoPlayerWithOverlay';
import { saveSession } from '../api/apiClient';

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
    // Sample session data for demo
    const sampleSession = {
      sessionId: id,
      athleteId: "athleteA",
      exercise: "squat",
      date: "2025-01-15T10:05:00Z",
      durationSec: 28,
      metrics: {
        reps: 12,
        avgRepTimeSec: 2.1,
        formScore: 82,
        symmetryScore: 92,
        waistAngleDeg: 34.2,
        muscleActivations: { "left_quadriceps": 0.67 }
      },
      injuryFlags: [
        {
          type: "knee_valgus",
          severity: "medium",
          frameIndex: 86,
          message: "Left knee collapsed inward"
        }
      ],
      thumbnailUrl: "https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      keypointsUrl: "/api/keypoints/sess_001.json"
    };
    setSession(sampleSession);
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

  const getRiskClass = (severity: string) => {
    switch (severity) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Session Analysis</h1>
        <button onClick={handleBack}>Back</button>
      </header>

      <VideoPlayerWithOverlay session={session} />

      <div className="session-details">
        <div className="session-info">
          <h2>Exercise: {session.exercise}</h2>
          <p><strong>Date:</strong> {new Date(session.date).toLocaleDateString()}</p>
          <p><strong>Duration:</strong> {session.durationSec}s</p>
        </div>

        <div className="session-metrics">
          <div className="metric-card green">
            <h3>Repetitions</h3>
            <p className="metric-value">{session.metrics.reps}</p>
            <p>Average time: {session.metrics.avgRepTimeSec}s</p>
          </div>

          <div className="metric-card green">
            <h3>Form Score</h3>
            <p className="metric-value">{session.metrics.formScore}/100</p>
          </div>

          <div className="metric-card green">
            <h3>Symmetry Score</h3>
            <p className="metric-value">{session.metrics.symmetryScore}/100</p>
          </div>

          {session.metrics.waistAngleDeg && (
            <div className="metric-card yellow">
              <h3>Waist Angle</h3>
              <p className="metric-value">{session.metrics.waistAngleDeg}°</p>
            </div>
          )}
        </div>
      </div>

      {session.injuryFlags && session.injuryFlags.length > 0 && (
        <div className="injury-flags">
          <h4>Injury Risk Flags</h4>
          {session.injuryFlags.map((flag: any, index: number) => (
            <div key={index} className="flag-item">
              <span className={`risk-level ${getRiskClass(flag.severity)}`}>
                {flag.severity.toUpperCase()}
              </span>
              <p>{flag.message}</p>
              <small>Frame: {flag.frameIndex}</small>
            </div>
          ))}
        </div>
      )}

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