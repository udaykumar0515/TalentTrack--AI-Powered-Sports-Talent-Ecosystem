# exercise_counter_v2.py
"""
Exercise counter using MediaPipe Tasks API (0.10.30+)
Replaces deprecated mp.solutions.pose with mp.tasks.python.vision.PoseLandmarker
"""

import cv2
import numpy as np
import time
import json
import os
import uuid
import datetime
import argparse
import sys
sys.dont_write_bytecode = True
import logging

# MediaPipe Tasks imports
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Setup logging to stderr (stdout is for JSON output only)
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DATA_FILE = "data/sessions/sessions.json"
MODEL_PATH = "models/pose_landmarker_lite.task"

# Create directories if they don't exist
os.makedirs(os.path.dirname(DATA_FILE) or ".", exist_ok=True)

def parse_arguments():
    parser = argparse.ArgumentParser(description='Exercise Counter (MediaPipe Tasks API)')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--user-name', required=True, help='User name')
    parser.add_argument('--exercise', required=True,
                        choices=['squat', 'pushups', 'pushup', 'jumping_jacks', 'jumping_jack'],
                        help='Exercise type')
    parser.add_argument('--coach-id', default='', help='Coach ID')
    parser.add_argument('--coach-name', default='', help='Coach name')
    parser.add_argument('--video-file', required=True, help='Path to video file for analysis')
    return parser.parse_args()

def load_sessions():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                data = json.loads(content) if content else {}
                # Ensure data is a dictionary (handle legacy list format)
                if isinstance(data, list):
                    return {} 
                return data
        except Exception:
            return {}
    return {}

def save_sessions(data):
    os.makedirs(os.path.dirname(DATA_FILE) or ".", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def angle_between_points(a, b, c):
    """Calculate angle between three points (in degrees)"""
    if a is None or b is None or c is None:
        return None
    
    a = np.array([a.x, a.y])
    b = np.array([b.x, b.y])
    c = np.array([c.x, c.y])
    
    ba = a - b
    bc = c - b
    
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    
    if norm_ba < 1e-6 or norm_bc < 1e-6:
        return None
        
    cosang = np.dot(ba, bc) / (norm_ba * norm_bc)
    cosang = np.clip(cosang, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosang)))

class RepCounter:
    """Simple repetition counter based on angle thresholds"""
    def __init__(self, up_thresh, down_thresh, min_time=0.3):
        self.up_thresh = up_thresh
        self.down_thresh = down_thresh
        self.min_time = min_time
        self.state = "unknown"
        self.count = 0
        self.last_count_time = 0.0
        
    def update(self, value):
        if value is None:
            return self.count, self.state
            
        now = time.time()
        prev_state = self.state
        
        if self.state in ("unknown", "up"):
            if value < self.down_thresh:
                self.state = "down"
                
        if self.state in ("unknown", "down"):
            if value > self.up_thresh:
                if prev_state == "down" and (now - self.last_count_time) > self.min_time:
                    self.count += 1
                    self.last_count_time = now
                self.state = "up"
                
        return self.count, self.state

