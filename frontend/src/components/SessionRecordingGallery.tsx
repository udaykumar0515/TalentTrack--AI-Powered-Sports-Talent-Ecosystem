import React, { useState, useEffect } from 'react';
import { Play, Calendar, User, Clock, Eye, Download, X } from 'lucide-react';
import { getSessions } from '../api/apiClient';

interface SessionRecordingGalleryProps {
  athleteId?: string;
  coachId?: string;
  isCoach?: boolean;
}

interface SessionData {
  sessionId: string;
  athleteId: string;
  athleteName: string;
  coachId?: string;
  coachName?: string;
  exercise: string;
  timestamp: string;
  durationSec?: number;
  reps?: number;
  formScore?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  metrics?: {
    reps?: number;
    formScore?: number;
    durationSec?: number;
  };
}

const SessionRecordingGallery: React.FC<SessionRecordingGalleryProps> = ({ 
  athleteId, 
  coachId, 
  isCoach = false 
}) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [athleteId, coachId]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let sessionData: SessionData[] = [];
      
      if (isCoach && coachId) {
        // Load sessions for coach to see all athlete sessions
        sessionData = await getSessions(undefined, coachId);
      } else if (athleteId) {
        // Load sessions for specific athlete
        sessionData = await getSessions(athleteId);
      }
      
      setSessions(sessionData);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (session: SessionData) => {
    setSelectedSession(session);
  };

  const handleCloseVideo = () => {
    setSelectedSession(null);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (durationSec?: number) => {
    if (!durationSec) return '0s';
    const minutes = Math.floor(durationSec / 60);
    const seconds = Math.floor(durationSec % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getFormScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFormScoreText = (score?: number) => {
    if (!score) return 'N/A';
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <div className="session-gallery">
        <h2>Session Recordings</h2>
        <div className="loading">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="session-gallery">
      <h2>Session Recordings</h2>
      
      {sessions.length === 0 ? (
        <div className="no-sessions">
          <p>No session recordings found.</p>
          {isCoach ? (
            <p>Tell your athletes to record exercise videos to see them here.</p>
          ) : (
            <p>Record your first exercise video to see it here!</p>
          )}
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div 
              key={session.sessionId} 
              className="session-card" 
              onClick={() => handleSessionClick(session)}
            >
              <div className="session-thumbnail">
                {session.thumbnailUrl ? (
                  <img 
                    src={session.thumbnailUrl} 
                    alt={session.exercise}
                    className="thumbnail-image"
                  />
                ) : (
                  <div className="thumbnail-placeholder">
                    <Play size={32} />
                  </div>
                )}
                <div className="play-overlay">
                  <Play size={24} />
                </div>
                <div className="session-duration">
                  {formatDuration(session.durationSec || session.metrics?.durationSec)}
                </div>
              </div>
              
              <div className="session-info">
                <h3 className="session-title">
                  {session.exercise.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </h3>
                
                <div className="session-meta">
                  <div className="meta-item">
                    <User size={16} />
                    <span>{session.athleteName}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>{formatDate(session.timestamp)}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>{formatTime(session.timestamp)}</span>
                  </div>
                </div>

                <div className="session-metrics">
                  <div className="metric">
                    <span className="metric-label">Reps:</span>
                    <span className="metric-value">
                      {session.reps || session.metrics?.reps || 0}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Form Score:</span>
                    <span className={`metric-value ${getFormScoreColor(session.formScore || session.metrics?.formScore)}`}>
                      {session.formScore || session.metrics?.formScore || 0}%
                    </span>
                  </div>
                </div>

                <div className="session-status">
                  <span className={`status-badge ${getFormScoreColor(session.formScore || session.metrics?.formScore)}`}>
                    {getFormScoreText(session.formScore || session.metrics?.formScore)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSession && (
        <div className="video-modal">
          <div className="video-modal-content">
            <div className="video-header">
              <div className="video-title">
                <h3>
                  {selectedSession.exercise.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} - {selectedSession.athleteName}
                </h3>
                <p className="video-subtitle">
                  {formatDate(selectedSession.timestamp)} at {formatTime(selectedSession.timestamp)}
                </p>
              </div>
              <button onClick={handleCloseVideo} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="video-container">
              {selectedSession.videoUrl ? (
                <video
                  src={selectedSession.videoUrl}
                  controls
                  className="session-video"
                  poster={selectedSession.thumbnailUrl}
                />
              ) : (
                <div className="no-video">
                  <Play size={48} />
                  <p>Video not available</p>
                </div>
              )}
            </div>

            <div className="session-details">
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Athlete:</strong> {selectedSession.athleteName}
                </div>
                {selectedSession.coachName && (
                  <div className="detail-item">
                    <strong>Coach:</strong> {selectedSession.coachName}
                  </div>
                )}
                <div className="detail-item">
                  <strong>Exercise:</strong> {selectedSession.exercise.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {formatDuration(selectedSession.durationSec || selectedSession.metrics?.durationSec)}
                </div>
                <div className="detail-item">
                  <strong>Repetitions:</strong> {selectedSession.reps || selectedSession.metrics?.reps || 0}
                </div>
                <div className="detail-item">
                  <strong>Form Score:</strong> 
                  <span className={`ml-2 ${getFormScoreColor(selectedSession.formScore || selectedSession.metrics?.formScore)}`}>
                    {selectedSession.formScore || selectedSession.metrics?.formScore || 0}% 
                    ({getFormScoreText(selectedSession.formScore || selectedSession.metrics?.formScore)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionRecordingGallery;
