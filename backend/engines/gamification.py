import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid

class GamificationEngine:
    def __init__(self):
        self.achievements_file = "data/gamification/achievements.json"
        self.badges_file = "data/gamification/badges.json"
        self.points_file = "data/gamification/points.json"
        self.leaderboards_file = "data/gamification/leaderboards.json"
        self.ensure_files_exist()
    
    def ensure_files_exist(self):
        """Ensure all gamification data files exist"""
        os.makedirs("data/gamification", exist_ok=True)
        
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
        
        # Form score bonus (more weight on form)
        form_score = session_data.get('formScore', session_data.get('form_score', 0))
        if form_score >= 95:
            points += 60
        elif form_score >= 90:
            points += 40
        elif form_score >= 85:
            points += 30
        elif form_score >= 80:
            points += 20
        elif form_score >= 70:
            points += 10
        
        # Reps bonus (primary factor)
        reps = session_data.get('reps', 0)
        if reps >= 50:
            points += 50
        elif reps >= 40:
            points += 40
        elif reps >= 30:
            points += 30
        elif reps >= 20:
            points += 20
        elif reps >= 15:
            points += 15
        elif reps >= 10:
            points += 10
        elif reps >= 5:
            points += 5
        
        # Speed bonus (reps per minute)
        duration = session_data.get('durationSec', session_data.get('duration', 1))
        if duration > 0:
            reps_per_minute = (reps * 60) / duration
            if reps_per_minute >= 40:
                points += 25
            elif reps_per_minute >= 30:
                points += 20
            elif reps_per_minute >= 20:
                points += 15
            elif reps_per_minute >= 15:
                points += 10
        
        # Risk level bonus (lower risk = more points)
        risk_level = session_data.get('risk', session_data.get('risk_level', 'medium')).lower()
        if risk_level == 'low':
            points += 15
        elif risk_level == 'medium':
            points += 10
        elif risk_level == 'high':
            points += 5
        
        return points
    
    def check_achievements(self, user_id: str, session_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check if user has earned any new achievements"""
        user_data = self.load_user_points(user_id)
        achievements = self.load_achievements()
        new_achievements = []
        
        # Check first session
        if user_data["sessions_completed"] == 0 and "first_session" not in user_data["achievements"]:
            if "first_session" in achievements:
                new_achievements.append(achievements["first_session"])
        
        # Check perfect form
        form_score = session_data.get('form_score', session_data.get('formScore', 0))
        if form_score >= 95 and "perfect_form" not in user_data["achievements"]:
            if "perfect_form" in achievements:
                new_achievements.append(achievements["perfect_form"])
        
        # Check speed demon
        reps = session_data.get('reps', 0)
        duration = session_data.get('duration', session_data.get('durationSec', 1))
        if reps >= 20 and duration <= 30 and "speed_demon" not in user_data["achievements"]:
            if "speed_demon" in achievements:
                new_achievements.append(achievements["speed_demon"])
        
        # Check endurance king
        if reps >= 50 and "endurance_king" not in user_data["achievements"]:
            if "endurance_king" in achievements:
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
            if early_sessions >= 5 and "early_bird" in achievements:
                new_achievements.append(achievements["early_bird"])
            user_data["early_sessions"] = early_sessions
        
        # Check night owl
        if session_time.hour >= 22 and "night_owl" not in user_data["achievements"]:
            # Count late night sessions
            night_sessions = user_data.get("night_sessions", 0) + 1
            if night_sessions >= 5 and "night_owl" in achievements:
                new_achievements.append(achievements["night_owl"])
            user_data["night_sessions"] = night_sessions
        
        # Check risk-free warrior
        risk_level = session_data.get('risk_level', 'medium').lower()
        if risk_level == 'low' and "risk_free" not in user_data["achievements"]:
            low_risk_sessions = user_data.get("low_risk_sessions", 0) + 1
            if low_risk_sessions >= 10 and "risk_free" in achievements:
                new_achievements.append(achievements["risk_free"])
            user_data["low_risk_sessions"] = low_risk_sessions
        
        # Check variety seeker
        exercise_type = session_data.get('exercise_type', 'unknown')
        if "variety_seeker" not in user_data["achievements"]:
            unique_exercises = set(user_data.get("unique_exercises", []))
            unique_exercises.add(exercise_type)
            if len(unique_exercises) >= 5 and "variety_seeker" in achievements:
                new_achievements.append(achievements["variety_seeker"])
            user_data["unique_exercises"] = list(unique_exercises)
        
        return new_achievements
    
    def check_badges(self, user_id: str, total_points: int) -> List[Dict[str, Any]]:
        """Check if user has earned any new badges"""
        user_data = self.load_user_points(user_id)
        badges = self.load_badges()
        new_badges = []
        
        # Find the highest badge the user can earn
        highest_badge = None
        highest_points_required = 0
        
        for badge_id, badge_data in badges.items():
            if total_points >= badge_data["points_required"]:
                if badge_data["points_required"] > highest_points_required:
                    highest_badge = badge_data
                    highest_points_required = badge_data["points_required"]
        
        # Check if this is a new highest badge
        current_badge = user_data.get("current_badge")
        if highest_badge and (not current_badge or highest_badge["points_required"] > current_badge.get("points_required", 0)):
            new_badges.append(highest_badge)
        
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
        
        # Load athletes data to map user_id to username
        athletes_data = {}
        try:
            with open("data/athletes.json", 'r', encoding='utf-8') as f:
                athletes = json.load(f)
                for athlete in athletes:
                    athletes_data[athlete["id"]] = athlete["username"]
        except:
            pass
        
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
            # Get the actual username from athletes data
            username = athletes_data.get(user_id, user_id)
            
            leaderboard.append({
                "rank": rank,
                "user_id": username,  # Use username instead of user_id
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
    
    def recalculate_user_stats_from_sessions(self, user_id: str) -> Dict[str, Any]:
        """Recalculate user stats from actual session data"""
        try:
            # Load sessions data
            sessions_file = "data/sessions/sessions.json"
            if not os.path.exists(sessions_file):
                return self.load_user_points(user_id)
            
            with open(sessions_file, 'r', encoding='utf-8') as f:
                sessions_data = json.load(f)
            
            if user_id not in sessions_data or "sessions" not in sessions_data[user_id]:
                return self.load_user_points(user_id)
            
            user_sessions = sessions_data[user_id]["sessions"]
            if not user_sessions:
                return self.load_user_points(user_id)
            
            # Initialize user data
            user_data = {
                "total_points": 0,
                "achievements": [],
                "badges": [],
                "level": 1,
                "sessions_completed": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "last_session_date": None,
                "unique_exercises": set(),
                "early_sessions": 0,
                "night_sessions": 0,
                "low_risk_sessions": 0
            }
            
            # Sort sessions by date
            sorted_sessions = sorted(user_sessions, key=lambda x: x.get('timestamp', x.get('date', '')))
            
            # Calculate stats from sessions
            current_streak = 0
            longest_streak = 0
            last_session_date = None
            
            for session in sorted_sessions:
                # Calculate points for this session
                session_points = self.calculate_session_points(session)
                user_data["total_points"] += session_points
                user_data["sessions_completed"] += 1
                
                # Track unique exercises
                exercise = session.get('exercise', 'unknown')
                user_data["unique_exercises"].add(exercise)
                
                # Track time-based sessions
                session_time_str = session.get('timestamp', session.get('date', ''))
                if session_time_str:
                    try:
                        session_time = datetime.fromisoformat(session_time_str.replace('Z', '+00:00'))
                        if session_time.hour < 8:
                            user_data["early_sessions"] += 1
                        if session_time.hour >= 22:
                            user_data["night_sessions"] += 1
                    except:
                        pass
                
                # Track risk level
                risk = session.get('risk', session.get('risk_level', 'medium')).lower()
                if risk == 'low':
                    user_data["low_risk_sessions"] += 1
                
                # Calculate streak
                session_date_str = session.get('timestamp', session.get('date', ''))
                if session_date_str:
                    try:
                        session_date = datetime.fromisoformat(session_date_str.replace('Z', '+00:00')).date()
                        
                        if last_session_date is None:
                            current_streak = 1
                        else:
                            days_diff = (session_date - last_session_date).days
                            if days_diff == 1:
                                current_streak += 1
                            elif days_diff == 0:
                                # Same day, don't change streak
                                pass
                            else:
                                current_streak = 1
                        
                        longest_streak = max(longest_streak, current_streak)
                        last_session_date = session_date
                        user_data["last_session_date"] = session_time_str
                    except:
                        pass
            
            # Convert set to list for JSON serialization
            user_data["unique_exercises"] = list(user_data["unique_exercises"])
            
            # Calculate level based on points (every 500 points = 1 level)
            user_data["level"] = (user_data["total_points"] // 500) + 1
            
            # Calculate current streak (check if last session was today or yesterday)
            if last_session_date:
                today = datetime.now().date()
                days_since_last = (today - last_session_date).days
                if days_since_last > 1:
                    user_data["current_streak"] = 0
                else:
                    user_data["current_streak"] = current_streak
            
            user_data["longest_streak"] = longest_streak
            
            # Check achievements
            achievements = self.load_achievements()
            user_achievements = []
            
            # First session
            if user_data["sessions_completed"] >= 1:
                user_achievements.append("first_session")
            
            # Perfect form (check if any session had 95%+ form)
            for session in sorted_sessions:
                form_score = session.get('formScore', session.get('form_score', 0))
                if form_score >= 95:
                    user_achievements.append("perfect_form")
                    break
            
            # Speed demon (20+ reps in under 30 seconds)
            for session in sorted_sessions:
                reps = session.get('reps', 0)
                duration = session.get('durationSec', session.get('duration', 1))
                if reps >= 20 and duration <= 30:
                    user_achievements.append("speed_demon")
                    break
            
            # Endurance king (50+ reps)
            for session in sorted_sessions:
                reps = session.get('reps', 0)
                if reps >= 50:
                    user_achievements.append("endurance_king")
                    break
            
            # Early bird (5+ early sessions)
            if user_data["early_sessions"] >= 5:
                user_achievements.append("early_bird")
            
            # Night owl (5+ night sessions)
            if user_data["night_sessions"] >= 5:
                user_achievements.append("night_owl")
            
            # Risk-free warrior (10+ low risk sessions)
            if user_data["low_risk_sessions"] >= 10:
                user_achievements.append("risk_free")
            
            # Variety seeker (5+ different exercises)
            if len(user_data["unique_exercises"]) >= 5:
                user_achievements.append("variety_seeker")
            
            # Century club (100+ sessions)
            if user_data["sessions_completed"] >= 100:
                user_achievements.append("century_club")
            
            # Add achievement points
            for achievement_id in user_achievements:
                if achievement_id in achievements:
                    user_data["total_points"] += achievements[achievement_id]["points"]
            
            user_data["achievements"] = user_achievements
            
            # Check badges - only store the highest badge earned
            badges = self.load_badges()
            highest_badge = None
            highest_points_required = 0
            
            for badge_id, badge_data in badges.items():
                if user_data["total_points"] >= badge_data["points_required"]:
                    if badge_data["points_required"] > highest_points_required:
                        highest_badge = badge_data
                        highest_points_required = badge_data["points_required"]
            
            # Store only the highest badge
            user_data["badges"] = [highest_badge["name"]] if highest_badge else []
            user_data["current_badge"] = highest_badge if highest_badge else None
            
            # Recalculate level after adding achievement points
            user_data["level"] = (user_data["total_points"] // 500) + 1
            
            # Save updated data
            self.save_user_points(user_id, user_data)
            
            return user_data
            
        except Exception as e:
            print(f"Error recalculating stats for {user_id}: {e}")
            return self.load_user_points(user_id)
    
    def recalculate_all_users_stats(self):
        """Recalculate stats for all users from their session data"""
        try:
            # Load sessions data
            sessions_file = "data/sessions/sessions.json"
            if not os.path.exists(sessions_file):
                return
            
            with open(sessions_file, 'r', encoding='utf-8') as f:
                sessions_data = json.load(f)
            
            # Recalculate for each user
            for user_id in sessions_data.keys():
                self.recalculate_user_stats_from_sessions(user_id)
                
        except Exception as e:
            print(f"Error recalculating all users stats: {e}")
