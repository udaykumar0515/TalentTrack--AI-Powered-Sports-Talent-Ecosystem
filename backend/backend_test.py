"""
Backend API Testing Script
Run this script to test your backend endpoints with sample data
"""
import requests
import json
import time
import os

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health Check: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            return True
        return False
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_register():
    """Test user registration"""
    try:
        # Test athlete registration
        athlete_data = {
            "email": "test_athlete@example.com",
            "password": "password123",
            "username": "Test Athlete",
            "role": "athlete"
        }
        
        response = requests.post(f"{BASE_URL}/api/register", json=athlete_data)
        print(f"Athlete Registration: {response.status_code}")
        if response.status_code == 200:
            athlete = response.json()
            print(f"Registered athlete: {athlete['username']} (ID: {athlete['id']})")
            return athlete['id']
        else:
            print(f"Registration failed: {response.text}")
            return None
    except Exception as e:
        print(f"Registration test failed: {e}")
        return None

def test_login():
    """Test user login"""
    try:
        login_data = {
            "email": "test_athlete@example.com",
            "password": "password123"
        }
        
        response = requests.post(f"{BASE_URL}/api/login", json=login_data)
        print(f"Login: {response.status_code}")
        if response.status_code == 200:
            user = response.json()
            print(f"Logged in: {user['username']} ({user['role']})")
            return user
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login test failed: {e}")
        return None

def test_video_analysis_mock():
    """Test video analysis endpoint with mock data"""
    try:
        # Use the actual video file
        video_path = r'C:\Users\ACER\Downloads\Bodyweight Squats.mp4'
        
        # Check if file exists
        if not os.path.exists(video_path):
            print(f"❌ Video file not found: {video_path}")
            return False
        
        # Open and read the actual video file
        with open(video_path, 'rb') as video_file:
            files = {
                'file': ('Bodyweight Squats.mp4', video_file, 'video/mp4')
            }
            data = {
                'exercise': 'squat',
                'athleteId': 'test-athlete-123',
                'athleteName': 'Test Athlete'
            }
            
            response = requests.post(f"{BASE_URL}/api/analyze", files=files, data=data)
            print(f"Video Analysis (Real Video): {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Analysis result: {json.dumps(result, indent=2)}")
                return True
            else:
                print(f"Analysis failed: {response.text}")
                return False
    except Exception as e:
        print(f"Video analysis test failed: {e}")
        return False

def test_sessions():
    """Test getting user sessions"""
    try:
        response = requests.get(f"{BASE_URL}/api/user-sessions/test-athlete-123")
        print(f"Get Sessions: {response.status_code}")
        if response.status_code == 200:
            sessions = response.json()
            print(f"Sessions: {json.dumps(sessions, indent=2)}")
            return True
        else:
            print(f"Get sessions failed: {response.text}")
            return False
    except Exception as e:
        print(f"Sessions test failed: {e}")
        return False

def test_api_endpoints():
    """Test all API endpoints"""
    print("=" * 50)
    print("BACKEND API TESTING")
    print("=" * 50)
    
    # Test health
    print("\n1. Testing Health Endpoint...")
    if not test_health():
        print("❌ Server is not running or health check failed!")
        print("Make sure to run: python main.py")
        return False
    print("✅ Health check passed!")
    
    # Test registration
    print("\n2. Testing Registration...")
    athlete_id = test_register()
    if athlete_id:
        print("✅ Registration passed!")
    else:
        print("⚠️ Registration failed (might be already registered)")
    
    # Test login
    print("\n3. Testing Login...")
    user = test_login()
    if user:
        print("✅ Login passed!")
    else:
        print("❌ Login failed!")
    
    # Test video analysis (mock)
    print("\n4. Testing Video Analysis (Mock)...")
    # Note: This will fail because we don't have actual exercise_counter.py working
    # But it will test the API endpoint structure
    test_video_analysis_mock()
    
    # Test sessions
    print("\n5. Testing Sessions Endpoint...")
    test_sessions()
    
    print("\n" + "=" * 50)
    print("API TESTING COMPLETE")
    print("=" * 50)
    
    return True

if __name__ == "__main__":
    # Check if server is running
    print("Testing backend API at:", BASE_URL)
    print("Make sure the server is running with: python main.py")
    print()
    
    # Wait a moment for server to be ready
    time.sleep(1)
    
    test_api_endpoints()