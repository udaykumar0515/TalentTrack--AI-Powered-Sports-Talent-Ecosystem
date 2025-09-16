import { offlineStorage, StoredVideo } from './OfflineStorage';

class VideoSyncService {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncListeners: ((status: 'syncing' | 'idle' | 'error') => void)[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingVideos();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Check for pending videos on startup
    this.syncPendingVideos();
  }

  addSyncListener(listener: (status: 'syncing' | 'idle' | 'error') => void) {
    this.syncListeners.push(listener);
  }

  removeSyncListener(listener: (status: 'syncing' | 'idle' | 'error') => void) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  private notifyListeners(status: 'syncing' | 'idle' | 'error') {
    this.syncListeners.forEach(listener => listener(status));
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncPendingVideos(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    this.notifyListeners('syncing');
    
    try {
      const pendingVideos = await offlineStorage.getPendingVideos();
      console.log(`Found ${pendingVideos.length} videos to sync`);
      
      if (pendingVideos.length === 0) {
        this.notifyListeners('idle');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const video of pendingVideos) {
        const success = await this.uploadVideo(video);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      console.log(`Sync completed: ${successCount} successful, ${errorCount} failed`);
      this.notifyListeners(errorCount > 0 ? 'error' : 'idle');
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('error');
    } finally {
      this.syncInProgress = false;
    }
  }

  async uploadVideo(videoData: StoredVideo): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('file', videoData.videoBlob, `${videoData.sessionData.exercise}.mp4`);
      formData.append('session_data', JSON.stringify(videoData.sessionData));

      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await offlineStorage.markAsSynced(videoData.id);
        console.log(`Video ${videoData.id} synced successfully`);
        return true;
      } else {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to upload video ${videoData.id}:`, error);
      await offlineStorage.markAsFailed(videoData.id);
      return false;
    }
  }

  async retryFailedVideos(): Promise<void> {
    try {
      const videos = await offlineStorage.getStoredVideos();
      const failedVideos = videos.filter(video => video.syncStatus === 'failed');
      
      for (const video of failedVideos) {
        video.syncStatus = 'pending';
        await this.uploadVideo(video);
      }
    } catch (error) {
      console.error('Error retrying failed videos:', error);
    }
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  getSyncStatus(): 'syncing' | 'idle' | 'error' {
    if (this.syncInProgress) return 'syncing';
    return 'idle';
  }

  async getPendingCount(): Promise<number> {
    const pendingVideos = await offlineStorage.getPendingVideos();
    return pendingVideos.length;
  }

  async getFailedCount(): Promise<number> {
    const videos = await offlineStorage.getStoredVideos();
    return videos.filter(video => video.syncStatus === 'failed').length;
  }
}

export const videoSyncService = new VideoSyncService();
