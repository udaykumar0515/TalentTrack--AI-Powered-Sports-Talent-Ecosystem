interface StoredVideo {
  id: string;
  videoBlob: Blob;
  sessionData: {
    exercise: string;
    athleteId: string;
    athleteName: string;
    coachId?: string;
    timestamp: string;
  };
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: string;
}

class OfflineStorageService {
  private dbName = 'SportsAI_Videos';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' });
        }
      };
    });
  }

  async storeVideo(videoBlob: Blob, sessionData: any): Promise<string> {
    if (!this.db) await this.init();
    
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storedVideo: StoredVideo = {
      id: videoId,
      videoBlob,
      sessionData,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const request = store.add(storedVideo);
      
      request.onsuccess = () => resolve(videoId);
      request.onerror = () => reject(request.error);
    });
  }

  async getStoredVideos(): Promise<StoredVideo[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingVideos(): Promise<StoredVideo[]> {
    const videos = await this.getStoredVideos();
    return videos.filter(video => video.syncStatus === 'pending');
  }

  async markAsSynced(videoId: string): Promise<void> {
    if (!this.db) await this.init();
    
    const videos = await this.getStoredVideos();
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    video.syncStatus = 'synced';
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const request = store.put(video);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markAsFailed(videoId: string): Promise<void> {
    if (!this.db) await this.init();
    
    const videos = await this.getStoredVideos();
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    video.syncStatus = 'failed';
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const request = store.put(video);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteVideo(videoId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const request = store.delete(videoId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getVideoById(videoId: string): Promise<StoredVideo | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const request = store.get(videoId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, available: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, available: 0 };
    }
  }
}

export const offlineStorage = new OfflineStorageService();
export type { StoredVideo };
