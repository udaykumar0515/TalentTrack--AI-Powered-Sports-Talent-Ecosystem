import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCoaches } from '../contexts/CoachContext';
import VideoRecorder from './VideoRecorder';
import VideoUploader from './VideoUploader';
import SessionView from './SessionView';
import ChatSidebar from './ChatSidebar';
import DetailedAnalysisModal from './DetailedAnalysisModal';
import { saveSession, getAthleteMessages, getSessions, deleteSession, getAthleteTrainingPlan, generateAthleteTrainingPlan, getUserGamificationStats, getGamificationLeaderboard, createGoal, getUserGoals, updateGoal, deleteGoal, getGoalAnalytics, getGoalRecommendations, getAthlete, assignCoach, submitCoachChangeRequest } from '../api/apiClient';

const AthleteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { coaches } = useCoaches();
  const [selectedCoach, setSelectedCoach] = useState('none'); // Will be set from athlete data
  const [showCoachChangeModal, setShowCoachChangeModal] = useState(false);
  const [newCoachId, setNewCoachId] = useState('');
  const [changeReason, setChangeReason] = useState('');
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
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [loadingTrainingPlan, setLoadingTrainingPlan] = useState(false);
  const [gamificationStats, setGamificationStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingGamification, setLoadingGamification] = useState(false);

  // Goal Setting state
  const [goals, setGoals] = useState<any[]>([]);
  const [goalAnalytics, setGoalAnalytics] = useState<any>(null);
  const [goalRecommendations, setGoalRecommendations] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showRecommendedGoals, setShowRecommendedGoals] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    type: 'reps',
    target_value: 0,
    unit: '',
    priority: 'medium',
    target_date: '',
    motivation_notes: ''
  });

  // Offline functionality state
  // Collapsible sections state
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Session flow state
  const [showSessionOptions, setShowSessionOptions] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [videoQueue, setVideoQueue] = useState<any[]>([]);
  const [showVideoQueue, setShowVideoQueue] = useState(false);
  const [videoResetKey, setVideoResetKey] = useState(0);

  const exercises = [
    { value: 'squat', label: 'Squat' },
    { value: 'jumping_jack', label: 'Jumping Jack' },
    { value: 'pushup', label: 'Push-up' }
  ];

  // Helper function to toggle collapsible sections
  const toggleSection = (sectionName: string) => {
    setActiveSection(activeSection === sectionName ? null : sectionName);
  };

  // Session flow functions
  const handleStartSession = () => {
    setShowSessionOptions(true);
  };

  const handleCancelSession = () => {
    setShowSessionOptions(false);
    setIsOfflineMode(false);
    // Clear video preview and reset components
    setVideoResetKey(prev => prev + 1);
    setCurrentSession(null);
    setIsAnalyzing(false);
  };

  const handleOfflineToggle = () => {
    setIsOfflineMode(!isOfflineMode);
    // Clear any existing video preview when switching modes
    setVideoResetKey(prev => prev + 1);
  };

  const handleVideoQueued = async (videoData: any) => {
    try {
      if (!user?.id) return;

      // Convert video blob to base64 for storage
      let videoBlob = '';
      if (videoData.videoBlob) {
        videoBlob = await blobToBase64(videoData.videoBlob);
      } else if (videoData.videoFile) {
        videoBlob = await fileToBase64(videoData.videoFile);
      }

      const offlineVideoData = {
        user_id: user.id,
        video_blob: videoBlob,
        video_name: videoData.videoFile?.name || `offline_${videoData.exercise}_${Date.now()}.webm`,
        exercise_type: videoData.exercise,
        recorded_at: videoData.timestamp,
        file_size: videoData.videoFile?.size || videoData.videoBlob?.size || 0,
        duration: 0, // Will be calculated during analysis
        notes: `Offline ${videoData.type} session`,
        location: 'web_app',
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform
        }
      };

      // Store in backend
      const response = await fetch('/api/offline-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offlineVideoData)
      });

      if (response.ok) {
        const storedVideo = await response.json();
        // Reload the video queue from backend
        await loadVideoQueue();
        console.log('Video stored offline successfully:', storedVideo);
        
        // Reset video components after successful upload
        setVideoResetKey(prev => prev + 1);
        setShowSessionOptions(false);
        setIsOfflineMode(false);
      } else {
        console.error('Failed to store offline video');
      }
    } catch (error) {
      console.error('Error storing offline video:', error);
    }
  };

  // Helper functions to convert files to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadVideoQueue = async () => {
    try {
      if (!user?.id) return;
      
      const response = await fetch(`/api/offline-videos/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setVideoQueue(data.videos || []);
      }
    } catch (error) {
      console.error('Error loading video queue:', error);
    }
  };

  const handleAnalyzeQueuedVideo = async (queuedVideo: any) => {
    try {
      if (!user?.id) return;

      // For offline videos, we need to call the backend analysis API directly
      // since the video is now stored as a file, not a blob
      const response = await fetch(`/api/offline-videos/${user.id}/${queuedVideo.id}/analyze`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercise_type: queuedVideo.exercise_type,
          coach_id: selectedCoach !== 'none' ? selectedCoach : null
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Video analysis result:', result);
        
        // Reload video queue and sessions
        await loadVideoQueue();
        await loadSessions();
        console.log('Queued video analyzed and moved to sessions');
      } else {
        console.error('Failed to analyze video:', response.statusText);
      }
    } catch (error) {
      console.error('Error analyzing queued video:', error);
    }
  };

  // Load sessions and messages on component mount
  useEffect(() => {
    const loadData = async () => {
      console.log('User object in useEffect:', user);
      console.log('User ID:', user?.id);
      await loadSessions();
      await loadMessages();
      await loadTrainingPlan();
      await loadGamificationStats();
      await loadLeaderboard();
      await loadGoals();
      await loadGoalAnalytics();
      await loadGoalRecommendations();
      await loadVideoQueue();
      await loadSelectedCoach();
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
  const loadSelectedCoach = async () => {
    if (user?.id) {
      try {
        // First try to get the default coach from athlete data
        const athleteData = await getAthlete(user.id);
        if (athleteData.coachId) {
          setSelectedCoach(athleteData.coachId);
          return;
        }
        
        // Fallback to localStorage if no default coach
        const storedCoach = localStorage.getItem(`selectedCoach_${user.id}`);
        if (storedCoach) {
          setSelectedCoach(storedCoach);
        }
      } catch (error) {
        console.error('Error loading coach:', error);
        // Fallback to localStorage
        const storedCoach = localStorage.getItem(`selectedCoach_${user.id}`);
        if (storedCoach) {
          setSelectedCoach(storedCoach);
        }
      }
    }
  };

  // Handle coach change with request system
  const handleCoachChange = (coachId: string) => {
    if (coachId === 'none') {
      setSelectedCoach('none');
      if (user?.id) {
        localStorage.setItem(`selectedCoach_${user.id}`, 'none');
      }
      return;
    }

    // If no coach is currently selected, directly assign the coach
    if (selectedCoach === 'none' || !selectedCoach) {
      // Call backend to assign coach directly
      assignCoachDirectly(coachId);
      return;
    }

    // If changing to a different coach, show the change request modal
    if (coachId !== selectedCoach) {
      setNewCoachId(coachId);
      setShowCoachChangeModal(true);
    }
  };

  // Directly assign coach (for initial assignment)
  const assignCoachDirectly = async (coachId: string) => {
    try {
      const result = await assignCoach(user?.id || '', coachId);
      setSelectedCoach(coachId);
      if (user?.id) {
        localStorage.setItem(`selectedCoach_${user.id}`, coachId);
      }
      alert('Coach assigned successfully!');
    } catch (error) {
      console.error('Error assigning coach:', error);
      alert('Failed to assign coach. Please try again.');
    }
  };

  // Handle coach change request submission
  const handleCoachChangeRequest = async () => {
    if (!newCoachId || !changeReason.trim()) {
      alert('Please provide a reason for changing coaches.');
      return;
    }

    try {
      const result = await submitCoachChangeRequest({
        athleteId: user?.id || '',
        currentCoachId: selectedCoach,
        newCoachId: newCoachId,
        reason: changeReason
      });

      if (result.autoApproved) {
        alert('Coach assigned successfully!');
        setSelectedCoach(newCoachId);
        if (user?.id) {
          localStorage.setItem(`selectedCoach_${user.id}`, newCoachId);
        }
      } else {
        alert('Coach change request submitted successfully! The new coach will review your request.');
      }
      setShowCoachChangeModal(false);
      setChangeReason('');
      setNewCoachId('');
    } catch (error) {
      console.error('Error submitting coach change request:', error);
      alert('Failed to submit coach change request. Please try again.');
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
      if (showVideoQueue && !(event.target as Element).closest('.video-queue-dropdown') && !(event.target as Element).closest('.video-queue-btn')) {
        setShowVideoQueue(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedSessionMenu, showVideoQueue]);

  const loadSessions = async () => {
    try {
      if (!user?.id) return;
      
      // Load from backend first
      try {
        const backendSessions = await getSessions(user.id);
        console.log('Loaded sessions from backend:', backendSessions);
        console.log('First session predictive analytics:', backendSessions[0]?.predictiveAnalytics);
        
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

  const loadTrainingPlan = async () => {
    if (!user?.id) return;
    
    setLoadingTrainingPlan(true);
    try {
      console.log('Loading training plan for user:', user.id);
      const plan = await getAthleteTrainingPlan(user.id);
      console.log('Training plan loaded:', plan);
      setTrainingPlan(plan);
    } catch (error) {
      console.error('Error loading training plan:', error);
    } finally {
      setLoadingTrainingPlan(false);
    }
  };

  const generateNewTrainingPlan = async () => {
    if (!user?.id) return;
    
    setLoadingTrainingPlan(true);
    try {
      console.log('Generating new training plan for user:', user.id);
      const plan = await generateAthleteTrainingPlan(user.id);
      console.log('New training plan generated:', plan);
      setTrainingPlan(plan);
    } catch (error) {
      console.error('Error generating training plan:', error);
    } finally {
      setLoadingTrainingPlan(false);
    }
  };

  const loadGamificationStats = async () => {
    if (!user?.id) return;
    
    console.log('Loading gamification stats for user:', user.id);
    setLoadingGamification(true);
    try {
      const stats = await getUserGamificationStats(user.id);
      console.log('Gamification stats received:', stats);
      setGamificationStats(stats);
    } catch (error) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoadingGamification(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      console.log('Loading leaderboard...');
      const leaderboardData = await getGamificationLeaderboard('total_points', 10);
      console.log('Leaderboard data received:', leaderboardData);
      setLeaderboard(leaderboardData.leaderboard || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // Goal Setting functions
  const loadGoals = async () => {
    if (!user?.id) return;
    
    setLoadingGoals(true);
    try {
      const goalsData = await getUserGoals(user.id);
      setGoals(goalsData.goals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const loadGoalAnalytics = async () => {
    if (!user?.id) return;
    
    try {
      const analytics = await getGoalAnalytics(user.id);
      setGoalAnalytics(analytics);
    } catch (error) {
      console.error('Error loading goal analytics:', error);
    }
  };

  const loadGoalRecommendations = async () => {
    if (!user?.id) return;
    
    try {
      const recommendations = await getGoalRecommendations(user.id);
      setGoalRecommendations(recommendations.recommendations || []);
    } catch (error) {
      console.error('Error loading goal recommendations:', error);
    }
  };

  const handleCreateGoal = async () => {
    if (!user?.id || !newGoal.title || !newGoal.target_value) return;
    
    try {
      const goalData = {
        ...newGoal,
        user_id: user.id
      };
      
      const createdGoal = await createGoal(goalData);
      setGoals([...goals, createdGoal]);
      setNewGoal({
        title: '',
        description: '',
        type: 'reps',
        target_value: 0,
        unit: '',
        priority: 'medium',
        target_date: '',
        motivation_notes: ''
      });
      setShowCreateGoal(false);
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: any) => {
    if (!user?.id) return;
    
    try {
      await updateGoal(user.id, goalId, updates);
      await loadGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.id) return;
    
    try {
      await deleteGoal(user.id, goalId);
      setGoals(goals.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // Calculate real performance insights from session data
  const calculatePerformanceInsights = () => {
    if (sessions.length === 0) return null;

    const validSessions = sessions.filter(session => session.formScore && session.reps);
    if (validSessions.length === 0) return null;

    // Calculate averages and trends
    const avgFormScore = validSessions.reduce((sum, session) => sum + (session.formScore || 0), 0) / validSessions.length;
    const avgReps = validSessions.reduce((sum, session) => sum + (session.reps || 0), 0) / validSessions.length;
    const avgDuration = validSessions.reduce((sum, session) => sum + (session.durationSec || 0), 0) / validSessions.length;

    // Calculate trends (comparing recent vs older sessions)
    const recentSessions = validSessions.slice(0, Math.min(3, validSessions.length));
    const olderSessions = validSessions.slice(-Math.min(3, validSessions.length));
    
    const recentAvgForm = recentSessions.reduce((sum, session) => sum + (session.formScore || 0), 0) / recentSessions.length;
    const olderAvgForm = olderSessions.reduce((sum, session) => sum + (session.formScore || 0), 0) / olderSessions.length;
    const formTrend = recentAvgForm - olderAvgForm;

    const recentAvgReps = recentSessions.reduce((sum, session) => sum + (session.reps || 0), 0) / recentSessions.length;
    const olderAvgReps = olderSessions.reduce((sum, session) => sum + (session.reps || 0), 0) / olderSessions.length;
    const repsTrend = recentAvgReps - olderAvgReps;

    // Calculate form consistency for trends
    const formScores = validSessions.map(s => s.formScore || 0);
    const formVariance = Math.sqrt(formScores.reduce((sum, score) => sum + Math.pow(score - avgFormScore, 2), 0) / formScores.length);

    // Generate insights based on actual data
    const insights = {
      performance_trends: {
        form_trend: formTrend,
        reps_trend: repsTrend,
        consistency: Math.round(100 - formVariance),
        overall_progress: formTrend > 0 && repsTrend >= 0 ? 'improving' : formTrend < -5 ? 'declining' : 'stable'
      },
      current_stats: {
        avg_form_score: Math.round(avgFormScore),
        avg_reps: Math.round(avgReps),
        avg_duration: Math.round(avgDuration),
        total_sessions: validSessions.length,
        best_form_score: Math.max(...formScores),
        best_reps: Math.max(...validSessions.map(s => s.reps || 0))
      }
    };

    return insights;
  };

  // Offline functionality - handled by loadVideoQueue()





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
      
      // Reload goals to show updated progress
      await loadGoals();
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
      
      // Still try to reload goals even if session save failed
      await loadGoals();
    }
    
    // Reset analysis state and clear video preview
    setIsAnalyzing(false);
    setCurrentVideoUrl(null);
    // Clear video preview and reset session options after analysis
    setVideoResetKey(prev => prev + 1);
    setShowSessionOptions(false);
    setIsOfflineMode(false);
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      setCurrentVideoUrl(null);
    }, 100);
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

  const handleVideoCleared = () => {
    setCurrentVideoUrl(null);
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

  const getPerformanceLevelClass = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'elite': return 'elite';
      case 'advanced': return 'advanced';
      case 'intermediate': return 'intermediate';
      case 'beginner': return 'beginner';
      default: return 'unknown';
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
            <label htmlFor="coach-dropdown">Current Coach:</label>
            <select 
              id="coach-dropdown"
              value={selectedCoach}
              onChange={(e) => handleCoachChange(e.target.value)}
              className="coach-dropdown"
            >
              <option value="none">No Coach Selected</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>
                  {coach.username}
                </option>
              ))}
            </select>
            {selectedCoach !== 'none' && (
              <div className="coach-info">
                <span className="current-coach-label">
                  Current: {coaches.find(c => c.id === selectedCoach)?.username || 'Unknown Coach'}
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowVideoQueue(!showVideoQueue)} 
            className="video-queue-btn"
            title={`Video Queue (${videoQueue.length})`}
          >
            <span className="queue-icon">📹</span>
            Queue ({videoQueue.length})
          </button>
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

      {/* Video Queue Dropdown */}
      {showVideoQueue && (
        <div className="video-queue-dropdown">
          <div className="queue-header">
            <h3>Video Queue ({videoQueue.length})</h3>
            <button 
              onClick={() => setShowVideoQueue(false)}
              className="close-queue-btn"
            >
              ✕
            </button>
          </div>
          {videoQueue.length > 0 ? (
            <div className="queue-list">
              {videoQueue.map((video) => (
                <div key={video.id} className="queue-item">
                  <div className="queue-video-info">
                    <div className="video-exercise">{video.exercise_type || 'Unknown Exercise'}</div>
                    <div className="video-timestamp">
                      {new Date(video.recorded_at || video.created_at).toLocaleString()}
                    </div>
                    <div className="video-status">{video.status}</div>
                    <div className="video-details">
                      {video.file_size && `${Math.round(video.file_size / 1024 / 1024 * 100) / 100} MB`}
                      {video.duration && ` • ${Math.round(video.duration)}s`}
                    </div>
                  </div>
                  <div className="queue-actions">
                    {video.status === 'pending_analysis' && (
                      <button 
                        onClick={() => handleAnalyzeQueuedVideo(video)}
                        className="analyze-btn"
                      >
                        Analyze
                      </button>
                    )}
                    {video.status === 'analyzing' && (
                      <span className="analyzing-status">Analyzing...</span>
                    )}
                    {video.status === 'completed' && (
                      <span className="completed-status">Completed</span>
                    )}
                    <button 
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/offline-videos/${user?.id}/${video.id}`, {
                            method: 'DELETE'
                          });
                          if (response.ok) {
                            await loadVideoQueue();
                          }
                        } catch (error) {
                          console.error('Error deleting video:', error);
                        }
                      }}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-queue">
              <p>No videos in queue</p>
            </div>
          )}
        </div>
      )}

      {/* Session Controls */}
      {!showSessionOptions ? (
        <div className="session-start-section">
          <button 
            onClick={handleStartSession}
            className="start-session-btn"
          >
            <span className="session-icon">🏋️</span>
            Start Session
          </button>
          
          {/* Section Navigation Buttons */}
          <div className="section-nav-buttons">
            <button 
              onClick={() => toggleSection('performance-insights')}
              className={`section-nav-btn ${activeSection === 'performance-insights' ? 'active' : ''}`}
              title="Performance Insights"
            >
              📊 Performance Insights
            </button>
            <button 
              onClick={() => toggleSection('training-plan')}
              className={`section-nav-btn ${activeSection === 'training-plan' ? 'active' : ''}`}
              title="Training Plan"
            >
              📋 Training Plan
            </button>
            <button 
              onClick={() => toggleSection('gamification')}
              className={`section-nav-btn ${activeSection === 'gamification' ? 'active' : ''}`}
              title="Progress & Achievements"
            >
              🏆 Progress & Achievements
            </button>
            <button 
              onClick={() => toggleSection('goals')}
              className={`section-nav-btn ${activeSection === 'goals' ? 'active' : ''}`}
              title="Goals & Progress"
            >
              🎯 Goals & Progress
            </button>
          </div>
        </div>
      ) : (
        <div className="session-options-section">
          <div className="session-header">
            <h3>Session Options</h3>
            <button 
              onClick={handleCancelSession}
              className="cancel-session-btn"
            >
              ✕ Cancel
            </button>
          </div>
          
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

          <div className="offline-toggle">
            <label className="offline-switch">
              <input 
                type="checkbox" 
                checked={isOfflineMode}
                onChange={handleOfflineToggle}
              />
              <span className="slider"></span>
              <span className="offline-label">Offline Mode</span>
            </label>
        </div>
        
        <div className="video-buttons">
          <VideoRecorder 
              key={`recorder-${videoResetKey}`}
            exercise={selectedExercise}
              onVideoAnalyzed={isOfflineMode ? handleVideoQueued : handleVideoAnalyzed}
              onStartAnalysis={isOfflineMode ? () => {} : handleStartAnalysis}
              isAnalyzing={isOfflineMode ? false : isAnalyzing}
            onStartRecording={cameraActive ? handleStartRecording : handleOpenCamera}
            onStopRecording={handleStopRecording}
            onVideoReady={handleVideoReady}
            onVideoCleared={handleVideoCleared}
            cameraStream={cameraStream}
              isOfflineMode={isOfflineMode}
          />
          <VideoUploader 
              key={`uploader-${videoResetKey}`}
            exercise={selectedExercise}
              onVideoAnalyzed={isOfflineMode ? handleVideoQueued : handleVideoAnalyzed}
              onStartAnalysis={isOfflineMode ? () => {} : handleStartAnalysis}
              isAnalyzing={isOfflineMode ? false : isAnalyzing}
            onStartUploading={handleStartUploading}
            onVideoReady={handleVideoReady}
            onVideoCleared={handleVideoCleared}
              isOfflineMode={isOfflineMode}
          />
        </div>
      </div>
      )}

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

      {isAnalyzing && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing your video...</p>
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
        {/* Performance Insights Section */}
        <div className={`collapsible-section ${activeSection === 'performance-insights' ? 'active' : ''}`}>
          {activeSection === 'performance-insights' && (
            <div className="section-content">
              {(() => {
                const realInsights = calculatePerformanceInsights();
                if (realInsights) {
                  return (
          <div className="predictive-analytics-section">
                      <div className="analytics-grid">
                        {/* Current Performance Stats */}
                        <div className="analytics-card current-stats">
                          <h3>Current Performance</h3>
                          <div className="stats-grid-2x2">
                            <div className="stat-item">
                              <div className="stat-label">Avg Form Score</div>
                              <div className="stat-value">{realInsights.current_stats.avg_form_score}%</div>
            </div>
                            <div className="stat-item">
                              <div className="stat-label">Avg Reps</div>
                              <div className="stat-value">{realInsights.current_stats.avg_reps}</div>
          </div>
                            <div className="stat-item">
                              <div className="stat-label">Best Form Score</div>
                              <div className="stat-value">{realInsights.current_stats.best_form_score}%</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-label">Total Sessions</div>
                              <div className="stat-value">{realInsights.current_stats.total_sessions}</div>
                            </div>
                          </div>
                        </div>

                        {/* Performance Trends */}
                        <div className="analytics-card trends">
                          <h3>Performance Trends</h3>
                          <div className="trends-grid-2x2">
                            <div className="trend-item">
                              <div className="trend-label">Form Trend</div>
                              <div className={`trend-value ${realInsights.performance_trends.form_trend > 0 ? 'trend-up' : realInsights.performance_trends.form_trend < 0 ? 'trend-down' : 'trend-neutral'}`}>
                                <span className="trend-arrow">
                                  {realInsights.performance_trends.form_trend > 0 ? '↗' : realInsights.performance_trends.form_trend < 0 ? '↘' : '→'}
                        </span>
                                <span className="trend-number">
                                  {Math.abs(realInsights.performance_trends.form_trend).toFixed(1)}%
                                </span>
                      </div>
                    </div>
                            <div className="trend-item">
                              <div className="trend-label">Reps Trend</div>
                              <div className={`trend-value ${realInsights.performance_trends.reps_trend > 0 ? 'trend-up' : realInsights.performance_trends.reps_trend < 0 ? 'trend-down' : 'trend-neutral'}`}>
                                <span className="trend-arrow">
                                  {realInsights.performance_trends.reps_trend > 0 ? '↗' : realInsights.performance_trends.reps_trend < 0 ? '↘' : '→'}
                        </span>
                                <span className="trend-number">
                                  {Math.abs(realInsights.performance_trends.reps_trend).toFixed(1)}
                                </span>
                      </div>
                    </div>
                            <div className="trend-item">
                              <div className="trend-label">Consistency</div>
                              <div className="trend-value trend-neutral">
                                <span className="trend-number">{realInsights.performance_trends.consistency}%</span>
                            </div>
                            </div>
                            <div className="trend-item">
                              <div className="trend-label">Overall Progress</div>
                              <div className={`trend-value ${realInsights.performance_trends.overall_progress === 'improving' ? 'trend-up' : realInsights.performance_trends.overall_progress === 'declining' ? 'trend-down' : 'trend-neutral'}`}>
                                <span className="trend-text">{realInsights.performance_trends.overall_progress}</span>
                        </div>
                        </div>
                      </div>
            </div>
          </div>
                    </div>
                  );
                }
                return (
          <div className="predictive-analytics-section">
            <div className="no-analytics">
                      <p>No performance insights available yet. Complete more sessions with form scores and reps to see your analytics!</p>
            </div>
                  </div>
                );
              })()}
          </div>
        )}
        </div>
        {/* Training Plan Section */}
        <div className={`collapsible-section ${activeSection === 'training-plan' ? 'active' : ''}`}>
          {activeSection === 'training-plan' && (
            <div className="section-content">
        {loadingTrainingPlan && (
            <div className="loading-training-plan">
              <p>Loading your personalized training plan...</p>
          </div>
        )}
              {(trainingPlan && !trainingPlan.error) || (sessions.length > 0 && sessions[0].trainingPlan) ? (
                <div className="training-plan-content">
            <div className="training-plan-header">
              <button 
                className="btn-secondary generate-plan-btn"
                onClick={generateNewTrainingPlan}
                disabled={loadingTrainingPlan}
              >
                {loadingTrainingPlan ? 'Generating...' : 'Generate New Plan'}
              </button>
            </div>
            
            {(() => {
              const planData = trainingPlan || (sessions.length > 0 ? sessions[0].trainingPlan : null);
              if (!planData) return null;
              
              return (
                <>
                  {/* Analysis Summary */}
                  {planData.analysis && (
                    <div className="analysis-summary">
                      <h3>Performance Analysis</h3>
                      <div className="analysis-grid">
                        {planData.analysis.gaps.length > 0 && (
                          <div className="analysis-card gaps">
                            <h4>Areas to Improve</h4>
                            <ul>
                              {planData.analysis.gaps.map((gap: string, index: number) => (
                                <li key={index}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {planData.analysis.strengths.length > 0 && (
                          <div className="analysis-card strengths">
                            <h4>Your Strengths</h4>
                            <ul>
                              {planData.analysis.strengths.map((strength: string, index: number) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weekly Schedule */}
                  {planData.weekly_schedule && planData.weekly_schedule.length > 0 && (
                    <div className="weekly-schedule">
                      <h3>This Week's Schedule</h3>
                      <div className="schedule-grid">
                        {planData.weekly_schedule.map((day: any, index: number) => (
                          <div key={index} className="schedule-card">
                            <div className="day-header">
                              <h4>{day.day}</h4>
                              <span className={`priority-badge ${day.priority}`}>{day.priority}</span>
                            </div>
                            <div className="exercise-info">
                              <div className="exercise-name">{day.exercise}</div>
                              <div className="exercise-details">
                                {day.sets} sets × {day.reps} reps
                              </div>
                              <div className="exercise-focus">{day.focus}</div>
                            </div>
                            <div className="exercise-instructions">
                              <h5>Instructions:</h5>
                              <ul>
                                {day.instructions.map((instruction: string, idx: number) => (
                                  <li key={idx}>{instruction}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="exercise-duration">
                              Duration: {day.estimated_duration}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progression Plan */}
                  {planData.progression_plan && (
                    <div className="progression-plan">
                      <h3>4-Week Progression Plan</h3>
                      <div className="progression-grid">
                        {planData.progression_plan.weeks.map((week: any, index: number) => (
                          <div key={index} className="progression-card">
                            <div className="week-header">
                              <h4>Week {week.week}</h4>
                              <div className="week-focus">{week.focus}</div>
                            </div>
                            <div className="week-targets">
                              <div className="target">
                                <span className="target-label">Form Target:</span>
                                <span className="target-value">{week.form_target}%</span>
                              </div>
                              <div className="target">
                                <span className="target-label">Reps Target:</span>
                                <span className="target-value">{week.reps_target}</span>
                              </div>
                            </div>
                            <div className="week-metrics">
                              <h5>Key Metrics:</h5>
                              <ul>
                                {week.key_metrics.map((metric: string, idx: number) => (
                                      <li key={idx}>{metric}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coaching Notes */}
                      {planData.coaching_notes && planData.coaching_notes.length > 0 && (
                        <div className="coaching-notes">
                          <h3>Coaching Notes</h3>
                          <div className="notes-list">
                            {planData.coaching_notes.map((note: string, index: number) => (
                              <div key={index} className="note-item">
                                <span className="note-icon">💡</span>
                                <span className="note-text">{note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="no-training-plan">
                <p>No training plan available yet. Generate your personalized plan!</p>
                <button 
                  className="btn-primary generate-plan-btn"
                  onClick={generateNewTrainingPlan}
                  disabled={loadingTrainingPlan}
                >
                  {loadingTrainingPlan ? 'Generating...' : 'Generate Training Plan'}
                </button>
              </div>
            )}
          </div>
        )}
                              </div>
        {/* Gamification Section */}
        <div className={`collapsible-section ${activeSection === 'gamification' ? 'active' : ''}`}>
          {activeSection === 'gamification' && (
            <div className="section-content">
          {loadingGamification ? (
            <div className="loading-gamification">
              <p>Loading your progress...</p>
            </div>
          ) : gamificationStats ? (
            <div className="gamification-content">
              {/* Stats Overview */}
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-info">
                    <div className="stat-value">{gamificationStats.total_points || 0}</div>
                    <div className="stat-label">Total Points</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <div className="stat-value">Level {gamificationStats.level || 1}</div>
                    <div className="stat-label">Current Level</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🔥</div>
                  <div className="stat-info">
                    <div className="stat-value">{gamificationStats.current_streak || 0}</div>
                    <div className="stat-label">Current Streak</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <div className="stat-value">{gamificationStats.sessions_completed || 0}</div>
                    <div className="stat-label">Sessions Completed</div>
                  </div>
                </div>
              </div>

              {/* Achievements and Badge */}
              <div className="achievements-badge-section">
                <div className="achievements-side">
                  <h3>🏅 Your Achievements</h3>
                  <div className="achievements-icons">
                    {gamificationStats.achievements && gamificationStats.achievements.length > 0 ? (
                      gamificationStats.achievements.map((achievement: any, index: number) => (
                        <div key={index} className="achievement-icon-small" title={`${achievement.name}: ${achievement.description} (+${achievement.points} points)`}>
                          {achievement.icon}
                        </div>
                      ))
                    ) : (
                      <p className="no-achievements">No achievements yet</p>
                    )}
                  </div>
                </div>
                
                <div className="badge-side">
                  <h3>🏆 Current Badge</h3>
                  <div className="current-badge-simple">
                    {gamificationStats.badges && gamificationStats.badges.length > 0 ? (
                      gamificationStats.badges.map((badge: any, index: number) => (
                        <div key={index} className="badge-card-simple">
                          <div className="badge-icon">{badge.icon}</div>
                          <div className="badge-info">
                            <div className="badge-name">{badge.name}</div>
                            <div className="badge-description">{badge.description}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-badge">No badge yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="leaderboard-section">
                  <h3>🏆 Global Leaderboard</h3>
                  <div className="leaderboard-list">
                    {(() => {
                      // Create a combined leaderboard with current user
                      const currentUserData = gamificationStats ? {
                        user_id: user?.username || 'You',
                        total_points: gamificationStats.total_points || 0,
                        level: gamificationStats.level || 1,
                        rank: 0, // Will be calculated
                        badges: gamificationStats.badges?.map((b: any) => b.name) || []
                      } : null;

                      // Sort leaderboard by points (descending), then by level (descending)
                      const sortedLeaderboard = [...leaderboard].sort((a, b) => {
                        if (b.total_points !== a.total_points) {
                          return b.total_points - a.total_points;
                        }
                        return b.level - a.level;
                      });

                      // Add current user if not already in top 5
                      let displayList = sortedLeaderboard.slice(0, 5);
                      const currentUserInTop5 = displayList.some(u => u.user_id === currentUserData?.user_id);
                      
                      if (currentUserData && !currentUserInTop5) {
                        // Find current user's actual rank
                        const currentUserRank = sortedLeaderboard.findIndex(u => u.user_id === currentUserData.user_id) + 1;
                        currentUserData.rank = currentUserRank;
                        displayList = [...displayList.slice(0, 4), currentUserData];
                      }

                      // Assign ranks
                      displayList = displayList.map((user, index) => ({
                        ...user,
                        rank: index + 1
                      }));

                      return displayList.map((user: any, index: number) => (
                        <div key={index} className={`leaderboard-item ${user.user_id === (user?.username || 'You') ? 'current-user' : ''}`}>
                          <div className="rank">#{user.rank}</div>
                          <div className="user-info">
                            <div className="username">{user.user_id}</div>
                            <div className="user-stats">
                              {user.total_points} points • Level {user.level}
                            </div>
                          </div>
                          <div className="user-badges">
                            {user.badges?.slice(0, 3).map((badge: string, badgeIndex: number) => (
                              <span key={badgeIndex} className="badge-mini">{badge}</span>
                            )) || []}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-gamification">
              <p>Complete your first session to start earning points and achievements!</p>
            </div>
          )}
        </div>
          )}
        </div>
        {/* Goal Setting Section */}
        <div className={`collapsible-section ${activeSection === 'goals' ? 'active' : ''}`}>
          {activeSection === 'goals' && (
            <div className="section-content">
          <div className="goal-setting-header">
            <button 
              className="btn-primary"
              onClick={() => setShowCreateGoal(true)}
            >
              + Create New Goal
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setShowRecommendedGoals(!showRecommendedGoals)}
            >
              {showRecommendedGoals ? 'Hide' : 'Show'} Recommended Goals
            </button>
          </div>

          {/* Recommended Goals Section */}
          {showRecommendedGoals && goalRecommendations.length > 0 && (
            <div className="goal-recommendations">
              <h3>💡 Recommended Goals</h3>
              <div className="recommendations-list">
                {goalRecommendations.map((rec, index) => (
                  <div key={index} className="recommendation-card">
                    <div className="recommendation-title">{rec.title}</div>
                    <div className="recommendation-description">{rec.description}</div>
                    <div className="recommendation-reason">{rec.reason}</div>
                    <button 
                      className="btn-small"
                      onClick={() => {
                        setNewGoal({
                          title: rec.title,
                          description: rec.description,
                          type: rec.type,
                          target_value: rec.target_value,
                          unit: rec.unit,
                          priority: rec.priority,
                          target_date: '',
                          motivation_notes: rec.reason
                        });
                        setShowCreateGoal(true);
                      }}
                    >
                      Create This Goal
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingGoals ? (
            <div className="loading-goals">
              <p>Loading your goals...</p>
            </div>
          ) : goals.length > 0 ? (
            <div className="goals-content">
              {/* Goal Analytics */}
              {goalAnalytics && (
                <div className="goal-analytics">
                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <div className="analytics-value">{goalAnalytics.total_goals || 0}</div>
                      <div className="analytics-label">Total Goals</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">{goalAnalytics.active_goals || 0}</div>
                      <div className="analytics-label">Active Goals</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">{goalAnalytics.completed_goals || 0}</div>
                      <div className="analytics-label">Completed</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">{goalAnalytics.completion_rate || 0}%</div>
                      <div className="analytics-label">Success Rate</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Goals List */}
              <div className="goals-list">
                {goals.map((goal) => (
                  <div key={goal.id} className={`goal-card ${goal.status}`}>
                    <div className="goal-header">
                      <div className="goal-title">{goal.title}</div>
                      <div className="goal-actions">
                        <button 
                          className="btn-small"
                          onClick={() => handleUpdateGoal(goal.id, { status: goal.status === 'active' ? 'paused' : 'active' })}
                        >
                          {goal.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button 
                          className="btn-small btn-danger"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="goal-description">{goal.description}</div>
                    <div className="goal-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${goal.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        {goal.current_value || 0} / {goal.target_value} {goal.unit} ({goal.progress_percentage || 0}%)
                      </div>
                    </div>
                    <div className="goal-meta">
                      <span className={`priority-badge ${goal.priority}`}>{goal.priority}</span>
                      <span className="goal-type">{goal.type.replace('_', ' ')}</span>
                      {goal.target_date && (
                        <span className="goal-deadline" title={`Due: ${new Date(goal.target_date).toLocaleDateString()}`}>
                          Due: {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="no-goals">
              <p>No goals set yet. Create your first goal to start tracking your progress!</p>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Create Goal Modal */}
        {showCreateGoal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Create New Goal</h3>
                <button 
                  className="btn-close"
                  onClick={() => setShowCreateGoal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Goal Title</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    placeholder="e.g., Complete 100 squats"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe your goal..."
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Goal Type</label>
                    <select
                      value={newGoal.type}
                      onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}
                    >
                      <option value="reps">Reps</option>
                      <option value="form_score">Form Score</option>
                      <option value="duration">Duration</option>
                      <option value="sessions_completed">Sessions Completed</option>
                      <option value="streak">Streak</option>
                      <option value="endurance">Endurance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Value</label>
                    <input
                      type="number"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal({...newGoal, target_value: parseInt(e.target.value) || 0})}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                      placeholder="reps, seconds, etc."
                    />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={newGoal.priority}
                      onChange={(e) => setNewGoal({...newGoal, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Target Date (Optional)</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Motivation Notes</label>
                  <textarea
                    value={newGoal.motivation_notes}
                    onChange={(e) => setNewGoal({...newGoal, motivation_notes: e.target.value})}
                    placeholder="Why is this goal important to you?"
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowCreateGoal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleCreateGoal}
                >
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        )}
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
                    <span className="metric-label">Performance Level</span>
                    <span className={`metric-value ${getPerformanceLevelClass(session.benchmarking?.performance_level?.level)}`}>
                      {session.benchmarking?.performance_level?.level?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Peer Rank</span>
                    <span className="metric-value">
                      #{(() => {
                        // Generate dynamic peer rank based on form score and reps
                        const formScore = session.formScore || 0;
                        const reps = session.reps || 0;
                        const performanceScore = (formScore * 0.7) + (Math.min(reps, 50) * 0.3);
                        
                        // Rank based on performance score (higher is better)
                        if (performanceScore >= 90) return Math.floor(Math.random() * 5) + 1; // Top 5
                        if (performanceScore >= 80) return Math.floor(Math.random() * 5) + 6; // 6-10
                        if (performanceScore >= 70) return Math.floor(Math.random() * 5) + 11; // 11-15
                        if (performanceScore >= 60) return Math.floor(Math.random() * 5) + 16; // 16-20
                        return Math.floor(Math.random() * 10) + 21; // 21-30
                      })()}
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

      {/* Coach Change Request Modal */}
      {showCoachChangeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Request Coach Change</h3>
              <button 
                className="btn-close"
                onClick={() => {
                  setShowCoachChangeModal(false);
                  setChangeReason('');
                  setNewCoachId('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>New Coach</label>
                <select
                  value={newCoachId}
                  onChange={(e) => setNewCoachId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select New Coach</option>
                  {coaches.filter(c => c.id !== selectedCoach).map(coach => (
                    <option key={coach.id} value={coach.id}>
                      {coach.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason for Change</label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Please explain why you want to change coaches..."
                  rows={4}
                  className="form-textarea"
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCoachChangeModal(false);
                    setChangeReason('');
                    setNewCoachId('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleCoachChangeRequest}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteDashboard;