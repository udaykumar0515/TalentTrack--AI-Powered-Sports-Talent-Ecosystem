import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';


interface UserRegistrationProps {
  role: 'athlete' | 'coach';
  onBack: () => void;
  onSuccess: () => void;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ role, onBack, onSuccess }) => {
  const { addCoach } = useCoaches();
  const { register, error, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await register(formData.email, formData.password, formData.username, role);
    if (success) {
      // If registering as a coach, add to CoachContext
      if (role === 'coach') {
        const coach = {
          id: generateId(), // You'll need to implement this or get from auth context
          email: formData.email,
          username: formData.username,
          createdAt: new Date().toISOString()
        };
        addCoach(coach);
      }
      onSuccess();
    }
  };

  return (
    <div className="login-container">
      <h2>Create {role === 'athlete' ? 'Athlete' : 'Coach'} Account</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            className={validationErrors.email ? 'error' : ''}
          />
          {validationErrors.email && (
            <span className="field-error">{validationErrors.email}</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleInputChange}
            className={validationErrors.username ? 'error' : ''}
          />
          {validationErrors.username && (
            <span className="field-error">{validationErrors.username}</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className={validationErrors.password ? 'error' : ''}
          />
          {validationErrors.password && (
            <span className="field-error">{validationErrors.password}</span>
          )}
        </div>

        <div className="form-group">
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={validationErrors.confirmPassword ? 'error' : ''}
          />
          {validationErrors.confirmPassword && (
            <span className="field-error">{validationErrors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        <p>Already have an account?</p>
        <button type="button" onClick={onBack} className="link-button">
          Sign In
        </button>
      </div>
    </div>
  );
};

function generateId() {
  // Simple unique ID generator (not for production use)
  return 'coach_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

export default UserRegistration;
