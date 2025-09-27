#!/usr/bin/env python3
"""
Offline Video Manager
Handles offline video storage, queuing, and deferred analysis
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

class OfflineVideoManager:
    def __init__(self, offline_videos_file: str = "data/videos/offline_videos.json"):
        self.offline_videos_file = offline_videos_file
        self.ensure_offline_videos_file()
    
    def ensure_offline_videos_file(self):
        """Ensure offline videos file exists with proper structure"""
        if not os.path.exists(self.offline_videos_file):
            os.makedirs(os.path.dirname(self.offline_videos_file), exist_ok=True)
            with open(self.offline_videos_file, 'w') as f:
                json.dump({}, f)
    
    def store_offline_video(self, user_id: str, video_data: Dict[str, Any]) -> Dict[str, Any]:
        """Store a video recorded offline with metadata"""
        try:
            import base64
            import os
            
            offline_videos = self.load_offline_videos()
            
            video_id = f"offline_{user_id}_{len(offline_videos.get(user_id, [])) + 1}_{int(datetime.now().timestamp())}"
            
            # Create directory for user's offline videos
            user_video_dir = f"videos/athletes/{user_id}/offline"
            os.makedirs(user_video_dir, exist_ok=True)
            
            # Save video as actual file
            video_blob = video_data.get("video_blob", "")
            video_filename = f"{video_id}.mp4"
            video_path = os.path.join(user_video_dir, video_filename)
            
            if video_blob.startswith("data:video/"):
                video_blob = video_blob.split(",")[1]
            
            with open(video_path, "wb") as f:
                f.write(base64.b64decode(video_blob))
            
            offline_video = {
                "id": video_id,
                "user_id": user_id,
                "video_path": video_path,  # Store file path instead of blob
                "video_name": video_data.get("video_name", f"offline_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"),
                "exercise_type": video_data.get("exercise_type", "unknown"),
                "recorded_at": video_data.get("recorded_at", datetime.now().isoformat()),
                "file_size": video_data.get("file_size", 0),
                "duration": video_data.get("duration", 0),
                "status": "pending_analysis",
                "created_at": datetime.now().isoformat(),
                "notes": video_data.get("notes", ""),
                "location": video_data.get("location", ""),
                "device_info": video_data.get("device_info", {})
            }
            
            if user_id not in offline_videos:
                offline_videos[user_id] = []
            
            offline_videos[user_id].append(offline_video)
            self.save_offline_videos(offline_videos)
            
            return offline_video
            
        except Exception as e:
            print(f"Error storing offline video: {e}")
            return {}
    
    def get_user_offline_videos(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all offline videos for a user, optionally filtered by status"""
        try:
            offline_videos = self.load_offline_videos()
            user_videos = offline_videos.get(user_id, [])
            
            if status:
                user_videos = [video for video in user_videos if video.get("status") == status]
            
            return user_videos
            
        except Exception as e:
            print(f"Error getting user offline videos: {e}")
            return []
    
    def update_video_status(self, user_id: str, video_id: str, status: str, analysis_data: Optional[Dict[str, Any]] = None) -> bool:
        """Update the status of an offline video"""
        try:
            offline_videos = self.load_offline_videos()
            user_videos = offline_videos.get(user_id, [])
            
            for i, video in enumerate(user_videos):
                if video["id"] == video_id:
                    video["status"] = status
                    video["updated_at"] = datetime.now().isoformat()
                    
                    if analysis_data:
                        video["analysis_data"] = analysis_data
                        video["analyzed_at"] = datetime.now().isoformat()
                    
                    user_videos[i] = video
                    offline_videos[user_id] = user_videos
                    self.save_offline_videos(offline_videos)
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error updating video status: {e}")
            return False
    
    def delete_offline_video(self, user_id: str, video_id: str) -> bool:
        """Delete an offline video"""
        try:
            offline_videos = self.load_offline_videos()
            user_videos = offline_videos.get(user_id, [])
            
            user_videos = [video for video in user_videos if video["id"] != video_id]
            offline_videos[user_id] = user_videos
            self.save_offline_videos(offline_videos)
            return True
            
        except Exception as e:
            print(f"Error deleting offline video: {e}")
            return False
    
    def get_pending_analysis_videos(self) -> List[Dict[str, Any]]:
        """Get all videos pending analysis across all users"""
        try:
            offline_videos = self.load_offline_videos()
            pending_videos = []
            
            for user_id, user_videos in offline_videos.items():
                for video in user_videos:
                    if video.get("status") == "pending_analysis":
                        pending_videos.append(video)
            
            return pending_videos
            
        except Exception as e:
            print(f"Error getting pending analysis videos: {e}")
            return []
    
    def process_offline_video(self, video_id: str, analysis_result: Dict[str, Any]) -> bool:
        """Process an offline video with analysis results"""
        try:
            offline_videos = self.load_offline_videos()
            
            for user_id, user_videos in offline_videos.items():
                for i, video in enumerate(user_videos):
                    if video["id"] == video_id:
                        video["status"] = "analyzed"
                        video["analysis_data"] = analysis_result
                        video["analyzed_at"] = datetime.now().isoformat()
                        video["updated_at"] = datetime.now().isoformat()
                        
                        user_videos[i] = video
                        offline_videos[user_id] = user_videos
                        self.save_offline_videos(offline_videos)
                        return True
            
            return False
            
        except Exception as e:
            print(f"Error processing offline video: {e}")
            return False
    
    def get_offline_video_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for user's offline videos"""
        try:
            offline_videos = self.get_user_offline_videos(user_id)
            
            total_videos = len(offline_videos)
            pending_videos = len([v for v in offline_videos if v.get("status") == "pending_analysis"])
            analyzed_videos = len([v for v in offline_videos if v.get("status") == "analyzed"])
            failed_videos = len([v for v in offline_videos if v.get("status") == "failed"])
            
            total_size = sum(v.get("file_size", 0) for v in offline_videos)
            total_duration = sum(v.get("duration", 0) for v in offline_videos)
            
            return {
                "total_videos": total_videos,
                "pending_videos": pending_videos,
                "analyzed_videos": analyzed_videos,
                "failed_videos": failed_videos,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_duration_minutes": round(total_duration / 60, 2),
                "last_upload": offline_videos[-1]["created_at"] if offline_videos else None
            }
            
        except Exception as e:
            print(f"Error getting offline video stats: {e}")
            return {}
    
    def cleanup_old_videos(self, days_old: int = 30) -> int:
        """Clean up videos older than specified days"""
        try:
            offline_videos = self.load_offline_videos()
            cutoff_date = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
            cleaned_count = 0
            
            for user_id, user_videos in offline_videos.items():
                original_count = len(user_videos)
                user_videos = [
                    video for video in user_videos 
                    if datetime.fromisoformat(video["created_at"]).timestamp() > cutoff_date
                ]
                cleaned_count += original_count - len(user_videos)
                offline_videos[user_id] = user_videos
            
            self.save_offline_videos(offline_videos)
            return cleaned_count
            
        except Exception as e:
            print(f"Error cleaning up old videos: {e}")
            return 0
    
    def load_offline_videos(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load offline videos from file"""
        try:
            with open(self.offline_videos_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    
    def save_offline_videos(self, offline_videos: Dict[str, List[Dict[str, Any]]]):
        """Save offline videos to file"""
        with open(self.offline_videos_file, 'w') as f:
            json.dump(offline_videos, f, indent=2)
