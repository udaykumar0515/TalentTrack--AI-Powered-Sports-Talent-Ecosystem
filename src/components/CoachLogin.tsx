import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CoachLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual authentication
    console.log('Coach login:', formData);
    navigate('/coach/dashboard');
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    console.log('Google login for coach');
    navigate('/coach/dashboard');
  };

  return (
    <div className="login-container">
      <h2>Coach Login</h2>
      
      <button onClick={handleGoogleLogin} className="google-signin-btn">
        Sign in with Google
      </button>
      
      <div className="or-divider"><span>OR</span></div>
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default CoachLogin;