import React, { useState, useRef } from 'react';
import VideoRecorder from './VideoRecorder';
import VideoUploader from './VideoUploader';
import SessionView from './SessionView';

const AthleteDashboard: React.FC = () => {
  const [selectedCoach, setSelectedCoach] = useState('none');
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const exercises = [
    { value: 'squat', label: 'Squat' },
    { value: 'jumping_jack', label: 'Jumping Jack' },
    { value: 'pushup', label: 'Push-up' }
  ];

  const coaches = [
    { value: 'none', label: 'None' },
    { value: 'coach1', label: 'Coach A' },
    { value: 'coach2', label: 'Coach B' }
  ];

  const handleVideoAnalyzed = (session: any) => {
    setCurrentSession(session);
    setIsAnalyzing(false);
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
  };

  if (currentSession) {
    return (
      <SessionView 
        session={currentSession} 
        onBack={() => setCurrentSession(null)}
        isAthlete={true}
      />
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Athlete Dashboard</h1>
        <div className="coach-select">
          <label htmlFor="coach-dropdown">Select a Coach:</label>
          <select 
            id="coach-dropdown"
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
          >
            {coaches.map(coach => (
              <option key={coach.value} value={coach.value}>
                {coach.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="exercise-select">
        <label htmlFor="exercise-dropdown">Select Exercise:</label>
        <select 
          id="exercise-dropdown"
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
        >
          {exercises.map(exercise => (
            <option key={exercise.value} value={exercise.value}>
              {exercise.label}
            </option>
          ))}
        </select>
      </div>

      <section className="video-actions">
        <VideoRecorder 
          exercise={selectedExercise}
          onVideoAnalyzed={handleVideoAnalyzed}
          onStartAnalysis={handleStartAnalysis}
          isAnalyzing={isAnalyzing}
        />
        <VideoUploader 
          exercise={selectedExercise}
          
          onVideoAnalyzed={handleVideoAnalyzed}
          onStartAnalysis={handleStartAnalysis}
          isAnalyzing={isAnalyzing}
        />
      </section>

      {isAnalyzing && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing your video...</p>
        </div>
      )}

      <section className="activity-feed">
        <h2>Your Recent Activity</h2>
        <div id="metrics-container">
          {/* Sample metric cards will be populated here */}
          <div className="metric-card green">
            <h3>Last Workout</h3>
            <p><strong>Exercise:</strong> Squats</p>
            <p><strong>Reps:</strong> 15</p>
            <p><strong>Form Score:</strong> 92</p>
            <p><strong>Status:</strong> <span className="risk-level low">Excellent</span></p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AthleteDashboard;