import React, { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeVideoEnhanced, uploadVideo } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface VideoRecorderProps {
  exercise: string;
  onVideoAnalyzed: (session: any) => void;
  onStartAnalysis: () => void;
  isAnalyzing: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onVideoReady?: (videoUrl: string) => void;
  onVideoCleared?: () => void;
  cameraStream?: MediaStream | null;
  isOfflineMode?: boolean;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  exercise,
  onVideoAnalyzed,
  onStartAnalysis,
  isAnalyzing,
  onStartRecording,
  onStopRecording,
  onVideoReady,
  onVideoCleared,
  cameraStream,
  isOfflineMode = false
}) => {
  const { user } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset component state when key changes (from parent component)
  useEffect(() => {
    resetRecording();
  }, [exercise]); // Reset when exercise changes

  const startRecording = useCallback(() => {
    if (!cameraStream) {
      console.error('No camera stream available');
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(cameraStream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/mp4' });
        setRecordedVideo(videoBlob);

        // create preview URL
        try {
          const url = URL.createObjectURL(videoBlob);
          setPreviewUrl(url);
          if (onVideoReady) {
            onVideoReady(url);
          }
        } catch (e) {
          }
      };

      mediaRecorder.start();
      setIsRecording(true);
      if (onStartRecording) {
        onStartRecording();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording.');
    }
  }, [cameraStream, onStartRecording, onVideoReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (onStopRecording) {
        onStopRecording();
      }
    }
  }, [isRecording, onStopRecording]);

  const handleAnalyze = async () => {
    if (!recordedVideo) return;

    // If in offline mode, just queue the video without analysis
    if (isOfflineMode) {
      const videoData = {
        exercise: exercise,
        videoBlob: recordedVideo,
        timestamp: new Date().toISOString(),
        type: 'recorded'
      };
      onVideoAnalyzed(videoData);
      return;
    }

    onStartAnalysis();

    try {
      const athleteId = user?.id ?? 'unknown';
      const athleteName = user?.username ?? 'Athlete';
      
      // Use enhanced analysis with metadata
      const metadata = {
        session_metadata: {
          session_type: "practice",
          difficulty_level: "intermediate",
          goals: ["form_improvement", "strength"],
          notes: "Recorded via webcam"
        },
        athlete_profile: {
          age: null,
          height: null,
          weight: null,
          fitness_level: "intermediate",
          experience_years: 1,
          dominant_side: "right",
          injury_history: [],
          performance_goals: ["form_improvement"]
        },
        environmental_data: {
          location: "indoor",
          lighting_conditions: "good",
          surface_type: "hard",
          temperature: null,
          humidity: null
        },
        device_info: {
          device_type: "webcam",
          resolution: "1280x720",
          fps: 30,
          camera_angle: "front",
          distance_from_subject: "medium"
        },
        analysis_config: {
          exercise: exercise,
          analysis_depth: "comprehensive",
          focus_areas: ["form", "injury_prevention"],
          comparison_mode: "self",
          real_time_feedback: true,
          biomechanical_analysis: true,
          muscle_activation_analysis: true,
          joint_angle_analysis: true,
          balance_analysis: true
        }
      };

      // Convert Blob to File for analysis
      const videoFile = new File([recordedVideo], `recording_${Date.now()}.mp4`, { 
        type: 'video/mp4' 
      });
      
      const session = await analyzeVideoEnhanced(videoFile, exercise, athleteId, athleteName, metadata);
      
      // Upload video to backend storage
      try {
        const uploadResult = await uploadVideo(videoFile, {
          sessionId: session.sessionId,
          athleteId: athleteId,
          athleteName: athleteName,
          exercise: exercise,
          coachId: null,
          coachName: null
        });
        
        // Add the stored video URL to the session
        const sessionWithVideo = {
          ...session,
          videoUrl: uploadResult.videoUrl, // Use the backend video URL
          thumbnailUrl: uploadResult.videoUrl
        };
        
        onVideoAnalyzed(sessionWithVideo);
      } catch (uploadError) {
        console.error('Video upload failed:', uploadError);
        // Fallback to blob URL if upload fails
        const sessionWithVideo = {
          ...session,
          videoUrl: previewUrl,
          thumbnailUrl: previewUrl
        };
        onVideoAnalyzed(sessionWithVideo);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Video analysis failed. Please try again.');
    }
  };

  const resetRecording = () => {
    setRecordedVideo(null);
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (e) {}
      setPreviewUrl(null);
    }
    if (videoRef.current) {
      videoRef.current.style.display = 'none';
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    // Notify parent component that video has been cleared
    if (onVideoCleared) {
      onVideoCleared();
    }
  };

  const getButtonText = () => {
    if (isRecording) return 'Stop Recording';
    if (cameraStream) return 'Start Recording';
    return 'Open Camera';
  };

  const getButtonIcon = () => {
    if (isRecording) return '⏹️';
    if (cameraStream) return '⏺️';
    return '📹';
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (cameraStream) {
      startRecording();
    } else {
      // This should trigger camera access in parent component
      if (onStartRecording) {
        onStartRecording();
      }
    }
  };

  return (
    <div className="video-recorder-compact">
      <button
        className={`record-btn ${isRecording ? 'recording' : ''} ${cameraStream ? 'camera-ready' : ''}`}
        onClick={handleButtonClick}
        disabled={isAnalyzing}
      >
        <span className="record-icon">
          {getButtonIcon()}
        </span>
        {getButtonText()}
      </button>
      
      {recordedVideo && (
        <div className="action-buttons-compact">
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <span className="analyze-icon">🔍</span>
            {isOfflineMode ? 'Upload to Queue' : (isAnalyzing ? 'Analyzing...' : 'Analyze')}
          </button>
          <button onClick={resetRecording} className="retry-btn">
            <span className="retry-icon">🔄</span>
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(VideoRecorder);
