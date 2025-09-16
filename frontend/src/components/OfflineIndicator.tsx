import React, { useState, useEffect } from 'react';
import { videoSyncService } from '../services/VideoSyncService';
import { Wifi, WifiOff, Sync, AlertCircle } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'idle' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleSyncStatusChange = (status: 'syncing' | 'idle' | 'error') => {
      setSyncStatus(status);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    videoSyncService.addSyncListener(handleSyncStatusChange);

    // Update counts periodically
    const updateCounts = async () => {
      const pending = await videoSyncService.getPendingCount();
      const failed = await videoSyncService.getFailedCount();
      setPendingCount(pending);
      setFailedCount(failed);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      videoSyncService.removeSyncListener(handleSyncStatusChange);
      clearInterval(interval);
    };
  }, []);

  const handleRetryFailed = async () => {
    await videoSyncService.retryFailedVideos();
  };

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <div className="offline-content">
        {!isOnline ? (
          <div className="offline-status">
            <WifiOff className="offline-icon" />
            <span>Offline - Videos will sync when online</span>
          </div>
        ) : syncStatus === 'syncing' ? (
          <div className="syncing-status">
            <Sync className="sync-icon spinning" />
            <span>Syncing videos...</span>
          </div>
        ) : failedCount > 0 ? (
          <div className="error-status">
            <AlertCircle className="error-icon" />
            <span>{failedCount} videos failed to sync</span>
            <button onClick={handleRetryFailed} className="retry-btn">
              Retry
            </button>
          </div>
        ) : pendingCount > 0 ? (
          <div className="pending-status">
            <Wifi className="online-icon" />
            <span>{pendingCount} videos pending sync</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OfflineIndicator;
