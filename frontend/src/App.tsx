import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CoachProvider } from './contexts/CoachContext';
import LandingPage from './components/LandingPage';
import AthleteLogin from './components/AthleteLogin';
import CoachLogin from './components/CoachLogin';
import AthleteDashboard from './components/AthleteDashboard';
import CoachDashboard from './components/CoachDashboard';
import SessionView from './components/SessionView';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineIndicator from './components/OfflineIndicator';
import './styles/globals.css';

function App() {
  return (
    <AuthProvider>
      <CoachProvider>
        <Router>
          <div className="App">
            <OfflineIndicator />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/athlete/login" element={<AthleteLogin />} />
              <Route path="/coach/login" element={<CoachLogin />} />
              <Route 
                path="/athlete/dashboard" 
                element={
                  <ProtectedRoute requiredRole="athlete">
                    <AthleteDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/coach/dashboard" 
                element={
                  <ProtectedRoute requiredRole="coach">
                    <CoachDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/session/:sessionId" 
                element={
                  <ProtectedRoute>
                    <SessionView />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </CoachProvider>
    </AuthProvider>
  );
}

export default App;