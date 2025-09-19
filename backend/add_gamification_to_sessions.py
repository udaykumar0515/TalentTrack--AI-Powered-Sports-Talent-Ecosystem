#!/usr/bin/env python3
"""
Script to add gamification data to existing sessions
"""

import json
import os
from gamification_engine import GamificationEngine

def add_gamification_to_sessions():
    """Add gamification data to all existing sessions"""
    
    # Initialize gamification engine
    gamification_engine = GamificationEngine()
    
    # Load existing sessions
    sessions_file = "data/sessions/sessions.json"
    if not os.path.exists(sessions_file):
        print("No sessions file found")
        return
    
    with open(sessions_file, 'r') as f:
        sessions_data = json.load(f)
    
    print(f"Found {len(sessions_data)} sessions to process")
    
    # Process each session
    updated_count = 0
    for session_id, session in sessions_data.items():
        try:
            # Check if gamification data already exists
            if 'gamification' in session:
                print(f"Session {session_id} already has gamification data, skipping")
                continue
            
            # Prepare session data for gamification engine
            temp_session_data = {
                "exercise": session.get("exercise", "unknown"),
                "reps": session.get("reps", 0),
                "formScore": session.get("formScore", 0),
                "durationSec": session.get("durationSec", 0),
                "athleteId": session.get("athleteId", "unknown"),
                "coachId": session.get("coachId", "unknown")
            }
            
            # Generate gamification data
            gamification_data = gamification_engine.update_user_progress(
                session.get("athleteId", "unknown"), 
                temp_session_data
            )
            
            # Add gamification data to session
            session["gamification"] = gamification_data
            
            updated_count += 1
            print(f"Added gamification data to session {session_id}")
            
        except Exception as e:
            print(f"Error processing session {session_id}: {e}")
            continue
    
    # Save updated sessions
    with open(sessions_file, 'w') as f:
        json.dump(sessions_data, f, indent=2)
    
    print(f"Successfully updated {updated_count} sessions with gamification data")

if __name__ == "__main__":
    add_gamification_to_sessions()
