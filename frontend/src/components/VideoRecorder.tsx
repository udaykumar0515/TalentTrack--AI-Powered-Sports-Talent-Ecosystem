import React, { useState, useRef, useCallback } from 'react';
import { analyzeVideo } from '../api/apiClient';
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
      const session = await analyzeVideo(recordedVideo as File, exercise, athleteId);
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
    <div className="video-recorder">
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{ display: 'none', width: '100%', maxWidth: '400px', borderRadius: '8px' }}
      />

      {!recordedVideo ? (
        <>
          <button
            id="record-btn"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isAnalyzing}
          >
            {isRecording ? 'Stop Recording' : 'Record Video'}
          </button>
        </>
      ) : (
        <div>
          <p>Video recorded successfully!</p>
          <div style={{ marginBottom: 8 }}>
            <button
              id="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
            </button>
            <button onClick={resetRecording} style={{ marginLeft: 8 }}>
              Record Again
            </button>
          </div>
          <div>
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                style={{ width: '100%', maxWidth: 400, borderRadius: 8 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