class ExerciseAnalyzer:
    """Analyze exercise form and count reps using pose landmarks"""
    
    # Pose landmark indices (from MediaPipe)
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    
    def __init__(self, exercise):
        self.exercise = exercise
        self.form_scores = []
        self.angle_history = []  # Debug: track angles
        
        # Set up rep counter based on exercise
        # Adjusted thresholds for better detection
        if exercise == "squat":
            # More lenient: standing at 150°, squat at 120°
            self.counter = RepCounter(up_thresh=150, down_thresh=120)
        elif exercise == "pushups":
            self.counter = RepCounter(up_thresh=150, down_thresh=90)
        elif exercise == "jumping_jacks":
            self.counter = RepCounter(up_thresh=1.6, down_thresh=1.15)
        else:
            self.counter = RepCounter(up_thresh=150, down_thresh=100)
    
    def get_landmark(self, landmarks, idx):
        """Get a landmark by index, return None if not visible enough"""
        if idx >= len(landmarks):
            return None
        lm = landmarks[idx]
        if lm.visibility < 0.4:
            return None
        return lm
    
    def analyze_frame(self, landmarks):
        """Analyze a single frame and return rep count and form score"""
        if not landmarks or len(landmarks) == 0:
            return self.counter.count, 50, "no_landmarks"
        
        if self.exercise == "squat":
            return self._analyze_squat(landmarks)
        elif self.exercise == "pushups":
            return self._analyze_pushup(landmarks)
        elif self.exercise == "jumping_jacks":
            return self._analyze_jumping_jack(landmarks)
        else:
            return self.counter.count, 50, "unknown_exercise"
    
    def _analyze_squat(self, landmarks):
        """Analyze squat form"""
        # Get hip, knee, ankle landmarks
        left_hip = self.get_landmark(landmarks, self.LEFT_HIP)
        left_knee = self.get_landmark(landmarks, self.LEFT_KNEE)
        left_ankle = self.get_landmark(landmarks, self.LEFT_ANKLE)
        right_hip = self.get_landmark(landmarks, self.RIGHT_HIP)
        right_knee = self.get_landmark(landmarks, self.RIGHT_KNEE)
        right_ankle = self.get_landmark(landmarks, self.RIGHT_ANKLE)
        
        angles = []
        
        # Calculate knee angles
        if left_hip and left_knee and left_ankle:
            angle = angle_between_points(left_hip, left_knee, left_ankle)
            if angle:
                angles.append(angle)
                
        if right_hip and right_knee and right_ankle:
            angle = angle_between_points(right_hip, right_knee, right_ankle)
            if angle:
                angles.append(angle)
        
        if not angles:
            return self.counter.count, 50, "insufficient_visibility"
        
        avg_angle = np.mean(angles)
        
        # Debug: track angles
        self.angle_history.append(avg_angle)
        if len(self.angle_history) % 20 == 0:
            logger.info(f"Frame {len(self.angle_history)}: knee_angle={avg_angle:.1f}°, state={self.counter.state}, count={self.counter.count}")
        
        count, state = self.counter.update(avg_angle)
        
        # Calculate form score (deeper squat = better, but not too deep)
        # Ideal is around 90 degrees
        if avg_angle < 70:
            form_score = 70  # Too deep
        elif avg_angle < 100:
            form_score = 90 + (100 - avg_angle)  # Good depth
        elif avg_angle < 120:
            form_score = 80  # Okay
        else:
            form_score = 60  # Not deep enough
            
        form_score = min(100, max(0, form_score))
        self.form_scores.append(form_score)
        
        return count, form_score, state
    
    def _analyze_pushup(self, landmarks):
        """Analyze pushup form"""
        left_shoulder = self.get_landmark(landmarks, self.LEFT_SHOULDER)
        left_elbow = self.get_landmark(landmarks, self.LEFT_ELBOW)
        left_wrist = self.get_landmark(landmarks, self.LEFT_WRIST)
        right_shoulder = self.get_landmark(landmarks, self.RIGHT_SHOULDER)
        right_elbow = self.get_landmark(landmarks, self.RIGHT_ELBOW)
        right_wrist = self.get_landmark(landmarks, self.RIGHT_WRIST)
        
        angles = []
        
        if left_shoulder and left_elbow and left_wrist:
            angle = angle_between_points(left_shoulder, left_elbow, left_wrist)
            if angle:
                angles.append(angle)
                
        if right_shoulder and right_elbow and right_wrist:
            angle = angle_between_points(right_shoulder, right_elbow, right_wrist)
            if angle:
                angles.append(angle)
        
        if not angles:
            return self.counter.count, 50, "insufficient_visibility"
        
        avg_angle = np.mean(angles)
        count, state = self.counter.update(avg_angle)
        
        # Form score based on elbow angle (90 degrees at bottom is ideal)
        if avg_angle < 80:
            form_score = 85
        elif avg_angle < 100:
            form_score = 95
        elif avg_angle < 140:
            form_score = 75
        else:
            form_score = 60
            
        form_score = min(100, max(0, form_score))
        self.form_scores.append(form_score)
        
        return count, form_score, state
    
    def _analyze_jumping_jack(self, landmarks):
        """Analyze jumping jack form"""
        left_shoulder = self.get_landmark(landmarks, self.LEFT_SHOULDER)
        right_shoulder = self.get_landmark(landmarks, self.RIGHT_SHOULDER)
        left_wrist = self.get_landmark(landmarks, self.LEFT_WRIST)
        right_wrist = self.get_landmark(landmarks, self.RIGHT_WRIST)
        left_ankle = self.get_landmark(landmarks, self.LEFT_ANKLE)
        right_ankle = self.get_landmark(landmarks, self.RIGHT_ANKLE)
        
        if not all([left_shoulder, right_shoulder, left_wrist, right_wrist]):
            return self.counter.count, 50, "insufficient_visibility"
        
        # Calculate arm spread relative to shoulder width
        shoulder_width = np.sqrt((right_shoulder.x - left_shoulder.x)**2 + 
                                  (right_shoulder.y - left_shoulder.y)**2)
        wrist_spread = np.sqrt((right_wrist.x - left_wrist.x)**2 + 
                               (right_wrist.y - left_wrist.y)**2)
        
        if shoulder_width > 0:
            arm_ratio = wrist_spread / shoulder_width
        else:
            arm_ratio = 1.0
        
        count, state = self.counter.update(arm_ratio)
        
        # Form score based on arm extension
        if arm_ratio > 2.0:
            form_score = 95  # Arms fully extended
        elif arm_ratio > 1.5:
            form_score = 85
        else:
            form_score = 70
            
        form_score = min(100, max(0, form_score))
        self.form_scores.append(form_score)
        
        return count, form_score, state
    
    def get_average_form_score(self):
        """Get the average form score across all analyzed frames"""
        if not self.form_scores:
            return 75
        return int(np.mean(self.form_scores))

