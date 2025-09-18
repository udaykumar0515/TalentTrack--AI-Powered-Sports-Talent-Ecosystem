import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSessions, getAthletes, getCoachMessages } from '../api/apiClient';
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
  const [unreadMessages, setUnreadMessages] = useState<{[athleteId: string]: number}>({});

  useEffect(() => {
    loadDashboardData();
    loadMessages();
    // reload when user changes (login/logout)
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

  const loadMessages = async () => {
    if (!user?.id) return;
    
    try {
      const coachMessages = await getCoachMessages(user.id);
      
      // Count unread messages per athlete (only messages from athletes to coach)
      const unreadCounts: {[athleteId: string]: number} = {};
      coachMessages.forEach((message: any) => {
        // Only count messages from athletes (not from coach) that are unread
        if (!message.read && message.coachId !== user.id) {
          unreadCounts[message.athleteId] = (unreadCounts[message.athleteId] || 0) + 1;
        }
      });
      setUnreadMessages(unreadCounts);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendFeedback = async (sessionId: string, athleteId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    const athleteName = session?.athleteName || 'Unknown';
    
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
          }}
          athleteId={selectedAthlete.id}
          isCoach={true}
          coachId={user?.id}
          athleteName={selectedAthlete.name}
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
                    <div className="athlete-name-container">
                      <h3 className="athlete-name">{athlete.name}</h3>
                      {unreadMessages[athlete.id] > 0 && (
                        <div className="unread-indicator">
                          <span className="unread-dot"></span>
                          <span className="unread-count">{unreadMessages[athlete.id]}</span>
                        </div>
                      )}
                    </div>
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
                              Message
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
