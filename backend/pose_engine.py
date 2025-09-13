import time
from typing import List, Dict, Any, Optional, Callable
import mediapipe as mp
import cv2
import math
import logging

logging.basicConfig(level=logging.INFO)
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Landmark names based on MediaPipe PoseLandmark enum
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky",
    "left_index", "right_index", "left_thumb", "right_thumb",
    "left_hip", "right_hip", "left_knee", "right_knee",
    "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_foot_index", "right_foot_index"
]

def normalize_landmark(lm, width: int, height: int) -> Dict[str, float]:
    """Return normalized x,y in [0,1] and z relative value and visibility/score."""
    return {
        "x": float(lm.x),   # mediapipe already returns normalized x,y by default
        "y": float(lm.y),
        "z": float(lm.z),
        "score": float(getattr(lm, "visibility", getattr(lm, "presence", 1.0)))
    }

def ema_smooth(prev, curr, alpha=0.3):
    """Exponential moving average between prev and curr {x,y,z,score} dicts."""
    if prev is None:
        return curr
    return {
        "x": prev["x"] * (1 - alpha) + curr["x"] * alpha,
        "y": prev["y"] * (1 - alpha) + curr["y"] * alpha,
        "z": prev["z"] * (1 - alpha) + curr["z"] * alpha,
        "score": prev.get("score", 1.0) * (1 - alpha) + curr.get("score", 1.0) * alpha
    }

def extract_landmarks_from_result(result, width: int, height: int) -> Dict[str, Dict[str, float]]:
    """Convert MediaPipe result.pose_landmarks into a dict name -> {x,y,z,score}."""
    out = {}
    if not result.pose_landmarks:
        return out
    
    for i, lm in enumerate(result.pose_landmarks.landmark):
        if i < len(LANDMARK_NAMES):
            name = LANDMARK_NAMES[i]
            out[name] = normalize_landmark(lm, width, height)
    
    return out

def process_video(path: str,
                  max_frames: Optional[int] = None,
                  visibility_threshold: float = 0.2,
                  smoothing_alpha: float = 0.25) -> List[Dict[str, Any]]:
    """
    Process a saved video file and return a list of frame entries:
    [{frameIndex, timestamp, keypoints: {name: {x,y,z,score}}}, ...]
    """
    logging.info(f"Started processing {path}")
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file: {path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
    
    logging.info(f"Video properties: width={width}, height={height}, fps={fps}")

    pose = mp_pose.Pose(static_image_mode=False,
                        model_complexity=1,
                        min_detection_confidence=0.5,
                        min_tracking_confidence=0.5)

    frames = []
    prev_smoothed = {}  # per-joint previous smoothed dict
    frame_idx = 0

    while True:
        ret, img = cap.read()
        if not ret:
            break

        # Convert to RGB for mediapipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = pose.process(img_rgb)

        # Extract landmarks
        raw_landmarks = extract_landmarks_from_result(res, width, height)

        # Filter by visibility and normalize (mediapipe gives normalized x,y)
        filtered = {}
        for name, lm in raw_landmarks.items():
            score = lm.get("score", 1.0)
            if score < visibility_threshold:
                # mark as low confidence (but include with score)
                filtered[name] = {**lm, "score": score}
            else:
                filtered[name] = lm

        # Smooth using EMA per joint
        smoothed = {}
        for name, lm in filtered.items():
            prev = prev_smoothed.get(name)
            sm = ema_smooth(prev, lm, alpha=smoothing_alpha)
            smoothed[name] = sm
            prev_smoothed[name] = sm  # update

        timestamp = frame_idx / fps
        frame_entry = {
            "frameIndex": frame_idx,
            "timestamp": timestamp,
            "keypoints": smoothed
        }
        frames.append(frame_entry)

        # For development: optionally print one-line JSON-ish summary
        if frame_idx % 30 == 0:  # print every ~second
            logging.info(f"frame {frame_idx} ts={timestamp:.3f} kp_count={len(smoothed)}")

        frame_idx += 1
        if max_frames and frame_idx >= max_frames:
            break

    cap.release()
    pose.close()
    
    logging.info(f"Finished processing {path} frames={len(frames)} duration={len(frames)/fps:.2f}s")
    return frames

def process_webcam(on_frame_callback: Optional[Callable] = None,
                   max_frames: Optional[int] = None,
                   visibility_threshold: float = 0.2,
                   smoothing_alpha: float = 0.25):
    """
    Run webcam in real-time and optionally call `on_frame_callback(frame_entry, img_with_overlay)`.
    If on_frame_callback is None, this will show an OpenCV window with overlay skeleton.
    """
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Cannot open webcam")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5)

    prev_smoothed = {}
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        h, w = frame.shape[:2]
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(img_rgb)

        raw_landmarks = extract_landmarks_from_result(res, w, h)

        # Simple smoothing & overlay drawing
        smoothed = {}
        for name, lm in raw_landmarks.items():
            prev = prev_smoothed.get(name)
            sm = ema_smooth(prev, lm, alpha=smoothing_alpha)
            smoothed[name] = sm
            prev_smoothed[name] = sm

        # Draw skeleton overlay on frame (basic)
        # Define pairs (connections) to draw lines
        connections = [
            ("left_shoulder", "right_shoulder"), ("left_shoulder", "left_elbow"),
            ("left_elbow", "left_wrist"), ("right_shoulder", "right_elbow"),
            ("right_elbow", "right_wrist"), ("left_shoulder", "left_hip"),
            ("right_shoulder", "right_hip"), ("left_hip", "right_hip"),
            ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
            ("right_hip", "right_knee"), ("right_knee", "right_ankle")
        ]
        # draw lines
        for a, b in connections:
            if a in smoothed and b in smoothed:
                x1 = int(smoothed[a]["x"] * w)
                y1 = int(smoothed[a]["y"] * h)
                x2 = int(smoothed[b]["x"] * w)
                y2 = int(smoothed[b]["y"] * h)
                cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # draw points
        for name, lm in smoothed.items():
            x = int(lm["x"] * w)
            y = int(lm["y"] * h)
            score = lm.get("score", 1.0)
            color = (0, 255, 0) if score >= visibility_threshold else (0, 120, 255)
            cv2.circle(frame, (x, y), 4, color, -1)

        timestamp = frame_idx / fps
        frame_entry = {"frameIndex": frame_idx, "timestamp": timestamp, "keypoints": smoothed}
        if on_frame_callback:
            on_frame_callback(frame_entry, frame)
        else:
            cv2.imshow("pose_engine - press q to quit", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        frame_idx += 1
        if max_frames and frame_idx >= max_frames:
            break

    cap.release()
    cv2.destroyAllWindows()
    pose.close()

# For testing the module directly
if __name__ == "__main__":
    # Test with webcam
    process_webcam()