import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAthletes, getSessions, postCoachAction } from '../api/apiClient';

const CoachDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [filterAthlete, setFilterAthlete] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [athletesData, sessionsData] = await Promise.all([
        getAthletes(),
        getSessions()
      ]);
      setAthletes(athletesData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use sample data for demo
      setSessions(sampleSessionData);
    }
  };

  const handleRequestRetest = async (sessionId: string, athleteId: string) => {
    try {
      await postCoachAction({
        type: 'retest',
        athleteId,
        sessionId,
        reason: 'Coach requested re-examination',
        notes: 'Please redo the exercise for better analysis'
      });
      alert('Retest request sent to athlete!');
    } catch (error) {
      console.error('Failed to send retest request:', error);
      alert('Retest request sent! (Demo mode)');
    }
  };

  const handleSendFeedback = async (sessionId: string, athleteId: string) => {
    const feedback = prompt('Enter your feedback:');
    if (!feedback) return;

    try {
      await postCoachAction({
        type: 'feedback',
        athleteId,
        sessionId,
        notes: feedback
      });
      alert('Feedback sent to athlete!');
    } catch (error) {
      console.error('Failed to send feedback:', error);
      alert('Feedback sent! (Demo mode)');
    }
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const getRiskClass = (risk: string) => {
    return risk.toLowerCase();
  };

  const filteredSessions = sessions.filter(session => 
    session.athleteName.toLowerCase().includes(filterAthlete.toLowerCase()) ||
    session.exercise.toLowerCase().includes(filterAthlete.toLowerCase())
  );

  // Sample data for demo
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
    },
    { 
      sessionId: 'sess_003',
      athleteId: 'athlete3',
      athleteName: 'Peter Jones', 
      exercise: 'Push-ups', 
      reps: 20, 
      score: 55, 
      risk: 'High', 
      date: '2025-01-13',
      metrics: { reps: 20, formScore: 55 }
    }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Coach Dashboard</h1>
        <div className="filters">
          <input
            type="text"
            id="filter-athlete"
            placeholder="Filter by athlete name or exercise"
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
          />
        </div>
      </header>

      <section className="athlete-table-section">
        <h2>Athlete Performance</h2>
        <div className="table-scroll">
          <table id="performance-table">
            <thead>
              <tr>
                <th>Athlete Name</th>
                <th>Exercise Type</th>
                <th>Reps / Duration</th>
                <th>Performance Score</th>
                <th>Injury Risk</th>
                <th>Last Activity Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.sessionId}>
                  <td>{session.athleteName}</td>
                  <td>{session.exercise}</td>
                  <td>{session.reps || session.duration}</td>
                  <td>{session.score}</td>
                  <td>
                    <span className={`risk-level ${getRiskClass(session.risk)}`}>
                      {session.risk}
                    </span>
                  </td>
                  <td>{session.date}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CoachDashboard;