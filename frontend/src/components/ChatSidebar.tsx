import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { getAthleteMessages, markMessageAsRead, CoachMessage } from '../api/apiClient';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  isCoach?: boolean;
  coachId?: string;
  athleteName?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  isOpen, 
  onClose, 
  athleteId, 
  isCoach = false,
  coachId,
  athleteName = 'Athlete'
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && athleteId) {
      loadMessages();
      // Refresh messages every 10 seconds when chat is open
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, athleteId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const athleteMessages = await getAthleteMessages(athleteId);
      setMessages(athleteMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
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
    if (!newMessage.trim() || !coachId) return;

    const message: CoachMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      coachId: coachId,
      coachName: 'You', // This would be the current user's name
      athleteId: athleteId,
      athleteName: athleteName,
      sessionId: '', // Optional for general messages
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
        setMessages(prev => [...prev, message]);
        setNewMessage('');
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
                className={`message ${message.coachId === coachId ? 'sent' : 'received'} ${!message.read && message.coachId !== coachId ? 'unread' : ''}`}
                onClick={() => !message.read && message.coachId !== coachId && handleMarkAsRead(message.id)}
              >
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-type">
                      {getMessageTypeIcon(message.type)}
                    </span>
                    <span className="message-sender">
                      {message.coachId === coachId ? 'You' : message.coachName}
                    </span>
                    <span className="message-time">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">
                    {message.message}
                  </div>
                  {message.type !== 'feedback' && (
                    <div className="message-type-label">
                      {message.type === 'retest' ? 'Retest Request' : 'Note'}
                    </div>
                  )}
                </div>
                {!message.read && message.coachId !== coachId && (
                  <div className="unread-indicator"></div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {isCoach && (
          <div className="chat-input">
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
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
