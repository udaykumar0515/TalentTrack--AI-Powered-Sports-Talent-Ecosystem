import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSessions } from '../api/apiClient';
import DetailedAnalysisModal from './DetailedAnalysisModal';

interface AthleteDetailDashboardProps {
  selectedAthlete: { id: string; name: string };
  onBack: () => void;
  onMessageAthlete: () => void;
}

const AthleteDetailDashboard: React.FC<AthleteDetailDashboardProps> = ({
  selectedAthlete,
  onBack,
  onMessageAthlete
}) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionForAnalysis, setSelectedSessionForAnalysis] = useState<any>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthleteSessions();
  }, [selectedAthlete.id, user?.id]);

  const loadAthleteSessions = async () => {
    if (!user?.id || !selectedAthlete.id) return;
    
    setLoading(true);
    try {
      const coachSessions = await getSessions(undefined, user.id);
      const athleteSessions = coachSessions.filter((session: any) => session.athleteId === selectedAthlete.id);
      setSessions(athleteSessions);
    } catch (error) {
      console.error('Failed to load athlete sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailedAnalysis = (session: any) => {
    setSelectedSessionForAnalysis(session);
    setShowDetailedAnalysis(true);
  };

  const handleSendFeedback = async (sessionId: string, athleteId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    const athleteName = session?.athleteName || 'Unknown';
    
    // Open chat with pre-filled message
    onMessageAthlete();
  };

  const getRiskClass = (risk: string) => {
    return (risk || '').toLowerCase();
  };

  const getPerformanceLevelClass = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'elite': return 'elite';
      case 'advanced': return 'advanced';
      case 'intermediate': return 'intermediate';
      case 'beginner': return 'beginner';
      default: return 'unknown';
    }
  };

  // Calculate athlete statistics
  const athleteStats = React.useMemo(() => {
    if (sessions.length === 0) {
      return {
        avgFormScore: 0,
        avgDuration: 0,
        totalSessions: 0,
        lastSession: null
      };
    }

    const totalScore = sessions.reduce((sum, session) => sum + (session.formScore || 0), 0);
    const totalDuration = sessions.reduce((sum, session) => sum + (session.durationSec || 0), 0);
    const lastSession = sessions.reduce((latest, session) => {
      const sessionTime = new Date(session.timestamp || session.date || 0).getTime();
      const latestTime = new Date(latest.timestamp || latest.date || 0).getTime();
      return sessionTime > latestTime ? session : latest;
    }, sessions[0]);

    return {
      avgFormScore: Math.round(totalScore / sessions.length),
      avgDuration: Math.round(totalDuration / sessions.length),
      totalSessions: sessions.length,
      lastSession
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="athlete-sessions-board">
        <div className="sessions-board-header">
          <button onClick={onBack} className="back-btn">
            ← Back to Athletes
          </button>
          <div className="athlete-header-info">
            <h1 className="athlete-sessions-title">{selectedAthlete.name}'s Training Sessions</h1>
            <p className="athlete-sessions-subtitle">Loading session data...</p>
          </div>
        </div>
        <div className="loading-container">
          <p>Loading athlete sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="athlete-sessions-board">
      <div className="sessions-board-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Athletes
        </button>
        <div className="athlete-header-info">
          <h1 className="athlete-sessions-title">{selectedAthlete.name}'s Training Sessions</h1>
          <p className="athlete-sessions-subtitle">Complete performance overview and session history</p>
        </div>
        <button 
          className="message-athlete-btn"
          onClick={onMessageAthlete}
        >
          💬 Message {selectedAthlete.name}
        </button>
      </div>
      
      <div className="sessions-board-content">
        {/* Athlete Performance Overview */}
        <div className="athlete-performance-overview">
          <h3>📊 Performance Overview</h3>
          
          {/* Performance Indicators */}
          <div className="athlete-performance-indicators">
            {/* Circular Progress for Form Score */}
            <div className="progress-circle">
              <div className="circle-container">
                <svg className="progress-ring" width="100" height="100">
                  <circle
                    className="progress-ring-circle-bg"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className={`progress-ring-circle ${getRiskClass(athleteStats.avgFormScore >= 85 ? 'Low' : athleteStats.avgFormScore >= 70 ? 'Medium' : 'High')}`}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 42}`,
                      strokeDashoffset: `${2 * Math.PI * 42 * (1 - athleteStats.avgFormScore / 100)}`
                    }}
                  />
                </svg>
                <div className="circle-content">
                  <span className="circle-value">{athleteStats.avgFormScore}%</span>
                  <span className="circle-label">Avg Form Score</span>
                </div>
              </div>
            </div>
            
            {/* Box-like displays for Duration and Sessions */}
            <div className="performance-boxes">
              <div className="performance-box duration-box">
                <div className="box-icon">⏱️</div>
                <div className="box-content">
                  <div className="box-value">{athleteStats.avgDuration}s</div>
                  <div className="box-label">Avg Duration</div>
                </div>
              </div>
              
              <div className="performance-box sessions-box">
                <div className="box-icon">📊</div>
                <div className="box-content">
                  <div className="box-value">{athleteStats.totalSessions}</div>
                  <div className="box-label">Total Sessions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="athlete-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <div className="stat-label">Last Session</div>
                <div className="stat-value">
                  {athleteStats.lastSession 
                    ? new Date(athleteStats.lastSession.timestamp).toLocaleDateString()
                    : 'No sessions yet'
                  }
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-label">Best Form Score</div>
                <div className="stat-value">
                  {sessions.length > 0 
                    ? Math.max(...sessions.map(s => s.formScore || 0)) + '%'
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-info">
                <div className="stat-label">Longest Session</div>
                <div className="stat-value">
                  {sessions.length > 0 
                    ? Math.max(...sessions.map(s => s.durationSec || 0)) + 's'
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="sessions-table-section">
          <h3>📊 Training Sessions</h3>
          
          {sessions.length === 0 ? (
            <div className="no-sessions">
              <p>No sessions found for this athlete.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table id="performance-table">
                <thead>
                  <tr>
                    <th>Exercise Type</th>
                    <th>Reps</th>
                    <th>Form Score</th>
                    <th>Duration</th>
                    <th>Risk Level</th>
                    <th>Performance Level</th>
                    <th>Global Rank</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const reps = session.metrics?.reps ?? session.reps ?? 0;
                    const score = session.metrics?.formScore ?? session.formScore ?? 0;
                    const duration = session.durationSec ? `${Math.floor(session.durationSec)}s` : (session.metrics?.durationSec ? `${Math.floor(session.metrics.durationSec)}s` : '0s');
                    const risk = session.risk ?? (session.injuryFlags && session.injuryFlags.length ? 'Medium' : 'Low');
                    const date = session.date ?? session.timestamp ?? 'Unknown';

                    return (
                      <tr key={session.sessionId} className="session-row">
                        <td className="exercise-cell">
                          <div className="exercise-info">
                            <span className="exercise-name">
                              {session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}
                            </span>
                            <span className="session-date">
                              {new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="metric-cell">
                          <div className="metric-value">{reps}</div>
                          <div className="metric-label">Reps</div>
                        </td>
                        <td className="metric-cell">
                          <div className={`metric-value ${getRiskClass(risk)}`}>{score}%</div>
                          <div className="metric-label">Form</div>
                        </td>
                        <td className="metric-cell">
                          <div className="metric-value">{duration}</div>
                          <div className="metric-label">Duration</div>
                        </td>
                        <td className="metric-cell">
                          <div className={`metric-value ${getRiskClass(risk)}`}>{risk}</div>
                          <div className="metric-label">Risk</div>
                        </td>
                        <td className="metric-cell">
                          <div className={`metric-value ${getPerformanceLevelClass(session.benchmarking?.performance_level?.level)}`}>
                            {session.benchmarking?.performance_level?.level?.toUpperCase() || 'N/A'}
                          </div>
                          <div className="metric-label">
                            Score: {session.benchmarking?.performance_level?.score || 0}
                          </div>
                        </td>
                        <td className="metric-cell">
                          <div className="metric-value">
                            #{session.benchmarking?.global_rank || 'N/A'}
                          </div>
                          <div className="metric-label">
                            {session.benchmarking?.peer_comparison?.percentile || 0}%
                          </div>
                        </td>
                        <td className="metric-cell">
                          <div className="metric-value">{new Date(date).toLocaleDateString()}</div>
                          <div className="metric-label">{new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => handleDetailedAnalysis(session)}
                            >
                              Analysis
                            </button>
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => {
                                // Handle video viewing
                                console.log('View video for session:', session.sessionId);
                              }}
                            >
                              Video
                            </button>
                            <button
                              className="btn-feedback btn-sm"
                              onClick={() => handleSendFeedback(session.sessionId, session.athleteId)}
                            >
                              Feedback
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DetailedAnalysisModal
        isOpen={showDetailedAnalysis}
        onClose={() => setShowDetailedAnalysis(false)}
        session={selectedSessionForAnalysis}
      />
    </div>
  );
};

export default AthleteDetailDashboard;
