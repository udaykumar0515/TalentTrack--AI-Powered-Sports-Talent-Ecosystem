# main.py
from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
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
import hashlib
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
    directories = ["data", "data/sessions", "sessions"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize empty JSON files if they don't exist
    files = {
        "data/athletes.json": [],
        "data/coaches.json": [],
        "data/sessions/sessions.json": {},
        "sessions/sessions.json": {}
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

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed_password

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
        
        # Also save to the sessions directory used by exercise_counter.py
        counter_sessions_file = "sessions/sessions.json"
        try:
            with open(counter_sessions_file, "w", encoding="utf-8") as f:
                json.dump(sessions, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to update counter sessions file: {e}")
        
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
        
        # Create new user with hashed password
        new_user = {
            "id": str(uuid.uuid4()),
            "email": user_data.email,
            "password": hash_password(user_data.password),
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
        
        # Verify password
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