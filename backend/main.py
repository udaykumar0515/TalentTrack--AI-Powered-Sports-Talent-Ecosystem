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
from engines.benchmarking import benchmarking_engine
from engines.predictive_analytics import predictive_analytics
from engines.training_plans import training_plan_generator
from engines.injury_alerts import injury_alert_system
from engines.gamification import GamificationEngine
from engines.goal_setting import GoalSettingEngine
from engines.longterm_plans import LongTermPlansEngine
from services.offline_video_manager import OfflineVideoManager
import bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Password hashing utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

# Initialize gamification engine
gamification_engine = GamificationEngine()

# Initialize goal setting engine
goal_setting_engine = GoalSettingEngine()

# Initialize long-term plans engine
longterm_plans_engine = LongTermPlansEngine()

# Initialize offline video manager
offline_video_manager = OfflineVideoManager()

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
    age: Optional[int] = None
    gender: Optional[str] = None

class CoachChangeRequest(BaseModel):
    athleteId: str
    currentCoachId: str
    newCoachId: str
    reason: str

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
    age: Optional[int] = None
    gender: Optional[str] = None


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
    senderId: Optional[str] = None


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

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

# File upload configuration
MAX_VIDEO_SIZE = int(os.getenv("MAX_VIDEO_SIZE_MB", "100")) * 1024 * 1024  # Default 100MB

# Input validation utilities
import re

def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filename"""
    # Remove path separators and dangerous chars
    safe = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
    # Remove leading/trailing dots and spaces
    safe = safe.strip('. ')
    # Limit length
    return safe[:100]

def validate_exercise_name(exercise: str) -> str:
    """Validate and normalize exercise name"""
    clean = exercise.lower().strip()
    if clean not in EXERCISE_MAPPING:
        raise HTTPException(400, f"Invalid exercise. Must be one of: {list(EXERCISE_MAPPING.keys())}")
    return EXERCISE_MAPPING[clean]

def validate_email(email: str) -> str:
    """Basic email validation"""
    email = email.strip().lower()
    # Simple regex for email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(400, "Invalid email format")
    if len(email) > 254:  # RFC 5321
        raise HTTPException(400, "Email too long")
    return email

def validate_username(username: str) -> str:
    """Validate username"""
    username = username.strip()
    if len(username) < 2:
        raise HTTPException(400, "Username must be at least 2 characters")
    if len(username) > 50:
        raise HTTPException(400, "Username too long (max 50 characters)")
    # Allow alphanumeric, spaces, dots, underscores, hyphens
    if not re.match(r'^[a-zA-Z0-9 ._-]+$', username):
        raise HTTPException(400, "Username contains invalid characters")
    return username

def validate_password(password: str) -> None:
    """Validate password strength"""
    if len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if len(password) > 128:
        raise HTTPException(400, "Password too long (max 128 characters)")
    # At least one number or special character for basic security
    if not re.search(r'[0-9!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(400, "Password must contain at least one number or special character")

def init_data_directories():
    """Ensure all required data directories exist"""
    directories = ["data", "data/sessions", "data/athletes", "data/gamification", "data/goals", "data/injury_alerts", "data/videos", "data/system", "videos", "videos/athletes", "videos/coaches"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize empty JSON files if they don't exist
    files = {
        "data/athletes/athletes.json": [],
        "data/athletes/coaches.json": [],
        "data/sessions/sessions.json": {},
        "data/videos/videos.json": []
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


def update_user_goals_progress(user_id: str, session_data: Dict[str, Any]) -> None:
    """Update progress for all active goals when user completes a session"""
    try:
        # Get all active goals for the user
        goals = goal_setting_engine.get_user_goals(user_id, status="active")
        
        # Update progress for each active goal
        for goal in goals:
            try:
                goal_setting_engine.update_goal_progress(user_id, goal["id"], session_data)
                logger.info(f"Updated goal progress for {user_id}, goal: {goal['title']}")
            except Exception as e:
                logger.error(f"Error updating goal {goal['id']} for user {user_id}: {e}")
                
    except Exception as e:
        logger.error(f"Error updating goals progress for user {user_id}: {e}")


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/coaches", response_model=List[User])
async def get_coaches():
    """Get all coaches"""
    try:
        coaches = read_json_file("athletes/coaches.json")
        # Return coaches without passwords
        return [{k: v for k, v in coach.items() if k != "password"} for coach in coaches]
    except Exception as e:
        logger.error(f"Error fetching coaches: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch coaches")

@app.get("/api/athletes", response_model=List[User])
async def get_athletes():
    """Get all athletes"""
    try:
        athletes = read_json_file("athletes/athletes.json")
        # Return athletes without passwords
        return [{k: v for k, v in athlete.items() if k != "password"} for athlete in athletes]
    except Exception as e:
        logger.error(f"Error fetching athletes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch athletes")

@app.get("/api/athletes/{athlete_id}")
async def get_athlete(athlete_id: str):
    """Get a specific athlete by ID"""
    try:
        athletes = read_json_file("athletes/athletes.json")
        athlete = next((a for a in athletes if a.get("id") == athlete_id), None)
        if not athlete:
            raise HTTPException(status_code=404, detail="Athlete not found")
        # Return athlete without password
        return {k: v for k, v in athlete.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get athlete {athlete_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get athlete")


@app.get("/api/sessions")
async def list_sessions(
    athleteId: Optional[str] = None,
    coachId: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """
    Return list of sessions with video URLs.
    Supports pagination via skip/limit parameters.
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
    videos = read_json_file("videos/videos.json")
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

    # Filter by user ID
    filtered_sessions = all_sessions
    if athleteId:
        filtered_sessions = [s for s in filtered_sessions if s.get("athleteId") == athleteId]
    if coachId:
        filtered_sessions = [s for s in filtered_sessions if s.get("coachId") == coachId]
        
    # Sort by timestamp descending (newest first)
    filtered_sessions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Calculate total and apply pagination
    total = len(filtered_sessions)
    start = skip
    end = skip + limit
    paginated_sessions = filtered_sessions[start:end]

    return {
        "sessions": paginated_sessions,
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": end < total
        }
    }

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
        
        # Recalculate gamification stats for the user
        athlete_id = session.get("athleteId")
        if athlete_id:
            gamification_engine.recalculate_user_stats_from_sessions(athlete_id)
            
            # Note: Goal progress is updated in the analyze-video endpoint to avoid double counting
        
        return {"status": "ok", "sessionId": sid}
    except Exception as e:
        logger.error(f"Failed to persist session: {e}")
        raise HTTPException(status_code=500, detail="Failed to save session")

