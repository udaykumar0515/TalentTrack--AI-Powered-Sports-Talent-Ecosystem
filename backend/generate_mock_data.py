#!/usr/bin/env python3
"""
Mock Data Generator for Sports Talent Ecosystem
Generates comprehensive mock data for 10 athletes with sessions, goals, achievements, etc.
"""

import json
import random
import datetime
from typing import Dict, List, Any
import os

# Configuration
NUM_ATHLETES = 10
SESSIONS_PER_ATHLETE = 10
COACH_ID = "coach_1"
COACH_NAME = "coach_mike"

# Exercise types
EXERCISES = ["squat", "pushup", "jumping_jack"]

# Athlete profiles
ATHLETE_PROFILES = [
    {
        "id": "athlete_1",
        "email": "uday@example.com",
        "password": "123456",
        "username": "uday",
        "age": 25,
        "gender": "male",
        "fitness_level": "intermediate",
        "goals": ["strength", "endurance"],
        "injuries": [],
        "preferred_exercises": ["squat", "pushup"]
    },
    {
        "id": "athlete_2",
        "email": "sarah.johnson@example.com",
        "password": "password123",
        "username": "sarah_fit",
        "age": 24,
        "gender": "female",
        "fitness_level": "intermediate",
        "goals": ["strength", "endurance"],
        "injuries": ["knee_tendinitis"],
        "preferred_exercises": ["squat", "jumping_jack"]
    },
    {
        "id": "athlete_3",
        "email": "mike.chen@example.com",
        "password": "mike2025",
        "username": "mike_strong",
        "age": 28,
        "gender": "male",
        "fitness_level": "beginner",
        "goals": ["weight_loss", "muscle_building"],
        "injuries": [],
        "preferred_exercises": ["pushup", "squat"]
    },
    {
        "id": "athlete_4",
        "email": "emma.wilson@example.com",
        "password": "emma123",
        "username": "emma_athlete",
        "age": 22,
        "gender": "female",
        "fitness_level": "advanced",
        "goals": ["performance", "competition"],
        "injuries": ["shoulder_impingement"],
        "preferred_exercises": ["jumping_jack", "squat"]
    },
    {
        "id": "athlete_5",
        "email": "david.rodriguez@example.com",
        "password": "david456",
        "username": "david_trainer",
        "age": 35,
        "gender": "male",
        "fitness_level": "intermediate",
        "goals": ["rehabilitation", "strength"],
        "injuries": ["lower_back_pain", "ankle_sprain"],
        "preferred_exercises": ["squat", "pushup"]
    },
    {
        "id": "athlete_6",
        "email": "lisa.patel@example.com",
        "password": "lisa789",
        "username": "lisa_fitness",
        "age": 26,
        "gender": "female",
        "fitness_level": "beginner",
        "goals": ["general_fitness", "flexibility"],
        "injuries": ["wrist_carpal_tunnel"],
        "preferred_exercises": ["jumping_jack", "squat"]
    },
    {
        "id": "athlete_7",
        "email": "alex.kim@example.com",
        "password": "alex2025",
        "username": "alex_warrior",
        "age": 30,
        "gender": "male",
        "fitness_level": "advanced",
        "goals": ["power", "speed"],
        "injuries": ["hamstring_strain"],
        "preferred_exercises": ["pushup", "jumping_jack"]
    },
    {
        "id": "athlete_8",
        "email": "jessica.brown@example.com",
        "password": "jessica123",
        "username": "jess_fit",
        "age": 29,
        "gender": "female",
        "fitness_level": "intermediate",
        "goals": ["endurance", "toning"],
        "injuries": ["hip_flexor_tightness"],
        "preferred_exercises": ["squat", "pushup"]
    },
    {
        "id": "athlete_9",
        "email": "robert.taylor@example.com",
        "password": "robert456",
        "username": "rob_athlete",
        "age": 42,
        "gender": "male",
        "fitness_level": "beginner",
        "goals": ["health", "mobility"],
        "injuries": ["knee_arthritis", "elbow_tendinitis"],
        "preferred_exercises": ["squat", "jumping_jack"]
    },
    {
        "id": "athlete_10",
        "email": "maria.garcia@example.com",
        "password": "maria789",
        "username": "maria_strong",
        "age": 31,
        "gender": "female",
        "fitness_level": "advanced",
        "goals": ["strength", "competition"],
        "injuries": ["achilles_tendinitis"],
        "preferred_exercises": ["pushup", "squat"]
    }
]

