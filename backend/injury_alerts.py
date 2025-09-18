# injury_alerts.py
"""
Injury Alert System for TalentTrack
Monitors athlete performance for injury risk indicators and sends alerts to coaches.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from predictive_analytics import predictive_analytics
from benchmarking_utils import benchmarking_engine

class InjuryAlertSystem:
    def __init__(self):
        self.data_dir = "data"
        self.sessions_file = os.path.join(self.data_dir, "sessions", "sessions.json")
        self.athletes_file = os.path.join(self.data_dir, "athletes.json")
        self.coaches_file = os.path.join(self.data_dir, "coaches.json")
        self.alerts_file = os.path.join(self.data_dir, "injury_alerts.json")
        
        # Injury risk thresholds
        self.thresholds = {
            "form_deterioration": 15,  # % drop in form score
            "cheat_rate": 0.4,        # 40% of sessions with cheating
            "overtraining": 5,        # 5+ sessions in 3 days
            "injury_risk_score": 70,  # High risk threshold
            "fatigue_indicators": 3,  # 3+ consecutive declining sessions
            "technique_breakdown": 0.5 # 50% technique violations
        }
    
    def _load_sessions(self) -> List[Dict]:
        """Load all sessions data"""
        try:
            with open(self.sessions_file, 'r') as f:
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
            with open(self.athletes_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []
    
    def _load_coaches(self) -> List[Dict]:
        """Load coaches data"""
        try:
            with open(self.coaches_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []
    
    def _load_alerts(self) -> Dict:
        """Load existing alerts"""
        try:
            with open(self.alerts_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def _save_alerts(self, alerts: Dict):
        """Save alerts to file"""
        with open(self.alerts_file, 'w') as f:
            json.dump(alerts, f, indent=2)
    
    def _analyze_form_deterioration(self, athlete_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze form score deterioration over time"""
        if len(athlete_sessions) < 3:
            return {"risk": False, "severity": "low", "details": "Insufficient data"}
        
        # Get recent sessions (last 10)
        recent_sessions = athlete_sessions[-10:] if len(athlete_sessions) >= 10 else athlete_sessions
        
        # Calculate form score trend
        form_scores = [s.get("formScore", 0) for s in recent_sessions]
        if len(form_scores) < 3:
            return {"risk": False, "severity": "low", "details": "Insufficient data"}
        
        # Calculate trend using linear regression
        x = np.arange(len(form_scores))
        trend = np.polyfit(x, form_scores, 1)[0]
        
        # Check for significant deterioration
        first_half = form_scores[:len(form_scores)//2]
        second_half = form_scores[len(form_scores)//2:]
        
        avg_first = np.mean(first_half)
        avg_second = np.mean(second_half)
        deterioration = avg_first - avg_second
        
        if deterioration > self.thresholds["form_deterioration"]:
            severity = "high" if deterioration > 25 else "medium"
            return {
                "risk": True,
                "severity": severity,
                "details": f"Form score dropped by {deterioration:.1f}% over recent sessions",
                "trend": trend,
                "current_avg": avg_second,
                "previous_avg": avg_first
            }
        
        return {"risk": False, "severity": "low", "details": "Form trend stable"}
    
    def _analyze_cheat_patterns(self, athlete_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze cheating patterns that may indicate injury risk"""
        if len(athlete_sessions) < 3:
            return {"risk": False, "severity": "low", "details": "Insufficient data"}
        
        # Get recent sessions
        recent_sessions = athlete_sessions[-10:] if len(athlete_sessions) >= 10 else athlete_sessions
        
        # Calculate cheat rate
        cheat_sessions = [s for s in recent_sessions if s.get("cheatDetection", {}).get("cheatDetected", False)]
        cheat_rate = len(cheat_sessions) / len(recent_sessions)
        
        # Analyze cheat types
        cheat_types = {}
        for session in cheat_sessions:
            flags = session.get("cheatDetection", {}).get("flags", {})
            for flag, detected in flags.items():
                if detected:
                    cheat_types[flag] = cheat_types.get(flag, 0) + 1
        
        # Check for concerning patterns
        high_cheat_rate = cheat_rate > self.thresholds["cheat_rate"]
        technique_breakdown = cheat_types.get("inconsistent_form", 0) / len(recent_sessions) > self.thresholds["technique_breakdown"]
        
        if high_cheat_rate or technique_breakdown:
            severity = "high" if cheat_rate > 0.6 else "medium"
            return {
                "risk": True,
                "severity": severity,
                "details": f"High cheat rate: {cheat_rate:.1%} of recent sessions",
                "cheat_rate": cheat_rate,
                "cheat_types": cheat_types,
                "technique_breakdown": technique_breakdown
            }
        
        return {"risk": False, "severity": "low", "details": "Cheat patterns normal"}
    
    def _analyze_overtraining(self, athlete_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze for overtraining indicators"""
        if len(athlete_sessions) < 3:
            return {"risk": False, "severity": "low", "details": "Insufficient data"}
        
        # Get sessions from last 7 days
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        
        recent_sessions = []
        for session in athlete_sessions:
            try:
                session_date = datetime.fromisoformat(session.get("timestamp", "").replace("Z", "+00:00"))
                if session_date >= week_ago:
                    recent_sessions.append(session)
            except:
                continue
        
        # Check for excessive training
        sessions_count = len(recent_sessions)
        if sessions_count > self.thresholds["overtraining"]:
            return {
                "risk": True,
                "severity": "high" if sessions_count > 8 else "medium",
                "details": f"Excessive training: {sessions_count} sessions in 7 days",
                "sessions_count": sessions_count,
                "recommended_max": 5
            }
        
        # Check for consecutive days without rest
        session_dates = set()
        for session in recent_sessions:
            try:
                session_date = datetime.fromisoformat(session.get("timestamp", "").replace("Z", "+00:00"))
                session_dates.add(session_date.date())
            except:
                continue
        
        consecutive_days = self._count_consecutive_days(sorted(session_dates))
        if consecutive_days > 4:
            return {
                "risk": True,
                "severity": "medium",
                "details": f"Training {consecutive_days} consecutive days without rest",
                "consecutive_days": consecutive_days,
                "recommended_max": 3
            }
        
        return {"risk": False, "severity": "low", "details": "Training frequency normal"}
    
    def _count_consecutive_days(self, dates: List) -> int:
        """Count consecutive days in a list of dates"""
        if not dates:
            return 0
        
        max_consecutive = 1
        current_consecutive = 1
        
        for i in range(1, len(dates)):
            if (dates[i] - dates[i-1]).days == 1:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 1
        
        return max_consecutive
    
    def _analyze_fatigue_indicators(self, athlete_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze fatigue indicators from performance data"""
        if len(athlete_sessions) < 5:
            return {"risk": False, "severity": "low", "details": "Insufficient data"}
        
        # Get recent sessions
        recent_sessions = athlete_sessions[-10:] if len(athlete_sessions) >= 10 else athlete_sessions
        
        # Analyze reps progression
        reps = [s.get("reps", 0) for s in recent_sessions]
        reps_trend = np.polyfit(range(len(reps)), reps, 1)[0] if len(reps) > 1 else 0
        
        # Check for declining performance
        if reps_trend < -0.5:  # Declining reps
            consecutive_declining = 0
            for i in range(1, len(reps)):
                if reps[i] < reps[i-1]:
                    consecutive_declining += 1
                else:
                    consecutive_declining = 0
            
            if consecutive_declining >= self.thresholds["fatigue_indicators"]:
                return {
                    "risk": True,
                    "severity": "medium",
                    "details": f"Performance declining for {consecutive_declining} consecutive sessions",
                    "reps_trend": reps_trend,
                    "consecutive_declining": consecutive_declining
                }
        
        # Analyze form score consistency
        form_scores = [s.get("formScore", 0) for s in recent_sessions]
        form_std = np.std(form_scores)
        form_mean = np.mean(form_scores)
        
        # High variability in form scores may indicate fatigue
        if form_std > 15 and form_mean < 75:
            return {
                "risk": True,
                "severity": "medium",
                "details": f"Inconsistent form scores (std: {form_std:.1f}) may indicate fatigue",
                "form_std": form_std,
                "form_mean": form_mean
            }
        
        return {"risk": False, "severity": "low", "details": "No fatigue indicators detected"}
    
    def _analyze_predictive_risk(self, athlete_id: str) -> Dict[str, Any]:
        """Analyze injury risk from predictive analytics"""
        try:
            analytics = predictive_analytics.get_predictive_analytics(athlete_id)
            injury_risk = analytics.get("injury_risk", {})
            
            risk_score = injury_risk.get("risk_score", 0)
            risk_level = injury_risk.get("risk_level", "low")
            
            if risk_score > self.thresholds["injury_risk_score"]:
                return {
                    "risk": True,
                    "severity": "high" if risk_score > 85 else "medium",
                    "details": f"High injury risk score: {risk_score}%",
                    "risk_score": risk_score,
                    "risk_level": risk_level,
                    "factors": injury_risk.get("factors", [])
                }
            
            return {"risk": False, "severity": "low", "details": "Injury risk within normal range"}
        
        except Exception as e:
            return {"risk": False, "severity": "low", "details": f"Could not analyze predictive risk: {str(e)}"}
    
    def analyze_athlete_injury_risk(self, athlete_id: str) -> Dict[str, Any]:
        """Comprehensive injury risk analysis for an athlete"""
        # Load athlete sessions
        sessions = self._load_sessions()
        athlete_sessions = [s for s in sessions if s.get("athleteId") == athlete_id]
        
        if not athlete_sessions:
            return {"error": "No sessions found for athlete"}
        
        # Sort sessions by timestamp
        athlete_sessions.sort(key=lambda x: x.get("timestamp", ""))
        
        # Run all analyses
        analyses = {
            "form_deterioration": self._analyze_form_deterioration(athlete_sessions),
            "cheat_patterns": self._analyze_cheat_patterns(athlete_sessions),
            "overtraining": self._analyze_overtraining(athlete_sessions),
            "fatigue_indicators": self._analyze_fatigue_indicators(athlete_sessions),
            "predictive_risk": self._analyze_predictive_risk(athlete_id)
        }
        
        # Determine overall risk level
        high_risks = [a for a in analyses.values() if a.get("risk") and a.get("severity") == "high"]
        medium_risks = [a for a in analyses.values() if a.get("risk") and a.get("severity") == "medium"]
        
        overall_severity = "high" if high_risks else "medium" if medium_risks else "low"
        overall_risk = len(high_risks) > 0 or len(medium_risks) > 0
        
        # Generate recommendations
        recommendations = self._generate_recommendations(analyses)
        
        return {
            "athlete_id": athlete_id,
            "analyzed_at": datetime.now().isoformat() + "Z",
            "overall_risk": overall_risk,
            "overall_severity": overall_severity,
            "analyses": analyses,
            "recommendations": recommendations,
            "total_sessions_analyzed": len(athlete_sessions)
        }
    
    def _generate_recommendations(self, analyses: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on analysis results"""
        recommendations = []
        
        # Form deterioration recommendations
        if analyses["form_deterioration"].get("risk"):
            recommendations.append("Focus on form technique - consider reducing intensity")
            recommendations.append("Schedule form check session with coach")
        
        # Cheat pattern recommendations
        if analyses["cheat_patterns"].get("risk"):
            recommendations.append("Address technique breakdown - may indicate compensation")
            recommendations.append("Consider rest day or lighter training load")
        
        # Overtraining recommendations
        if analyses["overtraining"].get("risk"):
            recommendations.append("Reduce training frequency - athlete needs rest")
            recommendations.append("Implement mandatory rest days")
        
        # Fatigue recommendations
        if analyses["fatigue_indicators"].get("risk"):
            recommendations.append("Monitor for signs of overtraining")
            recommendations.append("Consider deload week or active recovery")
        
        # Predictive risk recommendations
        if analyses["predictive_risk"].get("risk"):
            recommendations.append("High injury risk detected - immediate attention needed")
            recommendations.append("Consider sports medicine consultation")
        
        # General recommendations
        if not any(analysis.get("risk") for analysis in analyses.values()):
            recommendations.append("Continue current training approach")
            recommendations.append("Maintain regular monitoring")
        
        return recommendations
    
    def create_injury_alert(self, athlete_id: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create an injury alert for a coach"""
        # Load athlete and coach data
        athletes = self._load_athletes()
        coaches = self._load_coaches()
        
        athlete = next((a for a in athletes if a["id"] == athlete_id), None)
        if not athlete:
            return {"error": "Athlete not found"}
        
        coach_id = athlete.get("coachId")
        coach = next((c for c in coaches if c["id"] == coach_id), None) if coach_id else None
        
        # Create alert
        alert = {
            "id": f"alert_{athlete_id}_{int(datetime.now().timestamp())}",
            "athlete_id": athlete_id,
            "athlete_name": athlete.get("username", "Unknown"),
            "coach_id": coach_id,
            "coach_name": coach.get("username", "Unknown") if coach else "Unassigned",
            "severity": analysis["overall_severity"],
            "risk_factors": [k for k, v in analysis["analyses"].items() if v.get("risk")],
            "recommendations": analysis["recommendations"],
            "created_at": datetime.now().isoformat() + "Z",
            "status": "active",
            "acknowledged": False,
            "acknowledged_at": None
        }
        
        # Save alert
        alerts = self._load_alerts()
        if athlete_id not in alerts:
            alerts[athlete_id] = []
        alerts[athlete_id].append(alert)
        self._save_alerts(alerts)
        
        return alert
    
    def get_coach_alerts(self, coach_id: str) -> Dict[str, Any]:
        """Get all active alerts for a coach's athletes"""
        athletes = self._load_athletes()
        coach_athletes = [a for a in athletes if a.get("coachId") == coach_id]
        athlete_ids = [a["id"] for a in coach_athletes]
        
        alerts = self._load_alerts()
        coach_alerts = []
        
        for athlete_id in athlete_ids:
            if athlete_id in alerts:
                for alert in alerts[athlete_id]:
                    if alert.get("status") == "active":
                        coach_alerts.append(alert)
        
        # Sort by severity and creation time
        severity_order = {"high": 3, "medium": 2, "low": 1}
        coach_alerts.sort(key=lambda x: (severity_order.get(x.get("severity", "low"), 1), x.get("created_at", "")), reverse=True)
        
        return {
            "coach_id": coach_id,
            "total_alerts": len(coach_alerts),
            "high_priority": len([a for a in coach_alerts if a.get("severity") == "high"]),
            "medium_priority": len([a for a in coach_alerts if a.get("severity") == "medium"]),
            "low_priority": len([a for a in coach_alerts if a.get("severity") == "low"]),
            "alerts": coach_alerts
        }
    
    def acknowledge_alert(self, alert_id: str, coach_id: str) -> Dict[str, Any]:
        """Acknowledge an alert"""
        alerts = self._load_alerts()
        
        for athlete_id, athlete_alerts in alerts.items():
            for alert in athlete_alerts:
                if alert["id"] == alert_id and alert["coach_id"] == coach_id:
                    alert["acknowledged"] = True
                    alert["acknowledged_at"] = datetime.now().isoformat() + "Z"
                    self._save_alerts(alerts)
                    return {"success": True, "alert": alert}
        
        return {"error": "Alert not found or unauthorized"}
    
    def resolve_alert(self, alert_id: str, coach_id: str) -> Dict[str, Any]:
        """Resolve an alert"""
        alerts = self._load_alerts()
        
        for athlete_id, athlete_alerts in alerts.items():
            for alert in athlete_alerts:
                if alert["id"] == alert_id and alert["coach_id"] == coach_id:
                    alert["status"] = "resolved"
                    alert["resolved_at"] = datetime.now().isoformat() + "Z"
                    self._save_alerts(alerts)
                    return {"success": True, "alert": alert}
        
        return {"error": "Alert not found or unauthorized"}
    
    def run_bulk_analysis(self) -> Dict[str, Any]:
        """Run injury risk analysis for all athletes"""
        athletes = self._load_athletes()
        results = {
            "analyzed_at": datetime.now().isoformat() + "Z",
            "total_athletes": len(athletes),
            "athletes_with_risk": 0,
            "alerts_created": 0,
            "results": []
        }
        
        for athlete in athletes:
            athlete_id = athlete["id"]
            analysis = self.analyze_athlete_injury_risk(athlete_id)
            
            if analysis.get("overall_risk"):
                results["athletes_with_risk"] += 1
                alert = self.create_injury_alert(athlete_id, analysis)
                if "error" not in alert:
                    results["alerts_created"] += 1
            
            results["results"].append({
                "athlete_id": athlete_id,
                "athlete_name": athlete.get("username", "Unknown"),
                "risk": analysis.get("overall_risk", False),
                "severity": analysis.get("overall_severity", "low")
            })
        
        return results

# Create global instance
injury_alert_system = InjuryAlertSystem()
