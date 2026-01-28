import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle2, Trophy, Sparkles, Eye, EyeOff } from 'lucide-react';
import UserRegistration from './UserRegistration';

const UnifiedLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, googleLogin, error, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'athlete' as 'athlete' | 'coach'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await login(formData.email, formData.password, formData.role);
    if (success) {
      navigate(`/${formData.role}/dashboard`);
    }
  };

  const handleRegistrationSuccess = () => {
    navigate(`/${formData.role}/dashboard`);
  };

  const handleGoogleLogin = async () => {
    try {
      // For demo purposes, we'll use a mock Google user
      // In production, you would integrate with Google OAuth API
      const mockGoogleUser = {
        email: 'demo@gmail.com',
        name: 'Demo User'
      };
      
      const success = await googleLogin(mockGoogleUser.email, mockGoogleUser.name, formData.role);
      if (success) {
        navigate(`/${formData.role}/dashboard`);
      }
      
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  if (showRegistration) {
    return (
      <UserRegistration
        role={formData.role}
        onBack={() => setShowRegistration(false)}
        onSuccess={handleRegistrationSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute animate-pulse top-20 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute animate-pulse delay-100 top-40 right-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute animate-pulse delay-200 bottom-20 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
      </div>
      
      <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-6 w-full max-w-md relative transform hover:scale-105 transition-transform duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🏃‍♂️ TalentTrack
            </h1>
            <p className="text-sm text-gray-600">
              AI-Powered Sports Talent Ecosystem
            </p>
          </div>
          <div className="relative">
            {formData.role === 'athlete' ? (
              <Trophy className="w-16 h-16 text-blue-600 mb-3 animate-bounce" />
            ) : (
              <UserCircle2 className="w-16 h-16 text-green-600 mb-3 animate-bounce" />
            )}
            <Sparkles className="absolute -right-1 -top-1 w-5 h-5 text-yellow-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome {formData.role === 'athlete' ? 'Athlete' : 'Coach'}!
          </h2>
          <p className="text-gray-600 text-sm text-center flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {formData.role === 'athlete' 
              ? 'Track your performance and improve your form' 
              : 'Guide athletes and track their progress'
            }
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'athlete' }))}
              className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                formData.role === 'athlete'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              <Trophy className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs font-medium">Athlete</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'coach' }))}
              className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                formData.role === 'coach'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
              }`}
            >
              <UserCircle2 className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs font-medium">Coach</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="transform transition-all duration-200 hover:scale-105">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50 p-2.5 transition-colors duration-200 hover:bg-gray-50 ${
                validationErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="your.email@example.com"
              required
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div className="transform transition-all duration-200 hover:scale-105">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50 p-2.5 pr-10 transition-colors duration-200 hover:bg-gray-50 ${
                  validationErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center py-2.5 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Signing In...' : 'Login'}
            </button>
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex justify-center items-center py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Don't have an account?
          </p>
          <button 
            type="button" 
            onClick={() => setShowRegistration(true)} 
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors duration-200"
          >
            Create Account as {formData.role === 'athlete' ? 'Athlete' : 'Coach'}
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Ready to {formData.role === 'athlete' ? 'achieve your goals' : 'guide athletes to success'}? Let's get started! 🚀
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
