import React, { useState, useEffect } from 'react';
import { Play, Calendar, User, Clock, Wifi, WifiOff } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { offlineStorage, StoredVideo } from '../services/OfflineStorage';

interface VideoGalleryProps {
  athleteId: string;
  isCoach?: boolean;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ athleteId, isCoach = false }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [offlineVideos, setOfflineVideos] = useState<StoredVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, [athleteId]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      // Load online videos
      const response = await fetch(`/api/${isCoach ? 'coach' : 'athlete'}-videos/${athleteId}`);
      if (response.ok) {
        const onlineVideos = await response.json();
        setVideos(onlineVideos);
      }

      // Load offline videos
      const storedVideos = await offlineStorage.getStoredVideos();
      const athleteOfflineVideos = storedVideos.filter(video => 
        video.sessionData.athleteId === athleteId
      );
      setOfflineVideos(athleteOfflineVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: any, isOffline = false) => {
    if (isOffline) {
      const videoUrl = URL.createObjectURL(video.videoBlob);
      setSelectedVideo({
        ...video.sessionData,
        videoUrl,
        isOffline: true
      });
    } else {
      setSelectedVideo({
        ...video,
        videoUrl: `/api/videos/${video.sessionId}`,
        isOffline: false
      });
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSyncStatusIcon = (video: StoredVideo) => {
    switch (video.syncStatus) {
      case 'synced':
        return <Wifi className="sync-icon synced" />;
      case 'pending':
        return <WifiOff className="sync-icon pending" />;
      case 'failed':
        return <WifiOff className="sync-icon failed" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="video-gallery">
        <h2>Video Gallery</h2>
        <div className="loading">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="video-gallery">
      <h2>Video Gallery</h2>
      
      {videos.length === 0 && offlineVideos.length === 0 ? (
        <div className="no-videos">
          <p>No videos found. Record your first exercise video!</p>
        </div>
      ) : (
        <div className="videos-grid">
          {/* Online Videos */}
          {videos.map((video) => (
            <div key={video.videoId} className="video-card" onClick={() => handleVideoClick(video)}>
              <div className="video-thumbnail">
                <video src={`/api/videos/${video.sessionId}`} preload="metadata" />
                <div className="play-overlay">
                  <Play size={32} />
                </div>
              </div>
              <div className="video-info">
                <h3>{video.exercise}</h3>
                <div className="video-meta">
                  <div className="meta-item">
                    <User size={16} />
                    <span>{video.athleteName}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>{formatDate(video.uploadedAt)}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>{formatTime(video.uploadedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Offline Videos */}
          {offlineVideos.map((video) => (
            <div key={video.id} className="video-card offline" onClick={() => handleVideoClick(video, true)}>
              <div className="video-thumbnail">
                <video src={URL.createObjectURL(video.videoBlob)} preload="metadata" />
                <div className="play-overlay">
                  <Play size={32} />
                </div>
                <div className="offline-badge">
                  {getSyncStatusIcon(video)}
                  <span>{video.syncStatus}</span>
                </div>
              </div>
              <div className="video-info">
                <h3>{video.sessionData.exercise}</h3>
                <div className="video-meta">
                  <div className="meta-item">
                    <User size={16} />
                    <span>{video.sessionData.athleteName}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>{formatDate(video.sessionData.timestamp)}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>{formatTime(video.sessionData.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVideo && (
        <VideoPlayer
          videoUrl={selectedVideo.videoUrl}
          sessionData={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          isOffline={selectedVideo.isOffline}
        />
      )}
    </div>
  );
};

export default VideoGallery;
