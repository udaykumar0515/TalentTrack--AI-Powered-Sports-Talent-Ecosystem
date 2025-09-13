# main.py
import os
import uuid
import json
import cv2
from pathlib import Path
from pose_engine import process_video, process_webcam, save_keypoints
from analyzer import compute_metrics, save_signal_to_csv
import signal
from collections import deque

def draw_metrics(image, metrics, injury_flags):
    """Draw metrics on the image with a semi-transparent background"""
    # Create a semi-transparent background rectangle
    overlay = image.copy()
    cv2.rectangle(overlay, (10, 10), (350, 160), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
    
    # Draw metrics text
    font = cv2.FONT_HERSHEY_SIMPLEX
    color = (0, 255, 0)
    
    cv2.putText(image, f"Reps: {metrics.get('reps', 0)}", (20, 40), font, 0.7, color, 2)
    cv2.putText(image, f"Form: {metrics.get('formScore', 0):.1f}/100", (20, 70), font, 0.7, color, 2)
    cv2.putText(image, f"Symmetry: {metrics.get('symmetryScore', 0):.1f}/100", (20, 100), font, 0.7, color, 2)
    
    # Show latest injury warning if any
    if injury_flags and len(injury_flags) > 0:
        latest_warning = injury_flags[-1]['message']
        cv2.putText(image, f"Warning: {latest_warning}", (20, 130), font, 0.5, (0, 0, 255), 2)

def webcam_callback(exercise, accumulated_frames, analysis_results):
    """Create a callback function for webcam processing with exercise context"""
    def callback(frame_entry, image):
        # Add frame to accumulated frames
        accumulated_frames.append(frame_entry)
        
        # Perform analysis more frequently (every 15 frames)
        if len(accumulated_frames) % 15 == 0 and len(accumulated_frames) > 30:
            analysis = compute_metrics(list(accumulated_frames), exercise, 30.0)
            analysis_results.update({
                'metrics': analysis['metrics'],
                'injury_flags': analysis['injuryFlags']
            })
        
        # Always show the latest metrics on the frame
        if analysis_results['metrics']:
            draw_metrics(image, analysis_results['metrics'], analysis_results['injury_flags'])
        
        # Show the video with overlay
        cv2.imshow("Pose Detection - Press 'q' to quit", image)
        
        # Check for quit key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            return True
            
        return False
        
    return callback

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
        print("Press Ctrl+C to exit gracefully")
        print()
        
        # Initialize frame accumulator and analysis results
        accumulated_frames = deque(maxlen=900)  # Keep last 30 seconds at 30fps
        analysis_results = {'metrics': {}, 'injury_flags': []}
        
        try:
            # Create callback with exercise context
            callback = webcam_callback(exercise, accumulated_frames, analysis_results)
            process_webcam(on_frame_callback=callback)
            
            # After webcam stops, do final analysis
            if accumulated_frames:
                analysis = compute_metrics(list(accumulated_frames), exercise, 30.0)
                
                # Print results
                print(f"\nFinal Analysis:")
                print(f"Exercise: {exercise}")
                print(f"Reps detected: {analysis['metrics'].get('reps', 0)}")
                print(f"Average rep time: {analysis['metrics'].get('avgRepTimeSec', 0):.2f}s")
                print(f"Form score: {analysis['metrics'].get('formScore', 0):.1f}/100")
                print(f"Symmetry score: {analysis['metrics'].get('symmetryScore', 0):.1f}/100")
                
                # Show injury flags if any
                if analysis['injuryFlags']:
                    print("\nInjury flags detected:")
                    for flag in analysis['injuryFlags']:
                        print(f"  - {flag['message']} (frame {flag['frameIndex']})")
                
                # Ask if user wants to save results
                save_choice = input("\nSave results to JSON file? (y/n): ").strip().lower()
                if save_choice == 'y':
                    output_path = f"pose_results_{exercise}_{uuid.uuid4().hex[:8]}.json"
                    
                    # Create comprehensive results
                    results = {
                        "exercise": exercise,
                        "fps": 30.0,
                        "analysis": analysis,
                        "frames": list(accumulated_frames)  # Include all frame data if needed for debugging
                    }
                    
                    with open(output_path, 'w') as f:
                        json.dump(results, f, indent=2)
                    print(f"Results saved to {output_path}")
                    
        except KeyboardInterrupt:
            print("Interrupted by user.")
        except Exception as e:
            print(f"Error during webcam processing: {e}")
        finally:
            cv2.destroyAllWindows()
        
    elif source_choice == "2":
        file_path = input("Enter path to video file: ").strip()
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' not found!")
            return
        
        print(f"Processing video: {file_path}")
        print("This may take a while depending on video length...")
        print()
        
        try:
            # Process the video - now returns frames and fps
            frames, fps = process_video(file_path)
            
            # Analyze the exercise
            analysis = compute_metrics(frames, exercise, fps)
            
            # Print results
            print(f"Analysis complete!")
            print(f"Exercise: {exercise}")
            print(f"Reps detected: {analysis['metrics'].get('reps', 0)}")
            print(f"Average rep time: {analysis['metrics'].get('avgRepTimeSec', 0):.2f}s")
            print(f"Form score: {analysis['metrics'].get('formScore', 0):.1f}/100")
            print(f"Symmetry score: {analysis['metrics'].get('symmetryScore', 0):.1f}/100")
            print()
            
            # Show injury flags if any
            if analysis['injuryFlags']:
                print("Injury flags detected:")
                for flag in analysis['injuryFlags']:
                    print(f"  - {flag['message']} (frame {flag['frameIndex']})")
                print()
            
            # Ask if user wants to save results
            save_choice = input("Save results to JSON file? (y/n): ").strip().lower()
            if save_choice == 'y':
                output_path = f"pose_results_{exercise}_{uuid.uuid4().hex[:8]}.json"
                
                # Create comprehensive results
                results = {
                    "exercise": exercise,
                    "fps": fps,
                    "analysis": analysis,
                    "frames": frames  # Include all frame data if needed for debugging
                }
                
                with open(output_path, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"Results saved to {output_path}")
                
                # Also save signal data for debugging/visualization
                signal_path = f"signal_data_{exercise}_{uuid.uuid4().hex[:8]}.csv"
                save_signal_to_csv(analysis['signal'], signal_path)
                print(f"Signal data saved to {signal_path}")
                    
        except Exception as e:
            print(f"Error processing video: {e}")
    
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()