
import requests
import json
import uuid
from datetime import datetime
import sys

BASE_URL = "http://localhost:8000/api"

def test_goal_automation():
    # 1. Register/Login a test user
    user_email = f"test_goal_{uuid.uuid4().hex[:8]}@example.com"
    user_id = None
    
    print(f"Creating user: {user_email}")
    reg_response = requests.post(f"{BASE_URL}/register", json={
        "email": user_email,
        "password": "password123",
        "username": "GoalTester",
        "role": "athlete",
        "age": 25,
        "gender": "male"
    })
    
    if reg_response.status_code == 200:
        user_id = reg_response.json()["id"]
    else:
        # Try login
        login_response = requests.post(f"{BASE_URL}/login", json={
            "email": user_email,
            "password": "password123"
        })
        if login_response.status_code == 200:
            user_id = login_response.json()["id"]
        else:
            print("Failed to auth")
            return

    # 2. Create a 'Sessions Completed' Goal
    print("Creating 'Sessions Completed' Goal...")
    goal_data = {
        "user_id": user_id,
        "title": "Consistency Validation",
        "type": "sessions_completed",
        "target": 10,
        "unit": "sessions",
        "priority": "high",
        "description": "Test goal for automation"
    }
    
    goal_response = requests.post(f"{BASE_URL}/goals", json=goal_data)
    if goal_response.status_code != 200:
        print(f"Failed to create goal: {goal_response.text}")
        return
    
    goal_id = goal_response.json()["id"]
    print(f"Goal Created: {goal_id} (Current: 0)")

    # 3. Simulate a Session (Directly saving a session via analyze outcome or direct save if possible)
    # Since we can't easily upload a video in this script without a file, 
    # we'll look for an endpoint that triggers the 'session saved' logic.
    # But wait, logic is in 'analyze_video'. Ideally we upload a dummy video.
    # Alternatively, we can assume the 'update_user_goals_progress' function is what we need to test.
    # But for e2e, let's try to verify via the endpoint usage.
    
    # Actually, simpler: let's inspect the code fix first, validation later.
    # If I know I need to change code, I should just do it.
    pass

if __name__ == "__main__":
    test_goal_automation()
