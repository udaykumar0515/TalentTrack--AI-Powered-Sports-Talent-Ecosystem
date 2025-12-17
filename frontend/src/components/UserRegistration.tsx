import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';
import { UserCircle2, Trophy, Sparkles, Eye, EyeOff, ArrowLeft } from 'lucide-react';

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
    username: '',
    age: '',
    gender: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    // Age validation
    if (formData.age && (isNaN(Number(formData.age)) || Number(formData.age) < 0 || Number(formData.age) > 120)) {
       errors.age = 'Please enter a valid age';
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

    const ageNumber = formData.age ? parseInt(formData.age) : undefined;

    const success = await register(
      formData.email, 
      formData.password, 
      formData.username, 
      role,
      ageNumber,
      formData.gender
    );

    if (success) {
      // If registering as a coach, add to CoachContext
      if (role === 'coach') {
        const coach = {
          id: generateId(),
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute animate-pulse top-20 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute animate-pulse delay-100 top-40 right-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute animate-pulse delay-200 bottom-20 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
      </div>
      
      <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-6 w-full max-w-sm relative transform hover:scale-105 transition-transform duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {role === 'athlete' ? (
              <Trophy className="w-16 h-16 text-blue-600 mb-3 animate-bounce" />
            ) : (
              <UserCircle2 className="w-16 h-16 text-green-600 mb-3 animate-bounce" />
            )}
            <Sparkles className="absolute -right-1 -top-1 w-5 h-5 text-yellow-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create {role === 'athlete' ? 'Athlete' : 'Coach'} Account
          </h1>
          <p className="text-gray-600 text-sm text-center flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {role === 'athlete' 
              ? 'Join the platform and start tracking your performance' 
              : 'Guide athletes and help them reach their potential'
            }
          </p>
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
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50 p-2.5 transition-colors duration-200 hover:bg-gray-50 ${
                validationErrors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="Choose a username"
              required
            />
            {validationErrors.username && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="transform transition-all duration-200 hover:scale-105">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age (Optional)</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50 p-2.5 transition-colors duration-200 hover:bg-gray-50 ${
                  validationErrors.age ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="25"
                min="0"
                max="120"
              />
              {validationErrors.age && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.age}</p>
              )}
            </div>
            
            <div className="transform transition-all duration-200 hover:scale-105">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender (Optional)</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50 p-2.5 transition-colors duration-200 hover:bg-gray-50"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
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
                placeholder="Create a password"
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

          <div className="transform transition-all duration-200 hover:scale-105">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50 p-2.5 pr-10 transition-colors duration-200 hover:bg-gray-50 ${
                  validationErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex justify-center items-center py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center py-2.5 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Creating...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Already have an account?
          </p>
          <button 
            type="button" 
            onClick={onBack} 
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors duration-200"
          >
            Sign In Instead
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Ready to {role === 'athlete' ? 'start your journey' : 'begin coaching'}? Let's get started! 🚀
        </div>
      </div>
    </div>
  );
};

function generateId() {
  // Simple unique ID generator (not for production use)
  return 'coach_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

export default UserRegistration;