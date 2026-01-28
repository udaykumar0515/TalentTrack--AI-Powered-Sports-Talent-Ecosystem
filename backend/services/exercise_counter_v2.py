# exercise_counter_v2.py
"""
Enhanced exercise counter using MediaPipe Tasks API (0.10.30+)
With comprehensive cheat detection and detailed form metrics
Based on MediaPipe pose landmarker with risk assessment
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


class CheatDetector:
    """
    Comprehensive cheat detection system for exercise analysis
    Detects various cheating patterns and suspicious activities
    """
    
    def __init__(self, exercise_name):
        self.exercise = exercise_name
        self.frame_count = 0
        self.movement_history = []
        self.timing_history = []
        self.form_history = []
        self.cheat_flags = {
            'too_fast_reps': False,
            'inconsistent_form': False,
            'minimal_movement': False,
            'suspicious_timing': False,
            'form_deterioration': False,
            'repetitive_pattern': False
        }
        self.suspicious_patterns = []
        self.thresholds = self._get_exercise_thresholds()
    
    def _get_exercise_thresholds(self):
        """Get cheat detection thresholds for specific exercises"""
        if self.exercise == "squat":
            return {
                'min_rep_duration': 0.8,
                'max_rep_duration': 8.0,
                'min_angle_change': 30,
                'min_movement': 0.1,
                'form_consistency_threshold': 0.7,
                'max_speed_variation': 0.5
            }
        elif self.exercise == "pushups":
            return {
                'min_rep_duration': 0.6,
                'max_rep_duration': 6.0,
                'min_angle_change': 40,
                'min_movement': 0.08,
                'form_consistency_threshold': 0.75,
                'max_speed_variation': 0.4
            }
        elif self.exercise == "jumping_jacks":
            return {
                'min_rep_duration': 0.4,
                'max_rep_duration': 3.0,
                'min_movement': 0.15,
                'form_consistency_threshold': 0.8,
                'max_speed_variation': 0.3
            }
        else:
            return {
                'min_rep_duration': 0.5,
                'max_rep_duration': 5.0,
                'min_movement': 0.1,
                'form_consistency_threshold': 0.7,
                'max_speed_variation': 0.5
            }
    
    def analyze_frame(self, form_score, rep_count, angle_data=None):
        """Analyze current frame for cheating patterns"""
        self.frame_count += 1
        
        # Store form score history
        if form_score is not None:
            self.form_history.append(form_score)
            if len(self.form_history) > 60:
                self.form_history.pop(0)
        
        # Store movement data
        if angle_data:
            self.movement_history.append({
                'angle': angle_data,
                'frame_time': time.time()
            })
            if len(self.movement_history) > 60:
                self.movement_history.pop(0)
        
        # Run detection algorithms
        self._detect_inconsistent_form()
        self._detect_minimal_movement()
        self._detect_form_deterioration()
    
    def record_rep_completion(self, form_score):
        """Record when a rep is completed for timing analysis"""
        current_time = time.time()
        self.timing_history.append({
            'time': current_time,
            'form_score': form_score
        })
        
        # Check for too fast reps
        if len(self.timing_history) >= 2:
            rep_duration = current_time - self.timing_history[-2]['time']
            if rep_duration < self.thresholds['min_rep_duration']:
                self.cheat_flags['too_fast_reps'] = True
                self.suspicious_patterns.append(f"Rep completed too fast ({rep_duration:.2f}s)")
        
        # Check for suspicious timing (too regular)
        if len(self.timing_history) >= 3:
            intervals = []
            for i in range(1, len(self.timing_history)):
                intervals.append(self.timing_history[i]['time'] - self.timing_history[i-1]['time'])
            if len(intervals) >= 2:
                variance = np.var(intervals)
                if variance < 0.05:  # Very regular timing
                    self.cheat_flags['suspicious_timing'] = True
        
        # Keep only last 10 rep timings
        if len(self.timing_history) > 10:
            self.timing_history.pop(0)
    
    def _detect_inconsistent_form(self):
        """Detect inconsistent form across frames"""
        if len(self.form_history) < 15:
            return
        
        recent_forms = self.form_history[-15:]
        form_variance = np.var(recent_forms)
        threshold = (1 - self.thresholds['form_consistency_threshold']) * 100
        
        if form_variance > threshold * 5:  # High variance
            self.cheat_flags['inconsistent_form'] = True
    
    def _detect_minimal_movement(self):
        """Detect minimal movement patterns"""
        if len(self.movement_history) < 10:
            return
        
        recent = self.movement_history[-10:]
        angles = [m['angle'] for m in recent if m['angle'] is not None]
        
        if len(angles) >= 5:
            angle_range = max(angles) - min(angles)
            if angle_range < self.thresholds['min_angle_change']:
                self.cheat_flags['minimal_movement'] = True
    
    def _detect_form_deterioration(self):
        """Detect if form is deteriorating over time"""
        if len(self.form_history) < 20:
            return
        
        mid_point = len(self.form_history) // 2
        first_half = self.form_history[:mid_point]
        second_half = self.form_history[mid_point:]
        
        if len(first_half) > 0 and len(second_half) > 0:
            first_avg = np.mean(first_half)
            second_avg = np.mean(second_half)
            
            if first_avg - second_avg > 15:  # 15 point drop
                self.cheat_flags['form_deterioration'] = True
    
    def get_cheat_summary(self):
        """Get summary of detected cheating patterns"""
        cheat_count = sum(1 for flag in self.cheat_flags.values() if flag)
        cheat_percentage = (cheat_count / len(self.cheat_flags)) * 100
        
        return {
            'cheat_detected': cheat_count > 0,
            'cheat_percentage': round(cheat_percentage, 1),
            'cheat_flags': self.cheat_flags.copy(),
            'suspicious_patterns': list(set(self.suspicious_patterns))[-5:],  # Last 5 unique
            'total_flags': cheat_count,
            'confidence': round(min(100, 100 - cheat_percentage * 0.8), 1)
        }


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
        counted_rep = False
        
        if self.state in ("unknown", "up"):
            if value < self.down_thresh:
                self.state = "down"
                
        if self.state in ("unknown", "down"):
            if value > self.up_thresh:
                if prev_state == "down" and (now - self.last_count_time) > self.min_time:
                    self.count += 1
                    self.last_count_time = now
                    counted_rep = True
                self.state = "up"
                
        return self.count, self.state, counted_rep


class ExerciseAnalyzer:
    """Analyze exercise form and count reps using pose landmarks with cheat detection"""
    
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
        self.angle_history = []
        self.rep_form_scores = []  # Form score at each rep
        self.cheat_detector = CheatDetector(exercise)
        
        # Set up rep counter based on exercise
        if exercise == "squat":
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
            return self.counter.count, 50, "no_landmarks", False
        
        if self.exercise == "squat":
            return self._analyze_squat(landmarks)
        elif self.exercise == "pushups":
            return self._analyze_pushup(landmarks)
        elif self.exercise == "jumping_jacks":
            return self._analyze_jumping_jack(landmarks)
        else:
            return self.counter.count, 50, "unknown_exercise", False
    
    def _analyze_squat(self, landmarks):
        """Analyze squat form with detailed metrics"""
        left_hip = self.get_landmark(landmarks, self.LEFT_HIP)
        left_knee = self.get_landmark(landmarks, self.LEFT_KNEE)
        left_ankle = self.get_landmark(landmarks, self.LEFT_ANKLE)
        right_hip = self.get_landmark(landmarks, self.RIGHT_HIP)
        right_knee = self.get_landmark(landmarks, self.RIGHT_KNEE)
        right_ankle = self.get_landmark(landmarks, self.RIGHT_ANKLE)
        
        angles = []
        
        if left_hip and left_knee and left_ankle:
            angle = angle_between_points(left_hip, left_knee, left_ankle)
            if angle:
                angles.append(angle)
                
        if right_hip and right_knee and right_ankle:
            angle = angle_between_points(right_hip, right_knee, right_ankle)
            if angle:
                angles.append(angle)
        
        if not angles:
            return self.counter.count, 50, "insufficient_visibility", False
        
        avg_angle = np.mean(angles)
        self.angle_history.append(avg_angle)
        
        count, state, counted_rep = self.counter.update(avg_angle)
        
        # Calculate form score
        if avg_angle < 70:
            form_score = 70
        elif avg_angle < 100:
            form_score = 90 + (100 - avg_angle) * 0.3
        elif avg_angle < 120:
            form_score = 80
        else:
            form_score = 60
            
        form_score = min(100, max(0, form_score))
        self.form_scores.append(form_score)
        
        # Cheat detection
        self.cheat_detector.analyze_frame(form_score, count, avg_angle)
        if counted_rep:
            self.cheat_detector.record_rep_completion(form_score)
            self.rep_form_scores.append(form_score)
        
        return count, form_score, state, counted_rep
    
    def _analyze_pushup(self, landmarks):
        """Analyze pushup form with detailed metrics"""
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
            return self.counter.count, 50, "insufficient_visibility", False
        
        avg_angle = np.mean(angles)
        self.angle_history.append(avg_angle)
        
        count, state, counted_rep = self.counter.update(avg_angle)
        
        # Form score
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
        
        # Cheat detection
        self.cheat_detector.analyze_frame(form_score, count, avg_angle)
        if counted_rep:
            self.cheat_detector.record_rep_completion(form_score)
            self.rep_form_scores.append(form_score)
        
        return count, form_score, state, counted_rep
    
    def _analyze_jumping_jack(self, landmarks):
        """Analyze jumping jack form"""
        left_shoulder = self.get_landmark(landmarks, self.LEFT_SHOULDER)
        right_shoulder = self.get_landmark(landmarks, self.RIGHT_SHOULDER)
        left_wrist = self.get_landmark(landmarks, self.LEFT_WRIST)
        right_wrist = self.get_landmark(landmarks, self.RIGHT_WRIST)
        
        if not all([left_shoulder, right_shoulder, left_wrist, right_wrist]):
            return self.counter.count, 50, "insufficient_visibility", False
        
        # Calculate arm spread relative to shoulder width
        shoulder_width = np.sqrt((right_shoulder.x - left_shoulder.x)**2 + 
                                  (right_shoulder.y - left_shoulder.y)**2)
        wrist_spread = np.sqrt((right_wrist.x - left_wrist.x)**2 + 
                               (right_wrist.y - left_wrist.y)**2)
        
        arm_ratio = wrist_spread / shoulder_width if shoulder_width > 0 else 1.0
        self.angle_history.append(arm_ratio * 100)  # Normalize for history
        
        count, state, counted_rep = self.counter.update(arm_ratio)
        
        # Form score
        if arm_ratio > 2.0:
            form_score = 95
        elif arm_ratio > 1.5:
            form_score = 85
        else:
            form_score = 70
            
        form_score = min(100, max(0, form_score))
        self.form_scores.append(form_score)
        
        # Cheat detection
        self.cheat_detector.analyze_frame(form_score, count, arm_ratio * 100)
        if counted_rep:
            self.cheat_detector.record_rep_completion(form_score)
            self.rep_form_scores.append(form_score)
        
        return count, form_score, state, counted_rep
    
    def get_average_form_score(self):
        """Get the average form score across all analyzed frames"""
        if not self.form_scores:
            return 75
        return int(np.mean(self.form_scores))
    
    def get_detailed_metrics(self):
        """Get detailed metrics for the analysis"""
        metrics = {
            'avgAngle': round(np.mean(self.angle_history), 1) if self.angle_history else 0,
            'minAngle': round(min(self.angle_history), 1) if self.angle_history else 0,
            'maxAngle': round(max(self.angle_history), 1) if self.angle_history else 0,
            'angleRange': round(max(self.angle_history) - min(self.angle_history), 1) if self.angle_history else 0,
            'formConsistency': round(1 - (np.std(self.form_scores) / 100), 2) if len(self.form_scores) > 1 else 1.0,
            'repFormScores': self.rep_form_scores[-10:],  # Last 10 rep scores
            'totalFramesAnalyzed': len(self.form_scores)
        }
        return metrics


def calculate_risk_level(form_score, cheat_analysis, duration, total_reps):
    """Calculate risk level based on multiple factors"""
    risk_level = "low"
    risk_factors = []
    
    # Factor 1: Cheat detection
    if cheat_analysis['cheat_percentage'] > 50:
        risk_level = "high"
        risk_factors.append("form issues detected")
    elif cheat_analysis['cheat_percentage'] > 25:
        if risk_level == "low":
            risk_level = "medium"
        risk_factors.append("minor form issues")
    
    # Factor 2: Form score
    if form_score < 50:
        risk_level = "high"
        risk_factors.append("very low form score")
    elif form_score < 70:
        if risk_level == "low":
            risk_level = "medium"
        risk_factors.append("low form score")
    
    # Factor 3: Speed
    if duration > 0 and total_reps > 0:
        reps_per_minute = (total_reps * 60) / duration
        if reps_per_minute > 50:
            if risk_level == "low":
                risk_level = "medium"
            risk_factors.append("very fast pace")
    
    # Generate explanation
    if risk_level == "high":
        if "very low form score" in risk_factors:
            explanation = "⚠️ Your form needs immediate attention. Focus on proper technique to avoid injury."
        elif "form issues detected" in risk_factors:
            explanation = "⚠️ Your form needs attention. Slow down and focus on technique."
        else:
            explanation = "⚠️ Focus on proper technique to avoid injury and get better results."
    elif risk_level == "medium":
        if "very fast pace" in risk_factors:
            explanation = "⚡ Good effort! Slow down a bit for better form."
        elif "low form score" in risk_factors:
            explanation = "⚡ Good effort! Focus on maintaining consistent form."
        else:
            explanation = "⚡ Good effort! Your form is mostly correct with room for improvement."
    else:
        explanation = "✅ Excellent form! You're performing the exercise safely and effectively."
    
    return risk_level, risk_factors, explanation


def analyze_video(video_path, exercise):
    """Analyze a video file and return comprehensive results"""
    
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
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
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            timestamp_ms = int(frame_idx * 1000 / fps)
            
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                landmarks = result.pose_landmarks[0]
                count, form_score, state, _ = analyzer.analyze_frame(landmarks)
                last_count = count
            
            frame_idx += 1
            
    finally:
        cap.release()
        landmarker.close()
    
    processing_time = time.time() - start_time
    logger.info(f"Processed {frame_idx} frames in {processing_time:.1f}s")
    
    # Get all analysis results
    avg_form_score = analyzer.get_average_form_score()
    cheat_summary = analyzer.cheat_detector.get_cheat_summary()
    detailed_metrics = analyzer.get_detailed_metrics()
    risk_level, risk_factors, risk_explanation = calculate_risk_level(
        avg_form_score, cheat_summary, duration, last_count
    )
    
    return {
        "reps": last_count,
        "formScore": avg_form_score,
        "durationSec": round(duration, 2),
        "framesProcessed": frame_idx,
        "processingTimeSec": round(processing_time, 2),
        "cheatDetection": {
            **cheat_summary,
            "riskLevel": risk_level,
            "riskExplanation": risk_explanation,
            "riskFactors": risk_factors
        },
        "metrics": detailed_metrics
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
        
        # Build comprehensive output
        output = {
            "userId": args.user_id,
            "userName": args.user_name,
            "exercise": exercise,
            "reps": result["reps"],
            "formScore": result["formScore"],
            "durationSec": result["durationSec"],
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
            "sessionId": session_id,
            "analysis": {
                "mode": "mediapipe_tasks_v2",
                "framesProcessed": result["framesProcessed"],
                "processingTimeSec": result["processingTimeSec"]
            },
            "cheatDetection": result["cheatDetection"],
            "metrics": result["metrics"]
        }
        
        # Add coach info if provided
        if args.coach_id:
            output["coachId"] = args.coach_id
        if args.coach_name:
            output["coachName"] = args.coach_name
        
        
        # Note: Session storage is handled by main.py to avoid duplicates
        # Just output the result JSON
        
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
            "durationSec": 0.0,
            "cheatDetection": {
                "cheatDetected": False,
                "cheatPercentage": 0.0,
                "totalFlags": 0,
                "confidence": 0.0,
                "riskLevel": "unknown",
                "riskExplanation": "Analysis failed",
                "riskFactors": [],
                "cheat_flags": {},
                "suspiciousPatterns": []
            }
        }
        print(json.dumps(error_output))
        sys.exit(1)


if __name__ == "__main__":
    main()