def generate_session_id(athlete_id: str, session_num: int) -> str:
    """Generate a unique session ID"""
    return f"sess_{athlete_id}_{session_num:03d}"

def get_exercise_benchmarks(exercise: str, fitness_level: str) -> Dict[str, Any]:
    """Get exercise benchmarks based on fitness level"""
    benchmarks = {
        "squat": {
            "beginner": {"min_reps": 5, "max_reps": 15, "min_form": 60, "max_form": 80},
            "intermediate": {"min_reps": 10, "max_reps": 25, "min_form": 75, "max_form": 90},
            "advanced": {"min_reps": 20, "max_reps": 40, "min_form": 85, "max_form": 95}
        },
        "pushup": {
            "beginner": {"min_reps": 3, "max_reps": 12, "min_form": 60, "max_form": 80},
            "intermediate": {"min_reps": 8, "max_reps": 20, "min_form": 75, "max_form": 90},
            "advanced": {"min_reps": 15, "max_reps": 35, "min_form": 85, "max_form": 95}
        },
        "jumping_jack": {
            "beginner": {"min_reps": 10, "max_reps": 25, "min_form": 60, "max_form": 80},
            "intermediate": {"min_reps": 20, "max_reps": 40, "min_form": 75, "max_form": 90},
            "advanced": {"min_reps": 30, "max_reps": 60, "min_form": 85, "max_form": 95}
        }
    }
    return benchmarks[exercise][fitness_level]

def generate_cheat_detection(form_score: int, reps: int, exercise: str, injuries: List[str]) -> Dict[str, Any]:
    """Generate cheat detection data based on form score and injuries"""
    cheat_detected = form_score < 80
    cheat_percentage = max(0, 100 - form_score + random.randint(-10, 10))
    cheat_percentage = max(0, min(100, cheat_percentage))
    
    risk_level = "low"
    if cheat_percentage > 40:
        risk_level = "high"
    elif cheat_percentage > 20:
        risk_level = "medium"
    
    risk_factors = []
    if injuries:
        risk_factors.extend(injuries)
    if form_score < 70:
        risk_factors.append("form_issues")
    if cheat_percentage > 30:
        risk_factors.append("cheat_patterns")
    
    flags = {
        "too_fast_reps": random.choice([True, False]) and cheat_detected,
        "inconsistent_form": form_score < 75,
        "minimal_movement": form_score < 70,
        "suspicious_timing": random.choice([True, False]) and cheat_detected,
        "form_deterioration": form_score < 80,
        "repetitive_pattern": random.choice([True, False]) and cheat_detected
    }
    
    suspicious_patterns = []
    if flags["inconsistent_form"]:
        suspicious_patterns.append("Inconsistent form detected")
    if flags["form_deterioration"]:
        suspicious_patterns.append("Form deteriorating over time")
    if flags["too_fast_reps"]:
        suspicious_patterns.append("Reps completed too quickly")
    
    risk_explanations = {
        "low": "✅ Excellent form! You're performing the exercise safely and effectively.",
        "medium": "⚡ Good effort! Your form is mostly correct with room for improvement.",
        "high": "⚠️ Your form needs attention. Focus on proper technique to avoid injury."
    }
    
    return {
        "cheatDetected": cheat_detected,
        "cheatPercentage": cheat_percentage,
        "totalFlags": sum(flags.values()),
        "confidence": max(60, 100 - cheat_percentage + random.randint(-5, 5)),
        "riskLevel": risk_level,
        "riskExplanation": risk_explanations[risk_level],
        "riskFactors": risk_factors,
        "flags": flags,
        "suspiciousPatterns": suspicious_patterns
    }

def generate_benchmarking_data(reps: int, form_score: int, exercise: str, fitness_level: str) -> Dict[str, Any]:
    """Generate benchmarking data"""
    performance_levels = ["beginner", "intermediate", "advanced", "elite"]
    level_index = performance_levels.index(fitness_level)
    
    # Add some variation
    actual_level = performance_levels[min(level_index + random.randint(-1, 1), len(performance_levels) - 1)]
    
    performance_score = (form_score + (reps * 2)) / 2
    performance_score = max(40, min(100, performance_score))
    
    percentile = max(10, min(95, performance_score + random.randint(-15, 15)))
    rank = max(1, int((100 - percentile) / 10) + 1)
    
    return {
        "performance_level": {
            "level": actual_level,
            "score": performance_score,
            "description": f"Good form with {actual_level} intensity",
            "adjusted_reps": reps,
            "adjusted_form_score": form_score,
            "standards_met": {
                "reps": reps >= 5,
                "form": form_score >= 70,
                "duration": True
            }
        },
        "peer_comparison": {
            "percentile": percentile,
            "rank": rank,
            "total_athletes": random.randint(4, 8),
            "performance_score": performance_score,
            "average_score": performance_score + random.randint(-10, 10)
        },
        "global_rank": rank,
        "coach_rank": rank,
        "total_global_athletes": random.randint(50, 100),
        "total_coach_athletes": NUM_ATHLETES,
        "improvement_suggestions": [
            "Focus on maintaining consistent form",
            "Gradually increase intensity",
            "Listen to your body and rest when needed"
        ]
    }

