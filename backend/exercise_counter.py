# exercise_counter.py
"""
Improved exercise counter (fixed for backend integration).
- prints only final JSON to stdout
- all runtime/logging goes to stderr
- supports --video-file (headless) and webcam (interactive)
- accepts exercise synonyms (pushup/pushups, jumping_jack/jumping_jacks)
"""

import cv2
import mediapipe as mp
import numpy as np
import time
import json
import os
import uuid
import datetime
import argparse
import sys
import logging

PYTHON_EXECUTABLE = sys.executable  # use the same Python running FastAPI

# send logs to stderr
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

mp_pose = mp.solutions.pose
LM = mp_pose.PoseLandmark
DATA_FILE = "data/sessions/sessions.json"

# Create sessions directory if it doesn't exist
os.makedirs(os.path.dirname(DATA_FILE) or ".", exist_ok=True)

def parse_arguments():
    parser = argparse.ArgumentParser(description='Exercise Counter')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--user-name', required=True, help='User name')
    # accept synonyms to avoid mismatch errors
    parser.add_argument('--exercise', required=True,
                        choices=['squat', 'pushups', 'pushup', 'jumping_jacks', 'jumping_jack'],
                        help='Exercise type')
    parser.add_argument('--coach-id', default='', help='Coach ID')
    parser.add_argument('--coach-name', default='', help='Coach name')
    parser.add_argument('--video-file', help='Path to video file for analysis')
    return parser.parse_args()

# --- helper functions (unchanged) ---
def load_sessions():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return json.loads(content) if content else {}
        except Exception:
            try:
                os.rename(DATA_FILE, DATA_FILE + ".bak")
            except Exception:
                pass
            return {}
    return {}

def save_sessions(data):
    os.makedirs(os.path.dirname(DATA_FILE) or ".", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def store_session(user_id, exercise, reps, duration):
    data = load_sessions()
    session = {
        "sessionId": str(uuid.uuid4())[:8],
        "exercise": exercise,
        "date": datetime.datetime.utcnow().isoformat() + "Z",
        "reps": int(reps),
        "durationSec": float(round(duration, 3))
    }
    if user_id not in data:
        data[user_id] = {"sessions": []}
    if "sessions" not in data[user_id]:
        data[user_id]["sessions"] = []
    data[user_id]["sessions"].append(session)
    save_sessions(data)
    return session

def lm_coord(landmarks, idx, img_w, img_h):
    try:
        lm = landmarks[idx]
        return int(lm.x * img_w), int(lm.y * img_h), lm.visibility
    except (IndexError, AttributeError):
        return None, None, 0.0

def distance(a, b):
    if a is None or b is None or None in a or None in b:
        return 0
    return np.linalg.norm(np.array(a[:2]) - np.array(b[:2]))

def angle_between(a, b, c):
    if None in [a, b, c] or None in a or None in b or None in c:
        return None
    a = np.array(a[:2], dtype=np.float32)
    b = np.array(b[:2], dtype=np.float32)
    c = np.array(c[:2], dtype=np.float32)
    ba = a - b
    bc = c - b
    if np.linalg.norm(ba) < 1e-6 or np.linalg.norm(bc) < 1e-6:
        return None
    cosang = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    cosang = np.clip(cosang, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosang)))

class EWMA:
    def __init__(self, alpha=0.35, init=None):
        self.alpha = alpha
        self.value = init
        
    def update(self, x):
        if x is None:
            return self.value
        if self.value is None:
            self.value = x
        else:
            self.value = self.alpha * x + (1 - self.alpha) * self.value
        return self.value

class RepetitionCounter:
    def __init__(self, up_thresh, down_thresh, min_time_between=0.25):
        self.up_thresh = up_thresh
        self.down_thresh = down_thresh
        self.state = "unknown"
        self.count = 0
        self.last_count_time = 0.0
        self.min_time_between = min_time_between
        self.last_transition_time = time.time()
        self.last_value = None
        
    def reset(self):
        self.state = "unknown"
        self.count = 0
        self.last_count_time = 0.0
        self.last_transition_time = time.time()
        self.last_value = None
        
    def update(self, value):
        if value is None:
            return self.count, self.state
            
        prev_state = self.state
        now = time.time()
        
        if self.state in ("unknown", "up"):
            if value < self.down_thresh:
                self.state = "down"
                self.last_transition_time = now
                
        if self.state in ("unknown", "down"):
            if value > self.up_thresh:
                if prev_state == "down" and (now - self.last_count_time) > self.min_time_between:
                    self.count += 1
                    self.last_count_time = now
                self.state = "up"
                self.last_transition_time = now
                
        self.last_value = value
        return self.count, self.state

