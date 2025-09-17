import React, { useState, useRef, useCallback } from 'react';
import { analyzeVideoEnhanced } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface VideoRecorderProps {
  exercise: string;
  onVideoAnalyzed: (session: any) => void;
  onStartAnalysis: () => void;
  isAnalyzing: boolean;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  exercise,
  onVideoAnalyzed,
  onStartAnalysis,
  isAnalyzing
}) => {
  const { user } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.display = 'block';
      }

      const mediaRecorder = new MediaRecorder(stream);
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
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.style.display = 'block';
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        } catch (e) {
          console.warn('Could not create preview URL:', e);
        }

        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access camera. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleAnalyze = async () => {
    if (!recordedVideo) return;

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

      const session = await analyzeVideoEnhanced(recordedVideo as File, exercise, athleteId, athleteName, metadata);
      onVideoAnalyzed(session);
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
  };

  return (
    <div className="video-recorder-compact">
      {!recordedVideo ? (
        <button
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
        >
          <span className="record-icon">
            {isRecording ? '⏹️' : '⏺️'}
          </span>
          {isRecording ? 'Stop' : 'Record'}
        </button>
      ) : (
        <div className="video-preview-compact">
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              className="preview-video-small"
            />
          )}
          <div className="action-buttons-compact">
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              <span className="analyze-icon">🔍</span>
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            <button onClick={resetRecording} className="retry-btn">
              <span className="retry-icon">🔄</span>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
