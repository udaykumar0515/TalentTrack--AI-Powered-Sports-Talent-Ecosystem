import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSessions, createCoachTrainingPlan } from '../api/apiClient';
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
  const [showCoachPlanModal, setShowCoachPlanModal] = useState(false);
  const [coachPlanData, setCoachPlanData] = useState({
    title: '',
    description: '',
    exercises: [{ exercise: '', reps: '', duration: '' }],
    duration: '',
    frequency: '',
    goals: ''
  });
  const [creatingPlan, setCreatingPlan] = useState(false);

  const availableExercises = [
    'Squat', 'Deadlift', 'Bench Press', 'Overhead Press', 'Pull-ups', 'Push-ups',
    'Lunges', 'Plank', 'Burpees', 'Mountain Climbers', 'Jumping Jacks', 'Crunches',
    'Leg Press', 'Chest Fly', 'Lat Pulldown', 'Shoulder Press', 'Bicep Curls', 'Tricep Dips'
  ];

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

  const handleSendFeedback = async () => {
    // Open chat with pre-filled message
    onMessageAthlete();
  };

  const handleCreateCoachPlan = () => {
    setShowCoachPlanModal(true);
  };

  const handleCoachPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setCreatingPlan(true);
    try {
      const planData = {
        ...coachPlanData,
        coachId: user.id,
        coachName: user.username || 'Coach',
        athleteId: selectedAthlete.id,
        athleteName: selectedAthlete.name,
        createdBy: 'coach',
        status: 'active'
      };

      await createCoachTrainingPlan(selectedAthlete.id, planData);
      
      // Reset form
      setCoachPlanData({
        title: '',
        description: '',
        exercises: [{ exercise: '', reps: '', duration: '' }],
        duration: '',
        frequency: '',
        goals: ''
      });
      setShowCoachPlanModal(false);
      
      alert('Training plan created and sent to athlete successfully!');
    } catch (error) {
      console.error('Failed to create coach training plan:', error);
      alert('Failed to create training plan. Please try again.');
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleCoachPlanInputChange = (field: string, value: string) => {
    setCoachPlanData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExerciseChange = (index: number, field: string, value: string) => {
    setCoachPlanData(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) => 
        i === index ? { ...exercise, [field]: value } : exercise
      )
    }));
  };

  const addExercise = () => {
    setCoachPlanData(prev => ({
      ...prev,
      exercises: [...prev.exercises, { exercise: '', reps: '', duration: '' }]
    }));
  };

  const removeExercise = (index: number) => {
    if (coachPlanData.exercises.length > 1) {
      setCoachPlanData(prev => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index)
      }));
    }
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
        <div className="athlete-header-actions">
          <button 
            className="coach-plan-btn"
            onClick={handleCreateCoachPlan}
          >
            📋 Plan by Coach
          </button>
          <button 
            className="message-athlete-btn"
            onClick={onMessageAthlete}
          >
            💬 Message {selectedAthlete.name}
          </button>
        </div>
      </div>
      
      <div className="sessions-board-content">
        {/* Athlete Performance Overview */}
        <div className="athlete-performance-overview">
          <h3>📊 Performance Overview</h3>
          
          {/* Performance Overview Layout */}
          <div className="performance-overview-layout">
            {/* Left Side - Empty for now */}
            <div className="performance-left">
              {/* Space for future content */}
            </div>

            {/* Right Side - Performance Grid */}
            <div className="performance-right">
              {/* Top Row - 2 Circles */}
              <div className="performance-circles-row">
                <div className="progress-circle medium">
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
                        className={`progress-ring-circle ${getRiskClass(athleteStats.avgFormScore >= 85 ? 'Low' : athleteStats.avgFormScore >= 70 ? 'Medium' : 'High')}`}
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        r="34"
                        cx="40"
                        cy="40"
                        style={{
                          strokeDasharray: `${2 * Math.PI * 34}`,
                          strokeDashoffset: `${2 * Math.PI * 34 * (1 - athleteStats.avgFormScore / 100)}`
                        }}
                      />
                    </svg>
                    <div className="circle-content">
                      <span className="circle-value">{athleteStats.avgFormScore}%</span>
                    </div>
                  </div>
                  <div className="circle-text-right">
                    <div className="circle-label">Avg Form Score</div>
                  </div>
                </div>
                
                <div className="progress-circle medium">
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
                        className="progress-ring-circle best-score"
                        stroke="#f59e0b"
                        strokeWidth="6"
                        fill="transparent"
                        r="34"
                        cx="40"
                        cy="40"
                        style={{
                          strokeDasharray: `${2 * Math.PI * 34}`,
                          strokeDashoffset: `${2 * Math.PI * 34 * (1 - (sessions.length > 0 ? Math.max(...sessions.map(s => s.formScore || 0)) : 0) / 100)}`
                        }}
                      />
                    </svg>
                    <div className="circle-content">
                      <span className="circle-value">
                        {sessions.length > 0 
                          ? Math.max(...sessions.map(s => s.formScore || 0)) + '%'
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="circle-text-right">
                    <div className="circle-label">Best Form Score</div>
                  </div>
                </div>
              </div>

              {/* Bottom Row - 3 Performance Boxes */}
              <div className="performance-boxes-row">
                <div className="performance-box duration-box">
                  <div className="box-icon">⏱️</div>
                  <div className="box-content">
                    <div className="box-value">{athleteStats.avgDuration}s</div>
                    <div className="box-label">Avg Duration</div>
                  </div>
                </div>
                
                <div className="performance-box longest-session-box">
                  <div className="box-icon">⏱️</div>
                  <div className="box-content">
                    <div className="box-value">
                      {sessions.length > 0 
                        ? Math.max(...sessions.map(s => s.durationSec || 0)) + 's'
                        : 'N/A'
                      }
                    </div>
                    <div className="box-label">Longest Session</div>
                  </div>
                </div>
                
                <div className="performance-box last-session-box">
                  <div className="box-icon">📅</div>
                  <div className="box-content">
                    <div className="box-value">
                      {athleteStats.lastSession 
                        ? new Date(athleteStats.lastSession.timestamp).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                    <div className="box-label">Last Session</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="sessions-table-section">
          <div className="sessions-table-header">
            <h3>📊 Training Sessions</h3>
            <div className="total-sessions-badge">
              <span className="total-sessions-label">Total Sessions:</span>
              <span className="total-sessions-value">{athleteStats.totalSessions}</span>
            </div>
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
                              onClick={() => {
                                // Handle video viewing
                                console.log('View video for session:', session.sessionId);
                              }}
                            >
                              Video
                            </button>
                            <button
                              className="btn-feedback btn-sm"
                              onClick={handleSendFeedback}
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

      {/* Coach Plan Modal */}
      {showCoachPlanModal && (
        <div className="modal-overlay">
          <div className="modal-content coach-plan-modal">
            <div className="modal-header">
              <h2>Create Training Plan for {selectedAthlete.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCoachPlanModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCoachPlanSubmit} className="coach-plan-form">
              <div className="form-group">
                <label htmlFor="title">Plan Title</label>
                <input
                  type="text"
                  id="title"
                  value={coachPlanData.title}
                  onChange={(e) => handleCoachPlanInputChange('title', e.target.value)}
                  placeholder="e.g., Strength Building Program"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={coachPlanData.description}
                  onChange={(e) => handleCoachPlanInputChange('description', e.target.value)}
                  placeholder="Describe the training plan objectives and approach..."
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Exercises</label>
                <div className="exercises-container">
                  {coachPlanData.exercises.map((exercise, index) => (
                    <div key={index} className="exercise-item">
                      <div className="exercise-row">
                        <div className="form-group exercise-select">
                          <select
                            value={exercise.exercise}
                            onChange={(e) => handleExerciseChange(index, 'exercise', e.target.value)}
                            required
                          >
                            <option value="">Select Exercise</option>
                            {availableExercises.map(ex => (
                              <option key={ex} value={ex}>{ex}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="form-group exercise-reps">
                          <input
                            type="number"
                            placeholder="Reps"
                            value={exercise.reps}
                            onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                            min="1"
                          />
                        </div>
                        
                        <div className="form-group exercise-duration">
                          <input
                            type="number"
                            placeholder="Duration (sec)"
                            value={exercise.duration}
                            onChange={(e) => handleExerciseChange(index, 'duration', e.target.value)}
                            min="1"
                          />
                        </div>
                        
                        <button
                          type="button"
                          className="remove-exercise-btn"
                          onClick={() => removeExercise(index)}
                          disabled={coachPlanData.exercises.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    className="add-exercise-btn"
                    onClick={addExercise}
                  >
                    + Add Exercise
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="duration">Duration (weeks)</label>
                  <input
                    type="number"
                    id="duration"
                    value={coachPlanData.duration}
                    onChange={(e) => handleCoachPlanInputChange('duration', e.target.value)}
                    placeholder="8"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="frequency">Frequency (per week)</label>
                  <input
                    type="number"
                    id="frequency"
                    value={coachPlanData.frequency}
                    onChange={(e) => handleCoachPlanInputChange('frequency', e.target.value)}
                    placeholder="3"
                    min="1"
                    max="7"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="goals">Goals & Targets</label>
                <textarea
                  id="goals"
                  value={coachPlanData.goals}
                  onChange={(e) => handleCoachPlanInputChange('goals', e.target.value)}
                  placeholder="Specific goals and targets for this plan..."
                  rows={3}
                  required
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowCoachPlanModal(false)}
                  disabled={creatingPlan}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={creatingPlan}
                >
                  {creatingPlan ? 'Creating...' : 'Create & Send Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteDetailDashboard;
