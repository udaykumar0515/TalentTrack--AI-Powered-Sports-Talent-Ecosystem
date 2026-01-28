
import requests
import json
import sys

BASE_URL = "http://localhost:8002/api"

def test_ai_flow():
    print("--- TESTING AI TRAINING PLAN FLOW ---")
    
    # 1. Analyze Goal
    goal = "I want to improve my vertical jump for basketball"
    print(f"\n1. Sending Goal: '{goal}'...")
    
    try:
        resp = requests.post(f"{BASE_URL}/training-plans/ai/analyze-goal", json={"goal": goal})
        resp.raise_for_status()
        data = resp.json()
        print("✅ Analyze Success!")
        print(f"   Received {len(data.get('questions', []))} questions.")
        for q in data.get('questions', []):
            print(f"   - {q['text']} (Type: {q['type']})")
            
    except Exception as e:
        print(f"❌ Analyze Failed: {e}")
        if 'resp' in locals():
            print(resp.text)
        return

    # 2. Generate Plan
    print("\n2. Generating Plan (Simulating answers)...")
    # Mock answers based on what we expect or just generic ones
    answers = {
        "days_per_week": "4 days",
        "session_duration": "60 mins",
        "equipment": "Full Gym",
        "experience": "Intermediate"
    }
    
    payload = {
        "athleteId": "test_athlete_123",
        "goal": goal,
        "answers": answers
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/training-plans/ai/generate", json=payload)
        resp.raise_for_status()
        plan = resp.json()
        print("✅ Generation Success!")
        print(f"   Title: {plan.get('title')}")
        print(f"   Weeks: {len(plan.get('weekly_schedule', []))} representative days? No, weekly_schedule might be just the template.")
        print(f"   Progression: {len(plan.get('progression_plan', []))} steps.")
        
        # Check specific fields frontend needs
        if 'weekly_schedule' in plan and 'progression_plan' in plan:
            print("✅ Data Structure matches Frontend expectations.")
        else:
            print("❌ MISSING FIELDS! Frontend will break.")
            print(f"Keys found: {plan.keys()}")
            
    except Exception as e:
        print(f"❌ Generation Failed: {e}")
        if 'resp' in locals():
            print(resp.text)

if __name__ == "__main__":
    test_ai_flow()
