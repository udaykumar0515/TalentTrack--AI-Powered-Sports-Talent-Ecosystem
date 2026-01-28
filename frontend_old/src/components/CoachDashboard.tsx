import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSessions, getAthletes } from '../api/apiClient';
import ChatSidebar from './ChatSidebar';
import AthleteDetailDashboard from './AthleteDetailDashboard';

const CoachDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [filterAthlete, setFilterAthlete] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showAthleteSessions, setShowAthleteSessions] = useState(false);
  const [taggedSessionId, setTaggedSessionId] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
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
            avgFormScore: 0,
            avgDuration: 0
          });
        }
        const athlete = athleteMap.get(session.athleteId);
        athlete.sessions.push(session);
        athlete.totalSessions++;
        if (!athlete.lastSession || new Date(session.timestamp) > new Date(athlete.lastSession.timestamp)) {
          athlete.lastSession = session;
        }
      });
      
      // Calculate average form scores and durations
      athleteMap.forEach(athlete => {
        const totalScore = athlete.sessions.reduce((sum: number, session: any) => sum + (session.formScore || 0), 0);
        const totalDuration = athlete.sessions.reduce((sum: number, session: any) => sum + (session.durationSec || 0), 0);
        
        athlete.avgFormScore = athlete.sessions.length > 0 ? Math.round(totalScore / athlete.sessions.length) : 0;
        athlete.avgDuration = athlete.sessions.length > 0 ? Math.round(totalDuration / athlete.sessions.length) : 0;
      });
      
      setAthletes(Array.from(athleteMap.values()));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty data instead of mock data
      setSessions([]);
      setAthletes([]);
    }
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

      {!showAthleteSessions && (
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
                    <h3 className="athlete-name">{athlete.name}</h3>
                    
                    {/* Performance Indicators */}
                    <div className="athlete-performance-indicators">
                      {/* Circular Progress for Form Score */}
                      <div className="progress-circle">
                        <div className="circle-container">
                          <svg className="progress-ring" width="80" height="80">
                            <circle
                              className="progress-ring-circle-bg"
                              stroke="#e5e7eb"
                              strokeWidth="6"
                              fill="transparent"
                              r="34"
                              cx="40"
                              cy="40"
                            />
                            <circle
                              className={`progress-ring-circle ${getRiskClass(athlete.avgFormScore >= 85 ? 'Low' : athlete.avgFormScore >= 70 ? 'Medium' : 'High')}`}
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="transparent"
                              r="34"
                              cx="40"
                              cy="40"
                              style={{
                                strokeDasharray: `${2 * Math.PI * 34}`,
                                strokeDashoffset: `${2 * Math.PI * 34 * (1 - athlete.avgFormScore / 100)}`
                              }}
                            />
                          </svg>
                          <div className="circle-content">
                            <span className="circle-value">{athlete.avgFormScore}%</span>
                            <span className="circle-label">Form</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Box-like displays for Duration and Sessions */}
                      <div className="performance-boxes">
                        <div className="performance-box duration-box">
                          <div className="box-icon">⏱️</div>
                          <div className="box-content">
                            <div className="box-value">{Math.round(athlete.avgDuration || 0)}s</div>
                            <div className="box-label">Avg Duration</div>
                          </div>
                        </div>
                        
                        <div className="performance-box sessions-box">
                          <div className="box-icon">📊</div>
                          <div className="box-content">
                            <div className="box-value">{athlete.totalSessions}</div>
                            <div className="box-label">Total Sessions</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="athlete-stats">
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
      )}

      {showAthleteSessions && selectedAthlete && (
        <AthleteDetailDashboard
          selectedAthlete={selectedAthlete}
          onBack={handleBackToAthletes}
          onMessageAthlete={() => {
            setShowChat(true);
          }}
          onMessageAthleteWithSession={(sessionId: string) => {
            setTaggedSessionId(sessionId);
            setShowChat(true);
          }}
        />
      )}

    </div>
  );
};

export default CoachDashboard;