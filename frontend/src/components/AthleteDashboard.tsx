import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';
import VideoRecorder from './VideoRecorder';
import VideoUploader from './VideoUploader';
import SessionView from './SessionView';
import ChatSidebar from './ChatSidebar';
import DetailedAnalysisModal from './DetailedAnalysisModal';
import { saveSession, getAthleteMessages, getSessions, deleteSession } from '../api/apiClient';

const AthleteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { coaches } = useCoaches();
  const [selectedCoach, setSelectedCoach] = useState('udaykuamr'); // Default coach for testing
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [selectedSessionForAnalysis, setSelectedSessionForAnalysis] = useState<any>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedSessionMenu, setSelectedSessionMenu] = useState<string | null>(null);

  const exercises = [
    { value: 'squat', label: 'Squat' },
    { value: 'jumping_jack', label: 'Jumping Jack' },
    { value: 'pushup', label: 'Push-up' }
  ];

  // Load sessions and messages on component mount
  useEffect(() => {
    const loadData = async () => {
      await loadSessions();
      await loadMessages();
    loadSelectedCoach();
    };
    loadData();
  }, [user?.id]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Update video element when camera stream changes
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      console.log('Updating video element with camera stream');
      const video = videoRef.current;
      video.srcObject = cameraStream;
      
      // Ensure video plays
      video.load();
      video.play()
        .then(() => {
          console.log('Video started playing successfully');
        })
        .catch(e => {
          console.log('Video play error:', e);
          // Try again after a short delay
          setTimeout(() => {
            video.play().catch(console.log);
          }, 100);
        });
    }
  }, [cameraStream]);

  // Load selected coach from localStorage
  const loadSelectedCoach = () => {
    if (user?.id) {
      const storedCoach = localStorage.getItem(`selectedCoach_${user.id}`);
      if (storedCoach) {
        setSelectedCoach(storedCoach);
      }
    }
  };

  // Save selected coach to localStorage
  const handleCoachChange = (coachId: string) => {
    setSelectedCoach(coachId);
    if (user?.id) {
      localStorage.setItem(`selectedCoach_${user.id}`, coachId);
    }
  };

  // Load messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        loadMessages();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedSessionMenu && !(event.target as Element).closest('.session-menu')) {
        setSelectedSessionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedSessionMenu]);

  const loadSessions = async () => {
    try {
      if (!user?.id) return;
      
      // Load from backend first
      try {
        const backendSessions = await getSessions(user.id);
        console.log('Loaded sessions from backend:', backendSessions);
        
        // Clean up any test video URLs - treat them as no video
        const cleanedSessions = backendSessions.map((session: any) => ({
          ...session,
          videoUrl: session.videoUrl && !session.videoUrl.includes('test-video') ? session.videoUrl : null,
          thumbnailUrl: session.thumbnailUrl && !session.thumbnailUrl.includes('test-video') ? session.thumbnailUrl : null
        }));
        
        // Sort sessions by timestamp (latest first)
        const sortedSessions = cleanedSessions.sort((a: any, b: any) => {
          const timestampA = new Date(a.timestamp || a.date || 0).getTime();
          const timestampB = new Date(b.timestamp || b.date || 0).getTime();
          return timestampB - timestampA; // Descending order (newest first)
        });
        
        setSessions(sortedSessions);
        
        // Also update localStorage with backend data
        localStorage.setItem(`sessions_${user.id}`, JSON.stringify(sortedSessions));
        return;
      } catch (backendError) {
        console.warn('Failed to load sessions from backend, falling back to localStorage:', backendError);
      }
      
      // Fallback to localStorage if backend fails
      const storedSessions = localStorage.getItem(`sessions_${user.id}`) || '[]';
      const parsedSessions = JSON.parse(storedSessions);
      // Clean up any test video URLs - treat them as no video
      const cleanedSessions = parsedSessions.map((session: any) => ({
        ...session,
        videoUrl: session.videoUrl && !session.videoUrl.includes('test-video') ? session.videoUrl : null,
        thumbnailUrl: session.thumbnailUrl && !session.thumbnailUrl.includes('test-video') ? session.thumbnailUrl : null
      }));
      
      // Sort sessions by timestamp (latest first)
      const sortedSessions = cleanedSessions.sort((a: any, b: any) => {
        const timestampA = new Date(a.timestamp || a.date || 0).getTime();
        const timestampB = new Date(b.timestamp || b.date || 0).getTime();
        return timestampB - timestampA; // Descending order (newest first)
      });
      
      setSessions(sortedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadMessages = async () => {
    if (!user?.id) return;
    
    try {
      await getAthleteMessages(user.id);
      // Messages are handled by ChatSidebar component
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };



  const handleVideoAnalyzed = async (session: any) => {
    // existing logic: augment with athlete and coach
    const sessionWithCoach = {
      ...session,
      athleteId: user?.id,
      athleteName: user?.username,
      coachId: selectedCoach !== 'none' ? selectedCoach : null,
      coachName: selectedCoach !== 'none' ? coaches.find(c => c.id === selectedCoach)?.username : null,
      // ensure sessionId exists
      sessionId: session.sessionId || `sess_${Math.random().toString(36).slice(2,10)}`
    };
  
    // Set current session for UI
    setCurrentSession(sessionWithCoach);
  
    // Save to backend first
    try {
      await saveSession(sessionWithCoach);
      console.info('Session saved to backend with coach:', sessionWithCoach.coachName || 'No coach selected');
      
      // Reload sessions from backend to get complete, up-to-date list
      await loadSessions();
    } catch (err) {
      console.error('Failed to save session to backend:', err);
      
      // Fallback: add to local state if backend save fails
      const newSessions = [sessionWithCoach, ...sessions];
      setSessions(newSessions);
      try {
        localStorage.setItem(`sessions_${user?.id}`, JSON.stringify(newSessions));
      } catch (e) {
        console.error('Could not persist to localStorage', e);
      }
    }
    
    // Reset analysis state and clear video preview
    setIsAnalyzing(false);
    setCurrentVideoUrl(null);
  };

  const handleDetailedAnalysis = (session: any) => {
    setSelectedSessionForAnalysis(session);
    setShowDetailedAnalysis(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      // Call backend API to delete session
      await deleteSession(sessionId);

      // Remove session from local state
      const newSessions = sessions.filter(session => session.sessionId !== sessionId);
      setSessions(newSessions);

      // Update localStorage
      try {
        localStorage.setItem(`sessions_${user?.id}`, JSON.stringify(newSessions));
      } catch (e) {
        console.error('Could not update localStorage', e);
      }

      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
  };

  const handleOpenCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Camera access granted, setting up stream...');
      setCameraStream(stream);
      setCameraActive(true);
      setCurrentVideoUrl(null);
      
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Could not access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += 'Please check your camera settings and try again.';
      }
      
      alert(errorMessage);
    }
  };

  const handleStartRecording = () => {
    // This will be handled by VideoRecorder component
    console.log('Starting actual recording...');
    setCurrentVideoUrl(null); // Clear any existing video preview
  };

  const handleStopRecording = () => {
    setCameraActive(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleStartUploading = () => {
    setCurrentVideoUrl(null); // Clear any existing video preview
  };

  const handleVideoReady = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
  };


  // Helper functions for formatting and status
  const getStatusClass = (formScore: number) => {
    if (formScore >= 85) return 'green';
    if (formScore >= 70) return 'yellow';
    return 'red';
  };

  const getStatusText = (formScore: number) => {
    if (formScore >= 85) return 'Excellent';
    if (formScore >= 70) return 'Good';
    if (formScore >= 50) return 'Fair';
    return 'Poor';
  };

  const getRiskClass = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'low';
      case 'medium': return 'medium';
      case 'high': return 'high';
      default: return 'low';
    }
  };

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (durationSec: number) => {
    if (!durationSec) return '0s';
    const minutes = Math.floor(durationSec / 60);
    const seconds = Math.floor(durationSec % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (currentSession) {
    return (
      <SessionView 
        session={currentSession} 
        onBack={() => setCurrentSession(null)}
        isAthlete={true}
      />
    );
  }

  return (
    <div className={`dashboard-container ${showChat ? 'chat-open' : ''}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <img src="/logo.png" alt="AI Sports Platform" className="logo" />
            <div className="welcome-text">
              <h1>Welcome back, {user?.username}!</h1>
              <p>Track your performance and improve your form</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="coach-select">
            <select 
              id="coach-dropdown"
              value={selectedCoach}
              onChange={(e) => handleCoachChange(e.target.value)}
              className="coach-dropdown"
            >
              <option value="none">Select Coach</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>
                  {coach.username}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setShowChat(!showChat)} 
            className="messages-btn"
          >
            <span className="message-icon">💬</span>
            Chat
          </button>
          <button onClick={logout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </header>

      <div className="exercise-controls">
        <div className="exercise-select">
          <label htmlFor="exercise-dropdown">Select Exercise:</label>
          <select 
            id="exercise-dropdown"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
          >
            {exercises.map(exercise => (
              <option key={exercise.value} value={exercise.value}>
                {exercise.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="video-buttons">
          <VideoRecorder 
            exercise={selectedExercise}
            onVideoAnalyzed={handleVideoAnalyzed}
            onStartAnalysis={handleStartAnalysis}
            isAnalyzing={isAnalyzing}
            onStartRecording={cameraActive ? handleStartRecording : handleOpenCamera}
            onStopRecording={handleStopRecording}
            onVideoReady={handleVideoReady}
            cameraStream={cameraStream}
          />
          <VideoUploader 
            exercise={selectedExercise}
            onVideoAnalyzed={handleVideoAnalyzed}
            onStartAnalysis={handleStartAnalysis}
            isAnalyzing={isAnalyzing}
            onStartUploading={handleStartUploading}
            onVideoReady={handleVideoReady}
          />
        </div>
      </div>


      {/* Camera Preview Column */}
      {cameraActive && (
        <div className="camera-preview-section">
          <h3>📹 Live Camera Preview - Ready to Record!</h3>
          <div className="camera-preview-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="camera-preview-video"
            />
            <div className="camera-status">
              <span className="status-indicator">●</span>
              <span>Camera Active - Click "Start Recording" to begin</span>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Video Preview */}
      {currentVideoUrl && (
        <div className="video-preview-section">
          <h3>Video Preview</h3>
          <div className="video-preview-container">
            <video
              src={currentVideoUrl}
              controls
              className="video-preview-video"
              autoPlay
            />
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing your video...</p>
        </div>
      )}


      <ChatSidebar
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        athleteId={user?.id || ''}
        isCoach={false}
        athleteName={user?.username || 'Athlete'}
      />

      {selectedSession && (
        <div className="video-modal">
          <div className="video-modal-content">
            <div className="video-header">
              <div className="video-title">
                <h3>
                  {selectedSession.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'} - {user?.username}
                </h3>
                <p className="video-subtitle">
                  {formatDateTime(selectedSession.timestamp)}
                </p>
              </div>
              <button onClick={() => setSelectedSession(null)} className="close-btn">
                <span>✕</span>
              </button>
            </div>
            
            <div className="video-container">
              {selectedSession.videoUrl ? (
                <video
                  src={selectedSession.videoUrl}
                  controls
                  className="session-video"
                  poster={selectedSession.thumbnailUrl}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="no-video">
                  <div className="exercise-text-display">
                    <h2>{selectedSession.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}</h2>
                    <p>No video recording available for this session</p>
                  </div>
                </div>
              )}
            </div>

            <div className="session-details">
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Athlete:</strong> {user?.username}
                </div>
                {selectedSession.coachName && (
                  <div className="detail-item">
                    <strong>Coach:</strong> {selectedSession.coachName}
                  </div>
                )}
                <div className="detail-item">
                  <strong>Exercise:</strong> {selectedSession.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {formatDuration(selectedSession.durationSec)}
                </div>
                <div className="detail-item">
                  <strong>Repetitions:</strong> {selectedSession.reps || 0}
                </div>
                <div className="detail-item">
                  <strong>Form Score:</strong> 
                  <span className={`ml-2 ${getStatusClass(selectedSession.formScore)}`}>
                    {selectedSession.formScore || 0}% 
                    ({getStatusText(selectedSession.formScore)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="activity-feed">
        <h2>Your Recent Activity</h2>
        <div id="metrics-container">
          {sessions.length === 0 ? (
            <div className="no-activity">
              <p>No sessions recorded yet. Start your first workout!</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div key={index} className={`metric-card ${getStatusClass(session.formScore)}`}>
                <div className="session-card-header">
                  <div className="session-title-row">
                    <h3>{session.exercise?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Exercise'}</h3>
                    <div className="session-menu">
                      <button 
                        className="btn-menu"
                        onClick={() => setSelectedSessionMenu(session.sessionId)}
                        title="More options"
                      >
                        <span className="three-dots">⋯</span>
                      </button>
                      {selectedSessionMenu === session.sessionId && (
                        <div className="menu-dropdown">
                          <button 
                            className="menu-item delete"
                            onClick={() => {
                              setSelectedSessionMenu(null);
                              handleDeleteSession(session.sessionId);
                            }}
                          >
                            🗑️ Delete Session
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="session-date">{formatDateTime(session.timestamp)}</span>
                </div>
                
                <div className="session-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Reps</span>
                    <span className="metric-value">{session.reps || 0}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Form Score</span>
                    <span className={`metric-value ${getStatusClass(session.formScore)}`}>
                      {session.formScore || 0}%
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Duration</span>
                    <span className="metric-value">{formatDuration(session.durationSec)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Risk Level</span>
                    <span className={`metric-value ${getRiskClass(session.risk)}`}>
                      {session.risk || 'Low'}
                    </span>
                  </div>
                </div>

                <div className="session-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => handleDetailedAnalysis(session)}
                  >
                    View Analysis
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => setSelectedSession(session)}
                  >
                    View Video
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <DetailedAnalysisModal
        isOpen={showDetailedAnalysis}
        onClose={() => setShowDetailedAnalysis(false)}
        session={selectedSessionForAnalysis}
      />
    </div>
  );
};

export default AthleteDashboard;