# training_plans.py
"""
Personalized Training Plans Generator for TalentTrack
Generates AI-powered training recommendations based on athlete performance, goals, and analytics.
"""

import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import os
from .predictive_analytics import predictive_analytics
from .benchmarking import benchmarking_engine
from services.gemini_client import gemini_client

class TrainingPlanGenerator:
    def __init__(self):
        self.data_dir = "data"
        self.sessions_file = os.path.join(self.data_dir, "sessions", "sessions.json")
        self.athletes_file = os.path.join(self.data_dir, "athletes", "athletes.json")
        self.training_plans_file = os.path.join(self.data_dir, "training_plans", "training_plans.json")
        
    def _load_sessions(self) -> List[Dict]:
        """Load all sessions data"""
        try:
            with open(self.sessions_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Flatten the nested structure
                all_sessions = []
                if isinstance(data, dict):
                    for athlete_id, athlete_data in data.items():
                        if isinstance(athlete_data, dict) and 'sessions' in athlete_data:
                            all_sessions.extend(athlete_data['sessions'])
                return all_sessions
        except FileNotFoundError:
            return []
    
    def _load_athletes(self) -> List[Dict]:
        """Load athletes data"""
        try:
            with open(self.athletes_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return []
    
    def _load_training_plans(self) -> Dict:
        """Load existing training plans"""
        try:
            with open(self.training_plans_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def _save_training_plans(self, plans: Dict):
        """Save training plans to file"""
        with open(self.training_plans_file, 'w', encoding='utf-8') as f:
            json.dump(plans, f, indent=2)
    
    def _analyze_performance_gaps(self, athlete_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze performance gaps and areas for improvement"""
        if not athlete_sessions:
            return {"gaps": [], "strengths": [], "focus_areas": []}
        
        # Get recent sessions (last 10)
        recent_sessions = athlete_sessions[-10:] if len(athlete_sessions) >= 10 else athlete_sessions
        
        # Analyze form scores
        form_scores = [s.get("formScore", 0) for s in recent_sessions]
        avg_form = np.mean(form_scores) if form_scores else 0
        
        # Analyze reps progression
        reps = [s.get("reps", 0) for s in recent_sessions]
        reps_trend = np.polyfit(range(len(reps)), reps, 1)[0] if len(reps) > 1 else 0
        
        # Analyze exercise variety
        exercises = [s.get("exercise", "") for s in recent_sessions]
        exercise_variety = len(set(exercises))
        
        # Analyze cheat detection
        cheat_sessions = [s for s in recent_sessions if s.get("cheatDetection", {}).get("cheatDetected", False)]
        cheat_rate = len(cheat_sessions) / len(recent_sessions) if recent_sessions else 0
        
        # Identify gaps and strengths
        gaps = []
        strengths = []
        focus_areas = []
        
        # Form analysis
        if avg_form < 70:
            gaps.append("Form technique needs improvement")
            focus_areas.append("form_technique")
        elif avg_form > 85:
            strengths.append("Excellent form consistency")
        
        # Reps progression
        if reps_trend < 0:
            gaps.append("Rep count declining - may need rest or form focus")
            focus_areas.append("endurance")
        elif reps_trend > 0:
            strengths.append("Rep count improving consistently")
        
        # Exercise variety
        if exercise_variety < 2:
            gaps.append("Limited exercise variety - need more diverse training")
            focus_areas.append("variety")
        elif exercise_variety >= 3:
            strengths.append("Good exercise variety")
        
        # Cheat detection
        if cheat_rate > 0.3:
            gaps.append("High form violation rate - focus on technique")
            focus_areas.append("technique")
        elif cheat_rate < 0.1:
            strengths.append("Excellent form discipline")
        
        return {
            "gaps": gaps,
            "strengths": strengths,
            "focus_areas": focus_areas,
            "avg_form": avg_form,
            "reps_trend": reps_trend,
            "exercise_variety": exercise_variety,
            "cheat_rate": cheat_rate
        }
    
    def _generate_exercise_recommendations(self, analysis: Dict, athlete_sessions: List[Dict]) -> List[Dict]:
        """Generate specific exercise recommendations based on analysis"""
        recommendations = []
        
        # Get most recent exercise
        recent_exercise = athlete_sessions[-1].get("exercise", "squat") if athlete_sessions else "squat"
        
        # Form technique focus
        if "form_technique" in analysis["focus_areas"]:
            recommendations.append({
                "exercise": recent_exercise,
                "type": "form_focus",
                "sets": 3,
                "reps": "8-12",
                "intensity": "moderate",
                "focus": "Perfect form over speed",
                "instructions": [
                    "Slow down your movements",
                    "Focus on full range of motion",
                    "Maintain control throughout",
                    "Stop if form breaks down"
                ],
                "priority": "high"
            })
        
        # Endurance building
        if "endurance" in analysis["focus_areas"]:
            recommendations.append({
                "exercise": recent_exercise,
                "type": "endurance",
                "sets": 2,
                "reps": "15-20",
                "intensity": "light",
                "focus": "Build stamina and consistency",
                "instructions": [
                    "Maintain steady pace",
                    "Focus on breathing rhythm",
                    "Take short breaks between sets",
                    "Gradually increase reps"
                ],
                "priority": "medium"
            })
        
        # Variety expansion
        if "variety" in analysis["focus_areas"]:
            # Add complementary exercises
            if recent_exercise == "squat":
                recommendations.append({
                    "exercise": "jumping_jack",
                    "type": "cardio",
                    "sets": 3,
                    "reps": "30-45",
                    "intensity": "moderate",
                    "focus": "Cardiovascular fitness",
                    "instructions": [
                        "Maintain steady rhythm",
                        "Land softly on feet",
                        "Keep core engaged",
                        "Breathe consistently"
                    ],
                    "priority": "medium"
                })
            elif recent_exercise == "pushup":
                recommendations.append({
                    "exercise": "squat",
                    "type": "strength",
                    "sets": 3,
                    "reps": "12-15",
                    "intensity": "moderate",
                    "focus": "Lower body strength",
                    "instructions": [
                        "Keep chest up",
                        "Go below parallel",
                        "Drive through heels",
                        "Maintain neutral spine"
                    ],
                    "priority": "medium"
                })
        
        # Technique refinement
        if "technique" in analysis["focus_areas"]:
            recommendations.append({
                "exercise": recent_exercise,
                "type": "technique",
                "sets": 2,
                "reps": "5-8",
                "intensity": "light",
                "focus": "Perfect movement pattern",
                "instructions": [
                    "Use mirror for feedback",
                    "Record yourself for analysis",
                    "Focus on one cue at a time",
                    "Ask coach for form check"
                ],
                "priority": "high"
            })
        
        # If no specific focus areas, provide balanced training
        if not analysis["focus_areas"]:
            recommendations.append({
                "exercise": recent_exercise,
                "type": "maintenance",
                "sets": 3,
                "reps": "10-15",
                "intensity": "moderate",
                "focus": "Maintain current progress",
                "instructions": [
                    "Keep current form quality",
                    "Gradually increase difficulty",
                    "Listen to your body",
                    "Track progress consistently"
                ],
                "priority": "medium"
            })
        
        return recommendations
    
    def _generate_weekly_schedule(self, recommendations: List[Dict], athlete_sessions: List[Dict]) -> List[Dict]:
        """Generate a weekly training schedule"""
        if not recommendations:
            return []
        
        # Get athlete's preferred training frequency (default 3x per week)
        training_frequency = 3
        
        # Create weekly schedule
        schedule = []
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        # Distribute exercises across the week
        for i in range(training_frequency):
            day_index = i * 2  # Spread across week (Mon, Wed, Fri)
            if day_index >= len(days):
                day_index = i
            
            # Select exercise for this day
            exercise_rec = recommendations[i % len(recommendations)]
            
            schedule.append({
                "day": days[day_index],
                "exercise": exercise_rec["exercise"],
                "type": exercise_rec["type"],
                "sets": exercise_rec["sets"],
                "reps": exercise_rec["reps"],
                "intensity": exercise_rec["intensity"],
                "focus": exercise_rec["focus"],
                "instructions": exercise_rec["instructions"],
                "priority": exercise_rec["priority"],
                "estimated_duration": "15-20 minutes"
            })
        
        return schedule
    
    def _generate_progression_plan(self, athlete_sessions: List[Dict]) -> Dict[str, Any]:
        """Generate a 4-week progression plan"""
        if not athlete_sessions:
            return {"weeks": [], "goals": []}
        
        # Get current performance baseline
        recent_sessions = athlete_sessions[-5:] if len(athlete_sessions) >= 5 else athlete_sessions
        current_form = np.mean([s.get("formScore", 0) for s in recent_sessions])
        current_reps = np.mean([s.get("reps", 0) for s in recent_sessions])
        
        # Generate weekly progression
        weeks = []
        for week in range(1, 5):
            # Progressive overload
            form_target = min(100, current_form + (week * 2))
            reps_target = max(1, int(current_reps + (week * 1.5)))
            
            weeks.append({
                "week": week,
                "form_target": form_target,
                "reps_target": reps_target,
                "focus": self._get_week_focus(week),
                "key_metrics": self._get_week_metrics(week),
                "success_criteria": self._get_success_criteria(week, form_target, reps_target)
            })
        
        # Set overall goals
        goals = [
            f"Improve form score from {current_form:.0f} to {form_target}",
            f"Increase reps from {current_reps:.0f} to {reps_target}",
            "Maintain consistent training schedule",
            "Reduce form violations by 50%"
        ]
        
        return {"weeks": weeks, "goals": goals}
    
    def _get_week_focus(self, week: int) -> str:
        """Get focus area for specific week"""
        focuses = [
            "Foundation building and form mastery",
            "Consistency and endurance",
            "Progressive overload and strength",
            "Peak performance and refinement"
        ]
        return focuses[week - 1] if week <= len(focuses) else "Continued improvement"
    
    def _get_week_metrics(self, week: int) -> List[str]:
        """Get key metrics to track for specific week"""
        metrics = [
            ["Form score", "Consistency", "Range of motion"],
            ["Rep count", "Endurance", "Breathing"],
            ["Strength", "Speed", "Control"],
            ["Peak performance", "Efficiency", "Technique"]
        ]
        return metrics[week - 1] if week <= len(metrics) else ["Overall performance"]
    
    def _get_success_criteria(self, week: int, form_target: float, reps_target: int) -> List[str]:
        """Get success criteria for specific week"""
        return [
            f"Achieve form score of {form_target} or higher",
            f"Complete {reps_target} reps with good form",
            "Complete all scheduled sessions",
            "No form violations in final session"
        ]
    
    def generate_training_plan(self, athlete_id: str) -> Dict[str, Any]:
        """Generate comprehensive training plan for athlete"""
        # Load athlete sessions
        sessions = self._load_sessions()
        athlete_sessions = [s for s in sessions if s.get("athleteId") == athlete_id]
        
        if not athlete_sessions:
            return {"error": "No sessions found for athlete"}
        
        # Sort sessions by timestamp
        athlete_sessions.sort(key=lambda x: x.get("timestamp", ""))
        
        # Get predictive analytics
        try:
            analytics = predictive_analytics.get_predictive_analytics(athlete_id)
        except:
            analytics = {}
        
        # Analyze performance gaps
        analysis = self._analyze_performance_gaps(athlete_sessions)
        
        # Generate recommendations
        recommendations = self._generate_exercise_recommendations(analysis, athlete_sessions)
        
        # Generate weekly schedule
        weekly_schedule = self._generate_weekly_schedule(recommendations, athlete_sessions)
        
        # Generate progression plan
        progression_plan = self._generate_progression_plan(athlete_sessions)
        
        # Create comprehensive training plan
        training_plan = {
            "athlete_id": athlete_id,
            "generated_at": datetime.now().isoformat() + "Z",
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat() + "Z",
            "analysis": analysis,
            "recommendations": recommendations,
            "weekly_schedule": weekly_schedule,
            "progression_plan": progression_plan,
            "analytics_insights": {
                "injury_risk": analytics.get("injury_risk", {}),
                "improvement_potential": analytics.get("improvement_potential", {}),
                "performance_trends": analytics.get("performance_trends", {})
            },
            "coaching_notes": self._generate_coaching_notes(analysis, analytics),
            "next_review_date": (datetime.now() + timedelta(days=7)).isoformat() + "Z"
        }
        
        # Save training plan
        plans = self._load_training_plans()
        plans[athlete_id] = training_plan
        self._save_training_plans(plans)
        
        return training_plan
    
    def _generate_coaching_notes(self, analysis: Dict, analytics: Dict) -> List[str]:
        """Generate coaching notes based on analysis and analytics"""
        notes = []
        
        # Form-related notes
        if analysis["avg_form"] < 70:
            notes.append("Focus on form technique - current average form score is below 70%")
        elif analysis["avg_form"] > 85:
            notes.append("Excellent form consistency - ready for advanced progressions")
        
        # Endurance notes
        if analysis["reps_trend"] < 0:
            notes.append("Rep count declining - consider rest days or form focus")
        elif analysis["reps_trend"] > 0:
            notes.append("Strong progression in rep count - maintain current approach")
        
        # Variety notes
        if analysis["exercise_variety"] < 2:
            notes.append("Limited exercise variety - introduce complementary exercises")
        
        # Cheat detection notes
        if analysis["cheat_rate"] > 0.3:
            notes.append("High form violation rate - prioritize technique over intensity")
        elif analysis["cheat_rate"] < 0.1:
            notes.append("Excellent form discipline - ready for increased intensity")
        
        # Analytics insights
        injury_risk = analytics.get("injury_risk", {})
        if injury_risk.get("risk_level") == "high":
            notes.append("High injury risk detected - focus on recovery and form")
        
        improvement_potential = analytics.get("improvement_potential", {})
        if improvement_potential.get("potential") == "high":
            notes.append("High improvement potential - athlete ready for advanced training")
        
        return notes
    
    def get_training_plan(self, athlete_id: str) -> Dict[str, Any]:
        """Get existing training plan for athlete (AI or Coach created)"""
        plans = self._load_training_plans()
        
        # First check for AI-generated plan
        if athlete_id in plans:
            return plans[athlete_id]
        
        # Then check for coach-created plan
        coach_plan_key = f"{athlete_id}_coach"
        if coach_plan_key in plans:
            return plans[coach_plan_key]
        
        return {"error": "No training plan found"}
    
    def get_coach_training_plan(self, athlete_id: str) -> Dict[str, Any]:
        """Get coach-created training plan for athlete"""
        plans = self._load_training_plans()
        coach_plan_key = f"{athlete_id}_coach"
        return plans.get(coach_plan_key, {"error": "No coach training plan found"})
    
    def update_training_plan(self, athlete_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing training plan"""
        plans = self._load_training_plans()
        if athlete_id in plans:
            plans[athlete_id].update(updates)
            plans[athlete_id]["last_updated"] = datetime.now().isoformat() + "Z"
            self._save_training_plans(plans)
            return plans[athlete_id]
        return {"error": "Training plan not found"}
    
    def get_coach_training_plans(self, coach_id: str) -> Dict[str, Any]:
        """Get all training plans for coach's athletes"""
        athletes = self._load_athletes()
        coach_athletes = [a for a in athletes if a.get("coachId") == coach_id]
        
        plans = self._load_training_plans()
        coach_plans = {}
        
        for athlete in coach_athletes:
            athlete_id = athlete["id"]
            if athlete_id in plans:
                coach_plans[athlete_id] = {
                    "athlete_name": athlete.get("username", "Unknown"),
                    "plan": plans[athlete_id]
                }
        
        return {
            "coach_id": coach_id,
            "total_athletes": len(coach_athletes),
            "plans_with_training": len(coach_plans),
            "athlete_plans": coach_plans
        }
    
    def create_coach_training_plan(self, athlete_id: str, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a training plan for an athlete by their coach"""
        try:
            # Load existing plans
            plans = self._load_training_plans()
            
            # Create coach-created plan structure
            coach_plan = {
                "athlete_id": athlete_id,
                "created_by": "coach",
                "coach_id": plan_data.get("coachId"),
                "coach_name": plan_data.get("coachName", "Coach"),
                "created_at": datetime.now().isoformat() + "Z",
                "valid_until": (datetime.now() + timedelta(days=30)).isoformat() + "Z",
                "title": plan_data.get("title", "Coach Training Plan"),
                "description": plan_data.get("description", ""),
                "status": plan_data.get("status", "active"),
                "exercises": plan_data.get("exercises", []),
                "duration": plan_data.get("duration", ""),
                "frequency": plan_data.get("frequency", ""),
                "goals": plan_data.get("goals", ""),
                "plan_type": "coach_created",
                "next_review_date": (datetime.now() + timedelta(days=7)).isoformat() + "Z"
            }
            
            # Store the plan (overwrite any existing plan for this athlete)
            plans[athlete_id] = coach_plan
            self._save_training_plans(plans)
            
            return coach_plan
            
        except Exception as e:
            print(f"Error creating coach training plan: {e}")
            raise e

    async def analyze_user_goal(self, goal_text: str) -> Dict[str, Any]:
        """Using Gemini to analyze goal and generate clarification questions"""
        prompt = f"""
        Act as an elite sports performance coach. 
        A user has expressed this training goal: "{goal_text}"
        
        I need to create a personalized 4-week training plan for them.
        To do this effectively, I need to ask them 3-5 clarifying questions.
        
        You MUST include questions about:
        1. Time availability (How many days/week? How many mins/session?) - BE SPECIFIC
        2. Equipment access (Gym, Home, etc.)
        3. Experience level or Current ability relative to the goal.
        
        Return a JSON object with a list of questions.
        Schema:
        {{
            "questions": [
                {{
                    "id": "unique_id",
                    "text": "The question text",
                    "type": "select" | "text" | "number" | "multiselect",
                    "options": ["Option A", "Option B"] (only for select/multiselect),
                    "why": "Brief explanation of why you are asking this (e.g. 'To determine intensity')"
                }}
            ]
        }}
        """
        
        result = await gemini_client.generate_json(prompt)
        if not result:
            # Fallback if AI fails
            return {
                "questions": [
                    {
                        "id": "days_per_week",
                        "text": "How many days per week can you train?",
                        "type": "select",
                        "options": ["2 days", "3 days", "4 days", "5+ days"],
                        "why": "To build a realistic schedule"
                    },
                    {
                        "id": "session_duration",
                        "text": "How much time do you have per session?",
                        "type": "select",
                        "options": ["30 mins", "45 mins", "60 mins", "90+ mins"],
                        "why": "To check intensity capacity"
                    },
                    {
                        "id": "equipment",
                        "text": "What equipment do you have access to?",
                        "type": "select",
                        "options": ["Full Gym", "Home Gym", "Bodyweight Only"],
                        "why": "To select exercises"
                    }
                ]
            }
        return result

    async def generate_ai_plan(self, athlete_id: str, goal_text: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Generate full plan using Gemini based on goal and answers"""
        
        answers_context = "\\n".join([f"- {k}: {v}" for k, v in answers.items()])
        
        prompt = f"""
        Act as an elite sports performance coach.
        Create a detailed 4-Week Progressive Training Plan for an athlete.
        
        GOAL: "{goal_text}"
        
        CONTEXT & CONSTRAINTS:
        {answers_context}
        
        STRUCTURE:
        Create a 4-week Micro-Cycle.
        - Week 1: Introduction/Base
        - Week 2: Progression/Ramp Up
        - Week 3: Peak Intensity
        - Week 4: Deload/Recovery
        
        OUTPUT FORMAT: Valid JSON Only.
        {{
            "title": "Plan Title",
            "description": "Overview of the strategy.",
            "duration": "4 weeks",
            "frequency": "Based on input",
            "goal_focus": "{goal_text}",
            "weekly_schedule": [
                {{
                    "day": "Monday",
                    "focus": "Leg Strength",
                    "exercises": [
                         {{
                            "name": "Squat",
                            "sets": 3,
                            "reps": "10-12",
                            "notes": "Focus on depth"
                         }}
                    ]
                }},
                ... (create a representative week template)
            ],
            "progression_plan": [
                {{
                    "week": 1,
                    "focus": "Base Building",
                    "instruction": "Low weights, focus on form."
                }},
                ... (Weeks 2-4)
            ],
            "coaching_tips": ["Tip 1", "Tip 2"]
        }}
        """
        
        try:
            plan_data = await gemini_client.generate_json(prompt)
        except Exception as e:
            print(f"Gemini generation failed: {e}")
            plan_data = None
        
        if not plan_data:
            # Fallback Plan
            print("Using Fallback AI Plan")
            plan_data = {
                "title": f"4-Week {goal_text} Prep (Starter)",
                "description": f"A foundational program designed to help you achieve '{goal_text}'. Focuses on stability, strength, and gradual progression.",
                "duration": "4 weeks",
                "frequency": answers.get("days_per_week", "3 days"),
                "goal_focus": goal_text,
                "weekly_schedule": [
                    {
                        "day": "Monday",
                        "focus": "Full Body Strength",
                        "exercises": [
                            {"name": "Squat", "sets": 3, "reps": "10", "notes": "Control the descent"},
                            {"name": "Pushups", "sets": 3, "reps": "12", "notes": "Keep core tight"},
                            {"name": "Plank", "sets": 3, "reps": "30s", "notes": "Solid base"}
                        ]
                    },
                    {
                        "day": "Wednesday",
                        "focus": "Conditioning & Core",
                        "exercises": [
                            {"name": "Burpees", "sets": 3, "reps": "10", "notes": "Explosive movement"},
                            {"name": "Mountain Climbers", "sets": 3, "reps": "30s", "notes": "Fast pace"},
                            {"name": "Leg Raises", "sets": 3, "reps": "15", "notes": "Controlled"}
                        ]
                    },
                    {
                        "day": "Friday",
                        "focus": "Stability & Recovery",
                        "exercises": [
                            {"name": "Lunges", "sets": 3, "reps": "10/leg", "notes": "Knee alignment"},
                            {"name": "Glute Bridges", "sets": 3, "reps": "15", "notes": "Squeeze at top"}
                        ]
                    }
                ],
                "progression_plan": [
                    {"week": 1, "focus": "Adaptation", "instruction": "Focus on technique and consistency."},
                    {"week": 2, "focus": "Volume", "instruction": "Add 1 set to main lifts."},
                    {"week": 3, "focus": "Intensity", "instruction": "Decrease rest times by 15s."},
                    {"week": 4, "focus": "Deload", "instruction": "Reduce volume by 50% for recovery."}
                ],
                "coaching_tips": [
                    "Consistency is key.",
                    "Sleep at least 7 hours.",
                    "Hydrate before sessions."
                ]
            }
            
        full_plan = {
            "athlete_id": athlete_id,
            "created_by": "ai_coach",
            "created_at": datetime.now().isoformat() + "Z",
            "valid_until": (datetime.now() + timedelta(weeks=4)).isoformat() + "Z",
            "status": "active",
            **plan_data
        }
        
        # Save to storage (omitted as per context, assuming `_save_training_plans` handles it)
        plans = self._load_training_plans() # Need to ensure self context is valid
        plans[athlete_id] = full_plan
        self._save_training_plans(plans)
        
        return full_plan

# Create global instance
training_plan_generator = TrainingPlanGenerator()
