# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import shutil
import tempfile
import json
import uuid
from datetime import datetime
import subprocess
import time
import os
import logging
import sys
from benchmarking_utils import benchmarking_engine
from predictive_analytics import predictive_analytics
from training_plans import training_plan_generator
from injury_alerts import injury_alert_system

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Get Python executable path
PYTHON_EXECUTABLE = sys.executable

# User models
class UserCreate(BaseModel):
    email: str
    password: str
    username: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str
    role: Optional[str] = None

class User(BaseModel):
    id: str
    email: str
    username: str
    role: str
    created_at: str


class CoachMessage(BaseModel):
    id: str
    coachId: str
    coachName: str
    athleteId: str
    athleteName: str
    sessionId: str
    type: str  # 'retest', 'feedback', 'note'
    message: str
    timestamp: str
    read: bool = False


class VideoMetadata(BaseModel):
    videoId: str
    sessionId: str
    athleteId: str
    athleteName: str
    exercise: str
    videoPath: str
    uploadedAt: str
    coachId: Optional[str] = None
    coachName: Optional[str] = None
    syncStatus: str = "synced"

app = FastAPI(title="Exercise Analysis API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exercise name mapping
EXERCISE_MAPPING = {
    "squat": "squat",
    "pushup": "pushups",
    "pushups": "pushups", 
    "jumping_jack": "jumping_jacks",
    "jumping_jacks": "jumping_jacks"
}

def init_data_directories():
    """Ensure all required data directories exist"""
    directories = ["data", "data/sessions", "videos", "videos/athletes", "videos/coaches"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize empty JSON files if they don't exist
    files = {
        "data/athletes.json": [],
        "data/coaches.json": [],
        "data/sessions/sessions.json": {},
        "data/videos.json": []
    }
    
    for file_path, default_content in files.items():
        if not os.path.exists(file_path):
            try:
                with open(file_path, "w") as f:
                    json.dump(default_content, f, indent=2)
                logger.info(f"Created {file_path}")
            except Exception as e:
                logger.error(f"Failed to create {file_path}: {e}")

# Initialize on startup
init_data_directories()


def read_json_file(filename: str):
    """Read JSON file with proper error handling"""
    try:
        file_path = f"data/{filename}"
        if not os.path.exists(file_path):
            logger.warning(f"File {file_path} not found, returning empty list/dict")
            return [] if filename != "sessions/sessions.json" else {}
        
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read().strip()
            if not content:
                return [] if filename != "sessions/sessions.json" else {}
            return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {filename}: {e}")
        return [] if filename != "sessions/sessions.json" else {}
    except Exception as e:
        logger.error(f"Error reading {filename}: {e}")
        return [] if filename != "sessions/sessions.json" else {}

def write_json_file(filename: str, data):
    """Write JSON file with proper error handling"""
    try:
        file_path = f"data/{filename}"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
        logger.info(f"Successfully wrote {file_path}")
    except Exception as e:
        logger.error(f"Error writing {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save data: {str(e)}")

def save_session_result(session_data: Dict[str, Any]) -> bool:
    """Save session result to JSON file with improved error handling"""
    try:
        # Ensure sessions directory exists
        sessions_dir = "data/sessions"
        os.makedirs(sessions_dir, exist_ok=True)
        
        sessions_file = os.path.join(sessions_dir, "sessions.json")
        
        # Load existing sessions
        sessions = {}
        if os.path.exists(sessions_file):
            try:
                with open(sessions_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        sessions = json.loads(content)
            except (json.JSONDecodeError, Exception) as e:
                logger.error(f"Error reading sessions file: {e}")
                # Create backup of corrupted file
                backup_file = f"{sessions_file}.backup.{int(time.time())}"
                try:
                    shutil.copy2(sessions_file, backup_file)
                    logger.info(f"Created backup: {backup_file}")
                except Exception:
                    pass
                sessions = {}
        
        # Add session to user's session list
        user_id = session_data["athleteId"]
        if user_id not in sessions:
            sessions[user_id] = {"sessions": []}
        if "sessions" not in sessions[user_id]:
            sessions[user_id]["sessions"] = []
        
        # Add unique session ID if not present
        if "sessionId" not in session_data:
            session_data["sessionId"] = str(uuid.uuid4())[:8]
        
        # Check if session with same sessionId already exists
        session_id = session_data["sessionId"]
        existing_sessions = sessions[user_id]["sessions"]
        
        # Remove any existing session with the same sessionId to prevent duplicates
        sessions[user_id]["sessions"] = [s for s in existing_sessions if s.get("sessionId") != session_id]
        
        # Add the new session
        sessions[user_id]["sessions"].append(session_data)
        
        # Save back to file
        with open(sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Session saved for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving session: {e}")
        return False


def validate_exercise_name(exercise: str) -> str:
    """Validate and normalize exercise name"""
    exercise = exercise.lower().strip()
    if exercise not in EXERCISE_MAPPING:
        valid_exercises = list(set(EXERCISE_MAPPING.keys()))
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid exercise '{exercise}'. Valid exercises: {valid_exercises}"
        )
    return EXERCISE_MAPPING[exercise]

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/coaches", response_model=List[User])
async def get_coaches():
    """Get all coaches"""
    try:
        coaches = read_json_file("coaches.json")
        # Return coaches without passwords
        return [{k: v for k, v in coach.items() if k != "password"} for coach in coaches]
    except Exception as e:
        logger.error(f"Error fetching coaches: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch coaches")

@app.get("/api/athletes", response_model=List[User])
async def get_athletes():
    """Get all athletes"""
    try:
        athletes = read_json_file("athletes.json")
        # Return athletes without passwords
        return [{k: v for k, v in athlete.items() if k != "password"} for athlete in athletes]
    except Exception as e:
        logger.error(f"Error fetching athletes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch athletes")


@app.get("/api/sessions")
async def list_sessions(athleteId: Optional[str] = None, coachId: Optional[str] = None):
    """
    Return list of sessions with video URLs.
    Optional query params:
      - athleteId: filter by athlete
      - coachId: filter by coach
    """
    sessions_file = "data/sessions/sessions.json"
    if not os.path.exists(sessions_file):
        return []

    try:
        with open(sessions_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []

    # Load video metadata
    videos = read_json_file("videos.json")
    video_map = {v["sessionId"]: v for v in videos}

    # Flatten all sessions into a single list
    all_sessions = []
    # The data structure is { "athleteId": { "sessions": [...] } }
    for uid, user_data in (data.items() if isinstance(data, dict) else []):
        if isinstance(user_data, dict) and "sessions" in user_data:
            for session in user_data["sessions"]:
                # Add video URL if available
                session_id = session.get("sessionId")
                if session_id and session_id in video_map:
                    session["videoUrl"] = f"/api/videos/{session_id}"
                    session["thumbnailUrl"] = f"/api/videos/{session_id}"
                else:
                    session["videoUrl"] = None
                    session["thumbnailUrl"] = None
                all_sessions.append(session)

    if athleteId:
        return [s for s in all_sessions if s.get("athleteId") == athleteId]
    if coachId:
        return [s for s in all_sessions if s.get("coachId") == coachId]
    return all_sessions

@app.post("/api/sessions")
async def post_session(session: Dict[str, Any]):
    """
    Persist a session object. Expected shape similar to frontend Session.
    Uses existing save_session_result() helper to ensure consistent storage.
    """
    try:
        # Ensure a sessionId exists
        sid = session.get("sessionId") or uuid.uuid4().hex[:8]
        session["sessionId"] = sid

        # Add a timestamp if missing
        if not session.get("timestamp") and not session.get("date"):
            session["timestamp"] = datetime.utcnow().isoformat() + "Z"

        # Save it (save_session_result expects same dict format)
        save_session_result(session)
        return {"status": "ok", "sessionId": sid}
    except Exception as e:
        logger.error(f"Failed to persist session: {e}")
        raise HTTPException(status_code=500, detail="Failed to save session")

@app.post("/api/feedback")
async def submit_feedback(feedback_data: dict):
    """Submit user feedback"""
    try:
        # Create feedback directory if it doesn't exist
        feedback_dir = "data/feedback"
        os.makedirs(feedback_dir, exist_ok=True)
        
        # Generate feedback ID
        feedback_id = str(uuid.uuid4())[:8]
        
        # Prepare feedback record
        feedback_record = {
            "id": feedback_id,
            "userId": feedback_data.get("userId"),
            "userEmail": feedback_data.get("userEmail"),
            "username": feedback_data.get("username"),
            "feedback": feedback_data.get("feedback"),
            "timestamp": feedback_data.get("timestamp"),
            "status": "new"
        }
        
        # Load existing feedback
        feedback_file = f"{feedback_dir}/feedback.json"
        if os.path.exists(feedback_file):
            with open(feedback_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    feedbacks = json.loads(content)
                else:
                    feedbacks = []
        else:
            feedbacks = []
        
        # Add new feedback
        feedbacks.append(feedback_record)
        
        # Save feedback
        with open(feedback_file, "w", encoding="utf-8") as f:
            json.dump(feedbacks, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Feedback submitted by {feedback_data.get('username')} ({feedback_data.get('userEmail')})")
        
        return {"message": "Feedback submitted successfully", "feedbackId": feedback_id}
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")

@app.get("/api/benchmarks/leaderboard/{exercise}")
async def get_leaderboard(exercise: str, coach_id: Optional[str] = None):
    """Get leaderboard for specific exercise"""
    try:
        leaderboard = benchmarking_engine.generate_leaderboard(exercise, coach_id)
        return {"exercise": exercise, "leaderboard": leaderboard}
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard")

@app.get("/api/benchmarks/standards/{exercise}")
async def get_exercise_standards(exercise: str):
    """Get performance standards for specific exercise"""
    try:
        standards = benchmarking_engine.benchmarks.get("exercise_standards", {}).get(exercise, {})
        return {"exercise": exercise, "standards": standards}
    except Exception as e:
        logger.error(f"Error getting standards: {e}")
        raise HTTPException(status_code=500, detail="Failed to get standards")

@app.get("/api/predictive-analytics/athlete/{athlete_id}")
async def get_athlete_predictive_analytics(athlete_id: str):
    """Get predictive analytics for a specific athlete"""
    try:
        analytics = predictive_analytics.get_predictive_analytics(athlete_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting athlete predictive analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get predictive analytics")

@app.get("/api/predictive-analytics/coach/{coach_id}")
async def get_coach_predictive_analytics(coach_id: str):
    """Get predictive analytics for all athletes under a coach"""
    try:
        analytics = predictive_analytics.get_coach_predictive_analytics(coach_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting coach predictive analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get coach predictive analytics")

@app.get("/api/training-plans/athlete/{athlete_id}")
async def get_athlete_training_plan(athlete_id: str):
    """Get training plan for a specific athlete"""
    try:
        plan = training_plan_generator.get_training_plan(athlete_id)
        return plan
    except Exception as e:
        logger.error(f"Error getting athlete training plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to get training plan")

@app.post("/api/training-plans/athlete/{athlete_id}/generate")
async def generate_athlete_training_plan(athlete_id: str):
    """Generate new training plan for athlete"""
    try:
        plan = training_plan_generator.generate_training_plan(athlete_id)
        return plan
    except Exception as e:
        logger.error(f"Error generating training plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate training plan")

@app.put("/api/training-plans/athlete/{athlete_id}")
async def update_athlete_training_plan(athlete_id: str, updates: dict):
    """Update training plan for athlete"""
    try:
        plan = training_plan_generator.update_training_plan(athlete_id, updates)
        return plan
    except Exception as e:
        logger.error(f"Error updating training plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to update training plan")

@app.get("/api/training-plans/coach/{coach_id}")
async def get_coach_training_plans(coach_id: str):
    """Get all training plans for coach's athletes"""
    try:
        plans = training_plan_generator.get_coach_training_plans(coach_id)
        return plans
    except Exception as e:
        logger.error(f"Error getting coach training plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get coach training plans")

@app.get("/api/injury-alerts/athlete/{athlete_id}")
async def get_athlete_injury_analysis(athlete_id: str):
    """Get injury risk analysis for a specific athlete"""
    try:
        analysis = injury_alert_system.analyze_athlete_injury_risk(athlete_id)
        return analysis
    except Exception as e:
        logger.error(f"Error getting athlete injury analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to get injury analysis")

@app.get("/api/injury-alerts/coach/{coach_id}")
async def get_coach_injury_alerts(coach_id: str):
    """Get all injury alerts for coach's athletes"""
    try:
        alerts = injury_alert_system.get_coach_alerts(coach_id)
        return alerts
    except Exception as e:
        logger.error(f"Error getting coach injury alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get injury alerts")

@app.post("/api/injury-alerts/athlete/{athlete_id}/analyze")
async def analyze_athlete_injury_risk(athlete_id: str):
    """Run injury risk analysis for athlete and create alert if needed"""
    try:
        analysis = injury_alert_system.analyze_athlete_injury_risk(athlete_id)
        
        # Create alert if risk is detected
        if analysis.get("overall_risk"):
            alert = injury_alert_system.create_injury_alert(athlete_id, analysis)
            analysis["alert_created"] = alert
        
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing athlete injury risk: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze injury risk")

@app.put("/api/injury-alerts/{alert_id}/acknowledge")
async def acknowledge_injury_alert(alert_id: str, coach_id: str):
    """Acknowledge an injury alert"""
    try:
        result = injury_alert_system.acknowledge_alert(alert_id, coach_id)
        return result
    except Exception as e:
        logger.error(f"Error acknowledging injury alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")

@app.put("/api/injury-alerts/{alert_id}/resolve")
async def resolve_injury_alert(alert_id: str, coach_id: str):
    """Resolve an injury alert"""
    try:
        result = injury_alert_system.resolve_alert(alert_id, coach_id)
        return result
    except Exception as e:
        logger.error(f"Error resolving injury alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve alert")

@app.post("/api/injury-alerts/bulk-analysis")
async def run_bulk_injury_analysis():
    """Run injury risk analysis for all athletes"""
    try:
        results = injury_alert_system.run_bulk_analysis()
        return results
    except Exception as e:
        logger.error(f"Error running bulk injury analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to run bulk analysis")

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session by ID"""
    try:
        # Load all sessions
        sessions_file = "data/sessions/sessions.json"
        if not os.path.exists(sessions_file):
            raise HTTPException(status_code=404, detail="Session not found")
        
        with open(sessions_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                raise HTTPException(status_code=404, detail="Session not found")
            sessions_data = json.loads(content)
        
        # Find and remove the session
        session_found = False
        for user_id, user_data in sessions_data.items():
            if "sessions" in user_data:
                original_count = len(user_data["sessions"])
                user_data["sessions"] = [s for s in user_data["sessions"] if s.get("sessionId") != session_id]
                if len(user_data["sessions"]) < original_count:
                    session_found = True
                    break
        
        if not session_found:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Save updated sessions
        with open(sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions_data, f, indent=2, ensure_ascii=False)
        
        # Also try to delete associated video file
        try:
            video_file_path = f"videos/athletes/*/{session_id}_*.mp4"
            import glob
            video_files = glob.glob(video_file_path)
            for video_file in video_files:
                if os.path.exists(video_file):
                    os.remove(video_file)
                    logger.info(f"Deleted video file: {video_file}")
        except Exception as e:
            logger.warning(f"Could not delete video file for session {session_id}: {e}")
        
        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

# Authentication endpoints
@app.post("/api/register", response_model=User)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Validate role
        if user_data.role not in ["coach", "athlete"]:
            raise HTTPException(status_code=400, detail="Role must be 'coach' or 'athlete'")
        
        # Determine which file to use based on role
        filename = "coaches.json" if user_data.role == "coach" else "athletes.json"
        users = read_json_file(filename)
        
        # Check if user already exists
        if any(user["email"] == user_data.email for user in users):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user with plain text password
        new_user = {
            "id": str(uuid.uuid4()),
            "email": user_data.email,
            "password": user_data.password,
            "username": user_data.username,
            "role": user_data.role,
            "created_at": datetime.now().isoformat()
        }
        
        users.append(new_user)
        write_json_file(filename, users)
        
        logger.info(f"New {user_data.role} registered: {user_data.email}")
        
        # Return user without password
        return {k: v for k, v in new_user.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/login", response_model=User)
async def login(login_data: UserLogin):
    """Login user"""
    try:
        # Check both athletes and coaches
        athletes = read_json_file("athletes.json")
        coaches = read_json_file("coaches.json")
        all_users = athletes + coaches
        
        # Find user by email
        user = next((u for u in all_users if u["email"] == login_data.email), None)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password (direct comparison)
        if login_data.password != user["password"]:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check role if specified
        if login_data.role and user["role"] != login_data.role:
            raise HTTPException(status_code=403, detail=f"User is not a {login_data.role}")
        
        logger.info(f"User logged in: {login_data.email}")
        
        # Return user without password
        return {k: v for k, v in user.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

class GoogleLoginRequest(BaseModel):
    email: str
    name: str
    role: str
    google_id: str

@app.post("/api/google-login", response_model=User)
async def google_login(google_data: GoogleLoginRequest):
    """Login with Google OAuth"""
    try:
        # Check if user already exists
        athletes = read_json_file("athletes.json")
        coaches = read_json_file("coaches.json")
        all_users = athletes + coaches
        
        # Find user by email
        user = next((u for u in all_users if u["email"] == google_data.email), None)
        
        if not user:
            # Create new user
            filename = "coaches.json" if google_data.role == "coach" else "athletes.json"
            users = read_json_file(filename)
            
            new_user = {
                "id": str(uuid.uuid4()),
                "email": google_data.email,
                "password": "",  # No password for OAuth users
                "username": google_data.name,
                "role": google_data.role,
                "created_at": datetime.now().isoformat(),
                "google_id": google_data.google_id
            }
            
            users.append(new_user)
            write_json_file(filename, users)
            user = new_user
        
        logger.info(f"Google login successful: {google_data.email}")
        
        # Return user without password
        return {k: v for k, v in user.items() if k != "password"}
    except Exception as e:
        logger.error(f"Google login error: {e}")
        raise HTTPException(status_code=500, detail="Google login failed")



@app.get("/api/sessions/{session_id}")
async def get_session_by_id(session_id: str):
    """Get a specific session by ID with video URL"""
    try:
        sessions_file = "data/sessions/sessions.json"
        if not os.path.exists(sessions_file):
            raise HTTPException(status_code=404, detail="Session not found")
        
        with open(sessions_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Load video metadata
        videos = read_json_file("videos.json")
        video_map = {v["sessionId"]: v for v in videos}
        
        # Search through all sessions to find the one with matching sessionId
        for user_id, user_data in data.items():
            if isinstance(user_data, dict) and "sessions" in user_data:
                for session in user_data["sessions"]:
                    if session.get("sessionId") == session_id:
                        # Add video URL if available
                        if session_id in video_map:
                            session["videoUrl"] = f"/api/videos/{session_id}"
                            session["thumbnailUrl"] = f"/api/videos/{session_id}"
                        else:
                            session["videoUrl"] = None
                            session["thumbnailUrl"] = None
                        return session
        
        raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading session: {str(e)}")

# Coach messaging endpoints
@app.post("/api/coach-messages")
async def create_coach_message(message: CoachMessage):
    """Create a new coach message"""
    try:
        messages_file = "data/coach_messages.json"
        
        # Load existing messages
        messages = []
        if os.path.exists(messages_file):
            with open(messages_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    messages = json.loads(content)
        
        # Add new message
        messages.append(message.dict())
        
        # Save back to file
        with open(messages_file, "w", encoding="utf-8") as f:
            json.dump(messages, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Coach message created: {message.type} for athlete {message.athleteId}")
        return {"status": "success", "messageId": message.id}
        
    except Exception as e:
        logger.error(f"Error creating coach message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create message: {str(e)}")

@app.get("/api/coach-messages/{athlete_id}")
async def get_athlete_messages(athlete_id: str):
    """Get all messages for a specific athlete"""
    try:
        messages_file = "data/coach_messages.json"
        
        if not os.path.exists(messages_file):
            return []
        
        with open(messages_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            
            messages = json.loads(content)
            # Filter messages for this athlete and sort by timestamp (newest first)
            athlete_messages = [msg for msg in messages if msg.get("athleteId") == athlete_id]
            athlete_messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return athlete_messages
            
    except Exception as e:
        logger.error(f"Error loading messages for athlete {athlete_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load messages: {str(e)}")

@app.get("/api/coach-messages/coach/{coach_id}")
async def get_coach_messages(coach_id: str):
    """Get all messages for a specific coach"""
    try:
        messages_file = "data/coach_messages.json"
        
        if not os.path.exists(messages_file):
            return []
        
        with open(messages_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            
            messages = json.loads(content)
            # Filter messages for this coach and sort by timestamp (newest first)
            coach_messages = [msg for msg in messages if msg.get("coachId") == coach_id]
            coach_messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return coach_messages
            
    except Exception as e:
        logger.error(f"Error loading messages for coach {coach_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load messages: {str(e)}")

@app.put("/api/coach-messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    try:
        messages_file = "data/coach_messages.json"
        
        if not os.path.exists(messages_file):
            raise HTTPException(status_code=404, detail="Message not found")
        
        with open(messages_file, "r", encoding="utf-8") as f:
            messages = json.loads(f.read())
        
        # Find and update the message
        for message in messages:
            if message.get("id") == message_id:
                message["read"] = True
                break
        else:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Save back to file
        with open(messages_file, "w", encoding="utf-8") as f:
            json.dump(messages, f, indent=2, ensure_ascii=False)
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark message as read: {str(e)}")

@app.post("/api/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    exercise: str = Form(...),
    athleteId: str = Form(...),
    athleteName: str = Form(default="Athlete")
):
    """Analyze uploaded video file"""
    temp_file_path = None
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="File must be a video")
        
        # Validate exercise name
        exercise_internal = validate_exercise_name(exercise)
        
        # Check if exercise counter script exists
        if not os.path.exists("exercise_counter.py"):
            raise HTTPException(status_code=500, detail="Exercise counter script not found")

        # Create temporary file with proper extension
        file_extension = ".mp4"
        if file.filename:
            file_extension = os.path.splitext(file.filename)[1] or ".mp4"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        logger.info(f"Saved uploaded video to {temp_file_path} for athlete {athleteId}")

        # Build command
        cmd = [
            PYTHON_EXECUTABLE, "exercise_counter.py",
            "--user-id", athleteId,
            "--user-name", athleteName,
            "--exercise", exercise_internal,
            "--video-file", temp_file_path
        ]

        logger.info(f"Running command: {' '.join(cmd)}")

        # Run subprocess with timeout
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        try:
            stdout, stderr = process.communicate(timeout=300)  # 5 minute timeout
        except subprocess.TimeoutExpired:
            process.kill()
            raise HTTPException(status_code=500, detail="Video analysis timed out")

        # Log stderr for debugging
        if stderr:
            logger.info(f"Analyzer stderr: {stderr.strip()}")

        # Check return code
        if process.returncode != 0:
            error_msg = stderr.strip() if stderr else "Unknown error"
            logger.error(f"Analyzer failed (code {process.returncode}): {error_msg}")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg}")

        # Parse stdout JSON
        try:
            stdout_clean = stdout.strip()
            if not stdout_clean:
                raise ValueError("Empty output from analyzer")
            
            # Try to parse the entire output first
            try:
                parsed = json.loads(stdout_clean)
            except json.JSONDecodeError:
                # Fallback: find the last complete JSON object
                lines = stdout_clean.split('\n')
                json_line = None
                for line in reversed(lines):
                    line = line.strip()
                    if line.startswith('{') and line.endswith('}'):
                        try:
                            json.loads(line)  # Test if it's valid JSON
                            json_line = line
                            break
                        except json.JSONDecodeError:
                            continue
                
                if json_line:
                    parsed = json.loads(json_line)
                else:
                    raise ValueError("No valid JSON found in output")

        except Exception as e:
            logger.error(f"Failed to parse JSON from analyzer output: {e}")
            logger.error(f"Raw stdout: {repr(stdout)}")
            raise HTTPException(status_code=500, detail="Failed to parse analysis result")

        # Validate parsed result
        required_keys = ["userId", "exercise", "reps", "formScore", "durationSec"]
        for key in required_keys:
            if key not in parsed:
                logger.warning(f"Missing key '{key}' in parsed result, using default")

        # Get coach information from athlete data
        athletes = read_json_file("athletes.json")
        athlete_data = next((athlete for athlete in athletes if athlete["id"] == athleteId), None)
        coach_id = athlete_data.get("coachId") if athlete_data else None
        coach_name = athlete_data.get("coachName") if athlete_data else None

        # Construct session data for frontend & storage
        # Extract cheat detection data
        cheat_detection = parsed.get("cheatDetection", {})
        
        # Generate benchmarking data
        temp_session_data = {
            "exercise": exercise,
            "reps": int(parsed.get("reps", 0)),
            "formScore": int(parsed.get("formScore", 0)),
            "durationSec": float(parsed.get("durationSec", 0.0)),
            "athleteId": athleteId,
            "coachId": coach_id
        }
        
        benchmarking_data = benchmarking_engine.get_benchmarking_data(temp_session_data)
        
        # Generate predictive analytics data
        predictive_data = predictive_analytics.get_predictive_analytics(athleteId)
        
        # Generate training plan data
        training_plan_data = training_plan_generator.generate_training_plan(athleteId)
        
        # Generate injury risk analysis
        injury_analysis = injury_alert_system.analyze_athlete_injury_risk(athleteId)
        
        session_data = {
            "exercise": exercise,  # Use original exercise name for frontend
            "reps": int(parsed.get("reps", 0)),
            "formScore": int(parsed.get("formScore", 0)),
            "durationSec": float(parsed.get("durationSec", 0.0)),
            "timestamp": datetime.now().isoformat() + "Z",
            "athleteId": athleteId,
            "athleteName": parsed.get("userName", athleteName),
            "coachId": coach_id,
            "coachName": coach_name,
            "sessionId": str(uuid.uuid4())[:8],
            "cheatDetection": {
                "cheatDetected": cheat_detection.get("cheatDetected", False),
                "cheatPercentage": cheat_detection.get("cheatPercentage", 0.0),
                "totalFlags": cheat_detection.get("totalFlags", 0),
                "confidence": cheat_detection.get("confidence", 0.0),
                "riskLevel": cheat_detection.get("riskLevel", "low"),
                "flags": cheat_detection.get("flags", {}),
                "suspiciousPatterns": cheat_detection.get("suspiciousPatterns", [])
            },
            "benchmarking": benchmarking_data,
            "predictiveAnalytics": predictive_data,
            "trainingPlan": training_plan_data,
            "injuryAnalysis": injury_analysis
        }

        # Save session result
        if save_session_result(session_data):
            logger.info(f"Video analysis completed for athlete {athleteId}: {session_data['reps']} reps, {session_data['formScore']}% form")
        else:
            logger.warning("Failed to save session result")

        return session_data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in video analysis")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Could not remove temp file {temp_file_path}: {e}")

# Video storage endpoints
@app.post("/api/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    session_data: str = Form(...)
):
    """Upload video file with session metadata"""
    try:
        # Parse session data
        session_info = json.loads(session_data)
        session_id = session_info.get("sessionId", str(uuid.uuid4())[:8])
        athlete_id = session_info.get("athleteId")
        
        # Create video filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = f"{session_id}_{session_info['exercise']}_{timestamp}.mp4"
        
        # Store in athlete-specific directory
        athlete_video_dir = os.path.join("videos", "athletes", athlete_id)
        os.makedirs(athlete_video_dir, exist_ok=True)
        video_path = os.path.join(athlete_video_dir, video_filename)
        
        # Save video file
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create video metadata
        video_metadata = VideoMetadata(
            videoId=str(uuid.uuid4()),
            sessionId=session_id,
            athleteId=session_info["athleteId"],
            athleteName=session_info["athleteName"],
            exercise=session_info["exercise"],
            videoPath=video_path,
            uploadedAt=datetime.now().isoformat(),
            coachId=session_info.get("coachId"),
            coachName=session_info.get("coachName")
        )
        
        # Save metadata to JSON file
        videos_file = "videos.json"
        videos = read_json_file("videos.json") if os.path.exists(f"data/{videos_file}") else []
        videos.append(video_metadata.dict())
        write_json_file("videos.json", videos)
        
        logger.info(f"Video uploaded: {video_filename} to {video_path}")
        return {
            "status": "success", 
            "videoId": video_metadata.videoId, 
            "videoPath": video_path,
            "videoUrl": f"/api/videos/{session_id}"
        }
        
    except Exception as e:
        logger.error(f"Video upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Video upload failed: {str(e)}")

@app.get("/api/videos/{session_id}")
async def get_video(session_id: str):
    """Get video file by session ID"""
    try:
        videos = read_json_file("videos.json")
        video_meta = next((v for v in videos if v["sessionId"] == session_id), None)
        
        if not video_meta:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_path = video_meta["videoPath"]
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        
        return FileResponse(video_path, media_type="video/mp4")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving video: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve video")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Exercise Analysis API server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)