def sufficient_visibility(landmarks, indices, img_w, img_h, min_vis=0.45):
    # indices: list of LM enum entries
    for idx in indices:
        _, _, v = lm_coord(landmarks, idx, img_w, img_h)
        if v < min_vis:
            return False
    return True

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
        
        # Exercise-specific thresholds
        self.thresholds = self._get_exercise_thresholds()
    
    def _get_exercise_thresholds(self):
        """Get cheat detection thresholds for specific exercises"""
        if self.exercise == "squat":
            return {
                'min_rep_duration': 0.8,  # Minimum seconds per rep
                'max_rep_duration': 8.0,  # Maximum seconds per rep
                'min_knee_angle_change': 30,  # Minimum knee angle change
                'min_hip_movement': 0.1,  # Minimum hip vertical movement
                'form_consistency_threshold': 0.7,  # Minimum form consistency
                'max_speed_variation': 0.5,  # Maximum speed variation between reps
                'min_visibility_frames': 0.8  # Minimum visibility frames per rep
            }
        elif self.exercise == "pushups":
            return {
                'min_rep_duration': 0.6,
                'max_rep_duration': 6.0,
                'min_elbow_angle_change': 40,
                'min_shoulder_movement': 0.08,
                'form_consistency_threshold': 0.75,
                'max_speed_variation': 0.4,
                'min_visibility_frames': 0.85
            }
        elif self.exercise == "jumping_jacks":
            return {
                'min_rep_duration': 0.4,
                'max_rep_duration': 3.0,
                'min_arm_movement': 0.15,
                'min_leg_movement': 0.12,
                'form_consistency_threshold': 0.8,
                'max_speed_variation': 0.3,
                'min_visibility_frames': 0.9
            }
        else:
            return {
                'min_rep_duration': 0.5,
                'max_rep_duration': 5.0,
                'min_movement': 0.1,
                'form_consistency_threshold': 0.7,
                'max_speed_variation': 0.5,
                'min_visibility_frames': 0.8
            }
    
    def analyze_frame(self, landmarks, form_score, rep_count, is_rep_active):
        """Analyze current frame for cheating patterns"""
        self.frame_count += 1
        
        # Extract key metrics
        metrics = self._extract_metrics(landmarks)
        if metrics:
            self.movement_history.append(metrics)
            # Keep only last 30 frames for analysis
            if len(self.movement_history) > 30:
                self.movement_history.pop(0)
        
        # Store form score
        self.form_history.append(form_score)
        if len(self.form_history) > 30:
            self.form_history.pop(0)
        
        # Detect cheating patterns
        self._detect_too_fast_reps(rep_count, is_rep_active)
        self._detect_inconsistent_form()
        self._detect_minimal_movement()
        self._detect_suspicious_timing()
        self._detect_form_deterioration()
        self._detect_repetitive_patterns()
        
        return self.get_cheat_summary()
    
    def _extract_metrics(self, landmarks):
        """Extract key movement metrics from landmarks"""
        try:
            if self.exercise == "squat":
                return self._extract_squat_metrics(landmarks)
            elif self.exercise == "pushups":
                return self._extract_pushup_metrics(landmarks)
            elif self.exercise == "jumping_jacks":
                return self._extract_jj_metrics(landmarks)
            else:
                return self._extract_generic_metrics(landmarks)
        except:
            return None
    
    def _extract_squat_metrics(self, landmarks):
        """Extract squat-specific metrics"""
        def g(idx): return lm_coord(landmarks, idx, 640, 480)
        
        left_hip = g(LM.LEFT_HIP)
        right_hip = g(LM.RIGHT_HIP)
        left_knee = g(LM.LEFT_KNEE)
        right_knee = g(LM.RIGHT_KNEE)
        left_ankle = g(LM.LEFT_ANKLE)
        right_ankle = g(LM.RIGHT_ANKLE)
        
        if all(coord[2] > 0.4 for coord in [left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle]):
            # Calculate hip center height
            hip_center_y = (left_hip[1] + right_hip[1]) / 2
            
            # Calculate knee angles
            left_knee_angle = angle_between(left_hip, left_knee, left_ankle) or 180
            right_knee_angle = angle_between(right_hip, right_knee, right_ankle) or 180
            avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
            
            return {
                'hip_height': hip_center_y,
                'knee_angle': avg_knee_angle,
                'frame_time': time.time()
            }
        return None
    
    def _extract_pushup_metrics(self, landmarks):
        """Extract pushup-specific metrics"""
        def g(idx): return lm_coord(landmarks, idx, 640, 480)
        
        left_shoulder = g(LM.LEFT_SHOULDER)
        right_shoulder = g(LM.RIGHT_SHOULDER)
        left_elbow = g(LM.LEFT_ELBOW)
        right_elbow = g(LM.RIGHT_ELBOW)
        left_wrist = g(LM.LEFT_WRIST)
        right_wrist = g(LM.RIGHT_WRIST)
        
        if all(coord[2] > 0.4 for coord in [left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist]):
            # Calculate shoulder height
            shoulder_center_y = (left_shoulder[1] + right_shoulder[1]) / 2
            
            # Calculate elbow angles
            left_elbow_angle = angle_between(left_shoulder, left_elbow, left_wrist) or 180
            right_elbow_angle = angle_between(right_shoulder, right_elbow, right_wrist) or 180
            avg_elbow_angle = (left_elbow_angle + right_elbow_angle) / 2
            
            return {
                'shoulder_height': shoulder_center_y,
                'elbow_angle': avg_elbow_angle,
                'frame_time': time.time()
            }
        return None
    
    def _extract_jj_metrics(self, landmarks):
        """Extract jumping jack-specific metrics"""
        def g(idx): return lm_coord(landmarks, idx, 640, 480)
        
        left_shoulder = g(LM.LEFT_SHOULDER)
        right_shoulder = g(LM.RIGHT_SHOULDER)
        left_wrist = g(LM.LEFT_WRIST)
        right_wrist = g(LM.RIGHT_WRIST)
        left_hip = g(LM.LEFT_HIP)
        right_hip = g(LM.RIGHT_HIP)
        left_ankle = g(LM.LEFT_ANKLE)
        right_ankle = g(LM.RIGHT_ANKLE)
        
        if all(coord[2] > 0.4 for coord in [left_shoulder, right_shoulder, left_wrist, right_wrist, left_hip, right_hip, left_ankle, right_ankle]):
            # Calculate arm spread
            arm_distance = ((left_wrist[0] - right_wrist[0])**2 + (left_wrist[1] - right_wrist[1])**2)**0.5
            
            # Calculate leg spread
            leg_distance = ((left_ankle[0] - right_ankle[0])**2 + (left_ankle[1] - right_ankle[1])**2)**0.5
            
            return {
                'arm_distance': arm_distance,
                'leg_distance': leg_distance,
                'frame_time': time.time()
            }
        return None
    
    def _extract_generic_metrics(self, landmarks):
        """Extract generic movement metrics"""
        def g(idx): return lm_coord(landmarks, idx, 640, 480)
        
        # Use hip center as reference point
        left_hip = g(LM.LEFT_HIP)
        right_hip = g(LM.RIGHT_HIP)
        
        if left_hip[2] > 0.4 and right_hip[2] > 0.4:
            hip_center_y = (left_hip[1] + right_hip[1]) / 2
            return {
                'hip_height': hip_center_y,
                'frame_time': time.time()
            }
        return None
    
    def _detect_too_fast_reps(self, rep_count, is_rep_active):
        """Detect if reps are being performed too fast"""
        if len(self.timing_history) < 2:
            return
        
        # Check if current rep is too fast
        if is_rep_active and len(self.timing_history) > 0:
            current_time = time.time()
            last_rep_time = self.timing_history[-1]
            rep_duration = current_time - last_rep_time
            
            if rep_duration < self.thresholds['min_rep_duration']:
                self.cheat_flags['too_fast_reps'] = True
                self.suspicious_patterns.append(f"Rep {rep_count}: Too fast ({rep_duration:.2f}s)")
    
    def _detect_inconsistent_form(self):
        """Detect inconsistent form across reps"""
        if len(self.form_history) < 10:
            return
        
        recent_forms = self.form_history[-10:]
        form_variance = np.var(recent_forms)
        
        if form_variance > (1 - self.thresholds['form_consistency_threshold']) * 100:
            self.cheat_flags['inconsistent_form'] = True
            self.suspicious_patterns.append(f"Inconsistent form detected (variance: {form_variance:.2f})")
    
    def _detect_minimal_movement(self):
        """Detect minimal movement patterns"""
        if len(self.movement_history) < 5:
            return
        
        recent_movements = self.movement_history[-5:]
        
        if self.exercise == "squat":
            hip_heights = [m['hip_height'] for m in recent_movements if 'hip_height' in m]
            if hip_heights:
                hip_range = max(hip_heights) - min(hip_heights)
                if hip_range < self.thresholds['min_hip_movement']:
                    self.cheat_flags['minimal_movement'] = True
                    self.suspicious_patterns.append(f"Minimal hip movement detected (range: {hip_range:.3f})")
        
        elif self.exercise == "pushups":
            shoulder_heights = [m['shoulder_height'] for m in recent_movements if 'shoulder_height' in m]
            if shoulder_heights:
                shoulder_range = max(shoulder_heights) - min(shoulder_heights)
                if shoulder_range < self.thresholds['min_shoulder_movement']:
                    self.cheat_flags['minimal_movement'] = True
                    self.suspicious_patterns.append(f"Minimal shoulder movement detected (range: {shoulder_range:.3f})")
        
        elif self.exercise == "jumping_jacks":
            arm_distances = [m['arm_distance'] for m in recent_movements if 'arm_distance' in m]
            leg_distances = [m['leg_distance'] for m in recent_movements if 'leg_distance' in m]
            
            if arm_distances and leg_distances:
                arm_range = max(arm_distances) - min(arm_distances)
                leg_range = max(leg_distances) - min(leg_distances)
                
                if arm_range < self.thresholds['min_arm_movement'] or leg_range < self.thresholds['min_leg_movement']:
                    self.cheat_flags['minimal_movement'] = True
                    self.suspicious_patterns.append(f"Minimal arm/leg movement detected (arm: {arm_range:.3f}, leg: {leg_range:.3f})")
    
    def _detect_suspicious_timing(self):
        """Detect suspicious timing patterns"""
        if len(self.timing_history) < 3:
            return
        
        # Check for too regular timing (robotic pattern)
        intervals = []
        for i in range(1, len(self.timing_history)):
            intervals.append(self.timing_history[i] - self.timing_history[i-1])
        
        if len(intervals) >= 2:
            interval_variance = np.var(intervals)
            if interval_variance < 0.1:  # Very consistent timing
                self.cheat_flags['suspicious_timing'] = True
                self.suspicious_patterns.append("Suspiciously regular timing pattern detected")
    
    def _detect_form_deterioration(self):
        """Detect if form is deteriorating over time"""
        if len(self.form_history) < 15:
            return
        
        # Split form history into two halves
        mid_point = len(self.form_history) // 2
        first_half = self.form_history[:mid_point]
        second_half = self.form_history[mid_point:]
        
        if len(first_half) > 0 and len(second_half) > 0:
            first_avg = np.mean(first_half)
            second_avg = np.mean(second_half)
            
            # If form significantly deteriorates
            if first_avg - second_avg > 20:  # 20 point drop
                self.cheat_flags['form_deterioration'] = True
                self.suspicious_patterns.append(f"Form deterioration detected (first: {first_avg:.1f}, second: {second_avg:.1f})")
    
    def _detect_repetitive_patterns(self):
        """Detect repetitive movement patterns that might indicate cheating"""
        if len(self.movement_history) < 20:
            return
        
        # Check for identical movement patterns
        recent_movements = self.movement_history[-10:]
        
        if self.exercise == "squat" and all('knee_angle' in m for m in recent_movements):
            knee_angles = [m['knee_angle'] for m in recent_movements]
            if len(set([round(a, 1) for a in knee_angles])) < 3:  # Less than 3 unique angles
                self.cheat_flags['repetitive_pattern'] = True
                self.suspicious_patterns.append("Repetitive knee angle pattern detected")
        
        elif self.exercise == "pushups" and all('elbow_angle' in m for m in recent_movements):
            elbow_angles = [m['elbow_angle'] for m in recent_movements]
            if len(set([round(a, 1) for a in elbow_angles])) < 3:
                self.cheat_flags['repetitive_pattern'] = True
                self.suspicious_patterns.append("Repetitive elbow angle pattern detected")
    
    def record_rep_completion(self):
        """Record when a rep is completed for timing analysis"""
        self.timing_history.append(time.time())
        # Keep only last 10 rep timings
        if len(self.timing_history) > 10:
            self.timing_history.pop(0)
    
    def get_cheat_summary(self):
        """Get summary of detected cheating patterns"""
        cheat_count = sum(1 for flag in self.cheat_flags.values() if flag)
        cheat_percentage = (cheat_count / len(self.cheat_flags)) * 100
        
        return {
            'cheat_detected': cheat_count > 0,
            'cheat_percentage': cheat_percentage,
            'cheat_flags': self.cheat_flags.copy(),
            'suspicious_patterns': self.suspicious_patterns.copy(),
            'total_flags': cheat_count,
            'confidence': min(100, cheat_percentage * 1.2)  # Confidence score
        }

