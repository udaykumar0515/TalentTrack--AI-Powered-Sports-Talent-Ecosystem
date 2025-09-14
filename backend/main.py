# main.py
from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid
from datetime import datetime
import subprocess
import threading
import time
from fastapi.staticfiles import StaticFiles
import os, uuid, shutil, asyncio, logging
from exercise_counter import analyze_video_file


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

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React app address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for exercise analysis
current_process = None
analysis_results = {}

# Helper functions
def read_json_file(filename: str):
    try:
        with open(f"data/{filename}", "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []

def write_json_file(filename: str, data: list):
    with open(f"data/{filename}", "w") as file:
        json.dump(data, file, indent=2)

def save_session_result(session_data: Dict[str, Any]):
    """Save session result to JSON file"""
    try:
        # Create sessions directory if it doesn't exist
        os.makedirs("data/sessions", exist_ok=True)
        
        # Load existing sessions or create new list
        sessions_file = "data/sessions/sessions.json"
        if os.path.exists(sessions_file):
            with open(sessions_file, "r") as f:
                sessions = json.load(f)
        else:
            sessions = {}
        
        # Add session to user's session list
        user_id = session_data["athleteId"]
        if user_id not in sessions:
            sessions[user_id] = {"sessions": []}
        
        sessions[user_id]["sessions"].append(session_data)
        
        # Save back to file
        with open(sessions_file, "w") as f:
            json.dump(sessions, f, indent=2)
            
        return True
    except Exception as e:
        print(f"Error saving session: {e}")
        return False

@app.get("/api/coaches", response_model=List[User])
async def get_coaches():
    coaches = read_json_file("coaches.json")
    # Return coaches without passwords
    return [{k: v for k, v in coach.items() if k != "password"} for coach in coaches]

# Authentication endpoints
@app.post("/api/register", response_model=User)
async def register(user_data: UserCreate):
    # Determine which file to use based on role
    filename = "coaches.json" if user_data.role == "coach" else "athletes.json"
    users = read_json_file(filename)
    
    # Check if user already exists
    if any(user["email"] == user_data.email for user in users):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": user_data.password,  # Store password as plain text
        "username": user_data.username,
        "role": user_data.role,
        "created_at": datetime.now().isoformat()
    }
    
    users.append(new_user)
    write_json_file(filename, users)
    
    # Return user without password
    return {k: v for k, v in new_user.items() if k != "password"}

@app.post("/api/login", response_model=User)
async def login(login_data: UserLogin):
    # Check both athletes and coaches
    athletes = read_json_file("athletes.json")
    coaches = read_json_file("coaches.json")
    all_users = athletes + coaches
    
    # Find user by email
    user = next((u for u in all_users if u["email"] == login_data.email), None)
    if not user or user["password"] != login_data.password:  # Direct password comparison
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check role if specified
    if login_data.role and user["role"] != login_data.role:
        raise HTTPException(status_code=403, detail=f"User is not a {login_data.role}")
    
    # Return user without password
    return {k: v for k, v in user.items() if k != "password"}

# Exercise analysis endpoints
@app.post("/api/start-analysis")
async def start_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    global current_process
    
    # Stop any existing analysis
    if current_process and current_process.poll() is None:
        current_process.terminate()
        try:
            current_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            current_process.kill()
    
    # Prepare command for exercise counter
    exercise_mapping = {
        "squat": "squat",
        "pushup": "pushups", 
        "jumping_jack": "jumping_jacks"
    }
    
    python_exercise = exercise_mapping.get(request.exercise, request.exercise)
    
    # Run exercise counter in background
    def run_exercise_counter():
        global current_process
        try:
            cmd = [
                "python", "exercise_counter.py",
                "--user-id", request.userId,
                "--user-name", request.userName,
                "--exercise", python_exercise
            ]
            
            if request.coachId:
                cmd.extend(["--coach-id", request.coachId])
            if request.coachName:
                cmd.extend(["--coach-name", request.coachName])
            
            current_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = current_process.communicate()
            
            if current_process.returncode == 0 and stdout:
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
                    
                except json.JSONDecodeError:
                    print(f"Failed to parse exercise counter output: {stdout}")
            
            if stderr:
                print(f"Exercise counter error: {stderr}")
                
        except Exception as e:
            print(f"Error running exercise counter: {e}")
        finally:
            current_process = None
    
    background_tasks.add_task(run_exercise_counter)
    
    return {"status": "started", "message": "Exercise analysis started"}

@app.get("/api/analysis-status/{user_id}")
async def get_analysis_status(user_id: str):
    if user_id in analysis_results:
        return {"status": "completed", "result": analysis_results[user_id]}
    return {"status": "processing", "message": "Analysis in progress"}

@app.post("/api/stop-analysis")
async def stop_analysis():
    global current_process
    
    if current_process and current_process.poll() is None:
        current_process.terminate()
        try:
            current_process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            current_process.kill()
        current_process = None
        return {"status": "stopped", "message": "Analysis stopped"}
    
    return {"status": "inactive", "message": "No active analysis"}

@app.get("/api/user-sessions/{user_id}")
async def get_user_sessions(user_id: str):
    """Get all sessions for a specific user"""
    try:
        sessions_file = "data/sessions/sessions.json"
        if os.path.exists(sessions_file):
            with open(sessions_file, "r") as f:
                sessions = json.load(f)
                user_sessions = sessions.get(user_id, {}).get("sessions", [])
                return user_sessions
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading sessions: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)