@app.post("/api/coach-change-request")
async def submit_coach_change_request(request: CoachChangeRequest):
    """Submit a coach change request from an athlete"""
    try:
        # For automatic approval (when no current coach or for specific athletes like uday)
        if (request.currentCoachId == 'none' or 
            request.athleteId == 'athlete_1' or  # Auto-approve for uday
            not request.currentCoachId):
            
            # Directly update the athlete's coach
            athletes_file = "data/athletes/athletes.json"
            if os.path.exists(athletes_file):
                with open(athletes_file, 'r', encoding='utf-8') as f:
                    athletes = json.load(f)
                
                # Find and update the athlete
                athlete_updated = False
                for athlete in athletes:
                    if athlete.get("id") == request.athleteId:
                        athlete["coachId"] = request.newCoachId
                        # Get new coach name
                        coaches_file = "data/athletes/coaches.json"
                        if os.path.exists(coaches_file):
                            with open(coaches_file, 'r', encoding='utf-8') as f:
                                coaches = json.load(f)
                            new_coach = next((c for c in coaches if c.get("id") == request.newCoachId), None)
                            if new_coach:
                                athlete["coachName"] = new_coach.get("username", "Unknown Coach")
                        athlete_updated = True
                        break
                
                if athlete_updated:
                    with open(athletes_file, 'w', encoding='utf-8') as f:
                        json.dump(athletes, f, indent=2)
                    logger.info(f"Coach automatically assigned to athlete {request.athleteId}: {request.newCoachId}")
                    return {"status": "success", "message": "Coach assigned successfully", "autoApproved": True}
        
        # For regular coach change requests (when changing from one coach to another)
        # Create coach change requests directory if it doesn't exist
        requests_dir = "data/coach_change_requests"
        os.makedirs(requests_dir, exist_ok=True)
        
        # Generate request ID
        request_id = str(uuid.uuid4())[:8]
        
        # Prepare request record
        request_data = {
            "id": request_id,
            "athleteId": request.athleteId,
            "currentCoachId": request.currentCoachId,
            "newCoachId": request.newCoachId,
            "reason": request.reason,
            "status": "pending",  # pending, approved, rejected
            "created_at": datetime.now().isoformat(),
            "approved_at": None,
            "approved_by": None
        }
        
        # Save request to file
        request_file = os.path.join(requests_dir, f"{request_id}.json")
        with open(request_file, 'w', encoding='utf-8') as f:
            json.dump(request_data, f, indent=2)
        
        logger.info(f"Coach change request submitted: {request_id}")
        return {"status": "success", "requestId": request_id, "message": "Coach change request submitted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to submit coach change request: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit coach change request")