class ExerciseDetector:
    """
    Complete ExerciseDetector with:
     - improved Jumping Jacks (requires arms+legs movement)
     - form scoring helper score_jj_form (0..100)
     - push-up and squat scoring helpers (used in-process)
     - calibration support
     - comprehensive cheat detection algorithms
    """

    def __init__(self, exercise_name, img_w, img_h):
        self.img_w = img_w
        self.img_h = img_h
        self.exercise = exercise_name
        self.smoothers = {
            "knee_angle": EWMA(0.35),
            "elbow_angle": EWMA(0.35),
            "wrists_distance": EWMA(0.35),
            "ankles_distance": EWMA(0.35),
            "shoulder_width": EWMA(0.35),
            "torso_angle": EWMA(0.35),
            "form_score": EWMA(0.4)
        }
        
        # Cheat detection variables
        self.cheat_detector = CheatDetector(exercise_name)
        self.rep_history = []  # Store rep timing and form data
        self.suspicious_patterns = []  # Track suspicious activities

        if exercise_name == "squat":
            self.counter = RepetitionCounter(up_thresh=160.0, down_thresh=100.0, min_time_between=0.3)
            self.required = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                             LM.LEFT_HIP, LM.RIGHT_HIP,
                             LM.LEFT_KNEE, LM.RIGHT_KNEE,
                             LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
        elif exercise_name == "pushups":
            self.counter = RepetitionCounter(up_thresh=150.0, down_thresh=95.0, min_time_between=0.25)
            self.required = [LM.LEFT_WRIST, LM.RIGHT_WRIST,
                             LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                             LM.LEFT_HIP, LM.RIGHT_HIP]
        elif exercise_name == "jumping_jacks":
            # We use a custom JJ state-machine but keep counter for compatibility
            self.counter = RepetitionCounter(up_thresh=1.6, down_thresh=1.15, min_time_between=0.25)
            self.required = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                             LM.LEFT_WRIST, LM.RIGHT_WRIST,
                             LM.LEFT_HIP, LM.RIGHT_HIP,
                             LM.LEFT_ANKLE, LM.RIGHT_ANKLE]

            # custom JJ vars
            self.jj_arms_open = False
            self.jj_legs_open = False
            self.jj_prev_combined_open = False
            self.jj_count = 0
            self.jj_last_count_time = 0.0
            self.jj_min_time_between = 0.3
            self.jj_arms_thresh = 1.6
            self.jj_arms_strict_thresh = 1.9
            self.jj_legs_thresh = 1.4
            self.jj_vertical_margin_px = int(0)  # adjust if needed
        else:
            raise ValueError("Unsupported exercise")

        self.calibration = {}
        self.last_form_score = 100.0

    def calibrate(self, baseline):
        if self.exercise == "squat":
            b = baseline.get("knee_angle")
            if b:
                self.counter.up_thresh = max(150.0, b - 8.0)
                self.counter.down_thresh = 100.0
                self.calibration['knee_baseline'] = b
        elif self.exercise == "pushups":
            b = baseline.get("elbow_angle")
            if b:
                self.counter.up_thresh = max(145.0, b - 10.0)
                self.counter.down_thresh = 95.0
                self.calibration['elbow_baseline'] = b
        elif self.exercise == "jumping_jacks":
            shoulder_w = baseline.get("shoulder_width")
            if shoulder_w and shoulder_w > 0:
                self.calibration['shoulder_width'] = shoulder_w

        self.counter.reset()
        if self.exercise == "jumping_jacks":
            self.jj_count = 0
            self.jj_prev_combined_open = False
            self.jj_last_count_time = 0.0

    # ---------------------------
    # Scoring helpers
    # ---------------------------
    def score_jj_form(self, wrists_norm, ankles_norm, wrist_positions, shoulder_width_px):
        """
        Heuristic form score (0..100) for Jumping Jacks.
        - arms (horizontal spread) weighted more, legs (ankles) weighted less
        """
        arm_score = 0.0
        if wrists_norm is not None:
            arm_score = np.clip((wrists_norm - 1.0) / 1.5, 0.0, 1.0)

        leg_score = 0.0
        if ankles_norm is not None:
            leg_score = np.clip((ankles_norm - 1.0) / 1.0, 0.0, 1.0)

        # symmetry placeholder (kept neutral)
        symmetry = 1.0
        if wrist_positions and shoulder_width_px and shoulder_width_px > 1:
            symmetry = 1.0

        final = 0.6 * arm_score + 0.4 * leg_score
        return float(np.clip(final * 100.0, 0.0, 100.0))

    def score_pushup_form(self, left_shoulder, right_shoulder, left_elbow, right_elbow,
                         left_wrist, right_wrist, left_hip, right_hip):
        """
        Push-up form scoring (0..100)
        - elbow extension (prefer larger angles at top)
        - wrist alignment (hands under shoulders)
        - torso straightness (left vs right torso vectors)
        """
        angles = []
        if left_shoulder[2] > 0.4 and left_elbow[2] > 0.4 and left_wrist[2] > 0.4:
            a = angle_between((left_shoulder[0], left_shoulder[1]), (left_elbow[0], left_elbow[1]), (left_wrist[0], left_wrist[1]))
            if a is not None: angles.append(a)
        if right_shoulder[2] > 0.4 and right_elbow[2] > 0.4 and right_wrist[2] > 0.4:
            a = angle_between((right_shoulder[0], right_shoulder[1]), (right_elbow[0], right_elbow[1]), (right_wrist[0], right_wrist[1]))
            if a is not None: angles.append(a)
        elbow_angle = float(np.mean(angles)) if angles else None

        # torso straightness approximation
        torso_vecs = []
        if left_shoulder[2] > 0.3 and left_hip[2] > 0.3:
            torso_vecs.append(np.array([left_shoulder[0]-left_hip[0], left_shoulder[1]-left_hip[1]]))
        if right_shoulder[2] > 0.3 and right_hip[2] > 0.3:
            torso_vecs.append(np.array([right_shoulder[0]-right_hip[0], right_shoulder[1]-right_hip[1]]))
        torso_straightness = None
        if len(torso_vecs) == 2:
            v1 = torso_vecs[0]; v2 = torso_vecs[1]
            cosang = np.dot(v1, v2) / (np.linalg.norm(v1)*np.linalg.norm(v2) + 1e-6)
            cosang = np.clip(cosang, -1.0, 1.0)
            torso_straightness = float(np.degrees(np.arccos(cosang)))
        elif len(torso_vecs) == 1:
            torso_straightness = 0.0

        # wrist offset normalized by shoulder width
        wrist_offsets = []
        shoulder_width = None
        if left_shoulder[2] > 0.3 and right_shoulder[2] > 0.3:
            shoulder_width = distance((left_shoulder[0], left_shoulder[1]), (right_shoulder[0], right_shoulder[1]))
        if left_wrist[2] > 0.3 and left_shoulder[2] > 0.3:
            wrist_offsets.append(abs(left_wrist[0] - left_shoulder[0]))
        if right_wrist[2] > 0.3 and right_shoulder[2] > 0.3:
            wrist_offsets.append(abs(right_wrist[0] - right_shoulder[0]))
        wrist_score = 1.0
        if wrist_offsets and shoulder_width and shoulder_width > 1:
            offs = np.mean(wrist_offsets)
            wrist_score = max(0.0, 1.0 - (offs / (0.6 * shoulder_width)))
            wrist_score = float(np.clip(wrist_score, 0.0, 1.0))

        elbow_score = 0.5
        if elbow_angle is not None:
            elbow_score = np.clip((elbow_angle - 80.0) / 100.0, 0.0, 1.0)

        torso_score = 1.0
        if torso_straightness is not None:
            torso_score = max(0.0, 1.0 - (torso_straightness / 40.0))
            torso_score = float(np.clip(torso_score, 0.0, 1.0))

        final = 0.5 * elbow_score + 0.25 * wrist_score + 0.25 * torso_score
        return float(np.clip(final * 100.0, 0.0, 100.0))

    # ---------------------------
    # Main process
    # ---------------------------
    def process(self, landmarks):
        img_w = self.img_w
        img_h = self.img_h
        def g(idx): return lm_coord(landmarks, idx, img_w, img_h)

        visibility_ok = sufficient_visibility(landmarks, self.required, img_w, img_h, min_vis=0.45)
        missing_msg = None
        if not visibility_ok:
            missing_msg = "Camera must show: " + ", ".join([l.name.lower() for l in self.required])

        debug = {}
        form_score = None

        # --- SQUAT ---
        if self.exercise == "squat":
            left_hip = g(LM.LEFT_HIP); left_knee = g(LM.LEFT_KNEE); left_ankle = g(LM.LEFT_ANKLE)
            right_hip = g(LM.RIGHT_HIP); right_knee = g(LM.RIGHT_KNEE); right_ankle = g(LM.RIGHT_ANKLE)
            left_sh = g(LM.LEFT_SHOULDER); right_sh = g(LM.RIGHT_SHOULDER)

            angles = []
            if left_hip[2] > 0.4 and left_knee[2] > 0.4 and left_ankle[2] > 0.4:
                a = angle_between((left_hip[0], left_hip[1]), (left_knee[0], left_knee[1]), (left_ankle[0], left_ankle[1]))
                if a is not None: angles.append(a)
            if right_hip[2] > 0.4 and right_knee[2] > 0.4 and right_ankle[2] > 0.4:
                a = angle_between((right_hip[0], right_hip[1]), (right_knee[0], right_knee[1]), (right_ankle[0], right_ankle[1]))
                if a is not None: angles.append(a)

            knee_angle = float(np.mean(angles)) if angles else None
            knee_sm = self.smoothers["knee_angle"].update(knee_angle)
            debug['knee_angle'] = knee_sm

            # torso angle (shoulder-hip-knee)
            torso_angles = []
            if left_sh[2] > 0.3 and left_hip[2] > 0.3 and left_knee[2] > 0.3:
                ta = angle_between((left_sh[0], left_sh[1]), (left_hip[0], left_hip[1]), (left_knee[0], left_knee[1]))
                if ta is not None: torso_angles.append(ta)
            if right_sh[2] > 0.3 and right_hip[2] > 0.3 and right_knee[2] > 0.3:
                ta = angle_between((right_sh[0], right_sh[1]), (right_hip[0], right_hip[1]), (right_knee[0], right_knee[1]))
                if ta is not None: torso_angles.append(ta)
            torso_angle = float(np.mean(torso_angles)) if torso_angles else None
            torso_sm = self.smoothers["torso_angle"].update(torso_angle)
            debug['torso_angle'] = torso_sm

            knee_score = 0.0
            if knee_sm is not None:
                knee_score = np.clip((170.0 - knee_sm) / (170.0 - 70.0), 0.0, 1.0)
            torso_score = 1.0
            if torso_sm is not None:
                torso_score = np.clip((torso_sm - 120.0) / 60.0, 0.0, 1.0)
            form_score_val = 0.65 * knee_score + 0.35 * torso_score
            form_score = float(np.clip(form_score_val * 100.0, 0.0, 100.0))

            count, state = self.counter.update(knee_sm) if visibility_ok else (self.counter.count, self.counter.state)
            
            # Cheat detection analysis
            is_rep_active = state in ["down", "up"]
            cheat_analysis = self.cheat_detector.analyze_frame(landmarks, form_score, count, is_rep_active)
            
            # Record rep completion for timing analysis
            if count > len(self.rep_history):
                self.cheat_detector.record_rep_completion()
                self.rep_history.append({
                    'rep_count': count,
                    'form_score': form_score,
                    'timestamp': time.time()
                })
            
            return {
                "count": count, 
                "state": state, 
                "debug": debug, 
                "form_score": form_score, 
                "coverage_ok": visibility_ok, 
                "missing_msg": missing_msg,
                "cheat_detection": cheat_analysis
            }

        # --- PUSHUPS ---
        elif self.exercise == "pushups":
            left_sh = g(LM.LEFT_SHOULDER); left_el = g(LM.LEFT_ELBOW); left_wr = g(LM.LEFT_WRIST)
            right_sh = g(LM.RIGHT_SHOULDER); right_el = g(LM.RIGHT_ELBOW); right_wr = g(LM.RIGHT_WRIST)
            left_hip = g(LM.LEFT_HIP); right_hip = g(LM.RIGHT_HIP)

            angles = []
            if left_sh[2] > 0.4 and left_el[2] > 0.4 and left_wr[2] > 0.4:
                a = angle_between((left_sh[0], left_sh[1]), (left_el[0], left_el[1]), (left_wr[0], left_wr[1]))
                if a is not None: angles.append(a)
            if right_sh[2] > 0.4 and right_el[2] > 0.4 and right_wr[2] > 0.4:
                a = angle_between((right_sh[0], right_sh[1]), (right_el[0], right_el[1]), (right_wr[0], right_wr[1]))
                if a is not None: angles.append(a)
            elbow_angle = float(np.mean(angles)) if angles else None
            elbow_sm = self.smoothers["elbow_angle"].update(elbow_angle)
            debug['elbow_angle'] = elbow_sm

            # torso alignment
            torso_vecs = []
            if left_sh[2] > 0.3 and left_hip[2] > 0.3:
                torso_vecs.append(np.array([left_sh[0]-left_hip[0], left_sh[1]-left_hip[1]]))
            if right_sh[2] > 0.3 and right_hip[2] > 0.3:
                torso_vecs.append(np.array([right_sh[0]-right_hip[0], right_sh[1]-right_hip[1]]))
            torso_align = None
            if len(torso_vecs) == 2:
                v1 = torso_vecs[0]; v2 = torso_vecs[1]
                cosang = np.dot(v1, v2) / (np.linalg.norm(v1)*np.linalg.norm(v2) + 1e-6)
                cosang = np.clip(cosang, -1.0, 1.0)
                torso_align = float(np.degrees(np.arccos(cosang)))
            elif len(torso_vecs) == 1:
                torso_align = 0.0
            torso_align_sm = self.smoothers["torso_angle"].update(torso_align)
            debug['torso_align_deg'] = torso_align_sm

            # wrist alignment
            wrist_offsets = []
            shoulder_width = None
            if left_sh[2] > 0.3 and right_sh[2] > 0.3:
                shoulder_width = distance((left_sh[0], left_sh[1]), (right_sh[0], right_sh[1]))
            if left_wr[2] > 0.3 and left_sh[2] > 0.3:
                wrist_offsets.append(abs(left_wr[0] - left_sh[0]))
            if right_wr[2] > 0.3 and right_sh[2] > 0.3:
                wrist_offsets.append(abs(right_wr[0] - right_sh[0]))
            wrist_score = 1.0
            if wrist_offsets and shoulder_width and shoulder_width > 1:
                offs = np.mean(wrist_offsets)
                wrist_score = max(0.0, 1.0 - (offs / (0.6 * shoulder_width)))
                wrist_score = float(np.clip(wrist_score, 0.0, 1.0))

            elbow_score = 0.5
            if elbow_sm is not None:
                elbow_score = np.clip((elbow_sm - 80.0) / 100.0, 0.0, 1.0)

            torso_score = 1.0
            if torso_align_sm is not None:
                torso_score = max(0.0, 1.0 - (torso_align_sm / 40.0))
                torso_score = float(np.clip(torso_score, 0.0, 1.0))

            form_score_val = 0.5 * elbow_score + 0.25 * wrist_score + 0.25 * torso_score
            form_score = float(np.clip(form_score_val * 100.0, 0.0, 100.0))
            self.last_form_score = self.smoothers["form_score"].update(form_score)

            count, state = self.counter.update(elbow_sm) if visibility_ok else (self.counter.count, self.counter.state)
            
            # Cheat detection analysis
            is_rep_active = state in ["down", "up"]
            cheat_analysis = self.cheat_detector.analyze_frame(landmarks, self.last_form_score, count, is_rep_active)
            
            # Record rep completion for timing analysis
            if count > len(self.rep_history):
                self.cheat_detector.record_rep_completion()
                self.rep_history.append({
                    'rep_count': count,
                    'form_score': self.last_form_score,
                    'timestamp': time.time()
                })
            
            return {
                "count": count, 
                "state": state, 
                "debug": debug, 
                "form_score": self.last_form_score, 
                "coverage_ok": visibility_ok, 
                "missing_msg": missing_msg,
                "cheat_detection": cheat_analysis
            }

        # --- JUMPING JACKS ---
        elif self.exercise == "jumping_jacks":
            ls = g(LM.LEFT_SHOULDER); rs = g(LM.RIGHT_SHOULDER)
            lw = g(LM.LEFT_WRIST); rw = g(LM.RIGHT_WRIST)
            la = g(LM.LEFT_ANKLE); ra = g(LM.RIGHT_ANKLE)
            lh = g(LM.LEFT_HIP); rh = g(LM.RIGHT_HIP)
            nose = g(LM.NOSE)

            shoulder_width_px = None
            if ls[2] > 0.3 and rs[2] > 0.3:
                shoulder_width_px = distance((ls[0], ls[1]), (rs[0], rs[1]))

            wrists_norm = None
            if lw[2] > 0.3 and rw[2] > 0.3 and shoulder_width_px and shoulder_width_px > 1:
                wrists_dist_px = distance((lw[0], lw[1]), (rw[0], rw[1]))
                wrists_norm = wrists_dist_px / shoulder_width_px

            ankles_norm = None
            if la[2] > 0.3 and ra[2] > 0.3 and lh[2] > 0.3 and rh[2] > 0.3:
                hip_width_px = distance((lh[0], lh[1]), (rh[0], rh[1]))
                if hip_width_px > 1:
                    ankles_dist_px = distance((la[0], la[1]), (ra[0], ra[1]))
                    ankles_norm = ankles_dist_px / hip_width_px

            wrists_norm_sm = self.smoothers["wrists_distance"].update(wrists_norm)
            ankles_norm_sm = self.smoothers["ankles_distance"].update(ankles_norm)
            debug['wrists_norm'] = wrists_norm_sm
            debug['ankles_norm'] = ankles_norm_sm
            debug['shoulder_w_px'] = shoulder_width_px

            # arms open: require horizontal spread AND vertical wrists above shoulders (if visible)
            arms_horiz_ok = (wrists_norm_sm is not None and wrists_norm_sm >= self.jj_arms_thresh)
            arms_vertical_ok = False
            if nose and lw[2] > 0.3 and rw[2] > 0.3 and ls[2] > 0.3 and rs[2] > 0.3:
                arms_vertical_ok = (lw[1] < ls[1] - self.jj_vertical_margin_px) and (rw[1] < rs[1] - self.jj_vertical_margin_px)

            if arms_horiz_ok and arms_vertical_ok:
                arms_open = True
            elif wrists_norm_sm is not None and wrists_norm_sm >= self.jj_arms_strict_thresh:
                arms_open = True
            else:
                arms_open = False

            legs_open = False
            if ankles_norm_sm is not None and ankles_norm_sm >= self.jj_legs_thresh:
                legs_open = True

            combined_open = arms_open and legs_open
            combined_closed = (not arms_open) and (not legs_open)

            now = time.time()
            if not getattr(self, "jj_prev_combined_open", False) and combined_open:
                self.jj_prev_combined_open = True
                self._jj_open_enter_time = now

            elif getattr(self, "jj_prev_combined_open", False) and combined_closed:
                enter_time = getattr(self, "_jj_open_enter_time", 0.0)
                duration_open = now - enter_time if enter_time else 0.0
                if duration_open >= 0.08 and (now - getattr(self, "jj_last_count_time", 0.0)) > self.jj_min_time_between:
                    self.jj_count += 1
                    self.jj_last_count_time = now
                self.jj_prev_combined_open = False
                self._jj_open_enter_time = 0.0

            openness_for_counter = None
            if wrists_norm_sm is not None and ankles_norm_sm is not None:
                openness_for_counter = (wrists_norm_sm + ankles_norm_sm) / 2.0
            elif ankles_norm_sm is not None:
                openness_for_counter = ankles_norm_sm
            elif wrists_norm_sm is not None:
                openness_for_counter = wrists_norm_sm

            if openness_for_counter is not None:
                self.counter.update(openness_for_counter)

            count = getattr(self, "jj_count", 0)
            state = "open" if combined_open else ("closed" if combined_closed else "partial")

            wrist_positions = None
            if lw[2] > 0.3 and rw[2] > 0.3:
                wrist_positions = (lw[0], rw[0])
            form_score = self.score_jj_form(wrists_norm_sm, ankles_norm_sm, wrist_positions, shoulder_width_px)
            self.last_form_score = self.smoothers["form_score"].update(form_score)

            # Cheat detection analysis
            is_rep_active = state in ["open", "closed"]
            cheat_analysis = self.cheat_detector.analyze_frame(landmarks, self.last_form_score, count, is_rep_active)
            
            # Record rep completion for timing analysis
            if count > len(self.rep_history):
                self.cheat_detector.record_rep_completion()
                self.rep_history.append({
                    'rep_count': count,
                    'form_score': self.last_form_score,
                    'timestamp': time.time()
                })
            
            return {
                "count": count, 
                "state": state, 
                "debug": debug, 
                "form_score": self.last_form_score, 
                "coverage_ok": visibility_ok, 
                "missing_msg": missing_msg,
                "cheat_detection": cheat_analysis
            }

        # default fallback
        return {"count": self.counter.count, "state": self.counter.state, "debug": debug, "form_score": None, "coverage_ok": visibility_ok, "missing_msg": missing_msg}

