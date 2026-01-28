# predictive_analytics.py
"""
Predictive Analytics Engine for TalentTrack
Analyzes historical performance data to predict future trends, injury risks, and improvement trajectories.
"""

import json
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Tuple
import os

class PredictiveAnalytics:
    def __init__(self):
        self.data_dir = "data"
        self.sessions_file = os.path.join(self.data_dir, "sessions", "sessions.json")
        self.athletes_file = os.path.join(self.data_dir, "athletes", "athletes.json")
        
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
    
    def _calculate_trend(self, values: List[float], days: List[int]) -> Dict[str, float]:
        """Calculate performance trend using linear regression"""
        if len(values) < 2:
            return {"slope": 0, "r_squared": 0, "trend": "stable"}
        
        # Simple linear regression
        n = len(values)
        x = np.array(days)
        y = np.array(values)
        
        # Calculate slope and intercept
        slope = (n * np.sum(x * y) - np.sum(x) * np.sum(y)) / (n * np.sum(x**2) - np.sum(x)**2)
        intercept = (np.sum(y) - slope * np.sum(x)) / n
        
        # Calculate R-squared
        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Determine trend direction
        if slope > 0.1:
            trend = "improving"
        elif slope < -0.1:
            trend = "declining"
        else:
            trend = "stable"
        
        return {
            "slope": float(slope),
            "r_squared": float(r_squared),
            "trend": trend,
            "confidence": min(r_squared * 100, 100)
        }
    
    def _calculate_injury_risk(self, sessions: List[Dict]) -> Dict[str, Any]:
        """Calculate injury risk based on performance patterns"""
        if len(sessions) < 3:
            return {"risk_level": "low", "risk_score": 0, "factors": []}
        
        risk_factors = []
        risk_score = 0
        
        # Check for form deterioration trend
        form_scores = [s.get("formScore", 0) for s in sessions[-10:]]  # Last 10 sessions
        if len(form_scores) >= 3:
            form_trend = self._calculate_trend(form_scores, list(range(len(form_scores))))
            if form_trend["trend"] == "declining" and form_trend["confidence"] > 50:
                risk_factors.append("Form deterioration detected")
                risk_score += 30
        
        # Check for overtraining (too many sessions in short time)
        recent_sessions = [s for s in sessions if self._days_since(s.get("timestamp") or s.get("date", "")) <= 7]
        if len(recent_sessions) > 5:
            risk_factors.append("Potential overtraining")
            risk_score += 20
        
        # Check for cheat detection patterns
        cheat_sessions = [s for s in sessions[-5:] if s.get("cheatDetection", {}).get("cheatDetected", False)]
        if len(cheat_sessions) >= 3:
            risk_factors.append("Frequent form violations")
            risk_score += 25
        
        # Check for performance plateau
        reps = [s.get("reps", 0) for s in sessions[-8:]]
        if len(reps) >= 5:
            reps_trend = self._calculate_trend(reps, list(range(len(reps))))
            if reps_trend["trend"] == "stable" and reps_trend["confidence"] > 60:
                risk_factors.append("Performance plateau")
                risk_score += 15
        
        # Determine risk level
        if risk_score >= 60:
            risk_level = "high"
        elif risk_score >= 30:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "risk_level": risk_level,
            "risk_score": min(risk_score, 100),
            "factors": risk_factors
        }
    
    def _calculate_improvement_potential(self, sessions: List[Dict]) -> Dict[str, Any]:
        """Calculate improvement potential based on current performance and trends"""
        if len(sessions) < 3:
            return {"potential": "unknown", "score": 0, "suggestions": []}
        
        suggestions = []
        potential_score = 0
        
        # Analyze form score trend
        form_scores = [s.get("formScore", 0) for s in sessions[-8:]]
        if len(form_scores) >= 3:
            form_trend = self._calculate_trend(form_scores, list(range(len(form_scores))))
            if form_trend["trend"] == "improving":
                potential_score += 30
                suggestions.append("Form is improving - maintain current training")
            elif form_trend["trend"] == "declining":
                potential_score += 20
                suggestions.append("Focus on form correction - high improvement potential")
        
        # Analyze reps trend
        reps = [s.get("reps", 0) for s in sessions[-8:]]
        if len(reps) >= 3:
            reps_trend = self._calculate_trend(reps, list(range(len(reps))))
            if reps_trend["trend"] == "improving":
                potential_score += 25
                suggestions.append("Rep count increasing - good progress")
            elif reps_trend["trend"] == "stable":
                potential_score += 15
                suggestions.append("Consider increasing intensity or volume")
        
        # Analyze consistency
        form_variance = np.var(form_scores) if len(form_scores) > 1 else 0
        if form_variance < 100:  # Low variance = consistent
            potential_score += 20
            suggestions.append("Consistent performance - ready for advanced training")
        else:
            potential_score += 10
            suggestions.append("Work on consistency - focus on technique")
        
        # Analyze cheat detection
        clean_sessions = [s for s in sessions[-5:] if not s.get("cheatDetection", {}).get("cheatDetected", False)]
        if len(clean_sessions) >= 4:
            potential_score += 15
            suggestions.append("Excellent form discipline - ready for progression")
        
        # Determine potential level
        if potential_score >= 70:
            potential = "high"
        elif potential_score >= 40:
            potential = "medium"
        else:
            potential = "low"
        
        return {
            "potential": potential,
            "score": min(potential_score, 100),
            "suggestions": suggestions
        }
    
    def _predict_future_performance(self, sessions: List[Dict], days_ahead: int = 30) -> Dict[str, Any]:
        """Predict future performance based on historical trends"""
        if len(sessions) < 5:
            return {"prediction": "insufficient_data", "confidence": 0}
        
        # Get recent performance data
        recent_sessions = sessions[-10:]  # Last 10 sessions
        form_scores = [s.get("formScore", 0) for s in recent_sessions]
        reps = [s.get("reps", 0) for s in recent_sessions]
        durations = [s.get("durationSec", 0) for s in recent_sessions]
        
        predictions = {}
        
        # Predict form score
        if len(form_scores) >= 3:
            form_trend = self._calculate_trend(form_scores, list(range(len(form_scores))))
            predicted_form = form_scores[-1] + (form_trend["slope"] * days_ahead)
            predictions["form_score"] = {
                "current": form_scores[-1],
                "predicted": max(0, min(100, predicted_form)),
                "trend": form_trend["trend"],
                "confidence": form_trend["confidence"]
            }
        
        # Predict reps
        if len(reps) >= 3:
            reps_trend = self._calculate_trend(reps, list(range(len(reps))))
            predicted_reps = reps[-1] + (reps_trend["slope"] * days_ahead)
            predictions["reps"] = {
                "current": reps[-1],
                "predicted": max(0, predicted_reps),
                "trend": reps_trend["trend"],
                "confidence": reps_trend["confidence"]
            }
        
        # Predict duration
        if len(durations) >= 3:
            duration_trend = self._calculate_trend(durations, list(range(len(durations))))
            predicted_duration = durations[-1] + (duration_trend["slope"] * days_ahead)
            predictions["duration"] = {
                "current": durations[-1],
                "predicted": max(0, predicted_duration),
                "trend": duration_trend["trend"],
                "confidence": duration_trend["confidence"]
            }
        
        # Calculate overall confidence
        confidences = [p.get("confidence", 0) for p in predictions.values()]
        overall_confidence = np.mean(confidences) if confidences else 0
        
        return {
            "predictions": predictions,
            "overall_confidence": overall_confidence,
            "days_ahead": days_ahead
        }
    
    def _days_since(self, timestamp: str) -> int:
        """Calculate days since timestamp"""
        try:
            session_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            return (datetime.now() - session_date).days
        except:
            return 0
    
    def get_predictive_analytics(self, athlete_id: str) -> Dict[str, Any]:
        """Get comprehensive predictive analytics for an athlete"""
        sessions = self._load_sessions()
        athlete_sessions = [s for s in sessions if s.get("athleteId") == athlete_id]
        
        if not athlete_sessions:
            return {"error": "No sessions found for athlete"}
        
        # Sort sessions by timestamp
        athlete_sessions.sort(key=lambda x: x.get("timestamp", ""))
        
        # Calculate various analytics
        injury_risk = self._calculate_injury_risk(athlete_sessions)
        improvement_potential = self._calculate_improvement_potential(athlete_sessions)
        future_performance = self._predict_future_performance(athlete_sessions)
        
        # Calculate performance trends
        form_scores = [s.get("formScore", 0) for s in athlete_sessions[-10:]]
        reps = [s.get("reps", 0) for s in athlete_sessions[-10:]]
        
        form_trend = self._calculate_trend(form_scores, list(range(len(form_scores)))) if len(form_scores) >= 2 else {}
        reps_trend = self._calculate_trend(reps, list(range(len(reps)))) if len(reps) >= 2 else {}
        
        return {
            "athlete_id": athlete_id,
            "total_sessions": len(athlete_sessions),
            "injury_risk": injury_risk,
            "improvement_potential": improvement_potential,
            "future_performance": future_performance,
            "performance_trends": {
                "form": form_trend,
                "reps": reps_trend
            },
            "last_updated": datetime.now().isoformat() + "Z"
        }
    
    def get_coach_predictive_analytics(self, coach_id: str) -> Dict[str, Any]:
        """Get predictive analytics for all athletes under a coach"""
        sessions = self._load_sessions()
        athletes = self._load_athletes()
        
        coach_athletes = [a for a in athletes if a.get("coachId") == coach_id]
        coach_sessions = [s for s in sessions if s.get("coachId") == coach_id]
        
        athlete_analytics = {}
        for athlete in coach_athletes:
            athlete_id = athlete["id"]
            athlete_sessions = [s for s in coach_sessions if s.get("athleteId") == athlete_id]
            
            if athlete_sessions:
                analytics = self.get_predictive_analytics(athlete_id)
                athlete_analytics[athlete_id] = analytics
        
        # Calculate coach-level insights
        total_sessions = len(coach_sessions)
        high_risk_athletes = [aid for aid, analytics in athlete_analytics.items() 
                            if analytics.get("injury_risk", {}).get("risk_level") == "high"]
        high_potential_athletes = [aid for aid, analytics in athlete_analytics.items() 
                                 if analytics.get("improvement_potential", {}).get("potential") == "high"]
        
        return {
            "coach_id": coach_id,
            "total_athletes": len(coach_athletes),
            "total_sessions": total_sessions,
            "high_risk_athletes": high_risk_athletes,
            "high_potential_athletes": high_potential_athletes,
            "athlete_analytics": athlete_analytics,
            "last_updated": datetime.now().isoformat() + "Z"
        }

# Create global instance
predictive_analytics = PredictiveAnalytics()
