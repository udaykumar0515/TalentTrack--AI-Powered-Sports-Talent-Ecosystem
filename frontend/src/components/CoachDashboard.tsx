import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSessions } from '../api/apiClient';
import VideoGallery from './VideoGallery';
import ChatSidebar from './ChatSidebar';

const CoachDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [filterAthlete, setFilterAthlete] = useState('');
  const [showVideoGallery, setShowVideoGallery] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    loadDashboardData();
    // reload when user changes (login/logout)
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      if (!user?.id) {
        setSessions([]);
        return;
      }
      // fetch sessions for this coach from backend
      const coachSessions = await getSessions(undefined, user.id);
      setSessions(coachSessions || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSessions([]);
    }
  };

  const handleRequestRetest = async (sessionId: string, athleteId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    const athleteName = session?.athleteName || 'Unknown';
    
    try {
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        coachId: user?.id || '',
        coachName: user?.username || 'Coach',
        athleteId,
        athleteName,
        sessionId,
        type: 'retest',
        message: 'Please redo this exercise for better analysis. Focus on maintaining proper form throughout the movement.',
        timestamp: new Date().toISOString(),
        read: false
      };

      const response = await fetch('/api/coach-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        alert('Retest request sent to athlete!');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send retest request:', error);
      alert('Retest request sent! (Demo mode)');
    }
  };

  const handleSendFeedback = async (sessionId: string, athleteId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    const athleteName = session?.athleteName || 'Unknown';
    
    // Open chat with the athlete
    setSelectedAthlete({ id: athleteId, name: athleteName });
    setShowChat(true);
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const getRiskClass = (risk: string) => {
    return (risk || '').toLowerCase();
  };

  const filteredSessions = sessions.filter((session) =>
    (session.athleteName || '').toLowerCase().includes(filterAthlete.toLowerCase()) ||
    (session.exercise || '').toLowerCase().includes(filterAthlete.toLowerCase())
  );

  // fallback sample data (kept for demo if backend returns nothing)
  const sampleSessionData = [
    {
      sessionId: 'sess_001',
      athleteId: 'athlete1',
      athleteName: 'John Doe',
      exercise: 'Squats',
      reps: 15,
      score: 92,
      risk: 'Low',
      date: '2025-01-15',
      metrics: { reps: 15, formScore: 92 }
    },
    {
      sessionId: 'sess_002',
      athleteId: 'athlete2',
      athleteName: 'Jane Smith',
      exercise: 'Jumping Jacks',
      duration: '1:30',
      score: 75,
      risk: 'Medium',
      date: '2025-01-14',
      metrics: { formScore: 75 }
    }
  ];

  const rows = (filteredSessions.length ? filteredSessions : sampleSessionData);

  return (
    <div className="dashboard-container">
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
          <button 
            onClick={() => setShowVideoGallery(!showVideoGallery)} 
            className="gallery-btn"
          >
            <span className="gallery-icon">🎥</span>
            Videos
          </button>
          <button onClick={logout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </header>

      {showVideoGallery && (
        <VideoGallery athleteId={user?.id || ''} isCoach={true} />
      )}

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

      <section className="athlete-table-section">
        <h2>Athlete Performance</h2>
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <p>No athlete sessions found. Athletes need to select you as their coach and record sessions.</p>
            <p>Tell your athletes to:</p>
            <ul>
              <li>1. Go to their athlete dashboard</li>
              <li>2. Select you as their coach from the dropdown</li>
              <li>3. Record or upload exercise videos</li>
            </ul>
          </div>
        ) : (
          <div className="table-scroll">
            <table id="performance-table">
              <thead>
                <tr>
                  <th>Athlete Name</th>
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
              {rows.map((session) => {
                const reps = session.metrics?.reps ?? session.reps ?? '--';
                const score = session.metrics?.formScore ?? session.formScore ?? session.score ?? '--';
                const duration = session.durationSec ? `${Math.floor(session.durationSec)}s` : (session.metrics?.durationSec ? `${Math.floor(session.metrics.durationSec)}s` : '--');
                const risk = session.risk ?? (session.injuryFlags && session.injuryFlags.length ? 'Medium' : 'Low');
                const date = session.date ?? session.timestamp ?? 'Unknown';

                return (
                  <tr key={session.sessionId}>
                    <td>{session.athleteName}</td>
                    <td>{session.exercise}</td>
                    <td>{reps}</td>
                    <td>{score}</td>
                    <td>{duration}</td>
                    <td>
                      <span className={`risk-level ${getRiskClass(risk)}`}>
                        {risk}
                      </span>
                    </td>
                    <td>{new Date(date).toLocaleString?.() ?? date}</td>
                    <td>
                      <button
                        className="action-btn retest-btn"
                        onClick={() => handleRequestRetest(session.sessionId, session.athleteId)}
                      >
                        Request Retest
                      </button>
                      <button
                        className="action-btn feedback-btn"
                        onClick={() => handleSendFeedback(session.sessionId, session.athleteId)}
                      >
                        Send Feedback
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleViewSession(session.sessionId)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default CoachDashboard;
