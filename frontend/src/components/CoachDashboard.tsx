import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSessions, getAthletes, getCoachPredictiveAnalytics, getCoachInjuryAlerts, acknowledgeInjuryAlert, resolveInjuryAlert } from '../api/apiClient';
import ChatSidebar from './ChatSidebar';
import DetailedAnalysisModal from './DetailedAnalysisModal';

const CoachDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [filterAthlete, setFilterAthlete] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showAthleteSessions, setShowAthleteSessions] = useState(false);
  const [selectedSessionForAnalysis, setSelectedSessionForAnalysis] = useState<any>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [taggedSessionId, setTaggedSessionId] = useState<string>('');
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [injuryAlerts, setInjuryAlerts] = useState<any>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadPredictiveAnalytics();
    loadInjuryAlerts();
    // reload when user changes (login/logout)
  }, [user?.id]);


  const loadDashboardData = async () => {
    try {
      if (!user?.id) {
        setSessions([]);
        setAthletes([]);
        return;
      }
      
      // Fetch all athletes first
      const allAthletes = await getAthletes();
      
      // fetch sessions for this coach from backend
      const coachSessions = await getSessions(undefined, user.id);
      // Use actual video URLs from sessions, no fallback to test video
      const sessionsWithVideo = (coachSessions || []).map((session: any) => ({
        ...session,
        videoUrl: session.videoUrl || null,
        thumbnailUrl: session.thumbnailUrl || null
      }));
      // Sort sessions by timestamp (latest first)
      const sortedSessions = sessionsWithVideo.sort((a: any, b: any) => {
        const timestampA = new Date(a.timestamp || a.date || 0).getTime();
        const timestampB = new Date(b.timestamp || b.date || 0).getTime();
        return timestampB - timestampA; // Descending order (newest first)
      });
      
      setSessions(sortedSessions);
      
      // Group sessions by athlete and create athlete summaries
      const athleteMap = new Map();
      sessionsWithVideo.forEach(session => {
        if (!athleteMap.has(session.athleteId)) {
          // Find the actual athlete name from the athletes list
          const athleteData = allAthletes.find(athlete => athlete.id === session.athleteId);
          const athleteName = athleteData ? athleteData.username : session.athleteName || 'Unknown Athlete';
          
          athleteMap.set(session.athleteId, {
            id: session.athleteId,
            name: athleteName,
            username: athleteName, // Add username field for consistency
            sessions: [],
            totalSessions: 0,
            lastSession: null,
            avgFormScore: 0
          });
        }
        const athlete = athleteMap.get(session.athleteId);
        athlete.sessions.push(session);
        athlete.totalSessions++;
        if (!athlete.lastSession || new Date(session.timestamp) > new Date(athlete.lastSession.timestamp)) {
          athlete.lastSession = session;
        }
      });
      
      // Calculate average form scores
      athleteMap.forEach(athlete => {
        const totalScore = athlete.sessions.reduce((sum: number, session: any) => sum + (session.formScore || 0), 0);
        athlete.avgFormScore = athlete.sessions.length > 0 ? Math.round(totalScore / athlete.sessions.length) : 0;
      });
      
      setAthletes(Array.from(athleteMap.values()));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Create some test data for demonstration with more realistic names
      const testSessions = [
        {
          sessionId: 'test-session-1',
          athleteId: 'athlete1',
          athleteName: 'Alex Johnson',
          coachId: user?.id,
          coachName: user?.username,
          exercise: 'squat',
          timestamp: new Date().toISOString(),
          durationSec: 45,
          reps: 15,
          formScore: 85,
          videoUrl: null, // No video for demo
          thumbnailUrl: null
        },
        {
          sessionId: 'test-session-2',
          athleteId: 'athlete2',
          athleteName: 'Sarah Williams',
          coachId: user?.id,
          coachName: user?.username,
          exercise: 'jumping_jack',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          durationSec: 30,
          reps: 25,
          formScore: 72,
          videoUrl: null, // No video for demo
          thumbnailUrl: null
        },
        {
          sessionId: 'test-session-3',
          athleteId: 'athlete1',
          athleteName: 'Alex Johnson',
          coachId: user?.id,
          coachName: user?.username,
          exercise: 'pushup',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          durationSec: 60,
          reps: 20,
          formScore: 68,
          videoUrl: null, // No video for demo
          thumbnailUrl: null
        },
        {
          sessionId: 'test-session-4',
          athleteId: 'athlete3',
          athleteName: 'Mike Chen',
          coachId: user?.id,
          coachName: user?.username,
          exercise: 'squat',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          durationSec: 50,
          reps: 12,
          formScore: 78,
          videoUrl: null, // No video for demo
          thumbnailUrl: null
        }
      ];
      setSessions(testSessions);
      
      // Create athlete summaries
      const athleteMap = new Map();
      testSessions.forEach(session => {
        if (!athleteMap.has(session.athleteId)) {
          athleteMap.set(session.athleteId, {
            id: session.athleteId,
            name: session.athleteName,
            sessions: [],
            totalSessions: 0,
            lastSession: null,
            avgFormScore: 0
          });
        }
        const athlete = athleteMap.get(session.athleteId);
        athlete.sessions.push(session);
        athlete.totalSessions++;
        if (!athlete.lastSession || new Date(session.timestamp) > new Date(athlete.lastSession.timestamp)) {
          athlete.lastSession = session;
        }
      });
      
      // Calculate average form scores
      athleteMap.forEach(athlete => {
        const totalScore = athlete.sessions.reduce((sum: number, session: any) => sum + (session.formScore || 0), 0);
        athlete.avgFormScore = athlete.sessions.length > 0 ? Math.round(totalScore / athlete.sessions.length) : 0;
      });
      
      setAthletes(Array.from(athleteMap.values()));
    }
  };

  const loadPredictiveAnalytics = async () => {
    if (!user?.id) return;
    
    setLoadingAnalytics(true);
    try {
      console.log('Loading coach predictive analytics for user:', user.id);
      const analytics = await getCoachPredictiveAnalytics(user.id);
      console.log('Coach predictive analytics loaded:', analytics);
      setPredictiveAnalytics(analytics);
    } catch (error) {
      console.error('Error loading predictive analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadInjuryAlerts = async () => {
    if (!user?.id) return;
    
    setLoadingAlerts(true);
    try {
      console.log('Loading injury alerts for coach:', user.id);
      const alerts = await getCoachInjuryAlerts(user.id);
      console.log('Injury alerts loaded:', alerts);
      setInjuryAlerts(alerts);
    } catch (error) {
      console.error('Error loading injury alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!user?.id) return;
    
    try {
      await acknowledgeInjuryAlert(alertId, user.id);
      await loadInjuryAlerts(); // Reload alerts
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!user?.id) return;
    
    try {
      await resolveInjuryAlert(alertId, user.id);
      await loadInjuryAlerts(); // Reload alerts
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };


  const handleSendFeedback = async (sessionId: string, athleteId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    const athleteName = session?.athleteName || 'Unknown';
    
    // Set the session to be tagged
    setTaggedSessionId(sessionId);
    
    // Open chat with the athlete
    setSelectedAthlete({ id: athleteId, name: athleteName });
    setShowChat(true);
  };


  const handleAthleteClick = (athlete: any) => {
    setSelectedAthlete({ id: athlete.id, name: athlete.name });
    setShowAthleteSessions(true);
    // Filter sessions for this athlete
    const athleteSessions = sessions.filter(session => session.athleteId === athlete.id);
    setSessions(athleteSessions);
  };

  const handleBackToAthletes = () => {
    setShowAthleteSessions(false);
    setSelectedAthlete(null);
    loadDashboardData(); // Reload all sessions
  };

  const handleDetailedAnalysis = (session: any) => {
    setSelectedSessionForAnalysis(session);
    setShowDetailedAnalysis(true);
  };

  const getRiskClass = (risk: string) => {
    return (risk || '').toLowerCase();
  };

  const getCheatDetectionClass = (cheatDetection: any) => {
    if (!cheatDetection) return 'clean';
    if (cheatDetection.cheatDetected) {
      switch (cheatDetection.riskLevel?.toLowerCase()) {
        case 'high': return 'high-risk';
        case 'medium': return 'medium-risk';
        default: return 'low-risk';
      }
    }
    return 'clean';
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



  return (
    <div className={`dashboard-container ${showChat ? 'chat-open' : ''}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <img src="/logo.png" alt="AI Sports Platform" className="logo" />
            <div className="welcome-text">
              <h1>Welcome, {user?.username}!</h1>
              <p>Monitor athlete performance and provide feedback</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="filters">
            <input
              type="text"
              id="filter-athlete"
              placeholder="Search athletes or exercises..."
              value={filterAthlete}
              onChange={(e) => setFilterAthlete(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={logout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </header>


      {selectedAthlete && (
        <ChatSidebar
          isOpen={showChat}
          onClose={() => {
            setShowChat(false);
            setSelectedAthlete(null);
            setTaggedSessionId('');
          }}
          athleteId={selectedAthlete.id}
          isCoach={true}
          coachId={user?.id}
          athleteName={selectedAthlete.name}
          taggedSessionId={taggedSessionId}
        />
      )}

      {selectedSession && (
        <div className="video-modal">
          <div className="video-modal-content">
            <div className="video-header">
              <div className="video-title">
                <h3>
                  {selectedSession.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'} - {selectedSession.athleteName}
                </h3>
                <p className="video-subtitle">
                  {new Date(selectedSession.timestamp || selectedSession.date).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedSession(null)} className="close-btn">
                <span>✕</span>
              </button>
            </div>
            
            <div className="video-container">
              {selectedSession.videoUrl ? (
                <video
                  src={selectedSession.videoUrl}
                  controls
                  className="session-video"
                  poster={selectedSession.thumbnailUrl}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="no-video">
                  <div className="exercise-text-display">
                    <h2>{selectedSession.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}</h2>
                    <p>No video recording available for this session</p>
                  </div>
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
                  <strong>Exercise:</strong> {selectedSession.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {selectedSession.durationSec ? `${Math.floor(selectedSession.durationSec)}s` : '--'}
                </div>
                <div className="detail-item">
                  <strong>Repetitions:</strong> {selectedSession.reps || selectedSession.metrics?.reps || 0}
                </div>
                <div className="detail-item">
                  <strong>Form Score:</strong> 
                  <span className={`ml-2 ${getRiskClass(selectedSession.risk || 'Low')}`}>
                    {selectedSession.formScore || selectedSession.metrics?.formScore || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showAthleteSessions ? (
        <section className="athletes-section">
          {/* Predictive Analytics Section */}
          {predictiveAnalytics && !predictiveAnalytics.error && (
            <div className="predictive-analytics-section">
              <h2>Team Performance Insights</h2>
              <div className="coach-analytics-grid">
                {/* High Risk Athletes */}
                <div className="analytics-card high-risk-athletes">
                  <h3>⚠️ High Risk Athletes</h3>
                  <div className="risk-count">
                    {predictiveAnalytics.high_risk_athletes?.length || 0} athletes
                  </div>
                  {predictiveAnalytics.high_risk_athletes?.length > 0 && (
                    <ul className="athlete-list">
                      {predictiveAnalytics.high_risk_athletes.slice(0, 3).map((athleteId: string) => {
                        const athlete = athletes.find(a => a.id === athleteId);
                        return (
                          <li key={athleteId}>
                            {athlete?.name || 'Unknown Athlete'}
                          </li>
                        );
                      })}
                      {predictiveAnalytics.high_risk_athletes.length > 3 && (
                        <li>+{predictiveAnalytics.high_risk_athletes.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>

                {/* High Potential Athletes */}
                <div className="analytics-card high-potential-athletes">
                  <h3>⭐ High Potential Athletes</h3>
                  <div className="potential-count">
                    {predictiveAnalytics.high_potential_athletes?.length || 0} athletes
                  </div>
                  {predictiveAnalytics.high_potential_athletes?.length > 0 && (
                    <ul className="athlete-list">
                      {predictiveAnalytics.high_potential_athletes.slice(0, 3).map((athleteId: string) => {
                        const athlete = athletes.find(a => a.id === athleteId);
                        return (
                          <li key={athleteId}>
                            {athlete?.name || 'Unknown Athlete'}
                          </li>
                        );
                      })}
                      {predictiveAnalytics.high_potential_athletes.length > 3 && (
                        <li>+{predictiveAnalytics.high_potential_athletes.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Team Overview */}
                <div className="analytics-card team-overview">
                  <h3>📊 Team Overview</h3>
                  <div className="team-stats">
                    <div className="stat">
                      <span className="stat-label">Total Athletes:</span>
                      <span className="stat-value">{predictiveAnalytics.total_athletes || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total Sessions:</span>
                      <span className="stat-value">{predictiveAnalytics.total_sessions || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Avg Sessions/Athlete:</span>
                      <span className="stat-value">
                        {predictiveAnalytics.total_athletes > 0 
                          ? Math.round((predictiveAnalytics.total_sessions || 0) / predictiveAnalytics.total_athletes)
                          : 0
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Injury Alerts Section */}
          {loadingAlerts && (
            <div className="injury-alerts-section">
              <h2>Injury Alerts</h2>
              <div className="loading-alerts">
                <p>Loading injury alerts...</p>
              </div>
            </div>
          )}
          {injuryAlerts && !injuryAlerts.error && (
            <div className="injury-alerts-section">
              <div className="alerts-header">
                <h2>🚨 Injury Alerts</h2>
                <div className="alerts-summary">
                  <span className={`alert-count high ${injuryAlerts.high_priority > 0 ? 'active' : ''}`}>
                    {injuryAlerts.high_priority} High Priority
                  </span>
                  <span className={`alert-count medium ${injuryAlerts.medium_priority > 0 ? 'active' : ''}`}>
                    {injuryAlerts.medium_priority} Medium Priority
                  </span>
                  <span className={`alert-count low ${injuryAlerts.low_priority > 0 ? 'active' : ''}`}>
                    {injuryAlerts.low_priority} Low Priority
                  </span>
                </div>
              </div>
              
              {injuryAlerts.alerts && injuryAlerts.alerts.length > 0 ? (
                <div className="alerts-list">
                  {injuryAlerts.alerts.map((alert: any) => (
                    <div key={alert.id} className={`alert-card ${alert.severity}`}>
                      <div className="alert-header">
                        <div className="alert-info">
                          <h3 className="athlete-name">{alert.athlete_name}</h3>
                          <span className={`severity-badge ${alert.severity}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="alert-actions">
                          {!alert.acknowledged && (
                            <button 
                              className="btn-acknowledge"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </button>
                          )}
                          <button 
                            className="btn-resolve"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                      
                      <div className="alert-details">
                        <div className="risk-factors">
                          <h4>Risk Factors:</h4>
                          <ul>
                            {alert.risk_factors.map((factor: string, index: number) => (
                              <li key={index}>{factor.replace('_', ' ').toUpperCase()}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="recommendations">
                          <h4>Recommendations:</h4>
                          <ul>
                            {alert.recommendations.slice(0, 3).map((rec: string, index: number) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="alert-footer">
                        <span className="alert-time">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                        {alert.acknowledged && (
                          <span className="acknowledged-badge">
                            ✓ Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-alerts">
                  <p>🎉 No injury alerts at this time. All athletes are performing safely!</p>
                </div>
              )}
            </div>
          )}

          <h2>Your Athletes</h2>
          {athletes.length === 0 ? (
            <div className="no-sessions">
              <p>No athletes found. Athletes need to select you as their coach and record sessions.</p>
              <p>Tell your athletes to:</p>
              <ul>
                <li>1. Go to their athlete dashboard</li>
                <li>2. Select you as their coach from the dropdown</li>
                <li>3. Record or upload exercise videos</li>
              </ul>
            </div>
          ) : (
            <div className="athletes-grid">
              {athletes.map((athlete) => (
                <div 
                  key={athlete.id} 
                  className="athlete-card"
                  onClick={() => handleAthleteClick(athlete)}
                >
                  <div className="athlete-info">
                    <h3 className="athlete-name">{athlete.name}</h3>
                    <div className="athlete-stats">
                      <div className="stat-item">
                        <span className="stat-label">Total Sessions:</span>
                        <span className="stat-value">{athlete.totalSessions}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Avg Form Score:</span>
                        <span className={`stat-value ${getRiskClass(athlete.avgFormScore >= 85 ? 'Low' : athlete.avgFormScore >= 70 ? 'Medium' : 'High')}`}>
                          {athlete.avgFormScore}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Last Session:</span>
                        <span className="stat-value">
                          {athlete.lastSession ? new Date(athlete.lastSession.timestamp).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="athlete-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="athlete-sessions-section">
          <div className="sessions-header">
            <button onClick={handleBackToAthletes} className="back-btn">
              ← Back to Athletes
            </button>
            <h2>{selectedAthlete?.name}'s Sessions</h2>
            <button 
              className="btn-primary"
              onClick={() => {
                setShowChat(true);
              }}
            >
              💬 Message {selectedAthlete?.name}
            </button>
          </div>
          
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
                              onClick={() => setSelectedSession(session)}
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
        </section>
      )}

      <DetailedAnalysisModal
        isOpen={showDetailedAnalysis}
        onClose={() => setShowDetailedAnalysis(false)}
        session={selectedSessionForAnalysis}
      />
    </div>
  );
};

export default CoachDashboard;