def generate_session(athlete: Dict[str, Any], session_num: int) -> Dict[str, Any]:
    """Generate a single session for an athlete"""
    exercise = random.choice(athlete["preferred_exercises"])
    benchmarks = get_exercise_benchmarks(exercise, athlete["fitness_level"])
    
    # Generate realistic performance data
    reps = random.randint(benchmarks["min_reps"], benchmarks["max_reps"])
    form_score = random.randint(benchmarks["min_form"], benchmarks["max_form"])
    
    # Adjust for injuries
    if athlete["injuries"]:
        form_score = max(50, form_score - random.randint(5, 15))
        reps = max(3, reps - random.randint(1, 5))
    
    # Generate duration based on exercise and reps
    base_duration = {
        "squat": 3.0,
        "pushup": 2.5,
        "jumping_jack": 1.0
    }
    duration_sec = reps * base_duration[exercise] + random.uniform(-5, 10)
    
    # Generate risk level
    risk_levels = ["Low", "Medium", "High"]
    if form_score < 70 or athlete["injuries"]:
        risk = "High"
    elif form_score < 85:
        risk = "Medium"
    else:
        risk = "Low"
    
    # Generate injury flags
    injury_flags = []
    if athlete["injuries"] and random.random() < 0.3:
        injury_flags.append(f"{athlete['injuries'][0].replace('_', ' ').title()} detected")
    if form_score < 70:
        injury_flags.append("Poor form technique")
    
    # Generate date (recent sessions)
    days_ago = session_num * 2 + random.randint(0, 3)
    session_date = datetime.datetime.now() - datetime.timedelta(days=days_ago)
    
    session = {
        "sessionId": generate_session_id(athlete["id"], session_num),
        "athleteId": athlete["id"],
        "athleteName": athlete["username"],
        "coachId": COACH_ID,
        "coachName": COACH_NAME,
        "exercise": exercise,
        "date": session_date.isoformat() + "Z",
        "timestamp": session_date.isoformat() + "Z",
        "reps": reps,
        "durationSec": round(duration_sec, 1),
        "formScore": form_score,
        "risk": risk,
        "status": "completed",
        "metrics": {
            "reps": reps,
            "avgRepTimeSec": round(duration_sec / reps, 1),
            "formScore": form_score,
            "symmetryScore": form_score + random.randint(-5, 5),
            "waistAngleDeg": random.randint(35, 55)
        },
        "injuryFlags": injury_flags,
        "videoUrl": None,
        "thumbnailUrl": None,
        "cheatDetection": generate_cheat_detection(form_score, reps, exercise, athlete["injuries"]),
        "benchmarking": generate_benchmarking_data(reps, form_score, exercise, athlete["fitness_level"])
    }
    
    return session

def generate_athletes_data() -> List[Dict[str, Any]]:
    """Generate athletes data"""
    athletes = []
    for profile in ATHLETE_PROFILES:
        athlete = {
            "id": profile["id"],
            "email": profile["email"],
            "password": profile["password"],
            "username": profile["username"],
            "role": "athlete",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(10, 30))).isoformat() + "Z",
            "coachId": COACH_ID,
            "coachName": COACH_NAME,
            "age": profile["age"],
            "gender": profile["gender"],
            "fitness_level": profile["fitness_level"],
            "goals": profile["goals"],
            "injuries": profile["injuries"],
            "preferred_exercises": profile["preferred_exercises"]
        }
        athletes.append(athlete)
    return athletes

def generate_sessions_data() -> Dict[str, Any]:
    """Generate sessions data for all athletes"""
    sessions_data = {}
    
    for athlete in ATHLETE_PROFILES:
        athlete_sessions = []
        for session_num in range(1, SESSIONS_PER_ATHLETE + 1):
            session = generate_session(athlete, session_num)
            athlete_sessions.append(session)
        
        sessions_data[athlete["id"]] = {
            "sessions": athlete_sessions
        }
    
    return sessions_data

