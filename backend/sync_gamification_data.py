#!/usr/bin/env python3
"""
Script to sync gamification data from sessions to the points system
"""

import json
import os
from gamification_engine import GamificationEngine

def sync_gamification_data():
    """Sync gamification data from sessions to the points system"""
    
    # Initialize gamification engine
    gamification_engine = GamificationEngine()
    
    # Load existing sessions
    sessions_file = "data/sessions/sessions.json"
    if not os.path.exists(sessions_file):
        print("No sessions file found")
        return
    
    with open(sessions_file, 'r') as f:
        sessions_data = json.load(f)
    
    print(f"Found {len(sessions_data)} athletes with sessions")
    
    # Process each athlete's sessions
    for athlete_id, athlete_data in sessions_data.items():
        if 'sessions' not in athlete_data:
            continue
            
        sessions = athlete_data['sessions']
        print(f"Processing {len(sessions)} sessions for athlete {athlete_id}")
        
        # Initialize athlete's gamification data
        user_data = gamification_engine.load_user_points(athlete_id)
        
        # Process each session to update gamification data
        for session in sessions:
            if 'gamification' not in session:
                continue
                
            gamification = session['gamification']
            
            # Update basic stats
            user_data["sessions_completed"] = gamification.get("sessions_completed", 0)
            user_data["total_points"] = gamification.get("total_points", 0)
            user_data["level"] = gamification.get("level", 1)
            user_data["current_streak"] = gamification.get("current_streak", 0)
            user_data["longest_streak"] = gamification.get("longest_streak", 0)
            
            # Update achievements
            if "new_achievements" in gamification:
                for achievement in gamification["new_achievements"]:
                    if achievement["id"] not in user_data["achievements"]:
                        user_data["achievements"].append(achievement["id"])
            
            # Update badges
            if "new_badges" in gamification:
                for badge in gamification["new_badges"]:
                    if badge["name"] not in user_data["badges"]:
                        user_data["badges"].append(badge["name"])
        
        # Save updated user data
        gamification_engine.save_user_points(athlete_id, user_data)
        print(f"Updated gamification data for {athlete_id}: {user_data['total_points']} points, {user_data['sessions_completed']} sessions")
    
    print("Gamification data sync completed!")

if __name__ == "__main__":
    sync_gamification_data()
