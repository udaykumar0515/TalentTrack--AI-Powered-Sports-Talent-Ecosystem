# main.py
from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Form, WebSocket, WebSocketDisconnect
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
import numpy as np
import cv2
import base64
from io import BytesIO

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

# Phase 1: Enhanced Data Models
class SessionMetadata(BaseModel):
    session_type: str = "practice"  # "practice", "assessment", "rehabilitation"
    difficulty_level: str = "intermediate"  # "beginner", "intermediate", "advanced"
    goals: List[str] = []  # ["strength", "endurance", "form_improvement"]
    notes: Optional[str] = None
    previous_injuries: List[str] = []
    current_pain_level: int = 0  # 0-10 scale

class AthleteProfile(BaseModel):
    age: Optional[int] = None
    height: Optional[float] = None  # cm
    weight: Optional[float] = None  # kg
    fitness_level: str = "intermediate"  # "beginner", "intermediate", "advanced"
    experience_years: int = 0
    dominant_side: str = "right"  # "left", "right", "ambidextrous"
    injury_history: List[Dict] = []
    performance_goals: List[str] = []

class EnvironmentalData(BaseModel):
    location: str = "indoor"  # "indoor", "outdoor", "gym"
    lighting_conditions: str = "good"  # "poor", "good", "excellent"
    surface_type: str = "hard"  # "hard", "soft", "uneven"
    temperature: Optional[float] = None
    humidity: Optional[float] = None

class DeviceInfo(BaseModel):
    device_type: str = "webcam"  # "webcam", "phone", "tablet", "camera"
    resolution: str = "1280x720"
    fps: int = 30
    camera_angle: str = "front"  # "front", "side", "back", "top"
    distance_from_subject: str = "medium"  # "close", "medium", "far"

class AnalysisConfig(BaseModel):
    exercise: str
    analysis_depth: str = "standard"  # "basic", "standard", "comprehensive"
    focus_areas: List[str] = []  # ["form", "speed", "symmetry", "injury_prevention"]
    comparison_mode: str = "self"  # "self", "peer", "professional"
    real_time_feedback: bool = True
    generate_3d_model: bool = False
    biomechanical_analysis: bool = True
    muscle_activation_analysis: bool = True
    joint_angle_analysis: bool = True
    balance_analysis: bool = True
    power_analysis: bool = False
    endurance_analysis: bool = False

class EnhancedAnalysisRequest(BaseModel):
    # Basic data
    exercise: str
    athleteId: str
    athleteName: str
    coachId: Optional[str] = None
    coachName: Optional[str] = None
    
    # Enhanced metadata
    session_metadata: Optional[SessionMetadata] = None
    athlete_profile: Optional[AthleteProfile] = None
    environmental_data: Optional[EnvironmentalData] = None
    device_info: Optional[DeviceInfo] = None
    analysis_config: Optional[AnalysisConfig] = None

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

# Phase 2: Comprehensive Analysis Results
class FormError(BaseModel):
    error_type: str
    severity: str  # "low", "medium", "high"
    description: str
    timestamp: float  # when in video it occurs
    correction_tips: List[str]
    related_joints: List[str]

class FormAnalysis(BaseModel):
    overall_form_score: float
    technique_breakdown: Dict[str, float]  # specific technique elements
    common_errors: List[FormError]
    improvement_areas: List[str]
    perfect_reps: int
    good_reps: int
    poor_reps: int

class RiskFactor(BaseModel):
    factor_name: str
    risk_level: str  # "low", "medium", "high"
    description: str
    affected_joints: List[str]
    mitigation_strategies: List[str]

class InjuryRiskAssessment(BaseModel):
    overall_risk_score: float  # 0-100
    risk_factors: List[RiskFactor]
    recommended_modifications: List[str]
    warning_signs: List[str]
    prevention_exercises: List[str]

class FatigueIndicator(BaseModel):
    metric_name: str
    value: float
    threshold: float
    is_fatigued: bool
    timestamp: float

class PerformanceMetrics(BaseModel):
    power_output: Optional[float] = None  # watts
    velocity_profile: List[float]
    acceleration_profile: List[float]
    work_done: Optional[float] = None  # joules
    efficiency_score: float
    fatigue_indicators: List[FatigueIndicator]