def show_menu():
    print("Select exercise:")
    print("  1 - Squats")
    print("  2 - Push-ups")
    print("  3 - Jumping Jacks")
    print("  q - Quit")
    choice = input("Enter choice (1/2/3): ").strip()
    if choice == "1": return "squat"
    if choice == "2": return "pushups"
    if choice == "3": return "jumping_jacks"
    return None

def quick_calibration(detector, pose, cap, seconds=3):
    print(f"Calibration: stand naturally for {seconds} seconds...")
    t_end = time.time() + seconds
    baseline_vals = {"knee_angles": [], "elbow_angles": [], "shoulder_widths": []}
    while time.time() < t_end:
        ret, frame = cap.read()
        if not ret: break
        img_h, img_w = frame.shape[:2]
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            def g(idx): return lm_coord(landmarks, idx, img_w, img_h)
            # knees
            lhip = g(LM.LEFT_HIP); lk = g(LM.LEFT_KNEE); la = g(LM.LEFT_ANKLE)
            rhip = g(LM.RIGHT_HIP); rk = g(LM.RIGHT_KNEE); ra = g(LM.RIGHT_ANKLE)
            if lhip[2] > 0.4 and lk[2] > 0.4 and la[2] > 0.4:
                a = angle_between((lhip[0], lhip[1]), (lk[0], lk[1]), (la[0], la[1]))
                if a is not None: baseline_vals['knee_angles'].append(a)
            if rhip[2] > 0.4 and rk[2] > 0.4 and ra[2] > 0.4:
                a = angle_between((rhip[0], rhip[1]), (rk[0], rk[1]), (ra[0], ra[1]))
                if a is not None: baseline_vals['knee_angles'].append(a)
            # elbows
            lsh = g(LM.LEFT_SHOULDER); le = g(LM.LEFT_ELBOW); lw = g(LM.LEFT_WRIST)
            rsh = g(LM.RIGHT_SHOULDER); re = g(LM.RIGHT_ELBOW); rw = g(LM.RIGHT_WRIST)
            if lsh[2] > 0.4 and le[2] > 0.4 and lw[2] > 0.4:
                a = angle_between((lsh[0], lsh[1]), (le[0], le[1]), (lw[0], lw[1]))
                if a is not None: baseline_vals['elbow_angles'].append(a)
            if rsh[2] > 0.4 and re[2] > 0.4 and rw[2] > 0.4:
                a = angle_between((rsh[0], rsh[1]), (re[0], re[1]), (rw[0], rw[1]))
                if a is not None: baseline_vals['elbow_angles'].append(a)
            # shoulder width
            if lsh[2] > 0.3 and rsh[2] > 0.3:
                shoulder_w = distance((lsh[0], lsh[1]), (rsh[0], rsh[1]))
                baseline_vals['shoulder_widths'].append(shoulder_w)
        remaining = int(t_end - time.time()) + 1
        cv2.putText(frame, f"Calibrating... {remaining}s", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,255), 2)
        cv2.imshow("Calibration", frame)
        if cv2.waitKey(1) & 0xFF == 27: break
    cv2.destroyWindow("Calibration")
    baseline = {}
    if baseline_vals['knee_angles']: baseline['knee_angle'] = float(np.median(baseline_vals['knee_angles']))
    if baseline_vals['elbow_angles']: baseline['elbow_angle'] = float(np.median(baseline_vals['elbow_angles']))
    if baseline_vals['shoulder_widths']: baseline['shoulder_width'] = float(np.median(baseline_vals['shoulder_widths']))
    print("Calibration results:", baseline)
    return baseline

