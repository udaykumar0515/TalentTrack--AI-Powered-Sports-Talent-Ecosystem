import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid

class GamificationEngine:
    def __init__(self):
        self.achievements_file = "data/achievements.json"
        self.badges_file = "data/badges.json"
        self.points_file = "data/points.json"
        self.leaderboards_file = "data/leaderboards.json"
        self.ensure_files_exist()
    
    def ensure_files_exist(self):
        """Ensure all gamification data files exist"""
        os.makedirs("data", exist_ok=True)
        
        # Initialize achievements
        if not os.path.exists(self.achievements_file):
            achievements = {
                "first_session": {
                    "id": "first_session",
                    "name": "First Steps",
                    "description": "Complete your first exercise session",
                    "points": 50,
                    "icon": "🎯",
                    "category": "milestone"
                },
                "perfect_form": {
                    "id": "perfect_form",
                    "name": "Form Master",
                    "description": "Achieve 95%+ form score in a session",
                    "points": 100,
                    "icon": "💎",
                    "category": "performance"
                },
                "streak_7": {
                    "id": "streak_7",
                    "name": "Week Warrior",
                    "description": "Complete 7 sessions in a row",
                    "points": 200,
                    "icon": "🔥",
                    "category": "consistency"
                },
                "streak_30": {
                    "id": "streak_30",
                    "name": "Monthly Master",
                    "description": "Complete 30 sessions in a row",
                    "points": 500,
                    "icon": "👑",
                    "category": "consistency"
                },
                "speed_demon": {
                    "id": "speed_demon",
                    "name": "Speed Demon",
                    "description": "Complete 20+ reps in under 30 seconds",
                    "points": 150,
                    "icon": "⚡",
                    "category": "performance"
                },
                "endurance_king": {
                    "id": "endurance_king",
                    "name": "Endurance King",
                    "description": "Complete 50+ reps in a single session",
                    "points": 300,
                    "icon": "💪",
                    "category": "performance"
                },
                "improvement_master": {
                    "id": "improvement_master",
                    "name": "Improvement Master",
                    "description": "Improve form score by 20%+ from previous session",
                    "points": 200,
                    "icon": "📈",
                    "category": "improvement"
                },
                "early_bird": {
                    "id": "early_bird",
                    "name": "Early Bird",
                    "description": "Complete 5 sessions before 8 AM",
                    "points": 100,
                    "icon": "🌅",
                    "category": "lifestyle"
                },
                "night_owl": {
                    "id": "night_owl",
                    "name": "Night Owl",
                    "description": "Complete 5 sessions after 10 PM",
                    "points": 100,
                    "icon": "🦉",
                    "category": "lifestyle"
                },
                "social_butterfly": {
                    "id": "social_butterfly",
                    "name": "Social Butterfly",
                    "description": "Send 10 messages to your coach",
                    "points": 75,
                    "icon": "💬",
                    "category": "social"
                },
                "coach_favorite": {
                    "id": "coach_favorite",
                    "name": "Coach's Favorite",
                    "description": "Receive positive feedback from coach 5 times",
                    "points": 250,
                    "icon": "⭐",
                    "category": "social"
                },
                "risk_free": {
                    "id": "risk_free",
                    "name": "Risk-Free Warrior",
                    "description": "Complete 10 sessions with low risk level",
                    "points": 150,
                    "icon": "🛡️",
                    "category": "safety"
                },
                "variety_seeker": {
                    "id": "variety_seeker",
                    "name": "Variety Seeker",
                    "description": "Try 5 different exercise types",
                    "points": 200,
                    "icon": "🎭",
                    "category": "variety"
                },
                "century_club": {
                    "id": "century_club",
                    "name": "Century Club",
                    "description": "Complete 100 total sessions",
                    "points": 1000,
                    "icon": "💯",
                    "category": "milestone"
                }
            }
            with open(self.achievements_file, 'w') as f:
                json.dump(achievements, f, indent=2)
        
        # Initialize badges
        if not os.path.exists(self.badges_file):
            badges = {
                "bronze": {
                    "name": "Bronze Badge",
                    "description": "Earn 100 points",
                    "icon": "🥉",
                    "points_required": 100
                },
                "silver": {
                    "name": "Silver Badge",
                    "description": "Earn 500 points",
                    "icon": "🥈",
                    "points_required": 500
                },
                "gold": {
                    "name": "Gold Badge",
                    "description": "Earn 1000 points",
                    "icon": "🥇",
                    "points_required": 1000
                },
                "platinum": {
                    "name": "Platinum Badge",
                    "description": "Earn 2500 points",
                    "icon": "💎",
                    "points_required": 2500
                },
                "diamond": {
                    "name": "Diamond Badge",
                    "description": "Earn 5000 points",
                    "icon": "💠",
                    "points_required": 5000
                }
            }
            with open(self.badges_file, 'w') as f:
                json.dump(badges, f, indent=2)
        
        # Initialize points tracking
        if not os.path.exists(self.points_file):
            with open(self.points_file, 'w') as f:
                json.dump({}, f)
        
        # Initialize leaderboards
        if not os.path.exists(self.leaderboards_file):
            with open(self.leaderboards_file, 'w') as f:
                json.dump({}, f)
    
    def load_achievements(self) -> Dict[str, Any]:
        """Load achievements from file"""
        with open(self.achievements_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def load_badges(self) -> Dict[str, Any]:
        """Load badges from file"""
        with open(self.badges_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def load_user_points(self, user_id: str) -> Dict[str, Any]:
        """Load user's points and achievements"""
        try:
            with open(self.points_file, 'r', encoding='utf-8') as f:
                all_points = json.load(f)
                return all_points.get(user_id, {
                    "total_points": 0,
                    "achievements": [],
                    "badges": [],
                    "level": 1,
                    "sessions_completed": 0,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "last_session_date": None
                })
        except:
            return {
                "total_points": 0,
                "achievements": [],
                "badges": [],
                "level": 1,
                "sessions_completed": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "last_session_date": None
            }
    
    def save_user_points(self, user_id: str, user_data: Dict[str, Any]):
        """Save user's points and achievements"""
        try:
            with open(self.points_file, 'r', encoding='utf-8') as f:
                all_points = json.load(f)
        except:
            all_points = {}
        
        all_points[user_id] = user_data
        
        with open(self.points_file, 'w') as f:
            json.dump(all_points, f, indent=2)
    
    def calculate_session_points(self, session_data: Dict[str, Any]) -> int:
        """Calculate points for a session based on performance"""
        points = 0
        
        # Base points for completing session
        points += 10
        
        # Form score bonus
        form_score = session_data.get('form_score', 0)
        if form_score >= 95:
            points += 50
        elif form_score >= 90:
            points += 30
        elif form_score >= 80:
            points += 20
        elif form_score >= 70:
            points += 10
        
        # Reps bonus
        reps = session_data.get('reps', 0)
        if reps >= 50:
            points += 30
        elif reps >= 30:
            points += 20
        elif reps >= 20:
            points += 10
        elif reps >= 10:
            points += 5
        
        # Speed bonus (reps per minute)
        duration = session_data.get('duration', 1)
        reps_per_minute = (reps * 60) / duration if duration > 0 else 0
        if reps_per_minute >= 40:
            points += 25
        elif reps_per_minute >= 30:
            points += 15
        elif reps_per_minute >= 20:
            points += 10
        
        # Risk level bonus (lower risk = more points)
        risk_level = session_data.get('risk_level', 'medium').lower()
        if risk_level == 'low':
            points += 15
        elif risk_level == 'medium':
            points += 10
        elif risk_level == 'high':
            points += 5
        
        # Consistency bonus (if this is part of a streak)
        # This will be calculated in the main process
        
        return points
    
    def check_achievements(self, user_id: str, session_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check if user has earned any new achievements"""
        user_data = self.load_user_points(user_id)
        achievements = self.load_achievements()
        new_achievements = []
        
        # Check first session
        if user_data["sessions_completed"] == 0 and "first_session" not in user_data["achievements"]:
            new_achievements.append(achievements["first_session"])
        
        # Check perfect form
        form_score = session_data.get('form_score', 0)
        if form_score >= 95 and "perfect_form" not in user_data["achievements"]:
            new_achievements.append(achievements["perfect_form"])
        
        # Check speed demon
        reps = session_data.get('reps', 0)
        duration = session_data.get('duration', 1)
        if reps >= 20 and duration <= 30 and "speed_demon" not in user_data["achievements"]:
            new_achievements.append(achievements["speed_demon"])
        
        # Check endurance king
        if reps >= 50 and "endurance_king" not in user_data["achievements"]:
            new_achievements.append(achievements["endurance_king"])
        
        # Check improvement master
        if "improvement_master" not in user_data["achievements"]:
            # This would need previous session data to calculate improvement
            # For now, we'll skip this check
            pass
        
        # Check early bird
        session_time = datetime.now()
        if session_time.hour < 8 and "early_bird" not in user_data["achievements"]:
            # Count early morning sessions
            early_sessions = user_data.get("early_sessions", 0) + 1
            if early_sessions >= 5:
                new_achievements.append(achievements["early_bird"])
            user_data["early_sessions"] = early_sessions
        
        # Check night owl
        if session_time.hour >= 22 and "night_owl" not in user_data["achievements"]:
            # Count late night sessions
            night_sessions = user_data.get("night_sessions", 0) + 1
            if night_sessions >= 5:
                new_achievements.append(achievements["night_owl"])
            user_data["night_sessions"] = night_sessions
        
        # Check risk-free warrior
        risk_level = session_data.get('risk_level', 'medium').lower()
        if risk_level == 'low' and "risk_free" not in user_data["achievements"]:
            low_risk_sessions = user_data.get("low_risk_sessions", 0) + 1
            if low_risk_sessions >= 10:
                new_achievements.append(achievements["risk_free"])
            user_data["low_risk_sessions"] = low_risk_sessions
        
        # Check variety seeker
        exercise_type = session_data.get('exercise_type', 'unknown')
        if "variety_seeker" not in user_data["achievements"]:
            unique_exercises = set(user_data.get("unique_exercises", []))
            unique_exercises.add(exercise_type)
            if len(unique_exercises) >= 5:
                new_achievements.append(achievements["variety_seeker"])
            user_data["unique_exercises"] = list(unique_exercises)
        
        return new_achievements
    
    def check_badges(self, user_id: str, total_points: int) -> List[Dict[str, Any]]:
        """Check if user has earned any new badges"""
        user_data = self.load_user_points(user_id)
        badges = self.load_badges()
        new_badges = []
        
        for badge_id, badge_data in badges.items():
            if (badge_id not in user_data["badges"] and 
                total_points >= badge_data["points_required"]):
                new_badges.append(badge_data)
        
        return new_badges
    
    def update_user_progress(self, user_id: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user's progress and return gamification data"""
        user_data = self.load_user_points(user_id)
        
        # Calculate session points
        session_points = self.calculate_session_points(session_data)
        
        # Update basic stats
        user_data["sessions_completed"] += 1
        user_data["total_points"] += session_points
        user_data["last_session_date"] = datetime.now().isoformat()
        
        # Update streak
        last_session = user_data.get("last_session_date")
        if last_session:
            last_date = datetime.fromisoformat(last_session)
            current_date = datetime.now()
            if (current_date - last_date).days <= 1:
                user_data["current_streak"] += 1
            else:
                user_data["current_streak"] = 1
        else:
            user_data["current_streak"] = 1
        
        user_data["longest_streak"] = max(user_data["longest_streak"], user_data["current_streak"])
        
        # Check for new achievements
        new_achievements = self.check_achievements(user_id, session_data)
        for achievement in new_achievements:
            user_data["achievements"].append(achievement["id"])
            user_data["total_points"] += achievement["points"]
        
        # Check for new badges
        new_badges = self.check_badges(user_id, user_data["total_points"])
        for badge in new_badges:
            user_data["badges"].append(badge["name"])
        
        # Calculate level (every 1000 points = 1 level)
        user_data["level"] = (user_data["total_points"] // 1000) + 1
        
        # Save updated data
        self.save_user_points(user_id, user_data)
        
        # Return gamification data for this session
        return {
            "session_points": session_points,
            "total_points": user_data["total_points"],
            "level": user_data["level"],
            "new_achievements": new_achievements,
            "new_badges": new_badges,
            "current_streak": user_data["current_streak"],
            "longest_streak": user_data["longest_streak"],
            "sessions_completed": user_data["sessions_completed"]
        }
    
    def get_leaderboard(self, category: str = "total_points", limit: int = 10) -> List[Dict[str, Any]]:
        """Get leaderboard for a specific category"""
        try:
            with open(self.points_file, 'r', encoding='utf-8') as f:
                all_points = json.load(f)
        except:
            return []
        
        # Sort users by category
        if category == "total_points":
            sorted_users = sorted(all_points.items(), 
                                key=lambda x: x[1].get("total_points", 0), 
                                reverse=True)
        elif category == "current_streak":
            sorted_users = sorted(all_points.items(), 
                                key=lambda x: x[1].get("current_streak", 0), 
                                reverse=True)
        elif category == "sessions_completed":
            sorted_users = sorted(all_points.items(), 
                                key=lambda x: x[1].get("sessions_completed", 0), 
                                reverse=True)
        else:
            return []
        
        leaderboard = []
        for rank, (user_id, user_data) in enumerate(sorted_users[:limit], 1):
            leaderboard.append({
                "rank": rank,
                "user_id": user_id,
                "total_points": user_data.get("total_points", 0),
                "level": user_data.get("level", 1),
                "sessions_completed": user_data.get("sessions_completed", 0),
                "current_streak": user_data.get("current_streak", 0),
                "longest_streak": user_data.get("longest_streak", 0),
                "badges": user_data.get("badges", []),
                "achievements": user_data.get("achievements", [])
            })
        
        return leaderboard
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        user_data = self.load_user_points(user_id)
        achievements = self.load_achievements()
        badges = self.load_badges()
        
        # Get user's achievement details
        user_achievements = []
        for achievement_id in user_data.get("achievements", []):
            if achievement_id in achievements:
                user_achievements.append(achievements[achievement_id])
        
        # Get user's badge details
        user_badges = []
        for badge_name in user_data.get("badges", []):
            for badge_id, badge_data in badges.items():
                if badge_data["name"] == badge_name:
                    user_badges.append(badge_data)
                    break
        
        return {
            "user_id": user_id,
            "total_points": user_data.get("total_points", 0),
            "level": user_data.get("level", 1),
            "sessions_completed": user_data.get("sessions_completed", 0),
            "current_streak": user_data.get("current_streak", 0),
            "longest_streak": user_data.get("longest_streak", 0),
            "achievements": user_achievements,
            "badges": user_badges,
            "last_session_date": user_data.get("last_session_date")
        }
