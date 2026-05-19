import sys
import os
import json

# Ensure we can import from the backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from engines.injury_alerts import injury_alert_system

print("Running bulk analysis...")
results = injury_alert_system.run_bulk_analysis()
print("Analysis complete!")
print(json.dumps(results, indent=2))
