#!/usr/bin/env python3
"""
Long-term Plans Engine for Coaches
Handles creation, management, and tracking of long-term athlete development plans
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

class PlanPhase(Enum):
    FOUNDATION = "foundation"
    DEVELOPMENT = "development"
    ADVANCEMENT = "advancement"
    MASTERY = "mastery"
    SPECIALIZATION = "specialization"

class PlanStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PlanPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class LongTermPlansEngine:
    def __init__(self, plans_file: str = "data/longterm_plans.json"):
        self.plans_file = plans_file
        self.ensure_plans_file()
    
    def ensure_plans_file(self):
        """Ensure plans file exists with proper structure"""
        if not os.path.exists(self.plans_file):
            os.makedirs(os.path.dirname(self.plans_file), exist_ok=True)
            with open(self.plans_file, 'w') as f:
                json.dump({}, f)
    
    def create_plan(self, coach_id: str, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new long-term plan for an athlete"""
        try:
            plans = self.load_plans()
            
            plan_id = f"plan_{coach_id}_{plan_data.get('athlete_id', 'unknown')}_{len(plans.get(coach_id, [])) + 1}_{int(datetime.now().timestamp())}"
            
            plan = {
                "id": plan_id,
                "coach_id": coach_id,
                "athlete_id": plan_data.get("athlete_id", ""),
                "athlete_name": plan_data.get("athlete_name", ""),
                "title": plan_data.get("title", ""),
                "description": plan_data.get("description", ""),
                "phase": plan_data.get("phase", PlanPhase.FOUNDATION.value),
                "priority": plan_data.get("priority", PlanPriority.MEDIUM.value),
                "status": PlanStatus.DRAFT.value,
                "start_date": plan_data.get("start_date", datetime.now().isoformat()),
                "end_date": plan_data.get("end_date", ""),
                "duration_weeks": plan_data.get("duration_weeks", 12),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "objectives": plan_data.get("objectives", []),
                "milestones": plan_data.get("milestones", []),
                "training_schedule": plan_data.get("training_schedule", {}),
                "assessment_criteria": plan_data.get("assessment_criteria", {}),
                "progress_tracking": {
                    "current_phase": PlanPhase.FOUNDATION.value,
                    "phase_completion": 0.0,
                    "overall_progress": 0.0,
                    "last_assessment": None,
                    "next_milestone": None
                },
                "notes": plan_data.get("notes", ""),
                "tags": plan_data.get("tags", []),
                "is_template": plan_data.get("is_template", False)
            }
            
            if coach_id not in plans:
                plans[coach_id] = []
            
            plans[coach_id].append(plan)
            self.save_plans(plans)
            
            return plan
            
        except Exception as e:
            print(f"Error creating long-term plan: {e}")
            return {}
    
    def get_coach_plans(self, coach_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all long-term plans for a coach, optionally filtered by status"""
        try:
            plans = self.load_plans()
            coach_plans = plans.get(coach_id, [])
            
            if status:
                coach_plans = [plan for plan in coach_plans if plan.get("status") == status]
            
            return coach_plans
            
        except Exception as e:
            print(f"Error getting coach plans: {e}")
            return []
    
    def get_athlete_plans(self, athlete_id: str) -> List[Dict[str, Any]]:
        """Get all long-term plans for a specific athlete"""
        try:
            plans = self.load_plans()
            athlete_plans = []
            
            for coach_id, coach_plans in plans.items():
                for plan in coach_plans:
                    if plan.get("athlete_id") == athlete_id:
                        athlete_plans.append(plan)
            
            return athlete_plans
            
        except Exception as e:
            print(f"Error getting athlete plans: {e}")
            return []
    
    def update_plan(self, coach_id: str, plan_id: str, updates: Dict[str, Any]) -> bool:
        """Update a specific long-term plan"""
        try:
            plans = self.load_plans()
            coach_plans = plans.get(coach_id, [])
            
            for i, plan in enumerate(coach_plans):
                if plan["id"] == plan_id:
                    # Update fields
                    for key, value in updates.items():
                        if key in plan:
                            plan[key] = value
                    
                    plan["updated_at"] = datetime.now().isoformat()
                    coach_plans[i] = plan
                    plans[coach_id] = coach_plans
                    self.save_plans(plans)
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error updating plan: {e}")
            return False
    
    def delete_plan(self, coach_id: str, plan_id: str) -> bool:
        """Delete a specific long-term plan"""
        try:
            plans = self.load_plans()
            coach_plans = plans.get(coach_id, [])
            
            coach_plans = [plan for plan in coach_plans if plan["id"] != plan_id]
            plans[coach_id] = coach_plans
            self.save_plans(plans)
            return True
            
        except Exception as e:
            print(f"Error deleting plan: {e}")
            return False
    
    def update_plan_progress(self, coach_id: str, plan_id: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update plan progress based on session data"""
        try:
            plans = self.load_plans()
            coach_plans = plans.get(coach_id, [])
            
            for plan in coach_plans:
                if plan["id"] == plan_id:
                    # Calculate progress based on plan phase and objectives
                    progress_update = self._calculate_plan_progress(plan, session_data)
                    
                    # Update plan with new progress
                    plan["progress_tracking"].update(progress_update)
                    plan["updated_at"] = datetime.now().isoformat()
                    
                    # Check if plan phase should advance
                    if plan["progress_tracking"]["phase_completion"] >= 100:
                        self._advance_plan_phase(plan)
                    
                    # Update in plans
                    for i, p in enumerate(coach_plans):
                        if p["id"] == plan_id:
                            coach_plans[i] = plan
                            break
                    
                    plans[coach_id] = coach_plans
                    self.save_plans(plans)
                    
                    return progress_update
            
            return {}
            
        except Exception as e:
            print(f"Error updating plan progress: {e}")
            return {}
    
    def _calculate_plan_progress(self, plan: Dict[str, Any], session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate progress for a specific plan based on session data"""
        current_phase = plan["progress_tracking"]["current_phase"]
        phase_completion = plan["progress_tracking"]["phase_completion"]
        
        # Calculate progress based on plan phase and objectives
        progress_increment = 0
        
        if current_phase == PlanPhase.FOUNDATION.value:
            # Foundation phase: focus on form and basic technique
            if session_data.get("formScore", 0) > 80:
                progress_increment = 5
        elif current_phase == PlanPhase.DEVELOPMENT.value:
            # Development phase: focus on consistency and endurance
            if session_data.get("reps", 0) > 10:
                progress_increment = 3
        elif current_phase == PlanPhase.ADVANCEMENT.value:
            # Advancement phase: focus on intensity and complexity
            if session_data.get("formScore", 0) > 85 and session_data.get("reps", 0) > 15:
                progress_increment = 4
        elif current_phase == PlanPhase.MASTERY.value:
            # Mastery phase: focus on perfection and advanced techniques
            if session_data.get("formScore", 0) > 90:
                progress_increment = 2
        elif current_phase == PlanPhase.SPECIALIZATION.value:
            # Specialization phase: focus on specific skills
            if session_data.get("formScore", 0) > 95:
                progress_increment = 1
        
        new_phase_completion = min(phase_completion + progress_increment, 100)
        overall_progress = self._calculate_overall_progress(plan, new_phase_completion)
        
        return {
            "phase_completion": new_phase_completion,
            "overall_progress": overall_progress,
            "last_assessment": datetime.now().isoformat()
        }
    
    def _calculate_overall_progress(self, plan: Dict[str, Any], phase_completion: float) -> float:
        """Calculate overall progress based on current phase and completion"""
        phase_weights = {
            PlanPhase.FOUNDATION.value: 0.2,
            PlanPhase.DEVELOPMENT.value: 0.3,
            PlanPhase.ADVANCEMENT.value: 0.25,
            PlanPhase.MASTERY.value: 0.15,
            PlanPhase.SPECIALIZATION.value: 0.1
        }
        
        current_phase = plan["progress_tracking"]["current_phase"]
        phase_weight = phase_weights.get(current_phase, 0.2)
        
        # Calculate progress based on completed phases and current phase progress
        completed_phases = 0
        phase_order = [p.value for p in PlanPhase]
        current_phase_index = phase_order.index(current_phase)
        
        for i in range(current_phase_index):
            completed_phases += 1
        
        base_progress = (completed_phases / len(phase_order)) * 100
        current_phase_progress = (phase_completion / 100) * phase_weight * 100
        
        return min(base_progress + current_phase_progress, 100)
    
    def _advance_plan_phase(self, plan: Dict[str, Any]):
        """Advance plan to next phase when current phase is completed"""
        phase_order = [p.value for p in PlanPhase]
        current_phase = plan["progress_tracking"]["current_phase"]
        
        try:
            current_index = phase_order.index(current_phase)
            if current_index < len(phase_order) - 1:
                next_phase = phase_order[current_index + 1]
                plan["progress_tracking"]["current_phase"] = next_phase
                plan["progress_tracking"]["phase_completion"] = 0.0
                plan["progress_tracking"]["last_phase_advancement"] = datetime.now().isoformat()
        except ValueError:
            pass  # Current phase not found in order
    
    def get_plan_analytics(self, coach_id: str) -> Dict[str, Any]:
        """Get analytics for coach's long-term plans"""
        try:
            plans = self.get_coach_plans(coach_id)
            
            total_plans = len(plans)
            active_plans = len([p for p in plans if p["status"] == PlanStatus.ACTIVE.value])
            completed_plans = len([p for p in plans if p["status"] == PlanStatus.COMPLETED.value])
            
            # Calculate average progress
            active_plan_progress = [p["progress_tracking"]["overall_progress"] for p in plans if p["status"] == PlanStatus.ACTIVE.value]
            avg_progress = sum(active_plan_progress) / len(active_plan_progress) if active_plan_progress else 0
            
            # Plans by phase
            plans_by_phase = {}
            for plan in plans:
                phase = plan["progress_tracking"]["current_phase"]
                if phase not in plans_by_phase:
                    plans_by_phase[phase] = 0
                plans_by_phase[phase] += 1
            
            # Plans by priority
            plans_by_priority = {}
            for plan in plans:
                priority = plan["priority"]
                if priority not in plans_by_priority:
                    plans_by_priority[priority] = 0
                plans_by_priority[priority] += 1
            
            # Athletes with plans
            athletes_with_plans = set(plan["athlete_id"] for plan in plans if plan["athlete_id"])
            
            return {
                "total_plans": total_plans,
                "active_plans": active_plans,
                "completed_plans": completed_plans,
                "completion_rate": (completed_plans / total_plans * 100) if total_plans > 0 else 0,
                "average_progress": round(avg_progress, 2),
                "plans_by_phase": plans_by_phase,
                "plans_by_priority": plans_by_priority,
                "athletes_with_plans": len(athletes_with_plans),
                "recent_plans": sorted(plans, key=lambda x: x["created_at"], reverse=True)[:5]
            }
            
        except Exception as e:
            print(f"Error getting plan analytics: {e}")
            return {}
    
    def generate_plan_recommendations(self, coach_id: str, athlete_id: str, session_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate plan recommendations based on athlete's performance"""
        try:
            recommendations = []
            
            if not session_history:
                return recommendations
            
            # Analyze session history
            avg_reps = sum(s.get("reps", 0) for s in session_history) / len(session_history)
            avg_form_score = sum(s.get("formScore", 0) for s in session_history) / len(session_history)
            avg_duration = sum(s.get("durationSec", 0) for s in session_history) / len(session_history)
            session_count = len(session_history)
            
            # Generate recommendations based on performance level
            if avg_form_score < 70:
                recommendations.append({
                    "title": "Foundation Building Program",
                    "description": "Focus on basic technique and form development",
                    "phase": PlanPhase.FOUNDATION.value,
                    "duration_weeks": 8,
                    "priority": PlanPriority.HIGH.value,
                    "objectives": [
                        "Achieve consistent form score above 80",
                        "Complete 10+ reps with proper technique",
                        "Build basic movement patterns"
                    ],
                    "reason": f"Current form score is {avg_form_score:.1f}. Foundation work is essential for long-term success."
                })
            elif avg_form_score < 85 and avg_reps < 15:
                recommendations.append({
                    "title": "Development & Endurance Program",
                    "description": "Build consistency and increase workout capacity",
                    "phase": PlanPhase.DEVELOPMENT.value,
                    "duration_weeks": 12,
                    "priority": PlanPriority.MEDIUM.value,
                    "objectives": [
                        "Increase reps to 20+ per session",
                        "Maintain form score above 85",
                        "Build workout consistency"
                    ],
                    "reason": f"Good form foundation ({avg_form_score:.1f}) but needs endurance development ({avg_reps:.1f} reps)."
                })
            elif avg_form_score >= 85 and avg_reps >= 15:
                recommendations.append({
                    "title": "Advanced Performance Program",
                    "description": "Focus on advanced techniques and performance optimization",
                    "phase": PlanPhase.ADVANCEMENT.value,
                    "duration_weeks": 16,
                    "priority": PlanPriority.MEDIUM.value,
                    "objectives": [
                        "Master advanced movement patterns",
                        "Increase intensity and complexity",
                        "Develop sport-specific skills"
                    ],
                    "reason": f"Strong foundation ({avg_form_score:.1f} form, {avg_reps:.1f} reps). Ready for advanced training."
                })
            
            # Consistency recommendation
            if session_count < 20:
                recommendations.append({
                    "title": "Consistency Building Program",
                    "description": "Focus on establishing regular training habits",
                    "phase": PlanPhase.FOUNDATION.value,
                    "duration_weeks": 6,
                    "priority": PlanPriority.HIGH.value,
                    "objectives": [
                        "Complete 3+ sessions per week",
                        "Establish training routine",
                        "Build habit consistency"
                    ],
                    "reason": f"Only {session_count} sessions completed. Consistency is key to progress."
                })
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating plan recommendations: {e}")
            return []
    
    def create_plan_template(self, coach_id: str, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a reusable plan template"""
        try:
            template_data["is_template"] = True
            template_data["coach_id"] = coach_id
            return self.create_plan(coach_id, template_data)
        except Exception as e:
            print(f"Error creating plan template: {e}")
            return {}
    
    def get_plan_templates(self, coach_id: str) -> List[Dict[str, Any]]:
        """Get all plan templates for a coach"""
        try:
            plans = self.get_coach_plans(coach_id)
            return [plan for plan in plans if plan.get("is_template", False)]
        except Exception as e:
            print(f"Error getting plan templates: {e}")
            return []
    
    def load_plans(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load plans from file"""
        try:
            with open(self.plans_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    
    def save_plans(self, plans: Dict[str, List[Dict[str, Any]]]):
        """Save plans to file"""
        with open(self.plans_file, 'w') as f:
            json.dump(plans, f, indent=2)
