import React, { useState, useRef, useCallback } from 'react';
import { storeOfflineVideo } from '../api/apiClient';

interface OfflineVideoRecorderProps {
  onVideoRecorded: (videoData: any) => void;
  exerciseType: string;
  userId: string;
}

const OfflineVideoRecorder: React.FC<OfflineVideoRecorderProps> = ({ 
  onVideoRecorded, 
  exerciseType, 
  userId 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: false 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedVideo(videoBlob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing camera. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  }, [isRecording]);

  const uploadOfflineVideo = useCallback(async () => {
    if (!recordedVideo || !userId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert blob to base64 for storage
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Video = reader.result as string;
          
          const videoData = {
            user_id: userId,
            video_blob: base64Video,
            video_name: `offline_${exerciseType}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
            exercise_type: exerciseType,
            recorded_at: new Date().toISOString(),
            file_size: recordedVideo.size,
            duration: recordingDuration,
            notes: `Offline recording - ${exerciseType}`,
            location: 'Offline Mode',
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language
            }
          };

          // Simulate upload progress
          for (let i = 0; i <= 100; i += 10) {
            setUploadProgress(i);
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Store offline video
          const result = await storeOfflineVideo(videoData);
          
          setUploadProgress(100);
          onVideoRecorded(result);
          
          // Reset state
          setRecordedVideo(null);
          setRecordingDuration(0);
          
          alert('Video saved offline! It will be analyzed when you reconnect to the internet.');
          
        } catch (error) {
          console.error('Error uploading offline video:', error);
          alert('Error saving offline video. Please try again.');
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      };
      
      reader.readAsDataURL(recordedVideo);
      
    } catch (error) {
      console.error('Error processing offline video:', error);
      alert('Error processing video. Please try again.');
      setIsUploading(false);
    }
  }, [recordedVideo, userId, exerciseType, recordingDuration, onVideoRecorded]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="offline-video-recorder">
      <div className="offline-status">
        {isOffline ? (
          <div className="offline-indicator">
            <span className="offline-icon">📡</span>
            <span>Offline Mode - Videos will be analyzed when you reconnect</span>
          </div>
        ) : (
          <div className="online-indicator">
            <span className="online-icon">🌐</span>
            <span>Online Mode - Videos will be analyzed immediately</span>
          </div>
        )}
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-preview"
        />
        
        {recordedVideo && (
          <video
            src={URL.createObjectURL(recordedVideo)}
            controls
            className="recorded-video"
          />
        )}
      </div>

      <div className="recording-controls">
        {!isRecording && !recordedVideo && (
          <button
            className="btn-primary record-btn"
            onClick={startRecording}
            disabled={isUploading}
          >
            🎥 Start Recording
          </button>
        )}

        {isRecording && (
          <button
            className="btn-danger stop-btn"
            onClick={stopRecording}
          >
            ⏹️ Stop Recording ({formatDuration(recordingDuration)})
          </button>
        )}

        {recordedVideo && !isUploading && (
          <div className="video-actions">
            <button
              className="btn-primary"
              onClick={uploadOfflineVideo}
            >
              💾 Save Offline Video
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setRecordedVideo(null);
                setRecordingDuration(0);
              }}
            >
              🗑️ Discard
            </button>
          </div>
        )}

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span>Uploading... {uploadProgress}%</span>
          </div>
        )}
      </div>

      <div className="offline-info">
        <h4>Offline Mode Features:</h4>
        <ul>
          <li>✅ Record videos without internet connection</li>
          <li>✅ Videos are stored locally with timestamps</li>
          <li>✅ Analysis happens when you reconnect</li>
          <li>✅ No data loss during poor connectivity</li>
        </ul>
      </div>
    </div>
  );
};

export default OfflineVideoRecorder;
