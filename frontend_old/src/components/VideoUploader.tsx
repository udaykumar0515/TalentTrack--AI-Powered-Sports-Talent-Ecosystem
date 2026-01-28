import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideoEnhanced, uploadVideo } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface VideoUploaderProps {
  exercise: string;
  onVideoAnalyzed: (session: any) => void;
  onStartAnalysis: () => void;
  isAnalyzing: boolean;
  onStartUploading?: () => void;
  onVideoReady?: (videoUrl: string) => void;
  onVideoCleared?: () => void;
  isOfflineMode?: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  exercise,
  onVideoAnalyzed,
  onStartAnalysis,
  isAnalyzing,
  onStartUploading,
  onVideoReady,
  onVideoCleared,
  isOfflineMode = false
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset component state when exercise changes
  useEffect(() => {
    resetUpload();
  }, [exercise]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        if (onVideoReady) {
          onVideoReady(url);
        }
      } catch (e) {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      if (onStartUploading) {
        onStartUploading();
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    // If in offline mode, just queue the video without analysis
    if (isOfflineMode) {
      const videoData = {
        exercise: exercise,
        videoFile: selectedFile,
        timestamp: new Date().toISOString(),
        type: 'uploaded'
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
          notes: "Uploaded video file"
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
          device_type: "phone",
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

      const session = await analyzeVideoEnhanced(selectedFile, exercise, athleteId, athleteName, metadata);
      
      // Upload video to backend storage
      try {
        const uploadResult = await uploadVideo(selectedFile, {
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
        const videoUrl = URL.createObjectURL(selectedFile);
        const sessionWithVideo = {
          ...session,
          videoUrl: videoUrl,
          thumbnailUrl: videoUrl
        };
        onVideoAnalyzed(sessionWithVideo);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Video analysis failed. Please try again.');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (e) {}
      setPreviewUrl(null);
    }
    // Notify parent component that video has been cleared
    if (onVideoCleared) {
      onVideoCleared();
    }
  };

  return (
    <div className="video-uploader-compact">
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={isAnalyzing}
        >
          <span className="upload-icon">📁</span>
          Upload
        </button>
      ) : (
        <div className="upload-preview-compact">
          <div className="file-info-compact">
            <span className="file-icon">🎥</span>
            <span className="file-name">{selectedFile.name}</span>
          </div>

          <div className="action-buttons-compact">
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              <span className="analyze-icon">🔍</span>
              {isOfflineMode ? 'Upload to Queue' : (isAnalyzing ? 'Analyzing...' : 'Analyze')}
            </button>
            <button onClick={resetUpload} className="retry-btn">
              <span className="retry-icon">🔄</span>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
