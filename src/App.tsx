import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AthleteLogin from './components/AthleteLogin';
import CoachLogin from './components/CoachLogin';
import AthleteDashboard from './components/AthleteDashboard';
import CoachDashboard from './components/CoachDashboard';
import SessionView from './components/SessionView';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/athlete/login" element={<AthleteLogin />} />
          <Route path="/coach/login" element={<CoachLogin />} />
          <Route path="/athlete/dashboard" element={<AthleteDashboard />} />
          <Route path="/coach/dashboard" element={<CoachDashboard />} />
          <Route path="/session/:sessionId" element={<SessionView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;