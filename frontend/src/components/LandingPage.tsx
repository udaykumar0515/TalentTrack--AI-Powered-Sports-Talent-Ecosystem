import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <h1>Welcome to the AI-Powered Sports Talent Platform</h1>
      <div className="role-selection">
        <div 
          className="card athlete-card" 
          onClick={() => navigate('/athlete/login')}
        >
          <h2>Athlete</h2>
          <p>Track your performance and get AI feedback.</p>
        </div>
        <div 
          className="card coach-card" 
          onClick={() => navigate('/coach/login')}
        >
          <h2>Coach</h2>
          <p>Monitor athletes and give insights.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;