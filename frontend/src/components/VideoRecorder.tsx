import React, { useState, useRef, useCallback } from 'react';
import { analyzeVideo } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { offlineStorage } from '../services/OfflineStorage';
import { videoSyncService } from '../services/VideoSyncService';

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
      
      // Store video offline first
      const videoId = await offlineStorage.storeVideo(recordedVideo as Blob, {
        exercise: exercise,
        athleteId: athleteId,
        athleteName: user?.username || 'Athlete',
        timestamp: new Date().toISOString()
      });

      // Try to analyze and sync
      try {
        const session = await analyzeVideo(recordedVideo as File, exercise, athleteId);
        onVideoAnalyzed(session);
        
        // Try to sync immediately if online
        if (videoSyncService.getOnlineStatus()) {
          await videoSyncService.syncPendingVideos();
        }
      } catch (analysisError) {
        console.error('Analysis failed, but video saved offline:', analysisError);
        
        // Create a basic session for offline storage
        const offlineSession = {
          exercise: exercise,
          reps: 0,
          formScore: 0,
          durationSec: 0,
          timestamp: new Date().toISOString(),
          athleteId: athleteId,
          athleteName: user?.username || 'Athlete',
          sessionId: videoId,
          isOffline: true
        };
        
        onVideoAnalyzed(offlineSession);
        alert('Video saved offline. Analysis will be performed when online.');
      }
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Error saving video. Please try again.');
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
    <div className="video-recorder">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          className="live-video"
        />
      </div>

      {!recordedVideo ? (
        <div className="recording-controls">
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isAnalyzing}
          >
            <span className="record-icon">
              {isRecording ? '⏹️' : '⏺️'}
            </span>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <p className="recording-hint">
            {isRecording ? 'Recording in progress...' : 'Click to start recording your exercise'}
          </p>
        </div>
      ) : (
        <div className="analysis-controls">
          <div className="video-preview">
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                className="preview-video"
              />
            )}
          </div>
          <div className="action-buttons">
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              <span className="analyze-icon">🔍</span>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </button>
            <button onClick={resetRecording} className="retry-btn">
              <span className="retry-icon">🔄</span>
              Record Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