def generate_injury_alerts() -> Dict[str, List[Dict[str, Any]]]:
    """Generate injury alerts for athletes"""
    alerts = {}
    
    for athlete in ATHLETE_PROFILES:
        athlete_alerts = []
        
        # Generate alerts based on injuries
        for injury in athlete["injuries"]:
            alert = {
                "id": f"alert_{athlete['id']}_{random.randint(1000000, 9999999)}",
                "athlete_id": athlete["id"],
                "athlete_name": athlete["username"],
                "coach_id": COACH_ID,
                "coach_name": COACH_NAME,
                "severity": random.choice(["low", "medium", "high"]),
                "risk_factors": [injury, "form_deterioration"],
                "recommendations": [
                    f"Address {injury.replace('_', ' ')} issues",
                    "Focus on proper form",
                    "Consider modifications",
                    "Monitor for improvement"
                ],
                "created_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 10))).isoformat() + "Z",
                "status": random.choice(["active", "resolved"]),
                "acknowledged": random.choice([True, False]),
                "acknowledged_at": None
            }
            
            if alert["acknowledged"]:
                alert["acknowledged_at"] = (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 5))).isoformat() + "Z"
            
            athlete_alerts.append(alert)
        
        # Add some general alerts
        if random.random() < 0.3:  # 30% chance of additional alert
            general_alert = {
                "id": f"alert_{athlete['id']}_{random.randint(1000000, 9999999)}",
                "athlete_id": athlete["id"],
                "athlete_name": athlete["username"],
                "coach_id": COACH_ID,
                "coach_name": COACH_NAME,
                "severity": "medium",
                "risk_factors": ["fatigue_indicators", "form_deterioration"],
                "recommendations": [
                    "Monitor training frequency",
                    "Ensure adequate rest",
                    "Focus on recovery"
                ],
                "created_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 7))).isoformat() + "Z",
                "status": "resolved",
                "acknowledged": True,
                "acknowledged_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 3))).isoformat() + "Z"
            }
            athlete_alerts.append(general_alert)
        
        if athlete_alerts:
            alerts[athlete["id"]] = athlete_alerts
    
    return alerts

def generate_goals_data() -> Dict[str, List[Dict[str, Any]]]:
    """Generate goals for athletes"""
    goals_data = {}
    
    goal_templates = [
        {
            "title": "Strength Building",
            "description": "Increase overall strength and muscle endurance",
            "type": "reps",
            "target_value": 50,
            "unit": "reps"
        },
        {
            "title": "Form Improvement",
            "description": "Achieve consistent 90%+ form scores",
            "type": "form",
            "target_value": 90,
            "unit": "percentage"
        },
        {
            "title": "Endurance Challenge",
            "description": "Complete high-rep sessions without fatigue",
            "type": "endurance",
            "target_value": 30,
            "unit": "minutes"
        },
        {
            "title": "Injury Recovery",
            "description": "Return to full training capacity",
            "type": "recovery",
            "target_value": 100,
            "unit": "percentage"
        }
    ]
    
    for athlete in ATHLETE_PROFILES:
        athlete_goals = []
        
        # Generate 1-3 goals per athlete
        num_goals = random.randint(1, 3)
        selected_goals = random.sample(goal_templates, num_goals)
        
        for i, template in enumerate(selected_goals):
            current_value = random.randint(10, template["target_value"] - 10)
            progress_percentage = (current_value / template["target_value"]) * 100
            
            goal = {
                "id": f"goal_{athlete['id']}_{i+1}_{random.randint(1000000, 9999999)}",
                "user_id": athlete["id"],
                "title": template["title"],
                "description": template["description"],
                "type": template["type"],
                "target_value": template["target_value"],
                "current_value": current_value,
                "unit": template["unit"],
                "priority": random.choice(["low", "medium", "high"]),
                "status": "active",
                "start_date": (datetime.datetime.now() - datetime.timedelta(days=random.randint(5, 20))).isoformat(),
                "target_date": (datetime.datetime.now() + datetime.timedelta(days=random.randint(10, 30))).isoformat().split('T')[0],
                "created_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(5, 20))).isoformat(),
                "updated_at": datetime.datetime.now().isoformat(),
                "progress_percentage": round(progress_percentage, 1),
                "milestones": [],
                "tags": athlete["goals"][:2] if len(athlete["goals"]) >= 2 else athlete["goals"],
                "is_public": False,
                "motivation_notes": f"Focus on {template['title'].lower()} for {athlete['username']}"
            }
            athlete_goals.append(goal)
        
        if athlete_goals:
            goals_data[athlete["id"]] = athlete_goals
    
    return goals_data