@app.get("/api/coach-change-requests/{coach_id}")
async def get_coach_change_requests(coach_id: str):
    """Get pending coach change requests for a specific coach"""
    try:
        requests_dir = "data/coach_change_requests"
        if not os.path.exists(requests_dir):
            return {"requests": []}
        
        requests = []
        for filename in os.listdir(requests_dir):
            if filename.endswith('.json'):
                with open(os.path.join(requests_dir, filename), 'r', encoding='utf-8') as f:
                    request_data = json.load(f)
                    # Only return requests for this coach that are pending
                    if (request_data.get("newCoachId") == coach_id and 
                        request_data.get("status") == "pending"):
                        requests.append(request_data)
        
        return {"requests": requests}
        
    except Exception as e:
        logger.error(f"Failed to get coach change requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to get coach change requests")

@app.post("/api/coach-change-requests/{request_id}/approve")
async def approve_coach_change_request(request_id: str, coach_id: str):
    """Approve a coach change request"""
    try:
        requests_dir = "data/coach_change_requests"
        request_file = os.path.join(requests_dir, f"{request_id}.json")
        
        if not os.path.exists(request_file):
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Load request data
        with open(request_file, 'r', encoding='utf-8') as f:
            request_data = json.load(f)
        
        if request_data.get("newCoachId") != coach_id:
            raise HTTPException(status_code=403, detail="Unauthorized to approve this request")
        
        if request_data.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Request is not pending")
        
        # Update athlete's coach in athletes.json
        athletes_file = "data/athletes/athletes.json"
        if os.path.exists(athletes_file):
            with open(athletes_file, 'r', encoding='utf-8') as f:
                athletes = json.load(f)
            
            # Find and update the athlete
            athlete_updated = False
            for athlete in athletes:
                if athlete.get("id") == request_data["athleteId"]:
                    athlete["coachId"] = request_data["newCoachId"]
                    # Get new coach name
                    coaches_file = "data/athletes/coaches.json"
                    if os.path.exists(coaches_file):
                        with open(coaches_file, 'r', encoding='utf-8') as f:
                            coaches = json.load(f)
                        new_coach = next((c for c in coaches if c.get("id") == request_data["newCoachId"]), None)
                        if new_coach:
                            athlete["coachName"] = new_coach.get("username", "Unknown Coach")
                    athlete_updated = True
                    break
            
            if athlete_updated:
                with open(athletes_file, 'w', encoding='utf-8') as f:
                    json.dump(athletes, f, indent=2)
        
        # Update request status
        request_data["status"] = "approved"
        request_data["approved_at"] = datetime.now().isoformat()
        request_data["approved_by"] = coach_id
        
        with open(request_file, 'w', encoding='utf-8') as f:
            json.dump(request_data, f, indent=2)
        
        logger.info(f"Coach change request approved: {request_id}")
        return {"status": "success", "message": "Coach change request approved successfully"}
        
    except Exception as e:
        logger.error(f"Failed to approve coach change request: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve coach change request")

@app.post("/api/assign-coach")
async def assign_coach(athlete_id: str, coach_id: str):
    """Directly assign a coach to an athlete (for initial assignment)"""
    try:
        athletes_file = "data/athletes/athletes.json"
        if not os.path.exists(athletes_file):
            raise HTTPException(status_code=404, detail="Athletes data not found")
        
        with open(athletes_file, 'r', encoding='utf-8') as f:
            athletes = json.load(f)
        
        # Find and update the athlete
        athlete_updated = False
        for athlete in athletes:
            if athlete.get("id") == athlete_id:
                athlete["coachId"] = coach_id
                # Get coach name
                coaches_file = "data/athletes/coaches.json"
                if os.path.exists(coaches_file):
                    with open(coaches_file, 'r', encoding='utf-8') as f:
                        coaches = json.load(f)
                    coach = next((c for c in coaches if c.get("id") == coach_id), None)
                    if coach:
                        athlete["coachName"] = coach.get("username", "Unknown Coach")
                athlete_updated = True
                break
        
        if not athlete_updated:
            raise HTTPException(status_code=404, detail="Athlete not found")
        
        # Save updated athletes data
        with open(athletes_file, 'w', encoding='utf-8') as f:
            json.dump(athletes, f, indent=2)
        
        logger.info(f"Coach {coach_id} assigned to athlete {athlete_id}")
        return {"status": "success", "message": "Coach assigned successfully"}
        
    except Exception as e:
        logger.error(f"Failed to assign coach: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign coach")
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
async def get_benchmark_leaderboard(exercise: str, coach_id: Optional[str] = None):
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
    """Get all training plans for coaches athletes"""
    try:
        plans = training_plan_generator.get_coach_training_plans(coach_id)
        return plans
    except Exception as e:
        logger.error(f"Error getting coach training plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get coach training plans")

