import json
import os
import datetime
import uuid

SESSIONS_FILE = "backend/data/sessions/sessions.json"

athlete_id = "c867df8f-9cdf-4e32-a29d-379c892b220f"
athlete_name = "Udaykumar Haibathi"

new_session = {
    "sessionId": str(uuid.uuid4())[:8],
    "exercise": "squat",
    "reps": 5,
    "formScore": 85,
    "durationSec": 45.0,
    "timestamp": datetime.datetime.now().isoformat(),
    "athleteId": athlete_id,
    "athleteName": athlete_name,
    "metrics": {
        "velocity": 0.45,
        "peak_power": 1200,
        "tempo": "2-0-2",
        "rep_consistency": 0.92,
        "depth_achieved": "parallel"
    },
    "extra_metric_root_level": "Extra Value Test"
}

if os.path.exists(SESSIONS_FILE):
    with open(SESSIONS_FILE, "r") as f:
        data = json.load(f)
else:
    data = {}

if athlete_id not in data:
    data[athlete_id] = {"sessions": []}

data[athlete_id]["sessions"].append(new_session)

with open(SESSIONS_FILE, "w") as f:
    json.dump(data, f, indent=2)

print(f"Created session {new_session['sessionId']} with extra metrics.")
