
import math
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

def angle_between_points(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """
    Calculate the angle between three points (a-b-c) in degrees.
    """
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    
    dot_product = ba[0] * bc[0] + ba[1] * bc[1]
    magnitude_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    magnitude_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    
    # Avoid division by zero
    if magnitude_ba == 0 or magnitude_bc == 0:
        return 0.0
        
    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    cosine_angle = max(-1.0, min(1.0, cosine_angle))  # Clamp to avoid floating point errors
    
    return math.degrees(math.acos(cosine_angle))

def distance_between_points(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """
    Calculate Euclidean distance between two points.
    """
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)

def get_keypoint(keypoints: Dict, name: str, visibility_threshold: float = 0.2) -> Optional[Tuple[float, float]]:
    """
    Extract a keypoint if it meets visibility threshold.
    Returns (x, y) or None if not visible.
    """
    if name in keypoints and keypoints[name]["score"] >= visibility_threshold:
        return (keypoints[name]["x"], keypoints[name]["y"])
    return None

def smooth_signal(signal: List[Optional[float]], alpha: float = 0.3) -> List[float]:
    """
    Apply exponential moving average smoothing to a signal.
    Handles None values by skipping them in the smoothing.
    """
    if not signal:
        return []
        
    smoothed = []
    prev = None
    
    for value in signal:
        if value is None:
            # If we can't smooth, use the previous value or skip
            if prev is not None:
                smoothed.append(prev)
            else:
                smoothed.append(0.0)
        else:
            if prev is None:
                smoothed.append(value)
            else:
                smoothed.append(prev * (1 - alpha) + value * alpha)
            prev = smoothed[-1]
            
    return smoothed

def detect_reps(signal: List[float], fps: float, down_thr: float, up_thr: float, 
                min_rep_frames: int = 10) -> Tuple[int, List[float], List[int]]:
    """
    Detect repetitions in a signal using hysteresis thresholding.
    Returns: (rep_count, rep_times, rep_frames)
    """
    if not signal:
        return 0, [], []
    
    state = "up"  # Start in up position
    rep_count = 0
    rep_start_frame = 0
    rep_times = []
    rep_frames = []
    
    for i, value in enumerate(signal):
        if state == "up" and value <= down_thr:
            state = "down"
            rep_start_frame = i
        elif state == "down" and value >= up_thr:
            # Check if this rep lasted long enough
            if i - rep_start_frame >= min_rep_frames:
                state = "up"
                rep_count += 1
                rep_time = (i - rep_start_frame) / fps
                rep_times.append(rep_time)
                rep_frames.append(i)
    
    return rep_count, rep_times, rep_frames

def compute_squat_metrics(frames: List[Dict], fps: float) -> Tuple[List[float], Dict, List[Dict]]:
    """
    Compute metrics for squat exercise.
    Returns: (signal, metrics, injury_flags)
    """
    signal = []
    injury_flags = []
    
    for i, frame in enumerate(frames):
        keypoints = frame["keypoints"]
        
        # Get relevant keypoints
        left_hip = get_keypoint(keypoints, "left_hip")
        left_knee = get_keypoint(keypoints, "left_knee")
        left_ankle = get_keypoint(keypoints, "left_ankle")
        right_hip = get_keypoint(keypoints, "right_hip")
        right_knee = get_keypoint(keypoints, "right_knee")
        right_ankle = get_keypoint(keypoints, "right_ankle")
        
        # Calculate knee angles
        left_angle = angle_between_points(left_hip, left_knee, left_ankle) if all([left_hip, left_knee, left_ankle]) else None
        right_angle = angle_between_points(right_hip, right_knee, right_ankle) if all([right_hip, right_knee, right_ankle]) else None
        
        # Use average angle if both available, otherwise use available one
        if left_angle is not None and right_angle is not None:
            angle = (left_angle + right_angle) / 2
            # Check for asymmetry
            if abs(left_angle - right_angle) > 15:  # More than 15 degrees difference
                injury_flags.append({
                    "type": "asymmetry",
                    "severity": "medium",
                    "frameIndex": i,
                    "message": f"Significant asymmetry detected: {abs(left_angle - right_angle):.1f}° difference"
                })
        elif left_angle is not None:
            angle = left_angle
        elif right_angle is not None:
            angle = right_angle
        else:
            angle = None
            
        signal.append(angle)
        
        # Check for knee valgus (knees collapsing inward)
        if left_knee and right_knee and left_ankle and right_ankle:
            # Simplified valgus detection: check if knees are closer than ankles
            knee_distance = distance_between_points(left_knee, right_knee)
            ankle_distance = distance_between_points(left_ankle, right_ankle)
            
            if knee_distance < ankle_distance * 0.7:  # Knees significantly closer than ankles
                injury_flags.append({
                    "type": "knee_valgus",
                    "severity": "high",
                    "frameIndex": i,
                    "message": "Knees collapsing inward (valgus)"
                })
    
    # Smooth the signal
    smoothed_signal = smooth_signal(signal)
    
    # Detect reps
    rep_count, rep_times, rep_frames = detect_reps(smoothed_signal, fps, down_thr=110, up_thr=160)
    
    # Calculate metrics
    avg_rep_time = sum(rep_times) / len(rep_times) if rep_times else None
    form_score = calculate_form_score(signal, rep_frames, min_angle=70, max_angle=180)
    symmetry_score = calculate_symmetry_score(frames, "squat")
    
    metrics = {
        "reps": rep_count,
        "repTimes": rep_times,
        "avgRepTimeSec": avg_rep_time,
        "formScore": form_score,
        "symmetryScore": symmetry_score,
        "frameCount": len(frames),
        "durationSec": len(frames) / fps
    }
    
    return smoothed_signal, metrics, injury_flags

def compute_pushup_metrics(frames: List[Dict], fps: float) -> Tuple[List[float], Dict, List[Dict]]:
    """
    Compute metrics for push-up exercise.
    """
    signal = []
    injury_flags = []
    
    for i, frame in enumerate(frames):
        keypoints = frame["keypoints"]
        
        # Get relevant keypoints
        left_shoulder = get_keypoint(keypoints, "left_shoulder")
        left_elbow = get_keypoint(keypoints, "left_elbow")
        left_wrist = get_keypoint(keypoints, "left_wrist")
        right_shoulder = get_keypoint(keypoints, "right_shoulder")
        right_elbow = get_keypoint(keypoints, "right_elbow")
        right_wrist = get_keypoint(keypoints, "right_wrist")
        
        # Calculate elbow angles
        left_angle = angle_between_points(left_shoulder, left_elbow, left_wrist) if all([left_shoulder, left_elbow, left_wrist]) else None
        right_angle = angle_between_points(right_shoulder, right_elbow, right_wrist) if all([right_shoulder, right_elbow, right_wrist]) else None
        
        # Use average angle if both available
        if left_angle is not None and right_angle is not None:
            angle = (left_angle + right_angle) / 2
            # Check for asymmetry
            if abs(left_angle - right_angle) > 15:
                injury_flags.append({
                    "type": "asymmetry",
                    "severity": "medium",
                    "frameIndex": i,
                    "message": f"Significant asymmetry detected: {abs(left_angle - right_angle):.1f}° difference"
                })
        elif left_angle is not None:
            angle = left_angle
        elif right_angle is not None:
            angle = right_angle
        else:
            angle = None
            
        signal.append(angle)
        
        # Check for back sagging (simplified: check if hips are too low compared to shoulders)
        left_hip = get_keypoint(keypoints, "left_hip")
        right_hip = get_keypoint(keypoints, "right_hip")
        
        if left_shoulder and right_shoulder and left_hip and right_hip:
            shoulder_y = (left_shoulder[1] + right_shoulder[1]) / 2
            hip_y = (left_hip[1] + right_hip[1]) / 2
            
            if hip_y > shoulder_y + 0.1:  # Hips significantly lower than shoulders
                injury_flags.append({
                    "type": "back_sagging",
                    "severity": "medium",
                    "frameIndex": i,
                    "message": "Back sagging detected"
                })
    
    # Smooth the signal
    smoothed_signal = smooth_signal(signal)
    
    # Detect reps
    rep_count, rep_times, rep_frames = detect_reps(smoothed_signal, fps, down_thr=90, up_thr=160)
    
    # Calculate metrics
    avg_rep_time = sum(rep_times) / len(rep_times) if rep_times else None
    form_score = calculate_form_score(signal, rep_frames, min_angle=60, max_angle=180)
    symmetry_score = calculate_symmetry_score(frames, "push-up")
    
    metrics = {
        "reps": rep_count,
        "repTimes": rep_times,
        "avgRepTimeSec": avg_rep_time,
        "formScore": form_score,
        "symmetryScore": symmetry_score,
        "frameCount": len(frames),
        "durationSec": len(frames) / fps
    }
    
    return smoothed_signal, metrics, injury_flags

def compute_jumping_jack_metrics(frames: List[Dict], fps: float) -> Tuple[List[float], Dict, List[Dict]]:
    """
    Compute metrics for jumping jack exercise.
    """
    signal = []
    injury_flags = []
    
    for i, frame in enumerate(frames):
        keypoints = frame["keypoints"]
        
        # Get relevant keypoints
        left_wrist = get_keypoint(keypoints, "left_wrist")
        right_wrist = get_keypoint(keypoints, "right_wrist")
        left_shoulder = get_keypoint(keypoints, "left_shoulder")
        right_shoulder = get_keypoint(keypoints, "right_shoulder")
        
        if all([left_wrist, right_wrist, left_shoulder, right_shoulder]):
            # Calculate hand separation and normalize by shoulder width
            hand_distance = distance_between_points(left_wrist, right_wrist)
            shoulder_distance = distance_between_points(left_shoulder, right_shoulder)
            
            if shoulder_distance > 0:
                normalized_separation = hand_distance / shoulder_distance
                signal.append(normalized_separation)
            else:
                signal.append(None)
        else:
            signal.append(None)
    
    # Smooth the signal
    smoothed_signal = smooth_signal(signal)
    
    # Detect reps
    rep_count, rep_times, rep_frames = detect_reps(smoothed_signal, fps, down_thr=1.4, up_thr=1.05)
    
    # Calculate metrics
    avg_rep_time = sum(rep_times) / len(rep_times) if rep_times else None
    form_score = calculate_form_score(signal, rep_frames, min_val=1.0, max_val=2.0)
    symmetry_score = calculate_symmetry_score(frames, "jumping-jacks")
    
    metrics = {
        "reps": rep_count,
        "repTimes": rep_times,
        "avgRepTimeSec": avg_rep_time,
        "formScore": form_score,
        "symmetryScore": symmetry_score,
        "frameCount": len(frames),
        "durationSec": len(frames) / fps
    }
    
    return smoothed_signal, metrics, injury_flags

def calculate_form_score(signal: List[Optional[float]], rep_frames: List[int], 
                        min_angle: float = 0, max_angle: float = 180) -> Optional[float]:
    """
    Calculate a simple form score based on signal consistency.
    """
    if not signal or not rep_frames:
        return None
        
    # Calculate variance in the signal during reps
    variances = []
    for i in range(len(rep_frames) - 1):
        start = rep_frames[i]
        end = rep_frames[i + 1]
        rep_signal = [s for s in signal[start:end] if s is not None]
        
        if rep_signal:
            rep_mean = sum(rep_signal) / len(rep_signal)
            rep_variance = sum((s - rep_mean) ** 2 for s in rep_signal) / len(rep_signal)
            variances.append(rep_variance)
    
    if not variances:
        return None
        
    # Lower variance = better form
    avg_variance = sum(variances) / len(variances)
    max_variance = (max_angle - min_angle) / 10  # Arbitrary scaling
    
    # Convert to a 0-100 score
    form_score = max(0, min(100, 100 - (avg_variance / max_variance * 100)))
    return form_score

def calculate_symmetry_score(frames: List[Dict], exercise: str) -> Optional[float]:
    """
    Calculate a symmetry score based on left-right differences.
    """
    if not frames:
        return None
        
    differences = []
    
    for frame in frames:
        keypoints = frame["keypoints"]
        
        if exercise == "squat":
            left_angle = get_knee_angle(keypoints, "left")
            right_angle = get_knee_angle(keypoints, "right")
            
            if left_angle and right_angle:
                differences.append(abs(left_angle - right_angle))
                
        elif exercise == "push-up":
            left_angle = get_elbow_angle(keypoints, "left")
            right_angle = get_elbow_angle(keypoints, "right")
            
            if left_angle and right_angle:
                differences.append(abs(left_angle - right_angle))
                
        elif exercise == "jumping-jacks":
            left_hand_height = keypoints.get("left_wrist", {}).get("y")
            right_hand_height = keypoints.get("right_wrist", {}).get("y")
            
            if left_hand_height and right_hand_height:
                differences.append(abs(left_hand_height - right_hand_height))
    
    if not differences:
        return None
        
    avg_difference = sum(differences) / len(differences)
    
    # Convert to a 0-100 score (lower difference = higher score)
    if exercise in ["squat", "push-up"]:
        # For angles, a difference of 15° or more is bad
        symmetry_score = max(0, min(100, 100 - (avg_difference / 15 * 100)))
    else:
        # For jumping jacks, a difference of 0.1 or more is bad
        symmetry_score = max(0, min(100, 100 - (avg_difference / 0.1 * 100)))
        
    return symmetry_score

def get_knee_angle(keypoints: Dict, side: str) -> Optional[float]:
    """Get knee angle for the specified side."""
    hip = get_keypoint(keypoints, f"{side}_hip")
    knee = get_keypoint(keypoints, f"{side}_knee")
    ankle = get_keypoint(keypoints, f"{side}_ankle")
    
    if all([hip, knee, ankle]):
        return angle_between_points(hip, knee, ankle)
    return None

def get_elbow_angle(keypoints: Dict, side: str) -> Optional[float]:
    """Get elbow angle for the specified side."""
    shoulder = get_keypoint(keypoints, f"{side}_shoulder")
    elbow = get_keypoint(keypoints, f"{side}_elbow")
    wrist = get_keypoint(keypoints, f"{side}_wrist")
    
    if all([shoulder, elbow, wrist]):
        return angle_between_points(shoulder, elbow, wrist)
    return None

def compute_metrics(frames: List[Dict], exercise: str, fps: float = 30.0) -> Dict:
    """
    Main function to compute exercise metrics.
    Returns: {metrics, injuryFlags, repFrames, signal}
    """
    if not frames:
        return {
            "metrics": {},
            "injuryFlags": [],
            "repFrames": [],
            "signal": []
        }
    
    exercise = exercise.lower()
    
    if exercise == "squat":
        signal, metrics, injury_flags = compute_squat_metrics(frames, fps)
    elif exercise == "push-up":
        signal, metrics, injury_flags = compute_pushup_metrics(frames, fps)
    elif exercise == "jumping-jacks":
        signal, metrics, injury_flags = compute_jumping_jack_metrics(frames, fps)
    else:
        # General exercise - try to detect based on movement
        signal, metrics, injury_flags = compute_general_metrics(frames, fps, exercise)
    
    return {
        "metrics": metrics,
        "injuryFlags": injury_flags,
        "repFrames": metrics.get("repFrames", []),
        "signal": signal
    }

def compute_general_metrics(frames: List[Dict], fps: float, exercise: str) -> Tuple[List[float], Dict, List[Dict]]:
    """
    Fallback for general exercise detection.
    """
    # Simple implementation that just counts significant movements
    signal = []
    injury_flags = []
    
    for i, frame in enumerate(frames):
        keypoints = frame["keypoints"]
        
        # Use vertical movement of wrists as a general signal
        left_wrist = get_keypoint(keypoints, "left_wrist")
        right_wrist = get_keypoint(keypoints, "right_wrist")
        
        if left_wrist and right_wrist:
            avg_y = (left_wrist[1] + right_wrist[1]) / 2
            signal.append(avg_y)
        else:
            signal.append(None)
    
    # Smooth the signal
    smoothed_signal = smooth_signal(signal)
    
    # Normalize signal to 0-1 range for thresholding
    if smoothed_signal:
        min_val = min(smoothed_signal)
        max_val = max(smoothed_signal)
        if max_val > min_val:
            normalized_signal = [(s - min_val) / (max_val - min_val) for s in smoothed_signal]
        else:
            normalized_signal = smoothed_signal
    else:
        normalized_signal = []
    
    # Detect reps with generic thresholds
    rep_count, rep_times, rep_frames = detect_reps(normalized_signal, fps, down_thr=0.3, up_thr=0.7)
    
    metrics = {
        "reps": rep_count,
        "repTimes": rep_times,
        "avgRepTimeSec": sum(rep_times) / len(rep_times) if rep_times else None,
        "formScore": None,
        "symmetryScore": None,
        "frameCount": len(frames),
        "durationSec": len(frames) / fps
    }
    
    return smoothed_signal, metrics, injury_flags

# For debugging and visualization
def save_signal_to_csv(signal: List[float], filename: str):
    """Save signal data to CSV for debugging."""
    import csv
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Frame', 'Signal'])
        for i, value in enumerate(signal):
            writer.writerow([i, value])