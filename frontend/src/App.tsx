import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoachProvider } from './contexts/CoachContext';
import LandingPage from './components/LandingPage';
import AthleteDashboard from './components/AthleteDashboard';
import CoachDashboard from './components/CoachDashboard';
import SessionView from './components/SessionView';
import ProtectedRoute from './components/ProtectedRoute';
import FeedbackWidget from './components/FeedbackWidget';
import './styles/globals.css';

// Component to wrap routes with feedback widget
function AppContent() {
  const { user } = useAuth();
  
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
      <FeedbackWidget user={user} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CoachProvider>
        <Router>
          <AppContent />
        </Router>
      </CoachProvider>
    </AuthProvider>
  );
}

export default App;