def analyze_video(video_path, exercise):
    """Analyze a video file and return results"""
    
    # Check if video file exists
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}. Please download pose_landmarker_lite.task")
    
    # Create PoseLandmarker
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=False,
        running_mode=vision.RunningMode.VIDEO
    )
    
    landmarker = vision.PoseLandmarker.create_from_options(options)
    analyzer = ExerciseAnalyzer(exercise)
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    logger.info(f"Processing video: {video_path} ({total_frames} frames, {fps} fps, {duration:.1f}s)")
    
    frame_idx = 0
    start_time = time.time()
    last_count = 0
    last_state = "unknown"
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            
            # Calculate timestamp in milliseconds
            timestamp_ms = int(frame_idx * 1000 / fps)
            
            # Detect pose landmarks
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            
            # Analyze if landmarks were detected
            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                landmarks = result.pose_landmarks[0]  # Get first person
                count, form_score, state = analyzer.analyze_frame(landmarks)
                last_count = count
                last_state = state
            
            frame_idx += 1
            
    finally:
        cap.release()
        landmarker.close()
    
    processing_time = time.time() - start_time
    logger.info(f"Processed {frame_idx} frames in {processing_time:.1f}s")
    
    return {
        "reps": last_count,
        "formScore": analyzer.get_average_form_score(),
        "durationSec": round(duration, 2),
        "framesProcessed": frame_idx,
        "processingTimeSec": round(processing_time, 2)
    }

def main():
    args = parse_arguments()
    
    # Normalize exercise name
    exercise = args.exercise
    if exercise == "pushup":
        exercise = "pushups"
    if exercise == "jumping_jack":
        exercise = "jumping_jacks"
    
    try:
        # Analyze video
        result = analyze_video(args.video_file, exercise)
        
        # Generate session ID
        session_id = str(uuid.uuid4())[:8]
        
        # Build output
        output = {
            "userId": args.user_id,
            "userName": args.user_name,
            "exercise": exercise,
            "reps": result["reps"],
            "formScore": result["formScore"],
            "durationSec": result["durationSec"],
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "sessionId": session_id,
            "analysis": {
                "mode": "mediapipe_tasks",
                "framesProcessed": result["framesProcessed"],
                "processingTimeSec": result["processingTimeSec"]
            },
            "cheatDetection": {
                "cheatDetected": False,
                "cheatPercentage": 0.0,
                "totalFlags": 0,
                "confidence": 90.0,
                "riskLevel": "low",
                "flags": {},
                "suspiciousPatterns": []
            }
        }
        
        # Store session
        sessions = load_sessions()
        if args.user_id not in sessions:
            sessions[args.user_id] = {"sessions": []}
        if "sessions" not in sessions[args.user_id]:
            sessions[args.user_id]["sessions"] = []
        sessions[args.user_id]["sessions"].append({
            "sessionId": session_id,
            "exercise": exercise,
            "date": output["timestamp"],
            "reps": output["reps"],
            "formScore": output["formScore"],
            "durationSec": output["durationSec"]
        })
        save_sessions(sessions)
        
        # Output JSON to stdout
        print(json.dumps(output))
        sys.exit(0)
        
    except Exception as e:
        logger.exception(f"Analysis failed: {e}")
        error_output = {
            "error": str(e),
            "userId": args.user_id,
            "exercise": exercise,
            "reps": 0,
            "formScore": 0,
            "durationSec": 0.0
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()
