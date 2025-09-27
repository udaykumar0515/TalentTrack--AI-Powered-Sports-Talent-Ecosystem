#!/usr/bin/env python3
"""
Goal Setting Engine for Athletes
Handles goal creation, tracking, progress calculation, and achievement detection
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

class GoalType(Enum):
    REPS = "reps"
    FORM_SCORE = "form_score"
    DURATION = "duration"
    SESSIONS_COMPLETED = "sessions_completed"
    STREAK = "streak"
    WEIGHT_LOSS = "weight_loss"
    ENDURANCE = "endurance"

class GoalStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class GoalPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class GoalSettingEngine:
    def __init__(self, goals_file: str = "data/goals/goals.json"):
        self.goals_file = goals_file
        self.ensure_goals_file()
    
    def ensure_goals_file(self):
        """Ensure goals file exists with proper structure"""
        if not os.path.exists(self.goals_file):
            os.makedirs(os.path.dirname(self.goals_file), exist_ok=True)
            with open(self.goals_file, 'w') as f:
                json.dump({}, f)
    
    def create_goal(self, user_id: str, goal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new goal for a user"""
        try:
            goals = self.load_goals()
            
            goal_id = f"goal_{user_id}_{len(goals.get(user_id, [])) + 1}_{int(datetime.now().timestamp())}"
            
            goal = {
                "id": goal_id,
                "user_id": user_id,
                "title": goal_data.get("title", ""),
                "description": goal_data.get("description", ""),
                "type": goal_data.get("type", GoalType.REPS.value),
                "target_value": goal_data.get("target_value", 0),
                "current_value": 0,
                "unit": goal_data.get("unit", ""),
                "priority": goal_data.get("priority", GoalPriority.MEDIUM.value),
                "status": GoalStatus.ACTIVE.value,
                "start_date": datetime.now().isoformat(),
                "target_date": goal_data.get("target_date", ""),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "progress_percentage": 0.0,
                "milestones": goal_data.get("milestones", []),
                "tags": goal_data.get("tags", []),
                "is_public": goal_data.get("is_public", False),
                "motivation_notes": goal_data.get("motivation_notes", "")
            }
            
            if user_id not in goals:
                goals[user_id] = []
            
            goals[user_id].append(goal)
            self.save_goals(goals)
            
            return goal
            
        except Exception as e:
            print(f"Error creating goal: {e}")
            return {}
    
    def get_user_goals(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all goals for a user, optionally filtered by status"""
        try:
            goals = self.load_goals()
            user_goals = goals.get(user_id, [])
            
            if status:
                user_goals = [goal for goal in user_goals if goal.get("status") == status]
            
            return user_goals
            
        except Exception as e:
            print(f"Error getting user goals: {e}")
            return []
    
    def update_goal(self, user_id: str, goal_id: str, updates: Dict[str, Any]) -> bool:
        """Update a specific goal"""
        try:
            goals = self.load_goals()
            user_goals = goals.get(user_id, [])
            
            for i, goal in enumerate(user_goals):
                if goal["id"] == goal_id:
                    # Update fields
                    for key, value in updates.items():
                        if key in goal:
                            goal[key] = value
                    
                    goal["updated_at"] = datetime.now().isoformat()
                    user_goals[i] = goal
                    goals[user_id] = user_goals
                    self.save_goals(goals)
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error updating goal: {e}")
            return False
    
    def delete_goal(self, user_id: str, goal_id: str) -> bool:
        """Delete a specific goal"""
        try:
            goals = self.load_goals()
            user_goals = goals.get(user_id, [])
            
            user_goals = [goal for goal in user_goals if goal["id"] != goal_id]
            goals[user_id] = user_goals
            self.save_goals(goals)
            return True
            
        except Exception as e:
            print(f"Error deleting goal: {e}")
            return False
    
    def update_goal_progress(self, user_id: str, goal_id: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update goal progress based on session data"""
        try:
            goals = self.load_goals()
            user_goals = goals.get(user_id, [])
            
            for goal in user_goals:
                if goal["id"] == goal_id:
                    # Calculate progress based on goal type
                    progress_update = self._calculate_progress(goal, session_data)
                    
                    # Update goal with new progress
                    goal["current_value"] = progress_update["current_value"]
                    goal["progress_percentage"] = progress_update["progress_percentage"]
                    goal["updated_at"] = datetime.now().isoformat()
                    
                    # Check if goal is completed
                    if goal["progress_percentage"] >= 100:
                        goal["status"] = GoalStatus.COMPLETED.value
                        goal["completed_at"] = datetime.now().isoformat()
                    
                    # Update in goals
                    for i, g in enumerate(user_goals):
                        if g["id"] == goal_id:
                            user_goals[i] = goal
                            break
                    
                    goals[user_id] = user_goals
                    self.save_goals(goals)
                    
                    return progress_update
            
            return {}
            
        except Exception as e:
            print(f"Error updating goal progress: {e}")
            return {}
    
    def _calculate_progress(self, goal: Dict[str, Any], session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate progress for a specific goal based on session data"""
        goal_type = goal["type"]
        target_value = goal["target_value"]
        current_value = goal.get("current_value", 0)
        
        # Get relevant value from session data
        session_value = 0
        if goal_type == GoalType.REPS.value:
            session_value = session_data.get("reps", 0)
        elif goal_type == GoalType.FORM_SCORE.value:
            session_value = session_data.get("formScore", 0)
        elif goal_type == GoalType.DURATION.value:
            session_value = session_data.get("durationSec", 0)
        elif goal_type == GoalType.SESSIONS_COMPLETED.value:
            session_value = 1  # Each session counts as 1
        elif goal_type == GoalType.STREAK.value:
            # Streak calculation would need historical data
            session_value = 1
        elif goal_type == GoalType.ENDURANCE.value:
            # Endurance could be based on duration or reps
            session_value = session_data.get("durationSec", 0)
        
        # Update current value
        if goal_type in [GoalType.REPS.value, GoalType.FORM_SCORE.value, GoalType.DURATION.value, GoalType.ENDURANCE.value]:
            # For cumulative goals, add to current value
            new_current_value = current_value + session_value
        else:
            # For other goals, use the session value directly
            new_current_value = session_value
        
        # Calculate progress percentage
        progress_percentage = min((new_current_value / target_value) * 100, 100) if target_value > 0 else 0
        
        return {
            "current_value": new_current_value,
            "progress_percentage": round(progress_percentage, 2),
            "session_contribution": session_value
        }
    
    def get_goal_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get analytics for user's goals"""
        try:
            goals = self.get_user_goals(user_id)
            
            total_goals = len(goals)
            active_goals = len([g for g in goals if g["status"] == GoalStatus.ACTIVE.value])
            completed_goals = len([g for g in goals if g["status"] == GoalStatus.COMPLETED.value])
            
            # Calculate average progress
            active_goal_progress = [g["progress_percentage"] for g in goals if g["status"] == GoalStatus.ACTIVE.value]
            avg_progress = sum(active_goal_progress) / len(active_goal_progress) if active_goal_progress else 0
            
            # Goal completion rate
            completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0
            
            # Goals by type
            goals_by_type = {}
            for goal in goals:
                goal_type = goal["type"]
                if goal_type not in goals_by_type:
                    goals_by_type[goal_type] = 0
                goals_by_type[goal_type] += 1
            
            # Goals by priority
            goals_by_priority = {}
            for goal in goals:
                priority = goal["priority"]
                if priority not in goals_by_priority:
                    goals_by_priority[priority] = 0
                goals_by_priority[priority] += 1
            
            return {
                "total_goals": total_goals,
                "active_goals": active_goals,
                "completed_goals": completed_goals,
                "completion_rate": round(completion_rate, 2),
                "average_progress": round(avg_progress, 2),
                "goals_by_type": goals_by_type,
                "goals_by_priority": goals_by_priority,
                "recent_goals": sorted(goals, key=lambda x: x["created_at"], reverse=True)[:5]
            }
            
        except Exception as e:
            print(f"Error getting goal analytics: {e}")
            return {}
    
    def get_goal_recommendations(self, user_id: str, session_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate goal recommendations based on user's session history"""
        try:
            recommendations = []
            
            if not session_history:
                return recommendations
            
            # Analyze session history
            avg_reps = sum(s.get("reps", 0) for s in session_history) / len(session_history)
            avg_form_score = sum(s.get("formScore", 0) for s in session_history) / len(session_history)
            avg_duration = sum(s.get("durationSec", 0) for s in session_history) / len(session_history)
            
            # Generate recommendations based on performance
            if avg_reps < 15:
                recommendations.append({
                    "type": GoalType.REPS.value,
                    "title": "Increase Rep Count",
                    "description": f"Work towards completing {int(avg_reps * 1.5)} reps per session",
                    "target_value": int(avg_reps * 1.5),
                    "unit": "reps",
                    "priority": GoalPriority.MEDIUM.value,
                    "reason": f"Your current average is {avg_reps:.1f} reps. Let's aim for 50% more!"
                })
            
            if avg_form_score < 85:
                recommendations.append({
                    "type": GoalType.FORM_SCORE.value,
                    "title": "Improve Form Quality",
                    "description": f"Focus on achieving a form score of 85+ consistently",
                    "target_value": 85,
                    "unit": "score",
                    "priority": GoalPriority.HIGH.value,
                    "reason": f"Your current average form score is {avg_form_score:.1f}. Good form is crucial for progress!"
                })
            
            if avg_duration < 60:
                recommendations.append({
                    "type": GoalType.DURATION.value,
                    "title": "Build Endurance",
                    "description": f"Increase session duration to {int(avg_duration * 1.5)} seconds",
                    "target_value": int(avg_duration * 1.5),
                    "unit": "seconds",
                    "priority": GoalPriority.LOW.value,
                    "reason": f"Your current average session duration is {avg_duration:.1f} seconds. Building endurance will help with overall fitness!"
                })
            
            # Consistency recommendation
            if len(session_history) < 10:
                recommendations.append({
                    "type": GoalType.SESSIONS_COMPLETED.value,
                    "title": "Build Consistency",
                    "description": "Complete 10 sessions this month",
                    "target_value": 10,
                    "unit": "sessions",
                    "priority": GoalPriority.MEDIUM.value,
                    "reason": "Consistency is key to seeing results. Aim for regular practice!"
                })
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating goal recommendations: {e}")
            return []
    
    def load_goals(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load goals from file"""
        try:
            with open(self.goals_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    
    def save_goals(self, goals: Dict[str, List[Dict[str, Any]]]):
        """Save goals to file"""
        with open(self.goals_file, 'w') as f:
            json.dump(goals, f, indent=2)
