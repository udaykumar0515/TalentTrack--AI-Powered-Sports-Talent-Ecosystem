import os
import uuid
import json
import cv2
from pathlib import Path
from pose_engine import process_video, process_webcam

def print_frame_summary(frame_entry):
    """Print a summary of the frame data"""
    print(f"Frame {frame_entry['frameIndex']} - Timestamp: {frame_entry['timestamp']:.2f}s")
    print(f"  Keypoints detected: {len(frame_entry['keypoints'])}")
    
    # Print a few key landmarks
    key_landmarks = ["nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip"]
    for landmark in key_landmarks:
        if landmark in frame_entry['keypoints']:
            kp = frame_entry['keypoints'][landmark]
            print(f"  {landmark}: x={kp['x']:.3f}, y={kp['y']:.3f}, score={kp['score']:.3f}")

def webcam_callback(frame_entry, image):
    """Callback function for webcam processing"""
    # Clear terminal (works on most systems)
    os.system('cls' if os.name == 'nt' else 'clear')
    
    # Print frame information
    print_frame_summary(frame_entry)
    
    # Show the video with overlay (optional)
    cv2.imshow("Pose Detection - Press 'q' to quit", image)
    
    # Check for quit key
    if cv2.waitKey(1) & 0xFF == ord('q'):
        return True  # Signal to stop processing
    return False

def main():
    """Main CLI interface for pose detection"""
    print("=== Athlete Pose Detection System ===")
    print()
    
    # Exercise type selection
    print("Select exercise type:")
    print("1. Squat")
    print("2. Push-up")
    print("3. Jumping Jacks")
    print("4. Other/General")
    
    exercise_choice = input("Enter choice (1-4): ").strip()
    exercises = {
        "1": "squat",
        "2": "push-up",
        "3": "jumping-jacks",
        "4": "general"
    }
    exercise = exercises.get(exercise_choice, "general")
    print(f"Selected exercise: {exercise}")
    print()
    
    # Input source selection
    print("Select input source:")
    print("1. Webcam (live)")
    print("2. Video file")
    
    source_choice = input("Enter choice (1-2): ").strip()
    
    if source_choice == "1":
        print("Starting webcam processing... Press 'q' to quit")
        print()
        process_webcam(on_frame_callback=webcam_callback)
        
    elif source_choice == "2":
        file_path = input("Enter path to video file: ").strip()
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' not found!")
            return
        
        print(f"Processing video: {file_path}")
        print("This may take a while depending on video length...")
        print()
        
        # Process the video
        frames = process_video(file_path)
        
        # Print summary
        print(f"Processing complete! Processed {len(frames)} frames.")
        print()
        
        # Show a few sample frames
        sample_indices = [0, len(frames)//2, -1]  # First, middle, and last frame
        for idx in sample_indices:
            if 0 <= idx < len(frames):
                print(f"Sample frame {idx}:")
                print_frame_summary(frames[idx])
                print()
        
        # Ask if user wants to save results
        save_choice = input("Save results to JSON file? (y/n): ").strip().lower()
        if save_choice == 'y':
            output_path = f"pose_results_{exercise}_{uuid.uuid4().hex[:8]}.json"
            with open(output_path, 'w') as f:
                json.dump(frames, f, indent=2)
            print(f"Results saved to {output_path}")
    
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()