@app.get("/api/training-plans/coach-plan/{athlete_id}")
async def get_coach_training_plan(athlete_id: str):
    """Get coach-created training plan for a specific athlete"""
    try:
        plan = training_plan_generator.get_coach_training_plan(athlete_id)
        return plan
    except Exception as e:
        logger.error(f"Error getting coach training plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to get coach training plan")

@app.post("/api/training-plans/coach/{athlete_id}")
async def create_coach_training_plan(athlete_id: str, plan_data: dict):
    """Create a training plan for an athlete by their coach"""
    try:
        plan = training_plan_generator.create_coach_training_plan(athlete_id, plan_data)
        return plan
    except Exception as e:
        logger.error(f"Error creating coach training plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to create coach training plan")

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
    """Get all injury alerts for coaches athletes"""
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
        deleted_user_id = None
        for user_id, user_data in sessions_data.items():
            if "sessions" in user_data:
                original_count = len(user_data["sessions"])
                user_data["sessions"] = [s for s in user_data["sessions"] if s.get("sessionId") != session_id]
                if len(user_data["sessions"]) < original_count:
                    session_found = True
                    deleted_user_id = user_id
                    break
        
        if not session_found:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Save updated sessions
        with open(sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions_data, f, indent=2, ensure_ascii=False)
        
        # Recalculate gamification stats after deleting session
        if deleted_user_id:
            gamification_engine.recalculate_user_stats_from_sessions(deleted_user_id)
        
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
        
        # Determine which file to use based on role (with correct path!)
        filename = "athletes/coaches.json" if user_data.role == "coach" else "athletes/athletes.json"
        users = read_json_file(filename)
       
        # Validate email format
        validated_email = validate_email(user_data.email)
        
        # Validate username
        validated_username = validate_username(user_data.username)
        
        # Validate password strength
        validate_password(user_data.password)
        
        # Check if user already exists
        if any(user["email"] == validated_email for user in users):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user with HASHED password
        new_user = {
            "id": str(uuid.uuid4()),
            "email": validated_email,  # Use validated email
            "password": hash_password(user_data.password),  # Hash password!
            "username": validated_username,  # Use validated username
            "role": user_data.role,
            "created_at": datetime.now().isoformat(),
            "age": user_data.age,
            "gender": user_data.gender
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
        athletes = read_json_file("athletes/athletes.json")
        coaches = read_json_file("athletes/coaches.json")
        all_users = athletes + coaches
        
        # Find user by email
        user = next((u for u in all_users if u["email"] == login_data.email), None)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        
        # Verify password using bcrypt
        if not verify_password(login_data.password, user["password"]):
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
        athletes = read_json_file("athletes/athletes.json")
        coaches = read_json_file("athletes/coaches.json")
        all_users = athletes + coaches
        
        # Find user by email
        user = next((u for u in all_users if u["email"] == google_data.email), None)
        
        if not user:
            # Create new user with correct path
            filename = "athletes/coaches.json" if google_data.role == "coach" else "athletes/athletes.json"
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
        videos = read_json_file("videos/videos.json")
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
        messages_file = "data/system/coach_messages.json"
        
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
        messages_file = "data/system/coach_messages.json"
        
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
        messages_file = "data/system/coach_messages.json"
        
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
        messages_file = "data/system/coach_messages.json"
        
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
        
        # Create temporary file with proper extension
        file_extension = ".mp4"
        if file.filename:
            file_extension = os.path.splitext(file.filename)[1] or ".mp4"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        logger.info(f"Saved uploaded video to {temp_file_path} for athlete {athleteId}")

        # Determine which script to use - prefer v2 (MediaPipe Tasks API)
        use_fallback = False
        main_script = "services/exercise_counter_v2.py"
        fallback_script = "services/exercise_counter_fallback.py"
        
        # Check if main script exists
        if not os.path.exists(main_script):
            if os.path.exists(fallback_script):
                use_fallback = True
                logger.warning("Main exercise counter not found, using fallback")
            else:
                raise HTTPException(status_code=500, detail="Exercise counter script not found")
        
        # Build command with appropriate script
        script_to_use = fallback_script if use_fallback else main_script
        cmd = [
            PYTHON_EXECUTABLE, script_to_use,
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

        # Check return code - if TensorFlow error, retry with fallback
        if process.returncode != 0:
            error_msg = stderr.strip() if stderr else "Unknown error"
            
            # Detect TensorFlow/MediaPipe import errors and retry with fallback
            tensorflow_error = any(keyword in error_msg.lower() for keyword in [
                'tensorflow', 'mediapipe', 'no module named', 'dll load failed', 
                'importerror', 'modulenotfounderror', 'pywrap'
            ])
            
            if tensorflow_error and not use_fallback and os.path.exists(fallback_script):
                logger.warning(f"TensorFlow error detected, retrying with fallback script: {error_msg[:200]}")
                
                # Retry with fallback script
                cmd = [
                    PYTHON_EXECUTABLE, fallback_script,
                    "--user-id", athleteId,
                    "--user-name", athleteName,
                    "--exercise", exercise_internal,
                    "--video-file", temp_file_path
                ]
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                try:
                    stdout, stderr = process.communicate(timeout=60)
                except subprocess.TimeoutExpired:
                    process.kill()
                    raise HTTPException(status_code=500, detail="Fallback analysis timed out")
                
                if process.returncode != 0:
                    error_msg = stderr.strip() if stderr else "Unknown error"
                    logger.error(f"Fallback analyzer failed (code {process.returncode}): {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg}")
            else:
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
        athletes = read_json_file("athletes/athletes.json")
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
        
        # Generate gamification data
        gamification_data = gamification_engine.update_user_progress(athleteId, temp_session_data)
        
        # Recalculate user stats from all sessions to ensure accuracy
        gamification_engine.recalculate_user_stats_from_sessions(athleteId)
        
        # Update goal progress for all active goals
        update_user_goals_progress(athleteId, temp_session_data)
        
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
            "injuryAnalysis": injury_analysis,
            "gamification": gamification_data
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
        # Check file size FIRST
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Seek back to start
        
        if file_size > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {MAX_VIDEO_SIZE / (1024*1024):.0f}MB"
            )
        
        # Parse session data
        session_info = json.loads(session_data)
        session_id = session_info.get("sessionId", str(uuid.uuid4())[:8])
        athlete_id = session_info.get("athleteId")
        
        # Validate and sanitize exercise name
        exercise = validate_exercise_name(session_info['exercise'])
        
        # Create video filename with timestamp (sanitized)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = sanitize_filename(f"{session_id}_{exercise}_{timestamp}.mp4")
        
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
        videos = read_json_file("videos/videos.json") if os.path.exists(f"data/videos/{videos_file}") else []
        videos.append(video_metadata.dict())
        write_json_file("videos/videos.json", videos)
        
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
        videos = read_json_file("videos/videos.json")
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

# Gamification endpoints
@app.get("/api/gamification/user/{user_id}")
async def get_user_gamification_stats(user_id: str):
    """Get users gamification statistics"""
    try:
        stats = gamification_engine.get_user_stats(user_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting user gamification stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gamification/leaderboard")
async def get_leaderboard(category: str = "total_points", limit: int = 10):
    """Get leaderboard for a specific category"""
    try:
        leaderboard = gamification_engine.get_leaderboard(category, limit)
        return {"leaderboard": leaderboard, "category": category}
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gamification/achievements")
async def get_all_achievements():
    """Get all available achievements"""
    try:
        achievements = gamification_engine.load_achievements()
        return {"achievements": achievements}
    except Exception as e:
        logger.error(f"Error getting achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gamification/badges")
async def get_all_badges():
    """Get all available badges"""
    try:
        badges = gamification_engine.load_badges()
        return {"badges": badges}
    except Exception as e:
        logger.error(f"Error getting badges: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gamification/recalculate-all")
async def recalculate_all_gamification_stats():
    """Recalculate all user gamification stats from session data"""
    try:
        gamification_engine.recalculate_all_users_stats()
        return {"status": "success", "message": "All user stats recalculated from session data"}
    except Exception as e:
        logger.error(f"Error recalculating all user stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gamification/recalculate/{user_id}")
async def recalculate_user_gamification_stats(user_id: str):
    """Recalculate a specific user's gamification stats from session data"""
    try:
        user_data = gamification_engine.recalculate_user_stats_from_sessions(user_id)
        return {"status": "success", "user_data": user_data}
    except Exception as e:
        logger.error(f"Error recalculating user stats for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Goal Setting API endpoints
@app.post("/api/goals")
async def create_goal(goal_data: dict):
    """Create a new goal for a user"""
    try:
        user_id = goal_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        goal = goal_setting_engine.create_goal(user_id, goal_data)
        if not goal:
            raise HTTPException(status_code=500, detail="Failed to create goal")
        
        return goal
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to create goal")

@app.get("/api/goals/{user_id}")
async def get_user_goals(user_id: str, status: Optional[str] = None):
    """Get all goals for a user"""
    try:
        goals = goal_setting_engine.get_user_goals(user_id, status)
        return {"goals": goals}
    except Exception as e:
        logger.error(f"Error getting user goals: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user goals")

@app.put("/api/goals/{user_id}/{goal_id}")
async def update_goal(user_id: str, goal_id: str, updates: dict):
    """Update a specific goal"""
    try:
        success = goal_setting_engine.update_goal(user_id, goal_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        return {"success": True, "message": "Goal updated successfully"}
    except Exception as e:
        logger.error(f"Error updating goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to update goal")

@app.delete("/api/goals/{user_id}/{goal_id}")
async def delete_goal(user_id: str, goal_id: str):
    """Delete a specific goal"""
    try:
        success = goal_setting_engine.delete_goal(user_id, goal_id)
        if not success:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        return {"success": True, "message": "Goal deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting goal: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete goal")

@app.get("/api/goals/{user_id}/analytics")
async def get_goal_analytics(user_id: str):
    """Get goal analytics for a user"""
    try:
        analytics = goal_setting_engine.get_goal_analytics(user_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting goal analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get goal analytics")

@app.get("/api/goals/{user_id}/recommendations")
async def get_goal_recommendations(user_id: str):
    """Get goal recommendations for a user based on their session history"""
    try:
        # Get user's session history
        sessions = read_json_file("sessions/sessions.json")
        user_sessions = []
        
        for athlete_id, athlete_data in sessions.items():
            if athlete_id == user_id and "sessions" in athlete_data:
                user_sessions.extend(athlete_data["sessions"])
        
        recommendations = goal_setting_engine.get_goal_recommendations(user_id, user_sessions)
        return {"recommendations": recommendations}
    except Exception as e:
        logger.error(f"Error getting goal recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get goal recommendations")

# Long-term Plans API endpoints
@app.post("/api/longterm-plans")
async def create_longterm_plan(plan_data: dict):
    """Create a new long-term plan for an athlete"""
    try:
        coach_id = plan_data.get("coach_id")
        if not coach_id:
            raise HTTPException(status_code=400, detail="coach_id is required")
        
        plan = longterm_plans_engine.create_plan(coach_id, plan_data)
        if not plan:
            raise HTTPException(status_code=500, detail="Failed to create long-term plan")
        
        return plan
    except Exception as e:
        logger.error(f"Error creating long-term plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to create long-term plan")

@app.get("/api/longterm-plans/coach/{coach_id}")
async def get_coach_plans(coach_id: str, status: Optional[str] = None):
    """Get all long-term plans for a coach"""
    try:
        plans = longterm_plans_engine.get_coach_plans(coach_id, status)
        return {"plans": plans}
    except Exception as e:
        logger.error(f"Error getting coach plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get coach plans")

@app.get("/api/longterm-plans/athlete/{athlete_id}")
async def get_athlete_plans(athlete_id: str):
    """Get all long-term plans for an athlete"""
    try:
        plans = longterm_plans_engine.get_athlete_plans(athlete_id)
        return {"plans": plans}
    except Exception as e:
        logger.error(f"Error getting athlete plans: {e}")
        raise HTTPException(status_code=500, detail="Failed to get athlete plans")

@app.put("/api/longterm-plans/{coach_id}/{plan_id}")
async def update_longterm_plan(coach_id: str, plan_id: str, updates: dict):
    """Update a specific long-term plan"""
    try:
        success = longterm_plans_engine.update_plan(coach_id, plan_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return {"success": True, "message": "Plan updated successfully"}
    except Exception as e:
        logger.error(f"Error updating plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to update plan")

@app.delete("/api/longterm-plans/{coach_id}/{plan_id}")
async def delete_longterm_plan(coach_id: str, plan_id: str):
    """Delete a specific long-term plan"""
    try:
        success = longterm_plans_engine.delete_plan(coach_id, plan_id)
        if not success:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return {"success": True, "message": "Plan deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete plan")

@app.get("/api/longterm-plans/{coach_id}/analytics")
async def get_plan_analytics(coach_id: str):
    """Get analytics for coach's long-term plans"""
    try:
        analytics = longterm_plans_engine.get_plan_analytics(coach_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting plan analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get plan analytics")

@app.get("/api/longterm-plans/{coach_id}/recommendations/{athlete_id}")
async def get_plan_recommendations(coach_id: str, athlete_id: str):
    """Get plan recommendations for an athlete based on their session history"""
    try:
        # Get athlete's session history
        sessions = read_json_file("sessions/sessions.json")
        athlete_sessions = []
        
        for aid, athlete_data in sessions.items():
            if aid == athlete_id and "sessions" in athlete_data:
                athlete_sessions.extend(athlete_data["sessions"])
        
        recommendations = longterm_plans_engine.generate_plan_recommendations(coach_id, athlete_id, athlete_sessions)
        return {"recommendations": recommendations}
    except Exception as e:
        logger.error(f"Error getting plan recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get plan recommendations")

@app.post("/api/longterm-plans/templates")
async def create_plan_template(template_data: dict):
    """Create a reusable plan template"""
    try:
        coach_id = template_data.get("coach_id")
        if not coach_id:
            raise HTTPException(status_code=400, detail="coach_id is required")
        
        template = longterm_plans_engine.create_plan_template(coach_id, template_data)
        if not template:
            raise HTTPException(status_code=500, detail="Failed to create plan template")
        
        return template
    except Exception as e:
        logger.error(f"Error creating plan template: {e}")
        raise HTTPException(status_code=500, detail="Failed to create plan template")

@app.get("/api/longterm-plans/templates/{coach_id}")
async def get_plan_templates(coach_id: str):
    """Get all plan templates for a coach"""
    try:
        templates = longterm_plans_engine.get_plan_templates(coach_id)
        return {"templates": templates}
    except Exception as e:
        logger.error(f"Error getting plan templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to get plan templates")

# Offline Video API endpoints
@app.post("/api/offline-videos")
async def store_offline_video(video_data: dict):
    """Store a video recorded offline"""
    try:
        user_id = video_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        offline_video = offline_video_manager.store_offline_video(user_id, video_data)
        if not offline_video:
            raise HTTPException(status_code=500, detail="Failed to store offline video")
        
        return offline_video
    except Exception as e:
        logger.error(f"Error storing offline video: {e}")
        raise HTTPException(status_code=500, detail="Failed to store offline video")

@app.get("/api/offline-videos/{user_id}")
async def get_user_offline_videos(user_id: str, status: Optional[str] = None):
    """Get all offline videos for a user"""
    try:
        videos = offline_video_manager.get_user_offline_videos(user_id, status)
        return {"videos": videos}
    except Exception as e:
        logger.error(f"Error getting user offline videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to get offline videos")

@app.put("/api/offline-videos/{user_id}/{video_id}/analyze")
async def analyze_offline_video(user_id: str, video_id: str, analysis_request: dict):
    """Trigger analysis for an offline video"""
    try:
        # Get the offline video
        user_videos = offline_video_manager.get_user_offline_videos(user_id)
        video = next((v for v in user_videos if v["id"] == video_id), None)
        
        if not video:
            raise HTTPException(status_code=404, detail="Offline video not found")
        
        if video["status"] != "pending_analysis":
            raise HTTPException(status_code=400, detail="Video is not pending analysis")
        
        # Update status to analyzing
        offline_video_manager.update_video_status(user_id, video_id, "analyzing")
        
        # Use the same analysis function as main analysis
        try:
            import subprocess
            import json
            import os
            import tempfile
            import shutil
            
            # Get the video file path
            video_path = video["video_path"]
            exercise_type = analysis_request.get("exercise_type", "squat")
            
            if not os.path.exists(video_path):
                raise Exception(f"Video file not found: {video_path}")
            
            # Create a temporary file for the analysis (same as main analysis)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file_path = temp_file.name
                # Copy the video file to temp location
                shutil.copy2(video_path, temp_file_path)
            
            try:
                # Validate exercise name (same as main analysis)
                exercise_internal = validate_exercise_name(exercise_type)
                
                # Run the same analysis command as main analysis
                cmd = [
                    PYTHON_EXECUTABLE, "services/exercise_counter.py",
                    "--user-id", user_id,
                    "--user-name", "Offline User",
                    "--exercise", exercise_internal,
                    "--video-file", temp_file_path
                ]
                
                logger.info(f"Running offline analysis command: {' '.join(cmd)}")
                
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=".", encoding='utf-8', errors='replace')
                
                if result.returncode == 0:
                    # Parse the analysis results (same format as main analysis)
                    analysis_data = json.loads(result.stdout)
                    
                    # Move video from offline folder to main athlete folder
                    main_video_dir = f"videos/athletes/{user_id}"
                    os.makedirs(main_video_dir, exist_ok=True)
                    
                    # New video path in main athlete folder
                    new_video_path = os.path.join(main_video_dir, f"{video_id}.mp4")
                    
                    # Move the video file
                    shutil.move(video_path, new_video_path)
                    
                    # Update video status to completed with analysis data
                    offline_video_manager.update_video_status(user_id, video_id, "completed", analysis_data)
                    
                    # Create a session from the analysis (same as main analysis)
                    import uuid
                    session_data = {
                        "sessionId": str(uuid.uuid4())[:8],  # Generate unique session ID
                        "athleteId": user_id,
                        "athleteName": "Offline User",
                        "exercise": exercise_type,
                        "reps": analysis_data.get("reps", 0),
                        "formScore": analysis_data.get("formScore", 0.0),
                        "timestamp": video["recorded_at"],
                        "videoPath": new_video_path,
                        "analysisData": analysis_data,
                        "sessionType": "offline_analysis",
                        "durationSec": analysis_data.get("durationSec", 0),
                        "cheatDetection": analysis_data.get("cheatDetection", {})
                    }
                    
                    # Use the same save function as main analysis
                    save_session_result(session_data)
                    
                    # Update goal progress for all active goals
                    update_user_goals_progress(user_id, session_data)
                    
                    # Remove the video from offline queue after successful analysis
                    offline_video_manager.delete_offline_video(user_id, video_id)
                    
                    return {"message": "Video analyzed successfully", "video_id": video_id, "analysis": analysis_data}
                else:
                    # Analysis failed
                    offline_video_manager.update_video_status(user_id, video_id, "failed")
                    return {"message": "Video analysis failed", "error": result.stderr}
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                
        except Exception as analysis_error:
            logger.error(f"Error during video analysis: {analysis_error}")
            offline_video_manager.update_video_status(user_id, video_id, "failed")
            return {"message": "Video analysis failed", "error": str(analysis_error)}
    except Exception as e:
        logger.error(f"Error analyzing offline video: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze offline video")

@app.delete("/api/offline-videos/{user_id}/{video_id}")
async def delete_offline_video(user_id: str, video_id: str):
    """Delete an offline video"""
    try:
        success = offline_video_manager.delete_offline_video(user_id, video_id)
        if not success:
            raise HTTPException(status_code=404, detail="Offline video not found")
        
        return {"success": True, "message": "Offline video deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting offline video: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete offline video")

@app.get("/api/offline-videos/{user_id}/stats")
async def get_offline_video_stats(user_id: str):
    """Get statistics for user's offline videos"""
    try:
        stats = offline_video_manager.get_offline_video_stats(user_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting offline video stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get offline video stats")

@app.get("/api/offline-videos/pending")
async def get_pending_analysis_videos():
    """Get all videos pending analysis (admin endpoint)"""
    try:
        videos = offline_video_manager.get_pending_analysis_videos()
        return {"videos": videos}
    except Exception as e:
        logger.error(f"Error getting pending analysis videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to get pending analysis videos")

@app.post("/api/offline-videos/{video_id}/process")
async def process_offline_video(video_id: str, analysis_result: dict):
    """Process an offline video with analysis results"""
    try:
        success = offline_video_manager.process_offline_video(video_id, analysis_result)
        if not success:
            raise HTTPException(status_code=404, detail="Offline video not found")
        
        return {"success": True, "message": "Offline video processed successfully"}
    except Exception as e:
        logger.error(f"Error processing offline video: {e}")
        raise HTTPException(status_code=500, detail="Failed to process offline video")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Exercise Analysis API server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)