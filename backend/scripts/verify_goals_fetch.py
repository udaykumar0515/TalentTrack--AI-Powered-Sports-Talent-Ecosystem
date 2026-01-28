
import requests
import json

BASE_URL = "http://localhost:8000/api"
USER_ID = "c867df8f-9cdf-4e32-a29d-379c892b220f" # The known ID

def test_fetch_goals():
    print(f"Fetching goals for {USER_ID}...")
    try:
        response = requests.get(f"{BASE_URL}/goals/{USER_ID}")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Data type: {type(data)}")
            if isinstance(data, list):
                print("Success! Data is a list.")
                print(f"Count: {len(data)}")
            else:
                print("FAIL! Data is not a list.")
                print(data)
        else:
            print("Failed.")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_fetch_goals()
