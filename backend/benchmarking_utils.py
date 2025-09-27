#!/usr/bin/env python3
"""
Benchmarking utilities for exercise performance analysis
"""

import json
import os
from typing import Dict, List, Any, Tuple
from datetime import datetime

class BenchmarkingEngine:
    """Handles exercise performance benchmarking and comparison"""
    
    def __init__(self):
        self.benchmarks_file = "data/benchmarks.json"
        self.benchmarks = self._load_benchmarks()
    
    def _load_benchmarks(self) -> Dict[str, Any]:
        """Load benchmarking data from JSON file"""
        try:
            if os.path.exists(self.benchmarks_file):
                with open(self.benchmarks_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"Error loading benchmarks: {e}")
            return {}
    
    def calculate_performance_level(self, exercise: str, reps: int, form_score: int, 
                                  duration: float, age_group: str = "18-25") -> Dict[str, Any]:
        """Calculate performance level based on exercise standards"""
        
        if exercise not in self.benchmarks.get("exercise_standards", {}):
            return {"level": "unknown", "score": 0, "description": "Unknown exercise"}
        
        exercise_standards = self.benchmarks["exercise_standards"][exercise]
        age_multipliers = self.benchmarks.get("age_group_standards", {}).get(age_group, {})
        
        # Apply age group multipliers
        exercise_data = age_multipliers.get(exercise, {})
        reps_multiplier = exercise_data.get("reps_multiplier", 1.0)
        form_bonus = exercise_data.get("form_bonus", 0)
        
        adjusted_reps = int(reps * reps_multiplier)
        adjusted_form_score = min(100, form_score + form_bonus)
        
        # Determine performance level
        level = "beginner"
        level_score = 0
        
        for level_name, standards in exercise_standards.items():
            reps_min, reps_max = standards["reps_range"]
            form_min = standards["form_score_min"]
            duration_min, duration_max = standards["duration_range"]
            
            if (reps_min <= adjusted_reps <= reps_max and 
                adjusted_form_score >= form_min and
                duration_min <= duration <= duration_max):
                level = level_name
                # Calculate level score (0-100)
                reps_score = min(100, (adjusted_reps / reps_max) * 100)
                form_score_normalized = min(100, (adjusted_form_score / 100) * 100)
                duration_score = min(100, (duration / duration_max) * 100)
                level_score = (reps_score + form_score_normalized + duration_score) / 3
                break
        
        # Get standards for the determined level
        level_standards = exercise_standards.get(level, {})
        level_reps_min, level_reps_max = level_standards.get("reps_range", [0, 0])
        level_form_min = level_standards.get("form_score_min", 0)
        level_duration_min, level_duration_max = level_standards.get("duration_range", [0, 0])
        
        return {
            "level": level,
            "score": round(level_score, 1),
            "description": level_standards.get("description", ""),
            "adjusted_reps": adjusted_reps,
            "adjusted_form_score": adjusted_form_score,
            "standards_met": {
                "reps": level_reps_min <= adjusted_reps <= level_reps_max,
                "form": adjusted_form_score >= level_form_min,
                "duration": level_duration_min <= duration <= level_duration_max
            }
        }
    
    def calculate_peer_comparison(self, exercise: str, athlete_id: str, 
                                reps: int, form_score: int, duration: float) -> Dict[str, Any]:
        """Compare athlete performance against peers"""
        
        # Load all sessions for this exercise
        sessions_file = "data/sessions/sessions.json"
        try:
            with open(sessions_file, "r", encoding="utf-8") as f:
                all_sessions = json.load(f)
        except:
            return {"percentile": 50, "rank": "N/A", "total_athletes": 0}
        
        # Collect all performances for this exercise
        exercise_performances = []
        for athlete_data in all_sessions.values():
            if "sessions" in athlete_data:
                for session in athlete_data["sessions"]:
                    if session.get("exercise") == exercise:
                        performance_score = self._calculate_performance_score(
                            session.get("reps", 0),
                            session.get("formScore", 0),
                            session.get("durationSec", 0)
                        )
                        exercise_performances.append({
                            "athlete_id": session.get("athleteId"),
                            "score": performance_score,
                            "reps": session.get("reps", 0),
                            "form_score": session.get("formScore", 0),
                            "duration": session.get("durationSec", 0)
                        })
        
        if not exercise_performances:
            return {"percentile": 50, "rank": "N/A", "total_athletes": 0}
        
        # Calculate current athlete's performance score
        current_score = self._calculate_performance_score(reps, form_score, duration)
        
        # Sort performances by score
        exercise_performances.sort(key=lambda x: x["score"], reverse=True)
        
        # Find percentile and rank
        total_athletes = len(exercise_performances)
        better_performances = sum(1 for p in exercise_performances if p["score"] > current_score)
        percentile = round((total_athletes - better_performances) / total_athletes * 100, 1)
        
        # Find rank
        rank = next((i + 1 for i, p in enumerate(exercise_performances) 
                    if p["athlete_id"] == athlete_id), "N/A")
        
        return {
            "percentile": percentile,
            "rank": rank,
            "total_athletes": total_athletes,
            "performance_score": current_score,
            "average_score": round(sum(p["score"] for p in exercise_performances) / total_athletes, 1)
        }
    
    def _calculate_performance_score(self, reps: int, form_score: int, duration: float) -> float:
        """Calculate overall performance score"""
        # Weighted scoring: 40% reps, 40% form, 20% efficiency (reps per minute)
        
        # Normalize reps score based on exercise type (more realistic ranges)
        # For most exercises, 50+ reps is excellent
        reps_score = min(100, (reps / 50) * 100)
        
        # Form score is already 0-100
        form_score_normalized = form_score
        
        # Calculate efficiency (reps per minute) with proper normalization
        if duration > 0:
            reps_per_minute = (reps * 60) / duration
            # Normalize efficiency: 30+ reps per minute is excellent
            efficiency_score = min(100, (reps_per_minute / 30) * 100)
        else:
            efficiency_score = 0
        
        return (reps_score * 0.4 + form_score_normalized * 0.4 + efficiency_score * 0.2)
    
    def generate_leaderboard(self, exercise: str, coach_id: str = None) -> List[Dict[str, Any]]:
        """Generate leaderboard for specific exercise"""
        
        sessions_file = "data/sessions/sessions.json"
        try:
            with open(sessions_file, "r", encoding="utf-8") as f:
                all_sessions = json.load(f)
        except:
            return []
        
        leaderboard = []
        
        for athlete_id, athlete_data in all_sessions.items():
            if "sessions" in athlete_data:
                for session in athlete_data["sessions"]:
                    if session.get("exercise") == exercise:
                        # Filter by coach if specified
                        if coach_id and session.get("coachId") != coach_id:
                            continue
                            
                        performance_score = self._calculate_performance_score(
                            session.get("reps", 0),
                            session.get("formScore", 0),
                            session.get("durationSec", 0)
                        )
                        
                        leaderboard.append({
                            "athlete_id": athlete_id,
                            "athlete_name": session.get("athleteName", "Unknown"),
                            "coach_id": session.get("coachId"),
                            "coach_name": session.get("coachName", "Unknown"),
                            "reps": session.get("reps", 0),
                            "form_score": session.get("formScore", 0),
                            "duration": session.get("durationSec", 0),
                            "performance_score": round(performance_score, 1),
                            "timestamp": session.get("timestamp"),
                            "session_id": session.get("sessionId")
                        })
        
        # Sort by performance score (descending)
        leaderboard.sort(key=lambda x: x["performance_score"], reverse=True)
        
        # Add rank
        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1
        
        return leaderboard
    
    def get_benchmarking_data(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate complete benchmarking data for a session"""
        
        exercise = session_data.get("exercise", "")
        reps = session_data.get("reps", 0)
        form_score = session_data.get("formScore", 0)
        duration = session_data.get("durationSec", 0)
        athlete_id = session_data.get("athleteId", "")
        
        # Calculate performance level
        performance_level = self.calculate_performance_level(exercise, reps, form_score, duration)
        
        # Calculate peer comparison
        peer_comparison = self.calculate_peer_comparison(exercise, athlete_id, reps, form_score, duration)
        
        # Generate leaderboard data
        global_leaderboard = self.generate_leaderboard(exercise)
        coach_leaderboard = self.generate_leaderboard(exercise, session_data.get("coachId"))
        
        return {
            "performance_level": performance_level,
            "peer_comparison": peer_comparison,
            "global_rank": next((entry["rank"] for entry in global_leaderboard 
                               if entry["athlete_id"] == athlete_id), "N/A"),
            "coach_rank": next((entry["rank"] for entry in coach_leaderboard 
                              if entry["athlete_id"] == athlete_id), "N/A"),
            "total_global_athletes": len(global_leaderboard),
            "total_coach_athletes": len(coach_leaderboard),
            "improvement_suggestions": self._get_improvement_suggestions(
                performance_level, peer_comparison, exercise
            )
        }
    
    def _get_improvement_suggestions(self, performance_level: Dict[str, Any], 
                                   peer_comparison: Dict[str, Any], exercise: str) -> List[str]:
        """Generate improvement suggestions based on performance"""
        
        suggestions = []
        
        # Level-based suggestions
        if performance_level["level"] == "beginner":
            suggestions.append("Focus on proper form before increasing intensity")
            suggestions.append("Practice consistently to build muscle memory")
        elif performance_level["level"] == "intermediate":
            suggestions.append("Work on increasing rep count while maintaining form")
            suggestions.append("Add variety to your training routine")
        elif performance_level["level"] == "advanced":
            suggestions.append("Focus on perfecting technique and efficiency")
            suggestions.append("Consider adding resistance or variations")
        elif performance_level["level"] == "elite":
            suggestions.append("Maintain current performance level")
            suggestions.append("Consider mentoring other athletes")
        
        # Percentile-based suggestions
        if peer_comparison["percentile"] < 25:
            suggestions.append("Focus on consistent practice to improve ranking")
        elif peer_comparison["percentile"] > 75:
            suggestions.append("Excellent performance! Keep up the great work")
        
        # Standards-based suggestions
        standards_met = performance_level.get("standards_met", {})
        if not standards_met.get("form", True):
            suggestions.append("Work on improving form technique")
        if not standards_met.get("reps", True):
            suggestions.append("Gradually increase rep count")
        if not standards_met.get("duration", True):
            suggestions.append("Focus on exercise duration and pacing")
        
        return suggestions[:3]  # Return top 3 suggestions

# Global benchmarking engine instance
benchmarking_engine = BenchmarkingEngine()
