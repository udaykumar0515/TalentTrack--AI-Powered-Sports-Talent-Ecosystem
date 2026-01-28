
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def test_sessions():
    print("Testing GET /api/sessions...")
    try:
        response = requests.get(f"{BASE_URL}/sessions")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Got {len(data)} sessions.")
            # print sample
            if len(data) > 0:
                print("First session sample:", json.dumps(data[0], indent=2)[:200])
        else:
            print("Failed to get sessions.")
            print(response.text)
    except Exception as e:
        print(f"Error testing sessions: {e}")

def test_goals_issue():
    print("\nTesting POST /api/goals (reproducing user_id error)...")
    payload = {
        "userId": "test-user-id", # CamelCase as sent by frontend
        "title": "Test Goal",
        "type": "reps",
        "target": 100
    }
    try:
        response = requests.post(f"{BASE_URL}/goals", json=payload)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Success! Goal created.")
            print(response.json())
        else:
            print(f"Failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error testing goals: {e}")

if __name__ == "__main__":
    test_sessions()
    test_goals_issue()
