import React, { useRef, useState } from 'react';
import { Play, Pause, X, Download } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  sessionData: any;
  onClose: () => void;
  isOffline?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  sessionData, 
  onClose, 
  isOffline = false 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${sessionData.exercise}_${sessionData.athleteName}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="video-player-overlay">
      <div className="video-player-container">
        <div className="video-header">
          <div className="video-title">
            <h3>{sessionData.exercise} - {sessionData.athleteName}</h3>
            {isOffline && <span className="offline-badge">Offline</span>}
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="video-wrapper">
          <video
            ref={videoRef}
            src={videoUrl}
            className="video-element"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            controls={false}
          />
          
          <div className="video-controls">
            <button onClick={togglePlay} className="play-pause-btn">
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="seek-bar"
            />
            
            <button onClick={handleDownload} className="download-btn">
              <Download size={20} />
            </button>
          </div>
        </div>
        
        <div className="video-info">
          <div className="info-row">
            <strong>Exercise:</strong> {sessionData.exercise}
          </div>
          <div className="info-row">
            <strong>Athlete:</strong> {sessionData.athleteName}
          </div>
          <div className="info-row">
            <strong>Date:</strong> {new Date(sessionData.timestamp).toLocaleString()}
          </div>
          {sessionData.coachName && (
            <div className="info-row">
              <strong>Coach:</strong> {sessionData.coachName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
