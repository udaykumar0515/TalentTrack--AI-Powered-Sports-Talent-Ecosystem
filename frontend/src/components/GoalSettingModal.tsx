import React, { useState } from 'react';
import { Target, Calendar, Trophy, X } from 'lucide-react';
import { createGoal } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface GoalSettingModalProps {
  onClose: () => void;
  onGoalCreated: (goal: any) => void;
}

const GoalSettingModal: React.FC<GoalSettingModalProps> = ({ onClose, onGoalCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_value: '',
    current_value: '0',
    target_date: '',
    category: 'performance',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const goalData = {
        ...formData,
        user_id: user.id,
        target_value: parseFloat(formData.target_value),
        current_value: parseFloat(formData.current_value),
        status: 'active'
      };

      const newGoal = await createGoal(goalData);
      onGoalCreated(newGoal);
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-brand-accent" />
        </div>
        <h3 className="text-heading-3 text-neutral-900 mb-2">Set Your Goal</h3>
        <p className="text-body text-neutral-600">Define what you want to achieve and track your progress</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Goal Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            placeholder="e.g., Improve squat form score to 90%"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            placeholder="Describe your goal in detail..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Target Value *
            </label>
            <input
              type="number"
              name="target_value"
              value={formData.target_value}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="90"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Current Value
            </label>
            <input
              type="number"
              name="current_value"
              value={formData.current_value}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Target Date *
          </label>
          <input
            type="date"
            name="target_date"
            value={formData.target_date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            >
              <option value="performance">Performance</option>
              <option value="strength">Strength</option>
              <option value="endurance">Endurance</option>
              <option value="technique">Technique</option>
              <option value="consistency">Consistency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoalSettingModal;