def generate_points_achievements_data() -> Dict[str, Dict[str, Any]]:
    """Generate points and achievements data"""
    points_data = {}
    
    achievements_list = [
        "first_session", "perfect_form", "streak_7", "speed_demon", 
        "endurance_king", "improvement_master", "early_bird", "night_owl",
        "social_butterfly", "coach_favorite", "risk_free", "variety_seeker"
    ]
    
    badges = ["Bronze Badge", "Silver Badge", "Gold Badge", "Platinum Badge", "Diamond Badge"]
    
    for athlete in ATHLETE_PROFILES:
        # Generate random achievements
        num_achievements = random.randint(2, 6)
        athlete_achievements = random.sample(achievements_list, num_achievements)
        
        # Calculate total points
        achievement_points = {
            "first_session": 50, "perfect_form": 100, "streak_7": 200, "speed_demon": 150,
            "endurance_king": 300, "improvement_master": 200, "early_bird": 100, "night_owl": 100,
            "social_butterfly": 75, "coach_favorite": 250, "risk_free": 150, "variety_seeker": 200
        }
        
        total_points = sum(achievement_points.get(achievement, 50) for achievement in athlete_achievements)
        total_points += random.randint(50, 200)  # Additional points from sessions
        
        # Determine badge
        current_badge = "Bronze Badge"
        if total_points >= 5000:
            current_badge = "Diamond Badge"
        elif total_points >= 2500:
            current_badge = "Platinum Badge"
        elif total_points >= 1000:
            current_badge = "Gold Badge"
        elif total_points >= 500:
            current_badge = "Silver Badge"
        
        # Generate unique exercises
        unique_exercises = list(set(athlete["preferred_exercises"] + random.sample(EXERCISES, random.randint(0, 1))))
        
        points_data[athlete["id"]] = {
            "total_points": total_points,
            "achievements": athlete_achievements,
            "badges": [current_badge],
            "level": min(10, total_points // 200 + 1),
            "sessions_completed": SESSIONS_PER_ATHLETE,
            "current_streak": random.randint(1, SESSIONS_PER_ATHLETE),
            "longest_streak": random.randint(5, SESSIONS_PER_ATHLETE + 5),
            "last_session_date": (datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 3))).isoformat() + "Z",
            "unique_exercises": unique_exercises,
            "early_sessions": random.randint(0, 3),
            "night_sessions": random.randint(0, 2),
            "low_risk_sessions": random.randint(2, SESSIONS_PER_ATHLETE),
            "current_badge": {
                "name": current_badge,
                "description": f"Earn {total_points} points",
                "icon": "🏆",
                "points_required": total_points
            }
        }
    
    return points_data

def save_json_file(data: Any, filename: str) -> None:
    """Save data to JSON file"""
    filepath = os.path.join("data", filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ Generated {filename}")

def main():
    """Main function to generate all mock data"""
    print("🚀 Starting mock data generation...")
    
    # Set random seed for reproducibility
    random.seed(42)
    
    # Generate and save all data files
    print("\n📊 Generating athletes data...")
    athletes_data = generate_athletes_data()
    save_json_file(athletes_data, "athletes.json")
    
    print("\n🏃 Generating sessions data...")
    sessions_data = generate_sessions_data()
    save_json_file(sessions_data, "sessions/sessions.json")
    
    print("\n⚠️ Generating injury alerts...")
    injury_alerts = generate_injury_alerts()
    save_json_file(injury_alerts, "injury_alerts.json")
    
    print("\n🎯 Generating goals data...")
    goals_data = generate_goals_data()
    save_json_file(goals_data, "goals.json")
    
    print("\n🏆 Generating points and achievements...")
    points_data = generate_points_achievements_data()
    save_json_file(points_data, "points.json")
    
    print(f"\n🎉 Successfully generated mock data for {NUM_ATHLETES} athletes!")
    print(f"📈 Each athlete has {SESSIONS_PER_ATHLETE} sessions")
    print(f"📁 Files generated:")
    print("   - athletes.json")
    print("   - sessions/sessions.json")
    print("   - injury_alerts.json")
    print("   - goals.json")
    print("   - points.json")

if __name__ == "__main__":
    main()
