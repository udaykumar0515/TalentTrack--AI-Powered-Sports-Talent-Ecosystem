import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

interface FeedbackWidgetProps {
  user: {
    id: string;
    email: string;
    username: string;
  } | null;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          username: user.username,
          feedback: feedback.trim(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFeedback('');
        setTimeout(() => {
          setIsSubmitted(false);
          setIsOpen(false);
        }, 2000);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFeedback('');
    setIsOpen(false);
    setIsSubmitted(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="feedback-button"
        title="Send Feedback"
      >
        <MessageSquare size={20} />
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="feedback-overlay">
          <div className="feedback-modal">
            <div className="feedback-header">
              <h3>Send Feedback</h3>
              <button
                onClick={handleCancel}
                className="feedback-close"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            {isSubmitted ? (
              <div className="feedback-success">
                <div className="success-icon">✓</div>
                <p>Thank you for your feedback!</p>
                <p>We'll review it and get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                <div className="feedback-field">
                  <label htmlFor="feedback">Your Feedback:</label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us about your experience, suggestions, or any issues you've encountered..."
                    rows={6}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="feedback-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-cancel"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={!feedback.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
