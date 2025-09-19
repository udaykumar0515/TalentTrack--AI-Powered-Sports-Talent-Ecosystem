#!/usr/bin/env python3
"""
Script to add gamification data to existing sessions and update user points
"""

import json
import os
from datetime import datetime
from gamification_engine import GamificationEngine

def add_gamification_to_existing_sessions():
    """Add gamification data to existing sessions and update user points"""
    
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
        total_points = 0
        sessions_completed = 0
        achievements = []
        badges = []
        
        # Process each session to add gamification data
        for i, session in enumerate(sessions):
            # Calculate points for this session (basic scoring)
            session_points = 10  # Base points per session
            if session.get('formScore', 0) > 80:
                session_points += 5  # Bonus for good form
            if session.get('reps', 0) > 10:
                session_points += 5  # Bonus for more reps
            
            # Add gamification data to session
            session['gamification'] = {
                'session_points': session_points,
                'total_points': total_points + session_points,
                'level': (total_points + session_points) // 50 + 1,
                'new_achievements': [],
                'new_badges': [],
                'current_streak': i + 1,
                'longest_streak': i + 1,
                'sessions_completed': i + 1
            }
            
            # Update running totals
            total_points += session_points
            sessions_completed += 1
            
            # Add achievements
            if i == 0:  # First session
                achievements.append('first_session')
                session['gamification']['new_achievements'].append({
                    'id': 'first_session',
                    'name': 'First Steps',
                    'description': 'Complete your first exercise session',
                    'points': 50,
                    'icon': '🎯',
                    'category': 'milestone'
                })
            
            if sessions_completed == 5:  # 5 sessions
                achievements.append('consistent_training')
                session['gamification']['new_achievements'].append({
                    'id': 'consistent_training',
                    'name': 'Consistent Training',
                    'description': 'Complete 5 exercise sessions',
                    'points': 100,
                    'icon': '💪',
                    'category': 'milestone'
                })
            
            if session.get('formScore', 0) > 90:  # High form score
                achievements.append('form_master')
                session['gamification']['new_achievements'].append({
                    'id': 'form_master',
                    'name': 'Form Master',
                    'description': 'Achieve a form score above 90',
                    'points': 75,
                    'icon': '🏆',
                    'category': 'performance'
                })
            
            # Add badges
            if sessions_completed >= 3:
                badges.append('Bronze Badge')
                session['gamification']['new_badges'].append({
                    'name': 'Bronze Badge',
                    'description': 'Complete 3 sessions',
                    'icon': '🥉',
                    'category': 'milestone'
                })
        
        # Update user's gamification data
        user_data.update({
            'total_points': total_points,
            'sessions_completed': sessions_completed,
            'level': total_points // 50 + 1,
            'current_streak': sessions_completed,
            'longest_streak': sessions_completed,
            'achievements': list(set(achievements)),
            'badges': list(set(badges)),
            'last_session_date': sessions[-1]['timestamp'] if sessions else None
        })
        
        # Save updated user data
        gamification_engine.save_user_points(athlete_id, user_data)
        print(f"Updated {athlete_id}: {total_points} points, {sessions_completed} sessions, level {user_data['level']}")
    
    # Save updated sessions
    with open(sessions_file, 'w') as f:
        json.dump(sessions_data, f, indent=2)
    
    print("Gamification data added to existing sessions!")

if __name__ == "__main__":
    add_gamification_to_existing_sessions()
