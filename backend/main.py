# main.py
from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Form
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
import threading
import time
from fastapi.staticfiles import StaticFiles
import os
import logging
import sys
import asyncio
from pathlib import Path

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

class AnalysisRequest(BaseModel):
    exercise: str
    userId: str
    userName: str
    coachId: Optional[str] = None
    coachName: Optional[str] = None

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

class SessionResult(BaseModel):
    exercise: str
    reps: int
    formScore: int
    durationSec: float
    timestamp: str
    athleteId: str
    athleteName: str
    coachId: Optional[str] = None
    coachName: Optional[str] = None

class VideoUpload(BaseModel):
    sessionId: str
    athleteId: str
    athleteName: str
    exercise: str
    coachId: Optional[str] = None
    coachName: Optional[str] = None

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

# Global state for exercise analysis
current_process = None
analysis_results = {}

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
        
        sessions[user_id]["sessions"].append(session_data)
        
        # Save back to file
        with open(sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Session saved for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving session: {e}")
        return False

def terminate_process_safely(process):
    """Safely terminate a subprocess"""
    if process and process.poll() is None:
        try:
            process.terminate()
            process.wait(timeout=5)
            logger.info("Process terminated gracefully")
        except subprocess.TimeoutExpired:
            logger.warning("Process didn't terminate gracefully, killing it")
            try:
                process.kill()
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                logger.error("Failed to kill process")

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
    Return list of sessions.
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

    # Flatten all sessions into a single list
    all_sessions = []
    # The data structure is { "athleteId": { "sessions": [...] } }
    for uid, user_data in (data.items() if isinstance(data, dict) else []):
        if isinstance(user_data, dict) and "sessions" in user_data:
            all_sessions.extend(user_data["sessions"])

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

# Exercise analysis endpoints
@app.post("/api/start-analysis")
async def start_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Start live exercise analysis"""
    global current_process
    
    try:
        # Validate exercise name
        exercise_internal = validate_exercise_name(request.exercise)
        
        # Stop any existing analysis
        terminate_process_safely(current_process)
        
        # Check if exercise counter script exists
        if not os.path.exists("exercise_counter.py"):
            raise HTTPException(status_code=500, detail="Exercise counter script not found")
        
        # Run exercise counter in background
        def run_exercise_counter():
            global current_process
            try:
                cmd = [
                    PYTHON_EXECUTABLE, "exercise_counter.py",
                    "--user-id", request.userId,
                    "--user-name", request.userName,
                    "--exercise", exercise_internal
                ]
                
                if request.coachId:
                    cmd.extend(["--coach-id", request.coachId])
                if request.coachName:
                    cmd.extend(["--coach-name", request.coachName])
                
                logger.info(f"Starting exercise analysis for user {request.userId} with command: {' '.join(cmd)}")
                
                current_process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Add timeout to prevent hanging
                try:
                    stdout, stderr = current_process.communicate(timeout=300)  # 5 minute timeout
                except subprocess.TimeoutExpired:
                    logger.error("Exercise counter timed out")
                    terminate_process_safely(current_process)
                    return
                
                if stderr:
                    logger.info(f"Analyzer stderr: {stderr.strip()}")
                
                if current_process.returncode == 0 and stdout.strip():
                    try:
                        result = json.loads(stdout.strip())
                        analysis_results[request.userId] = result
                        
                        # Convert to frontend format and save
                        session_data = {
                            "exercise": request.exercise,
                            "reps": result.get("reps", 0),
                            "formScore": result.get("formScore", 0),
                            "durationSec": result.get("durationSec", 0),
                            "timestamp": datetime.now().isoformat() + "Z",
                            "athleteId": request.userId,
                            "athleteName": request.userName,
                            "coachId": request.coachId,
                            "coachName": request.coachName
                        }
                        
                        save_session_result(session_data)
                        logger.info(f"Analysis completed for user {request.userId}")
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse exercise counter output: {stdout}, error: {e}")
                else:
                    logger.error(f"Exercise counter failed with return code {current_process.returncode}")
                    if stderr:
                        logger.error(f"Exercise counter stderr: {stderr}")
                    
            except Exception as e:
                logger.error(f"Error running exercise counter: {e}")
            finally:
                current_process = None
        
        background_tasks.add_task(run_exercise_counter)
        
        return {"status": "started", "message": "Exercise analysis started"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to start analysis")

@app.get("/api/analysis-status/{user_id}")
async def get_analysis_status(user_id: str):
    """Get analysis status for a user"""
    try:
        if user_id in analysis_results:
            return {"status": "completed", "result": analysis_results[user_id]}
        
        # Check if process is still running
        global current_process
        if current_process and current_process.poll() is None:
            return {"status": "processing", "message": "Analysis in progress"}
        
        return {"status": "idle", "message": "No analysis running"}
    except Exception as e:
        logger.error(f"Error getting analysis status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analysis status")

@app.post("/api/stop-analysis")
async def stop_analysis():
    """Stop current analysis"""
    global current_process
    
    try:
        if current_process and current_process.poll() is None:
            terminate_process_safely(current_process)
            current_process = None
            logger.info("Analysis stopped by user")
            return {"status": "stopped", "message": "Analysis stopped"}
        
        return {"status": "inactive", "message": "No active analysis"}
    except Exception as e:
        logger.error(f"Error stopping analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop analysis")

@app.get("/api/user-sessions/{user_id}")
async def get_user_sessions(user_id: str):
    """Get all sessions for a specific user"""
    try:
        sessions_file = "data/sessions/sessions.json"
        if os.path.exists(sessions_file):
            with open(sessions_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    sessions = json.loads(content)
                    user_sessions = sessions.get(user_id, {}).get("sessions", [])
                    # Sort by timestamp (newest first)
                    user_sessions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
                    return user_sessions
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in sessions file: {e}")
        raise HTTPException(status_code=500, detail="Corrupted session data")
    except Exception as e:
        logger.error(f"Error loading sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading sessions: {str(e)}")

@app.get("/api/sessions/{session_id}")
async def get_session_by_id(session_id: str):
    """Get a specific session by ID"""
    try:
        sessions_file = "data/sessions/sessions.json"
        if not os.path.exists(sessions_file):
            raise HTTPException(status_code=404, detail="Session not found")
        
        with open(sessions_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Search through all sessions to find the one with matching sessionId
        for user_id, user_data in data.items():
            if isinstance(user_data, dict) and "sessions" in user_data:
                for session in user_data["sessions"]:
                    if session.get("sessionId") == session_id:
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

        # Construct session data for frontend & storage
        session_data = {
            "exercise": exercise,  # Use original exercise name for frontend
            "reps": int(parsed.get("reps", 0)),
            "formScore": int(parsed.get("formScore", 0)),
            "durationSec": float(parsed.get("durationSec", 0.0)),
            "timestamp": datetime.now().isoformat() + "Z",
            "athleteId": athleteId,
            "athleteName": parsed.get("userName", athleteName),
            "coachId": None,
            "coachName": None,
            "sessionId": str(uuid.uuid4())[:8]
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
        
        # Create video filename
        video_filename = f"{session_id}_{session_info['exercise']}.mp4"
        video_path = os.path.join("videos", video_filename)
        
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
        videos_file = "data/videos.json"
        videos = read_json_file("videos.json") if os.path.exists(f"data/{videos_file}") else []
        videos.append(video_metadata.dict())
        write_json_file("videos.json", videos)
        
        logger.info(f"Video uploaded: {video_filename}")
        return {"status": "success", "videoId": video_metadata.videoId, "videoPath": video_path}
        
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

@app.get("/api/athlete-videos/{athlete_id}")
async def get_athlete_videos(athlete_id: str):
    """Get all videos for a specific athlete"""
    try:
        videos = read_json_file("videos.json")
        athlete_videos = [v for v in videos if v["athleteId"] == athlete_id]
        return athlete_videos
    except Exception as e:
        logger.error(f"Error loading athlete videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to load videos")

@app.get("/api/coach-videos/{coach_id}")
async def get_coach_videos(coach_id: str):
    """Get all videos for athletes under this coach"""
    try:
        videos = read_json_file("videos.json")
        coach_videos = [v for v in videos if v.get("coachId") == coach_id]
        return coach_videos
    except Exception as e:
        logger.error(f"Error loading coach videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to load videos")

# Test endpoint for API testing
@app.post("/api/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "message": "API is working!",
        "timestamp": datetime.now().isoformat(),
        "python_executable": PYTHON_EXECUTABLE,
        "exercise_counter_exists": os.path.exists("exercise_counter.py")
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Exercise Analysis API server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)