import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Tag } from 'lucide-react';
import { getAthleteMessages, markMessageAsRead, getSessions, CoachMessage } from '../api/apiClient';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  isCoach?: boolean;
  coachId?: string;
  athleteName?: string;
  taggedSessionId?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  isOpen, 
  onClose, 
  athleteId, 
  isCoach = false,
  coachId,
  athleteName = 'Athlete',
  taggedSessionId = ''
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && athleteId) {
      loadMessages();
      loadSessions();
      // Refresh messages every 10 seconds when chat is open
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, athleteId]);

  // Auto-select tagged session when provided
  useEffect(() => {
    if (taggedSessionId && sessions.length > 0) {
      setSelectedSessionId(taggedSessionId);
    }
  }, [taggedSessionId, sessions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const athleteMessages = await getAthleteMessages(athleteId);
      // Sort messages by timestamp (oldest first)
      const sortedMessages = athleteMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const athleteSessions = await getSessions(athleteId);
      // Sort sessions by timestamp (newest first)
      const sortedSessions = athleteSessions.sort((a, b) => {
        const timestampA = new Date(a.timestamp || a.date || 0).getTime();
        const timestampB = new Date(b.timestamp || b.date || 0).getTime();
        return timestampB - timestampA; // Descending order (newest first)
      });
      setSessions(sortedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: CoachMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      coachId: isCoach ? (coachId ?? '') : 'athlete', // Ensure coachId is a string
      coachName: isCoach ? 'You' : athleteName,
      athleteId: athleteId,
      athleteName: athleteName,
      sessionId: selectedSessionId, // Include selected session if any
      type: 'feedback',
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    try {
      const response = await fetch('/api/coach-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        setMessages(prev => {
          const updatedMessages = [...prev, message];
          // Sort messages by timestamp (oldest first)
          return updatedMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
        setNewMessage('');
        setTimeout(scrollToBottom, 100);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'retest':
        return '🔄';
      case 'feedback':
        return '💬';
      case 'note':
        return '📝';
      default:
        return '💬';
    }
  };

  const getSessionDetails = (sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return null;
    
    const exercise = session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise';
    const date = new Date(session.timestamp || session.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return {
      exercise,
      date: dateStr,
      time: timeStr,
      reps: session.reps || 0,
      formScore: session.formScore || 0
    };
  };

  return (
    <div className={`chat-sidebar-overlay ${isOpen ? 'open' : ''}`}>
      <div className="chat-sidebar">
        <div className="chat-header">
          <div className="chat-title">
            <MessageCircle className="chat-icon" />
            <div className="chat-info">
              <h3>Chat with {athleteName}</h3>
              <p className="chat-status">Online</p>
            </div>
          </div>
          <button onClick={onClose} className="chat-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="no-messages">
              <MessageCircle size={48} className="no-messages-icon" />
              <p>No messages yet</p>
              <p className="no-messages-sub">Start a conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.coachId === (isCoach ? coachId : 'athlete') ? 'sent' : 'received'} ${!message.read && message.coachId !== (isCoach ? coachId : 'athlete') ? 'unread' : ''}`}
                onClick={() => !message.read && message.coachId !== (isCoach ? coachId : 'athlete') && handleMarkAsRead(message.id)}
              >
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-type">
                      {getMessageTypeIcon(message.type)}
                    </span>
                    <span className="message-sender">
                      {message.coachId === (isCoach ? coachId : 'athlete') ? 'You' : message.coachName}
                    </span>
                    <span className="message-time">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">
                    {message.message}
                    {message.sessionId && (() => {
                      const sessionDetails = getSessionDetails(message.sessionId);
                      return sessionDetails ? (
                        <div className="message-session-info">
                          📋 Tagged to: {sessionDetails.exercise} on {sessionDetails.date} at {sessionDetails.time}
                          <div className="session-metrics-small">
                            {sessionDetails.reps} reps • {sessionDetails.formScore}% form
                          </div>
                        </div>
                      ) : (
                        <div className="message-session-info">
                          📋 Tagged to session: {message.sessionId}
                        </div>
                      );
                    })()}
                  </div>
                  {message.type !== 'feedback' && (
                    <div className="message-type-label">
                      {message.type === 'retest' ? 'Retest Request' : 'Note'}
                    </div>
                  )}
                </div>
                {!message.read && message.coachId !== (isCoach ? coachId : 'athlete') && (
                  <div className="unread-indicator"></div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          {/* Session Tagging */}
          <div className="session-tagging">
            <button
              className={`session-tag-btn ${selectedSessionId ? 'tagged' : ''}`}
              onClick={() => setShowSessionSelector(!showSessionSelector)}
            >
              <Tag size={16} />
              {selectedSessionId ? 'Tagged to Session' : 'Tag to Session'}
            </button>
            
            {showSessionSelector && (
              <div className="session-selector">
                <div className="session-selector-header">
                  <h4>Select a session to tag</h4>
                  <button 
                    className="clear-session-btn"
                    onClick={() => setSelectedSessionId('')}
                  >
                    Clear
                  </button>
                </div>
                <div className="session-list">
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`session-item ${selectedSessionId === session.sessionId ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSessionId(session.sessionId);
                        setShowSessionSelector(false);
                      }}
                    >
                      <div className="session-info">
                        <span className="session-exercise">
                          {session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}
                        </span>
                        <span className="session-date">
                          {new Date(session.timestamp || session.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="session-metrics">
                        <span className="session-reps">{session.reps || 0} reps</span>
                        <span className="session-score">{session.formScore || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="input-container">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              rows={2}
              disabled={false}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="send-btn"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
