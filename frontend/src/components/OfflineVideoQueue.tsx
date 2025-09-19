import React, { useState, useEffect } from 'react';
import { getUserOfflineVideos, analyzeOfflineVideo, deleteOfflineVideo, getOfflineVideoStats } from '../api/apiClient';

interface OfflineVideoQueueProps {
  userId: string;
  onVideoAnalyzed: (videoData: any) => void;
}

const OfflineVideoQueue: React.FC<OfflineVideoQueueProps> = ({ userId, onVideoAnalyzed }) => {
  const [offlineVideos, setOfflineVideos] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState<string | null>(null);

  const loadOfflineVideos = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const videosData = await getUserOfflineVideos(userId);
      setOfflineVideos(videosData.videos || []);
    } catch (error) {
      console.error('Error loading offline videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!userId) return;
    
    try {
      const statsData = await getOfflineVideoStats(userId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading offline video stats:', error);
    }
  };

  useEffect(() => {
    loadOfflineVideos();
    loadStats();
  }, [userId]);

  const handleAnalyzeVideo = async (videoId: string) => {
    if (!userId) return;
    
    setAnalyzingVideo(videoId);
    try {
      await analyzeOfflineVideo(userId, videoId, {
        exercise_type: 'squat', // This would be determined from the video metadata
        user_name: 'Athlete',
        coach_id: 'coach_1',
        coach_name: 'Coach'
      });
      
      // Reload videos to update status
      await loadOfflineVideos();
      await loadStats();
      
      // Notify parent component
      onVideoAnalyzed({ videoId, status: 'analyzed' });
      
    } catch (error) {
      console.error('Error analyzing video:', error);
      alert('Error analyzing video. Please try again.');
    } finally {
      setAnalyzingVideo(null);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!userId) return;
    
    if (window.confirm('Are you sure you want to delete this offline video?')) {
      try {
        await deleteOfflineVideo(userId, videoId);
        await loadOfflineVideos();
        await loadStats();
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Error deleting video. Please try again.');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_analysis':
        return <span className="status-badge pending">⏳ Pending</span>;
      case 'analyzing':
        return <span className="status-badge analyzing">🔄 Analyzing</span>;
      case 'analyzed':
        return <span className="status-badge analyzed">✅ Analyzed</span>;
      case 'failed':
        return <span className="status-badge failed">❌ Failed</span>;
      default:
        return <span className="status-badge unknown">❓ Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="offline-video-queue">
        <div className="loading">
          <p>Loading offline videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-video-queue">
      <div className="queue-header">
        <h3>📱 Offline Video Queue</h3>
        <button 
          className="btn-secondary btn-sm"
          onClick={() => {
            loadOfflineVideos();
            loadStats();
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {stats && (
        <div className="queue-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total_videos || 0}</span>
            <span className="stat-label">Total Videos</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.pending_videos || 0}</span>
            <span className="stat-label">Pending Analysis</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.analyzed_videos || 0}</span>
            <span className="stat-label">Analyzed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.total_size_mb || 0} MB</span>
            <span className="stat-label">Total Size</span>
          </div>
        </div>
      )}

      {offlineVideos.length === 0 ? (
        <div className="no-videos">
          <p>No offline videos found. Record some videos while offline!</p>
        </div>
      ) : (
        <div className="videos-list">
          {offlineVideos.map((video) => (
            <div key={video.id} className="video-item">
              <div className="video-info">
                <div className="video-header">
                  <h4>{video.video_name}</h4>
                  {getStatusBadge(video.status)}
                </div>
                <div className="video-details">
                  <div className="detail-item">
                    <strong>Exercise:</strong> {video.exercise_type}
                  </div>
                  <div className="detail-item">
                    <strong>Recorded:</strong> {formatDate(video.recorded_at)}
                  </div>
                  <div className="detail-item">
                    <strong>Duration:</strong> {video.duration} seconds
                  </div>
                  <div className="detail-item">
                    <strong>Size:</strong> {formatFileSize(video.file_size)}
                  </div>
                  {video.location && (
                    <div className="detail-item">
                      <strong>Location:</strong> {video.location}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="video-actions">
                {video.status === 'pending_analysis' && (
                  <button
                    className="btn-primary"
                    onClick={() => handleAnalyzeVideo(video.id)}
                    disabled={analyzingVideo === video.id}
                  >
                    {analyzingVideo === video.id ? '🔄 Analyzing...' : '🔍 Analyze Now'}
                  </button>
                )}
                
                {video.status === 'analyzed' && (
                  <button
                    className="btn-success"
                    onClick={() => onVideoAnalyzed(video)}
                  >
                    👁️ View Results
                  </button>
                )}
                
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteVideo(video.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="queue-info">
        <h4>How Offline Mode Works:</h4>
        <ul>
          <li>📱 Record videos when offline - they're stored locally</li>
          <li>⏰ Videos keep their original timestamp</li>
          <li>🌐 When online, click "Analyze Now" to process videos</li>
          <li>📊 Results are added to your session history</li>
        </ul>
      </div>
    </div>
  );
};

export default OfflineVideoQueue;