class BiomechanicalMetrics(BaseModel):
    joint_angles: Dict[str, List[float]]  # joint_name -> angles over time
    joint_velocities: Dict[str, List[float]]
    joint_accelerations: Dict[str, List[float]]
    center_of_mass: List[Dict[str, float]]  # x, y, z over time
    balance_metrics: Dict[str, float]
    symmetry_scores: Dict[str, float]  # left vs right symmetry
    range_of_motion: Dict[str, float]  # max ROM for each joint

class Recommendation(BaseModel):
    category: str  # "form", "safety", "performance", "recovery"
    priority: str  # "low", "medium", "high", "critical"
    title: str
    description: str
    specific_actions: List[str]
    expected_benefits: List[str]
    difficulty: str  # "easy", "moderate", "challenging"
    time_to_implement: str  # "immediate", "1-2 weeks", "1 month+"

class ComprehensiveAnalysisResult(BaseModel):
    # Basic results
    exercise: str
    reps: int
    formScore: int
    durationSec: float
    timestamp: str
    athleteId: str
    athleteName: str
    coachId: Optional[str] = None
    coachName: Optional[str] = None
    
    # Comprehensive analysis
    biomechanical_metrics: Optional[BiomechanicalMetrics] = None
    form_analysis: Optional[FormAnalysis] = None
    injury_risk_assessment: Optional[InjuryRiskAssessment] = None
    performance_metrics: Optional[PerformanceMetrics] = None
    recommendations: List[Recommendation] = []
    
    # Additional metadata
    session_metadata: Optional[SessionMetadata] = None
    analysis_config: Optional[AnalysisConfig] = None

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
    directories = ["data", "data/sessions", "sessions", "videos", "videos/athletes", "videos/coaches"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize empty JSON files if they don't exist
    files = {
        "data/athletes.json": [],
        "data/coaches.json": [],
        "data/sessions/sessions.json": {},
        "sessions/sessions.json": {},
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

# Phase 2: Helper functions for comprehensive analysis
def convert_to_comprehensive_result(parsed_data: Dict, session_meta: Optional[SessionMetadata], analysis_conf: Optional[AnalysisConfig]) -> ComprehensiveAnalysisResult:
    """Convert basic analysis result to comprehensive analysis result"""
    
    # Extract basic data
    # Calculate risk level based on form score
    form_score = parsed_data.get("formScore", 0)
    if form_score < 50:
        risk_level = "High"
    elif form_score < 70:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    basic_data = {
        "exercise": parsed_data.get("exercise", "unknown"),
        "reps": parsed_data.get("reps", 0),
        "formScore": form_score,
        "durationSec": parsed_data.get("durationSec", 0.0),
        "timestamp": parsed_data.get("timestamp", datetime.utcnow().isoformat() + "Z"),
        "athleteId": parsed_data.get("athleteId", "unknown"),
        "athleteName": parsed_data.get("athleteName", "Unknown"),
        "coachId": parsed_data.get("coachId"),
        "coachName": parsed_data.get("coachName"),
        "risk": risk_level
    }
    
    # Create comprehensive analysis components
    form_analysis = create_form_analysis(parsed_data)
    injury_risk = create_injury_risk_assessment(parsed_data)
    performance_metrics = create_performance_metrics(parsed_data)
    biomechanical_metrics = create_biomechanical_metrics(parsed_data)
    recommendations = create_recommendations(parsed_data, form_analysis, injury_risk)
    
    return ComprehensiveAnalysisResult(
        **basic_data,
        biomechanical_metrics=biomechanical_metrics,
        form_analysis=form_analysis,
        injury_risk_assessment=injury_risk,
        performance_metrics=performance_metrics,
        recommendations=recommendations,
        session_metadata=session_meta,
        analysis_config=analysis_conf
    )

def create_form_analysis(parsed_data: Dict) -> FormAnalysis:
    """Create form analysis from parsed data"""
    form_score = parsed_data.get("formScore", 0)
    reps = parsed_data.get("reps", 0)
    
    # Calculate rep quality distribution
    perfect_reps = int(reps * (form_score / 100) * 0.8)  # 80% of good reps are perfect
    good_reps = int(reps * (form_score / 100) * 0.2)     # 20% are just good
    poor_reps = reps - perfect_reps - good_reps
    
    # Create common errors based on form score
    common_errors = []
    if form_score < 70:
        common_errors.append(FormError(
            error_type="Poor Form",
            severity="high",
            description="Overall form needs significant improvement",
            timestamp=0.0,
            correction_tips=["Focus on proper technique", "Slow down the movement", "Practice with lighter intensity"],
            related_joints=["all"]
        ))
    
    return FormAnalysis(
        overall_form_score=form_score,
        technique_breakdown={"overall": form_score, "consistency": form_score * 0.9},
        common_errors=common_errors,
        improvement_areas=["form", "consistency"] if form_score < 80 else [],
        perfect_reps=perfect_reps,
        good_reps=good_reps,
        poor_reps=poor_reps
    )

def create_injury_risk_assessment(parsed_data: Dict) -> InjuryRiskAssessment:
    """Create injury risk assessment from parsed data"""
    form_score = parsed_data.get("formScore", 0)
    
    # Calculate risk based on form score
    if form_score < 50:
        risk_score = 80
        risk_level = "high"
    elif form_score < 70:
        risk_score = 50
        risk_level = "medium"
    else:
        risk_score = 20
        risk_level = "low"
    
    risk_factors = []
    if form_score < 70:
        risk_factors.append(RiskFactor(
            factor_name="Poor Form",
            risk_level=risk_level,
            description="Incorrect technique increases injury risk",
            affected_joints=["knees", "lower_back"],
            mitigation_strategies=["Focus on proper form", "Reduce intensity", "Seek professional guidance"]
        ))
    
    return InjuryRiskAssessment(
        overall_risk_score=risk_score,
        risk_factors=risk_factors,
        recommended_modifications=["Focus on form over speed", "Use lighter weights"] if form_score < 70 else [],
        warning_signs=["Pain during exercise", "Compensatory movements"] if form_score < 70 else [],
        prevention_exercises=["Core strengthening", "Mobility work"] if form_score < 70 else []
    )

def create_performance_metrics(parsed_data: Dict) -> PerformanceMetrics:
    """Create performance metrics from parsed data"""
    reps = parsed_data.get("reps", 0)
    duration = parsed_data.get("durationSec", 0)
    
    # Calculate basic performance metrics
    velocity_profile = [1.0] * reps  # Simplified
    acceleration_profile = [0.5] * reps  # Simplified
    efficiency_score = min(100, (reps / max(duration, 1)) * 10)  # Reps per second * 10
    
    return PerformanceMetrics(
        power_output=None,  # Would need more complex calculation
        velocity_profile=velocity_profile,
        acceleration_profile=acceleration_profile,
        work_done=None,  # Would need more complex calculation
        efficiency_score=efficiency_score,
        fatigue_indicators=[]
    )

def create_biomechanical_metrics(parsed_data: Dict) -> BiomechanicalMetrics:
    """Create biomechanical metrics from parsed data"""
    # Simplified biomechanical data
    return BiomechanicalMetrics(
        joint_angles={"knee": [90, 120, 90], "hip": [180, 150, 180]},
        joint_velocities={"knee": [0.5, 1.0, 0.5], "hip": [0.3, 0.8, 0.3]},
        joint_accelerations={"knee": [0.1, 0.2, 0.1], "hip": [0.05, 0.15, 0.05]},
        center_of_mass=[{"x": 0.5, "y": 0.7, "z": 0.0}],
        balance_metrics={"stability": 0.8, "symmetry": 0.9},
        symmetry_scores={"left_right": 0.85, "front_back": 0.9},
        range_of_motion={"knee": 120, "hip": 90}
    )

def create_recommendations(parsed_data: Dict, form_analysis: FormAnalysis, injury_risk: InjuryRiskAssessment) -> List[Recommendation]:
    """Create recommendations based on analysis"""
    recommendations = []
    form_score = parsed_data.get("formScore", 0)
    
    if form_score < 70:
        recommendations.append(Recommendation(
            category="form",
            priority="high",
            title="Improve Exercise Form",
            description="Focus on proper technique to improve form score",
            specific_actions=["Slow down the movement", "Focus on control", "Practice with lighter intensity"],
            expected_benefits=["Reduced injury risk", "Better muscle activation", "Improved results"],
            difficulty="moderate",
            time_to_implement="1-2 weeks"
        ))
    
    if injury_risk.overall_risk_score > 50:
        recommendations.append(Recommendation(
            category="safety",
            priority="critical",
            title="Reduce Injury Risk",
            description="Current form poses injury risk",
            specific_actions=["Stop if you feel pain", "Use proper form", "Consider professional guidance"],
            expected_benefits=["Prevent injuries", "Long-term health", "Sustainable training"],
            difficulty="easy",
            time_to_implement="immediate"
        ))
    
    return recommendations

def save_comprehensive_session(comprehensive_result: ComprehensiveAnalysisResult) -> bool:
    """Save comprehensive session data"""
    try:
        # Convert to dict for JSON serialization
        session_data = comprehensive_result.dict()
        
        # Save to comprehensive sessions file
        comprehensive_sessions_file = "data/comprehensive_sessions.json"
        os.makedirs(os.path.dirname(comprehensive_sessions_file), exist_ok=True)
        
        # Load existing sessions
        if os.path.exists(comprehensive_sessions_file):
            with open(comprehensive_sessions_file, "r", encoding="utf-8") as f:
                sessions = json.load(f)
        else:
            sessions = {}
        
        # Add session
        session_id = session_data.get("athleteId", "unknown")
        if session_id not in sessions:
            sessions[session_id] = {"sessions": []}
        
        sessions[session_id]["sessions"].append(session_data)
        
        # Save back
        with open(comprehensive_sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        logger.error(f"Error saving comprehensive session: {e}")
        return False

# Phase 3: WebSocket support for real-time analysis
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws/live-analysis/{athlete_id}")
async def live_analysis_websocket(websocket: WebSocket, athlete_id: str):
    """Real-time video analysis via WebSocket"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive video frame data
            data = await websocket.receive_text()
            
            # Parse frame data (base64 encoded image)
            try:
                frame_data = json.loads(data)
                frame_base64 = frame_data.get("frame")
                
                if frame_base64:
                    # Decode base64 image
                    frame_bytes = base64.b64decode(frame_base64)
                    nparr = np.frombuffer(frame_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
                    # Perform real-time analysis (simplified)
                    analysis_result = perform_realtime_analysis(frame, athlete_id)
                    
                    # Send analysis result back
                    await manager.send_personal_message(
                        json.dumps(analysis_result), 
                        websocket
                    )
                    
            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await manager.send_personal_message(
                    json.dumps({"error": str(e)}), 
                    websocket
                )
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def perform_realtime_analysis(frame, athlete_id: str) -> Dict:
    """Perform real-time analysis on video frame"""
    # Simplified real-time analysis
    # In a real implementation, this would use MediaPipe or similar
    return {
        "timestamp": datetime.now().isoformat(),
        "athlete_id": athlete_id,
        "form_score": 85,  # Placeholder
        "joint_angles": {"knee": 90, "hip": 180},
        "recommendations": ["Keep your back straight", "Bend your knees more"]
    }

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
                        # Calculate risk level based on form score
                        form_score = result.get("formScore", 0)
                        if form_score < 50:
                            risk_level = "High"
                        elif form_score < 70:
                            risk_level = "Medium"
                        else:
                            risk_level = "Low"

                        session_data = {
                            "exercise": request.exercise,
                            "reps": result.get("reps", 0),
                            "formScore": form_score,
                            "durationSec": result.get("durationSec", 0),
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "athleteId": request.userId,
                            "athleteName": request.userName,
                            "coachId": request.coachId,
                            "coachName": request.coachName,
                            "risk": risk_level
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

# Phase 1: Enhanced Analysis Endpoint
@app.post("/api/analyze/enhanced")
async def analyze_video_enhanced(
    file: UploadFile = File(...),
    exercise: str = Form(...),
    athleteId: str = Form(...),
    athleteName: str = Form(default="Athlete"),
    session_metadata: Optional[str] = Form(default=None),
    athlete_profile: Optional[str] = Form(default=None),
    environmental_data: Optional[str] = Form(default=None),
    device_info: Optional[str] = Form(default=None),
    analysis_config: Optional[str] = Form(default=None)
):
    """Enhanced video analysis with comprehensive metadata and results"""
    temp_file_path = None
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="File must be a video")
        
        # Validate exercise name
        exercise_internal = validate_exercise_name(exercise)
        
        # Parse enhanced metadata
        session_meta = None
        athlete_prof = None
        env_data = None
        device_inf = None
        analysis_conf = None
        
        if session_metadata:
            session_meta = SessionMetadata.parse_raw(session_metadata)
        if athlete_profile:
            athlete_prof = AthleteProfile.parse_raw(athlete_profile)
        if environmental_data:
            env_data = EnvironmentalData.parse_raw(environmental_data)
        if device_info:
            device_inf = DeviceInfo.parse_raw(device_info)
        if analysis_config:
            analysis_conf = AnalysisConfig.parse_raw(analysis_config)
        
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

        logger.info(f"Enhanced analysis for athlete {athleteId} with metadata")

        # Build enhanced command with metadata
        cmd = [
            PYTHON_EXECUTABLE, "exercise_counter.py",
            "--user-id", athleteId,
            "--user-name", athleteName,
            "--exercise", exercise_internal,
            "--video-file", temp_file_path,
            "--enhanced-analysis", "true"
        ]

        # Add metadata to command if available
        if session_meta:
            cmd.extend(["--session-metadata", session_metadata])
        if athlete_prof:
            cmd.extend(["--athlete-profile", athlete_profile])
        if env_data:
            cmd.extend(["--environmental-data", environmental_data])
        if device_inf:
            cmd.extend(["--device-info", device_info])
        if analysis_conf:
            cmd.extend(["--analysis-config", analysis_config])

        logger.info(f"Running enhanced command: {' '.join(cmd)}")

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
            logger.info(f"Enhanced analyzer stderr: {stderr.strip()}")

        # Check return code
        if process.returncode != 0:
            error_msg = stderr.strip() if stderr else "Unknown error"
            logger.error(f"Enhanced analyzer failed (code {process.returncode}): {error_msg}")
            raise HTTPException(status_code=500, detail=f"Enhanced analysis failed: {error_msg}")

        # Parse comprehensive JSON result
        try:
            stdout_clean = stdout.strip()
            if not stdout_clean:
                raise ValueError("Empty output from enhanced analyzer")
            
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
                    raise ValueError("No valid JSON found in enhanced output")

        except Exception as e:
            logger.error(f"Failed to parse JSON from enhanced analyzer output: {e}")
            logger.error(f"Raw stdout: {repr(stdout)}")
            raise HTTPException(status_code=500, detail="Failed to parse enhanced analysis result")

        # Convert to comprehensive analysis result
        comprehensive_result = convert_to_comprehensive_result(parsed, session_meta, analysis_conf)
        
        # Save comprehensive session
        session_saved = save_comprehensive_session(comprehensive_result)
        if not session_saved:
            logger.warning("Failed to save comprehensive session data")

        logger.info(f"Enhanced analysis completed for athlete {athleteId}")
        return comprehensive_result

    except Exception as e:
        logger.error(f"Enhanced analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Enhanced analysis failed: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_file_path}: {e}")

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
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "athleteId": athleteId,
            "athleteName": parsed.get("userName", athleteName),
            "risk": "High" if int(parsed.get("formScore", 0)) < 50 else "Medium" if int(parsed.get("formScore", 0)) < 70 else "Low",
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
# Phase 2: Professional Reporting Endpoints
@app.get("/api/reports/athlete/{athlete_id}")
async def generate_athlete_report(
    athlete_id: str,
    report_type: str = "comprehensive",
    time_period: str = "30d"
):
    """Generate professional athlete performance report"""
    try:
        # Load comprehensive sessions
        comprehensive_sessions_file = "data/comprehensive_sessions.json"
        if not os.path.exists(comprehensive_sessions_file):
            raise HTTPException(status_code=404, detail="No comprehensive session data found")
        
        with open(comprehensive_sessions_file, "r", encoding="utf-8") as f:
            sessions_data = json.load(f)
        
        athlete_sessions = sessions_data.get(athlete_id, {}).get("sessions", [])
        
        if not athlete_sessions:
            raise HTTPException(status_code=404, detail="No sessions found for athlete")
        
        # Filter by time period
        filtered_sessions = filter_sessions_by_period(athlete_sessions, time_period)
        
        # Generate report based on type
        if report_type == "summary":
            report = generate_summary_report(filtered_sessions)
        elif report_type == "detailed":
            report = generate_detailed_report(filtered_sessions)
        else:  # comprehensive
            report = generate_comprehensive_report(filtered_sessions)
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating athlete report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@app.get("/api/reports/coach/{coach_id}")
async def generate_coach_dashboard(coach_id: str, time_period: str = "30d"):
    """Generate coach dashboard with all athletes"""
    try:
        # Load all sessions for this coach
        sessions = read_json_file("sessions.json")
        coach_sessions = []
        
        for athlete_id, athlete_data in sessions.items():
            for session in athlete_data.get("sessions", []):
                if session.get("coachId") == coach_id:
                    coach_sessions.append(session)
        
        # Filter by time period
        filtered_sessions = filter_sessions_by_period(coach_sessions, time_period)
        
        # Group by athlete
        athlete_groups = {}
        for session in filtered_sessions:
            athlete_id = session.get("athleteId")
            if athlete_id not in athlete_groups:
                athlete_groups[athlete_id] = []
            athlete_groups[athlete_id].append(session)
        
        # Generate dashboard data
        dashboard = {
            "coach_id": coach_id,
            "time_period": time_period,
            "total_sessions": len(filtered_sessions),
            "athletes": []
        }
        
        for athlete_id, athlete_sessions in athlete_groups.items():
            athlete_summary = generate_athlete_summary(athlete_id, athlete_sessions)
            dashboard["athletes"].append(athlete_summary)
        
        return dashboard
        
    except Exception as e:
        logger.error(f"Error generating coach dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate dashboard: {str(e)}")

@app.get("/api/analysis/compare/{athlete_id}")
async def compare_sessions(
    athlete_id: str,
    exercise: str,
    time_period: str = "30d"
):
    """Compare athlete's performance over time"""
    try:
        # Load sessions
        sessions = read_json_file("sessions.json")
        athlete_sessions = sessions.get(athlete_id, {}).get("sessions", [])
        
        # Filter by exercise and time period
        filtered_sessions = [
            s for s in athlete_sessions 
            if s.get("exercise") == exercise
        ]
        filtered_sessions = filter_sessions_by_period(filtered_sessions, time_period)
        
        if not filtered_sessions:
            raise HTTPException(status_code=404, detail="No sessions found for comparison")
        
        # Sort by timestamp
        filtered_sessions.sort(key=lambda x: x.get("timestamp", ""))
        
        # Generate comparison data
        comparison = {
            "athlete_id": athlete_id,
            "exercise": exercise,
            "time_period": time_period,
            "total_sessions": len(filtered_sessions),
            "performance_trend": generate_performance_trend(filtered_sessions),
            "improvement_areas": identify_improvement_areas(filtered_sessions),
            "recommendations": generate_comparison_recommendations(filtered_sessions)
        }
        
        return comparison
        
    except Exception as e:
        logger.error(f"Error comparing sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compare sessions: {str(e)}")

@app.get("/api/analysis/benchmarks/{exercise}")
async def get_exercise_benchmarks(exercise: str):
    """Get performance benchmarks for exercise"""
    try:
        # Load all sessions
        sessions = read_json_file("sessions.json")
        all_sessions = []
        
        for athlete_id, athlete_data in sessions.items():
            for session in athlete_data.get("sessions", []):
                if session.get("exercise") == exercise:
                    all_sessions.append(session)
        
        if not all_sessions:
            raise HTTPException(status_code=404, detail="No sessions found for exercise")
        
        # Calculate benchmarks
        form_scores = [s.get("formScore", 0) for s in all_sessions]
        reps = [s.get("reps", 0) for s in all_sessions]
        durations = [s.get("durationSec", 0) for s in all_sessions]
        
        benchmarks = {
            "exercise": exercise,
            "total_sessions": len(all_sessions),
            "form_score": {
                "average": sum(form_scores) / len(form_scores),
                "min": min(form_scores),
                "max": max(form_scores),
                "percentiles": {
                    "25th": sorted(form_scores)[len(form_scores)//4],
                    "50th": sorted(form_scores)[len(form_scores)//2],
                    "75th": sorted(form_scores)[3*len(form_scores)//4]
                }
            },
            "reps": {
                "average": sum(reps) / len(reps),
                "min": min(reps),
                "max": max(reps)
            },
            "duration": {
                "average": sum(durations) / len(durations),
                "min": min(durations),
                "max": max(durations)
            }
        }
        
        return benchmarks
        
    except Exception as e:
        logger.error(f"Error getting benchmarks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get benchmarks: {str(e)}")

# Helper functions for reporting
def filter_sessions_by_period(sessions: List[Dict], time_period: str) -> List[Dict]:
    """Filter sessions by time period"""
    from datetime import datetime, timedelta
    
    now = datetime.now()
    if time_period == "7d":
        cutoff = now - timedelta(days=7)
    elif time_period == "30d":
        cutoff = now - timedelta(days=30)
    elif time_period == "90d":
        cutoff = now - timedelta(days=90)
    elif time_period == "1y":
        cutoff = now - timedelta(days=365)
    else:
        return sessions
    
    filtered = []
    for session in sessions:
        try:
            session_time = datetime.fromisoformat(session.get("timestamp", "").replace("Z", "+00:00"))
            if session_time >= cutoff:
                filtered.append(session)
        except:
            continue
    
    return filtered

def generate_summary_report(sessions: List[Dict]) -> Dict:
    """Generate summary report"""
    if not sessions:
        return {"error": "No sessions found"}
    
    form_scores = [s.get("formScore", 0) for s in sessions]
    reps = [s.get("reps", 0) for s in sessions]
    
    return {
        "report_type": "summary",
        "total_sessions": len(sessions),
        "average_form_score": sum(form_scores) / len(form_scores),
        "total_reps": sum(reps),
        "improvement_trend": "positive" if len(sessions) > 1 and form_scores[-1] > form_scores[0] else "stable"
    }

def generate_detailed_report(sessions: List[Dict]) -> Dict:
    """Generate detailed report"""
    summary = generate_summary_report(sessions)
    summary["report_type"] = "detailed"
    summary["sessions"] = sessions
    return summary

def generate_comprehensive_report(sessions: List[Dict]) -> Dict:
    """Generate comprehensive report"""
    detailed = generate_detailed_report(sessions)
    detailed["report_type"] = "comprehensive"
    detailed["analysis"] = {
        "strengths": ["Consistent form", "Good endurance"],
        "weaknesses": ["Speed variation", "Balance"],
        "recommendations": ["Focus on consistency", "Add balance training"]
    }
    return detailed

def generate_athlete_summary(athlete_id: str, sessions: List[Dict]) -> Dict:
    """Generate athlete summary for coach dashboard"""
    if not sessions:
        return {"athlete_id": athlete_id, "sessions": 0}
    
    form_scores = [s.get("formScore", 0) for s in sessions]
    latest_session = max(sessions, key=lambda x: x.get("timestamp", ""))
    
    return {
        "athlete_id": athlete_id,
        "athlete_name": latest_session.get("athleteName", "Unknown"),
        "total_sessions": len(sessions),
        "average_form_score": sum(form_scores) / len(form_scores),
        "latest_session": latest_session.get("timestamp"),
        "improvement_trend": "positive" if len(sessions) > 1 and form_scores[-1] > form_scores[0] else "stable"
    }

def generate_performance_trend(sessions: List[Dict]) -> Dict:
    """Generate performance trend analysis"""
    form_scores = [s.get("formScore", 0) for s in sessions]
    reps = [s.get("reps", 0) for s in sessions]
    
    return {
        "form_score_trend": form_scores,
        "reps_trend": reps,
        "overall_trend": "improving" if len(form_scores) > 1 and form_scores[-1] > form_scores[0] else "stable"
    }

def identify_improvement_areas(sessions: List[Dict]) -> List[str]:
    """Identify areas for improvement"""
    areas = []
    form_scores = [s.get("formScore", 0) for s in sessions]
    
    if len(form_scores) > 0 and sum(form_scores) / len(form_scores) < 70:
        areas.append("Form consistency")
    
    if len(sessions) > 1:
        latest_reps = sessions[-1].get("reps", 0)
        earlier_reps = sessions[0].get("reps", 0)
        if latest_reps < earlier_reps:
            areas.append("Endurance")
    
    return areas

def generate_comparison_recommendations(sessions: List[Dict]) -> List[str]:
    """Generate recommendations based on comparison"""
    recommendations = []
    form_scores = [s.get("formScore", 0) for s in sessions]
    
    if len(form_scores) > 0 and sum(form_scores) / len(form_scores) < 70:
        recommendations.append("Focus on form improvement")
    
    if len(sessions) > 1 and form_scores[-1] < form_scores[0]:
        recommendations.append("Consider reducing intensity")
    
    return recommendations

@app.get("/api/test")
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