# small utility
def form_to_status(score):
    if score is None: 
        return "Unknown"
    if score >= 85: 
        return "Excellent"
    if score >= 70: 
        return "Good"
    if score >= 50: 
        return "Fair"
    return "Poor"

def main():
    args = parse_arguments()
    user_id = args.user_id
    user_name = args.user_name
    # normalize exercise synonyms
    exe = args.exercise
    if exe in ("pushup", "pushups"):
        exercise = "pushups"
    elif exe in ("jumping_jack", "jumping_jacks"):
        exercise = "jumping_jacks"
    else:
        exercise = exe

    coach_id = args.coach_id if args.coach_id else None
    coach_name = args.coach_name if args.coach_name else None

    # Performance optimization settings
    FRAME_SKIP = 2  # Process every 2rd frame (2x faster)
    TARGET_WIDTH = 720  # Resize to 720p width (2x faster)

    # Decide capture source
    non_interactive = False
    if args.video_file:
        if not os.path.exists(args.video_file):
            logger.error(f"Video file not found: {args.video_file}")
            sys.exit(2)
        cap = cv2.VideoCapture(args.video_file)
        non_interactive = True
        logger.info(f"Using video file for analysis: {args.video_file}")
    else:
        cap = cv2.VideoCapture(0)
        non_interactive = False
        logger.info("Using webcam for analysis (interactive)")

    if not cap.isOpened():
        logger.error("ERROR: Could not open video source.")
        sys.exit(2)

    ret, frame = cap.read()
    if not ret:
        logger.error("ERROR: Can't read from video source.")
        cap.release()
        sys.exit(2)
    
    # Get original dimensions
    orig_h, orig_w = frame.shape[:2]
    
    # Calculate new dimensions maintaining aspect ratio
    if orig_w > TARGET_WIDTH:
        scale_factor = TARGET_WIDTH / orig_w
        new_w = TARGET_WIDTH
        new_h = int(orig_h * scale_factor)
    else:
        new_w, new_h = orig_w, orig_h
    
    logger.info(f"Original resolution: {orig_w}x{orig_h}, Optimized resolution: {new_w}x{new_h}")
    logger.info(f"Frame skip: every {FRAME_SKIP} frames (processing {100/FRAME_SKIP:.1f}% of frames)")

    detector = ExerciseDetector(exercise, new_w, new_h)
    pose = mp_pose.Pose(static_image_mode=False,
                        model_complexity=1,
                        enable_segmentation=False,
                        min_detection_confidence=0.5,
                        min_tracking_confidence=0.5)

    last_frame_time = time.time()
    fps = 0.0
    session_start_time = time.time()
    frame_counter = 0  # Track frame number for skipping
    
    # Get video properties for accurate duration calculation
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_duration = frame_count / video_fps if video_fps > 0 else 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                # end of video or camera lost
                break

            frame_counter += 1
            
            # Skip frames for performance (process every FRAME_SKIP frames)
            if frame_counter % FRAME_SKIP != 0:
                continue

            # Resize frame for performance
            if orig_w > TARGET_WIDTH:
                frame = cv2.resize(frame, (new_w, new_h))
            
            # Update detector dimensions if they changed
            if detector.img_w != new_w or detector.img_h != new_h:
                detector.img_w = new_w
                detector.img_h = new_h

            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image_rgb)
            landmarks = results.pose_landmarks.landmark if results.pose_landmarks else None

            info = detector.process(landmarks) if landmarks else {
                "count": detector.counter.count,
                "state": detector.counter.state,
                "debug": {},
                "form_score": None,
                "coverage_ok": False,
                "missing_msg": "No person detected"
            }

            count = info.get("count", 0)
            form_score = info.get("form_score", None)
            coverage_ok = info.get("coverage_ok", False)
            missing_msg = info.get("missing_msg", None)

            # Draw landmarks only in interactive mode
            if results.pose_landmarks and not non_interactive:
                mp.solutions.drawing_utils.draw_landmarks(
                    frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                    mp.solutions.drawing_utils.DrawingSpec(color=(0,200,0), thickness=2, circle_radius=2),
                    mp.solutions.drawing_utils.DrawingSpec(color=(0,120,255), thickness=2, circle_radius=2)
                )

            # overlay only in interactive mode
            if not non_interactive:
                cv2.rectangle(frame, (0,0), (380, 140), (0,0,0), thickness=-1)
                cv2.putText(frame, f"User: {user_name}", (10, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1)
                cv2.putText(frame, f"Exercise: {exercise.replace('_',' ').title()}", (10, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)
                cv2.putText(frame, f"Reps: {count}", (10, 72), cv2.FONT_HERSHEY_DUPLEX, 1.0, (0,255,0), 2)
                cv2.putText(frame, f"State: {info.get('state','unknown')}", (150, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 1)
                if form_score is not None:
                    status = form_to_status(form_score)
                    cv2.putText(frame, f"Form: {int(form_score)}%  {status}", (10, 106), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,0), 1)
                else:
                    cv2.putText(frame, "Form: --", (10, 106), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180,180,180), 1)
                if not coverage_ok and missing_msg:
                    cv2.rectangle(frame, (0, new_h-60), (new_w, new_h), (0,0,128), thickness=-1)
                    msg = missing_msg if len(missing_msg) <= (new_w // 8) else missing_msg[:new_w // 8] + "..."
                    cv2.putText(frame, "WARNING: " + msg, (10, new_h-30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,200,200), 1)

                # fps display (adjusted for frame skipping)
                now = time.time()
                fps = 0.9 * fps + 0.1 * (1.0 / (now - last_frame_time)) if now != last_frame_time else fps
                last_frame_time = now
                cv2.putText(frame, f"FPS: {fps:.1f} (processed)", (new_w - 150, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
                cv2.imshow("Exercise Counter (session)", frame)

                key = cv2.waitKey(1) & 0xFF
                if key != 255:
                    if key == ord('q') or key == 27:
                        break
                    elif key == ord('p'):
                        logger.info("Paused" if key else "Resume")
                        # toggle paused not implemented here for simplicity
                    elif key == ord('r'):
                        detector.counter.reset()
                        if hasattr(detector, "jj_count"):
                            detector.jj_count = 0
                            detector.jj_prev_combined_open = False
                        logger.info("Counter reset.")
                    elif key == ord('c'):
                        # optional: do calibration (skipped in headless mode)
                        pass
            else:
                # headless mode: continue without showing windows or waiting for keypress
                pass

    finally:
        cap.release()
        if not non_interactive:
            cv2.destroyAllWindows()
        pose.close()

        session_end_time = time.time()
        analysis_time = session_end_time - session_start_time
        
        # Use actual video duration if available, otherwise fall back to analysis time
        if video_duration > 0:
            duration = video_duration
        else:
            duration = analysis_time
        
        # Log performance metrics
        processed_frames = frame_counter // FRAME_SKIP
        total_frames = frame_count if frame_count > 0 else frame_counter
        logger.info(f"Performance: Processed {processed_frames}/{total_frames} frames ({100*processed_frames/total_frames:.1f}%) in {analysis_time:.2f}s")
        logger.info(f"Speed improvement: ~{FRAME_SKIP}x from frame skipping + ~{orig_w/TARGET_WIDTH:.1f}x from resolution reduction")

        if exercise == "jumping_jacks" and hasattr(detector, "jj_count"):
            total_reps = int(getattr(detector, "jj_count", detector.counter.count))
        else:
            total_reps = int(detector.counter.count)

        # Set form score to 0 if no reps detected, otherwise use the detected form score
        if total_reps == 0:
            form_score = 0
        else:
            form_score = int(detector.last_form_score) if hasattr(detector, 'last_form_score') and detector.last_form_score is not None else 75

        # Get final cheat detection summary
        final_cheat_analysis = detector.cheat_detector.get_cheat_summary()
        
        # Calculate risk level based on multiple factors
        risk_level = "low"
        risk_factors = []
        
        # Factor 1: Cheat detection percentage
        cheat_percentage = final_cheat_analysis['cheat_percentage']
        if cheat_percentage > 50:
            risk_level = "high"
            risk_factors.append("form issues")
        elif cheat_percentage > 25:
            if risk_level == "low":
                risk_level = "medium"
            risk_factors.append("minor form issues")
        
        # Factor 2: Form score
        if form_score < 70:
            if risk_level == "low":
                risk_level = "medium"
            risk_factors.append("low form score")
        elif form_score < 50:
            risk_level = "high"
            risk_factors.append("very low form score")
        
        # Factor 3: Speed (too fast can be risky)
        if duration > 0:
            reps_per_minute = (total_reps * 60) / duration
            if reps_per_minute > 50:  # Very fast
                if risk_level == "low":
                    risk_level = "medium"
                risk_factors.append("very fast pace")
        
        # Generate explanation based on risk factors
        if risk_level == "high":
            if "very low form score" in risk_factors:
                risk_explanation = "⚠️ Your form needs immediate attention. Focus on proper technique to avoid injury and get better results."
            elif "form issues" in risk_factors:
                risk_explanation = "⚠️ Your form needs attention. Slow down and focus on proper technique to avoid injury."
            else:
                risk_explanation = "⚠️ Your form needs attention. Focus on proper technique to avoid injury and get better results."
        elif risk_level == "medium":
            if "minor form issues" in risk_factors and "very fast pace" in risk_factors:
                risk_explanation = "⚡ Good effort! Slow down a bit and focus on smooth movements for better form."
            elif "minor form issues" in risk_factors:
                risk_explanation = "⚡ Good effort! Your form is mostly correct with room for improvement."
            elif "low form score" in risk_factors:
                risk_explanation = "⚡ Good effort! Focus on maintaining consistent form throughout the exercise."
            else:
                risk_explanation = "⚡ Good effort! Your form is mostly correct with room for improvement."
        else:
            risk_explanation = "✅ Excellent form! You're performing the exercise safely and effectively."

        result = {
            "userId": user_id,
            "userName": user_name,
            "exercise": exercise,
            "reps": total_reps,
            "formScore": form_score,
            "durationSec": round(duration, 3),
            "cheatDetection": {
                "cheatDetected": final_cheat_analysis['cheat_detected'],
                "cheatPercentage": round(final_cheat_analysis['cheat_percentage'], 1),
                "totalFlags": final_cheat_analysis['total_flags'],
                "confidence": round(final_cheat_analysis['confidence'], 1),
                "riskLevel": risk_level,
                "riskExplanation": risk_explanation,
                "riskFactors": risk_factors,
                "flags": final_cheat_analysis['cheat_flags'],
                "suspiciousPatterns": final_cheat_analysis['suspicious_patterns']
            }
        }

        # Only write final result JSON to stdout (for main.py to parse).
        # All other logs were sent to stderr via logger.
        print(json.dumps(result))
        sys.stdout.flush()

if __name__ == "__main__":
    main()