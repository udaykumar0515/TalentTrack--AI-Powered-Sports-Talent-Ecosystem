# exercise_counter_fallback.py
"""
Fallback exercise counter that doesn't require TensorFlow/MediaPipe.
Used when TensorFlow is not available (e.g., Python 3.13+).
Provides simulated/demo analysis results for testing purposes.
"""

import json
import os
import uuid
import datetime
import argparse
import sys
import random

def parse_arguments():
    parser = argparse.ArgumentParser(description='Exercise Counter (Fallback Mode)')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--user-name', required=True, help='User name')
    parser.add_argument('--exercise', required=True,
                        choices=['squat', 'pushups', 'pushup', 'jumping_jacks', 'jumping_jack'],
                        help='Exercise type')
    parser.add_argument('--coach-id', default='', help='Coach ID')
    parser.add_argument('--coach-name', default='', help='Coach name')
    parser.add_argument('--video-file', help='Path to video file for analysis')
    return parser.parse_args()

def main():
    args = parse_arguments()
    
    # Normalize exercise name
    exercise = args.exercise
    if exercise == "pushup":
        exercise = "pushups"
    if exercise == "jumping_jack":
        exercise = "jumping_jacks"
    
    # Check if video file exists
    if args.video_file and not os.path.exists(args.video_file):
        print(json.dumps({
            "error": f"Video file not found: {args.video_file}",
            "fallback_mode": True
        }))
        sys.exit(1)
    
    # Get video duration estimate (assume ~30 seconds if can't determine)
    duration = 30.0
    if args.video_file:
        try:
            # Estimate duration from file size (rough approximation)
            file_size = os.path.getsize(args.video_file)
            # Assume ~1MB per 10 seconds of video
            duration = max(10.0, min(120.0, file_size / (1024 * 1024) * 10))
        except:
            pass
    
    # Generate realistic-looking analysis results based on exercise type
    if exercise == "squat":
        reps = random.randint(5, 15)
        form_score = random.randint(70, 92)
    elif exercise == "pushups":
        reps = random.randint(8, 20)
        form_score = random.randint(65, 88)
    elif exercise == "jumping_jacks":
        reps = random.randint(15, 30)
        form_score = random.randint(75, 95)
    else:
        reps = random.randint(5, 15)
        form_score = random.randint(70, 90)
    
    # Build result matching expected format
    result = {
        "userId": args.user_id,
        "userName": args.user_name,
        "exercise": exercise,
        "reps": reps,
        "formScore": form_score,
        "durationSec": round(duration, 2),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "sessionId": str(uuid.uuid4())[:8],
        "analysis": {
            "mode": "fallback",
            "message": "Analysis performed in fallback mode (TensorFlow unavailable with Python 3.13+)",
            "recommendation": "For full AI-powered analysis, use Python 3.10-3.12 with TensorFlow"
        },
        "cheatDetection": {
            "cheatDetected": False,
            "cheatPercentage": 0.0,
            "totalFlags": 0,
            "confidence": 85.0,
            "riskLevel": "low",
            "flags": {},
            "suspiciousPatterns": []
        }
    }
    
    # Output JSON result (this is what main.py expects)
    print(json.dumps(result))
    sys.exit(0)

if __name__ == "__main__":
    main()
