# 🔧 Technical Documentation
## TalentTrack - AI-Powered Sports Talent Ecosystem

> **Deep Dive into the Technical Architecture and Implementation**

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [AI/ML Pipeline](#aiml-pipeline)
5. [Data Flow](#data-flow)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Performance Optimizations](#performance-optimizations)
9. [Security Implementation](#security-implementation)
10. [Deployment Guide](#deployment-guide)

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI/ML         │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (MediaPipe)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • Pose Detection│
│ • Video Recorder│    │ • Auth System   │    │ • Form Analysis │
│ • Chat System   │    │ • File Storage  │    │ • Risk Assessment│
│ • Analytics     │    │ • Data Mgmt     │    │ • Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   File System   │    │   Video Files   │
│   Storage       │    │   (JSON)        │    │   (MP4)         │
│                 │    │                 │    │                 │
│ • LocalStorage  │    │ • Users Data    │    │ • Session Videos│
│ • Session Data  │    │ • Sessions      │    │ • Thumbnails    │
│ • Cache         │    │ • Messages      │    │ • Analysis Data │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Interaction Flow

```
User Action → Frontend → Backend API → AI Processing → Data Storage → Response
     │           │           │             │              │           │
     │           │           │             │              │           │
     ▼           ▼           ▼             ▼              ▼           ▼
1. Record Video → React → FastAPI → MediaPipe → JSON/File → UI Update
2. View Sessions → React → FastAPI → Database → JSON Data → Display
3. Send Message → React → FastAPI → Message Store → Success → Chat Update
```

---

## 🎨 Frontend Implementation

### Technology Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management

### Key Components

#### 1. AthleteDashboard.tsx
```typescript
// Core functionality
- Video recording and upload
- Session management
- Progress tracking
- Coach communication
- Real-time analysis display
```

#### 2. CoachDashboard.tsx
```typescript
// Coach-specific features
- Athlete management
- Session analytics
- Communication hub
- Performance insights
- Feedback system
```

#### 3. VideoRecorder.tsx
```typescript
// Video capture functionality
- Camera access
- Recording controls
- File upload
- Progress tracking
- Error handling
```

#### 4. ChatSidebar.tsx
```typescript
// Communication system
- Message display
- Session tagging
- Real-time updates
- File sharing
- Notification system
```

### State Management

```typescript
// Context-based state management
interface AuthContext {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface CoachContext {
  athletes: Athlete[];
  sessions: Session[];
  messages: Message[];
  loadData: () => Promise<void>;
}
```

### Routing Structure

```typescript
// React Router configuration
const routes = [
  { path: '/', component: LandingPage },
  { path: '/login', component: UnifiedLogin },
  { path: '/athlete', component: AthleteDashboard },
  { path: '/coach', component: CoachDashboard },
  { path: '/session/:id', component: SessionView }
];
```

---

## ⚙️ Backend Implementation

### Technology Stack
- **FastAPI** (Python 3.8+)
- **Uvicorn** ASGI server
- **Pydantic** for data validation
- **JSON** for data storage
- **File system** for video storage

### Core Modules

#### 1. main.py - FastAPI Application
```python
# Key endpoints
@app.post("/api/upload-video")     # Video upload and analysis
@app.get("/api/sessions")          # Session retrieval
@app.post("/api/sessions")         # Session creation
@app.get("/api/athletes")          # Athlete management
@app.get("/api/coaches")           # Coach management
@app.post("/api/messages")         # Message handling
```

#### 2. exercise_counter.py - AI Analysis
```python
# AI processing pipeline
def analyze_video(video_path: str) -> dict:
    # 1. Video preprocessing
    # 2. Frame extraction
    # 3. Pose detection
    # 4. Form analysis
    # 5. Risk assessment
    # 6. Results compilation
```

### Data Models

```python
# Pydantic models
class User(BaseModel):
    id: str
    email: str
    username: str
    role: str
    created_at: str

class Session(BaseModel):
    sessionId: str
    athleteId: str
    exercise: str
    reps: int
    formScore: int
    durationSec: float
    timestamp: str
    coachId: str
    coachName: str

class CoachMessage(BaseModel):
    id: str
    coachId: str
    athleteId: str
    sessionId: str
    message: str
    timestamp: str
    read: bool
```

---

## 🤖 AI/ML Pipeline

### MediaPipe Integration

```python
# Pose detection setup
import mediapipe as mp

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

def detect_pose(frame):
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5
    ) as pose:
        results = pose.process(frame)
        return results
```

### Analysis Pipeline

#### 1. Video Preprocessing
```python
def preprocess_video(video_path: str):
    # Frame extraction
    # Resolution optimization
    # Frame sampling (every 2nd frame)
    # Quality enhancement
```

#### 2. Pose Detection
```python
def analyze_pose(landmarks):
    # Key point extraction
    # Joint angle calculation
    # Movement pattern analysis
    # Form assessment
```

#### 3. Exercise-Specific Analysis
```python
def analyze_squat(landmarks):
    # Hip angle analysis
    # Knee tracking
    # Depth assessment
    # Form scoring

def analyze_pushup(landmarks):
    # Arm angle tracking
    # Body alignment
    # Range of motion
    # Rep counting
```

#### 4. Risk Assessment
```python
def assess_injury_risk(landmarks, exercise_type):
    # Joint stress analysis
    # Movement pattern evaluation
    # Risk level calculation
    # Recommendation generation
```

### Performance Optimizations

```python
# Frame sampling for speed
FRAME_SKIP = 2  # Process every 2nd frame

# Resolution reduction
TARGET_WIDTH = 720  # Reduce to 720p

# Processing optimization
def optimized_analysis(video_path):
    for frame in video_frames:
        if frame_counter % FRAME_SKIP != 0:
            continue
        # Process frame
        frame = cv2.resize(frame, (new_w, new_h))
        # Analysis...
```

---

## 📊 Data Flow

### 1. Video Recording Flow

```
User starts recording
    ↓
Camera access granted
    ↓
Video captured (MP4)
    ↓
Upload to backend
    ↓
AI analysis triggered
    ↓
Results stored in JSON
    ↓
UI updated with results
```

### 2. Session Analysis Flow

```
Video uploaded
    ↓
Frame extraction
    ↓
Pose detection (MediaPipe)
    ↓
Exercise-specific analysis
    ↓
Form scoring
    ↓
Risk assessment
    ↓
Results compilation
    ↓
Database storage
    ↓
Frontend notification
```

### 3. Coach-Athlete Communication Flow

```
Message sent
    ↓
Backend validation
    ↓
Message stored
    ↓
Recipient notification
    ↓
Real-time update
    ↓
UI refresh
```

---

## 🔌 API Documentation

### Authentication Endpoints

```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "username",
  "role": "athlete"
}
```

```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "athlete"
}
```

### Session Management

```http
GET /api/sessions?athleteId=athlete_1&coachId=coach_1
Authorization: Bearer <token>

Response:
{
  "sessions": [
    {
      "sessionId": "sess_001",
      "athleteId": "athlete_1",
      "exercise": "squat",
      "reps": 15,
      "formScore": 85,
      "durationSec": 45.2,
      "timestamp": "2025-01-19T10:30:00Z"
    }
  ]
}
```

### Video Upload and Analysis

```http
POST /api/upload-video
Content-Type: multipart/form-data

FormData:
- file: video.mp4
- athleteId: athlete_1
- exercise: squat

Response:
{
  "sessionId": "sess_001",
  "analysis": {
    "reps": 15,
    "formScore": 85,
    "durationSec": 45.2,
    "risk": "Low"
  },
  "videoUrl": "/api/videos/sess_001"
}
```

### Message System

```http
POST /api/messages
Content-Type: application/json

{
  "coachId": "coach_1",
  "athleteId": "athlete_1",
  "sessionId": "sess_001",
  "message": "Great work on your form!",
  "type": "feedback"
}
```

---

## 🗄️ Database Schema

### JSON File Structure

#### athletes.json
```json
[
  {
    "id": "athlete_1",
    "email": "uday@example.com",
    "username": "uday",
    "role": "athlete",
    "coachId": "coach_1",
    "coachName": "coach_mike",
    "created_at": "2025-01-19T10:00:00Z"
  }
]
```

#### sessions.json
```json
{
  "athlete_1": {
    "sessions": [
      {
        "sessionId": "sess_001",
        "athleteId": "athlete_1",
        "exercise": "squat",
        "reps": 15,
        "formScore": 85,
        "durationSec": 45.2,
        "timestamp": "2025-01-19T10:30:00Z",
        "coachId": "coach_1",
        "coachName": "coach_mike",
        "metrics": {
          "reps": 15,
          "avgRepTimeSec": 3.0,
          "formScore": 85,
          "symmetryScore": 88,
          "waistAngleDeg": 45
        }
      }
    ]
  }
}
```

#### coach_messages.json
```json
[
  {
    "id": "msg_001",
    "coachId": "coach_1",
    "athleteId": "athlete_1",
    "sessionId": "sess_001",
    "message": "Great work on your form!",
    "type": "feedback",
    "timestamp": "2025-01-19T10:45:00Z",
    "read": false
  }
]
```

---

## ⚡ Performance Optimizations

### Frontend Optimizations

```typescript
// React.memo for component optimization
const SessionCard = React.memo(({ session }) => {
  // Component implementation
});

// useCallback for function memoization
const handleSessionClick = useCallback((sessionId: string) => {
  // Handler implementation
}, [sessions]);

// Lazy loading for large components
const DetailedAnalysisModal = lazy(() => import('./DetailedAnalysisModal'));
```

### Backend Optimizations

```python
# Async processing for video analysis
async def analyze_video_async(video_path: str):
    # Non-blocking video processing
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, process_video, video_path)
    return result

# Caching for frequently accessed data
from functools import lru_cache

@lru_cache(maxsize=128)
def get_athlete_data(athlete_id: str):
    # Cached athlete data retrieval
    pass
```

### AI/ML Optimizations

```python
# Frame sampling for speed
FRAME_SKIP = 2  # Process every 2nd frame

# Resolution reduction
TARGET_WIDTH = 720  # Reduce to 720p

# Batch processing
def process_frames_batch(frames):
    # Process multiple frames together
    pass
```

---

## 🔒 Security Implementation

### Authentication

```python
# JWT token generation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Password hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)
```

### Data Validation

```python
# Pydantic models for input validation
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    username: str = Field(..., min_length=3)
    role: str = Field(..., regex="^(athlete|coach)$")

# Input sanitization
def sanitize_input(data: str) -> str:
    # Remove potentially harmful characters
    return data.strip().replace("<", "&lt;").replace(">", "&gt;")
```

### File Upload Security

```python
# File type validation
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi'}
ALLOWED_MIME_TYPES = {'video/mp4', 'video/quicktime', 'video/x-msvideo'}

def validate_video_file(file: UploadFile):
    # Check file extension and MIME type
    # Validate file size
    # Scan for malicious content
    pass
```

---

## 🚀 Deployment Guide

### Development Environment

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Frontend setup
cd frontend
npm install
npm run dev
```

### Production Deployment

#### Backend (FastAPI + Uvicorn)

```bash
# Install production dependencies
pip install uvicorn[standard] gunicorn

# Run with Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Or with Uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend (React + Vite)

```bash
# Build for production
npm run build

# Serve with nginx or similar
# Copy dist/ contents to web server directory
```

#### Docker Deployment

```dockerfile
# Dockerfile for backend
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Dockerfile for frontend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

### Environment Variables

```bash
# Backend environment
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///./app.db
UPLOAD_DIR=./videos
MAX_FILE_SIZE=100MB

# Frontend environment
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=AI Sports Talent Ecosystem
```

---

## 📈 Monitoring and Logging

### Application Logging

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Usage in code
logger.info(f"Video analysis completed for athlete {athlete_id}")
logger.error(f"Failed to process video: {error}")
```

### Performance Monitoring

```python
# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

### Error Handling

```python
# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

---

## 🧪 Testing

### Unit Tests

```python
# Backend tests
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_upload_video():
    with open("test_video.mp4", "rb") as f:
        response = client.post("/api/upload-video", files={"file": f})
    assert response.status_code == 200
    assert "sessionId" in response.json()
```

### Frontend Tests

```typescript
// React component tests
import { render, screen } from '@testing-library/react';
import AthleteDashboard from './AthleteDashboard';

test('renders athlete dashboard', () => {
  render(<AthleteDashboard />);
  expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
});
```

### Integration Tests

```python
# End-to-end testing
def test_complete_workflow():
    # 1. User registration
    # 2. Video upload
    # 3. AI analysis
    # 4. Results display
    # 5. Coach communication
    pass
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Video Upload Fails
```bash
# Check file size limits
# Verify file format support
# Check disk space
# Review error logs
```

#### 2. AI Analysis Slow
```python
# Optimize frame sampling
FRAME_SKIP = 3  # Increase for faster processing

# Reduce resolution
TARGET_WIDTH = 480  # Lower resolution

# Check system resources
# Monitor CPU and memory usage
```

#### 3. Frontend Build Issues
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check

# Verify environment variables
echo $VITE_API_BASE_URL
```

### Debug Mode

```python
# Enable debug logging
import logging
logging.getLogger().setLevel(logging.DEBUG)

# Add debug endpoints
@app.get("/debug/sessions")
async def debug_sessions():
    return {"sessions": load_all_sessions()}
```

---

## 📚 Additional Resources

### Documentation Links
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [MediaPipe Documentation](https://mediapipe.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### API Reference
- [OpenAPI Schema](http://localhost:8000/docs)
- [ReDoc Documentation](http://localhost:8000/redoc)

### Development Tools
- [Postman Collection](docs/postman_collection.json)
- [Database Schema](docs/database_schema.sql)
- [Deployment Scripts](scripts/)

---

*This technical documentation provides a comprehensive guide to understanding, developing, and maintaining the AI-Powered Sports Talent Ecosystem project.*

**For questions or contributions, please refer to the main README.md or create an issue in the repository.**
