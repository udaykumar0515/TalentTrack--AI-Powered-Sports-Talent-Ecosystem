
import json
import os
import shutil
import tempfile
from engines.goal_setting import GoalSettingEngine, GoalType

def test_goal_automation_logic():
    # Setup temporary test environment
    temp_dir = tempfile.mkdtemp()
    test_goals_file = os.path.join(temp_dir, "test_goals.json")
    
    try:
        # Initialize engine with test file
        engine = GoalSettingEngine(goals_file=test_goals_file)
        user_id = "test_user_123"
        
        # 1. Create a "Sessions Completed" Goal (Target: 3)
        print("Creating Goal...")
        goal_data = {
            "title": "Consistency Check",
            "type": GoalType.SESSIONS_COMPLETED.value,
            "target": 3,
            "priority": "high"
        }
        goal = engine.create_goal(user_id, goal_data)
        goal_id = goal["id"]
        print(f"Goal Created: ID={goal_id}, Current={goal['current']}, Target={goal['target']}")
        
        # 2. Simulate Session 1
        print("\n--- Simulating Session 1 ---")
        session_data = {"reps": 10, "durationSec": 60, "formScore": 90}
        updated = engine.update_goals_from_session(user_id, session_data)
        
        # Reload to verify
        user_goals = engine.get_user_goals(user_id)
        current_goal = next(g for g in user_goals if g["id"] == goal_id)
        print(f"Goal Status: Current={current_goal['current']}, Progress={current_goal['progress_percentage']}%")
        
        assert current_goal["current"] == 1
        assert current_goal["progress_percentage"] == 33.33
        assert len(updated) == 1
        
        # 3. Simulate Session 2
        print("\n--- Simulating Session 2 ---")
        engine.update_goals_from_session(user_id, session_data)
        user_goals = engine.get_user_goals(user_id)
        current_goal = next(g for g in user_goals if g["id"] == goal_id)
        print(f"Goal Status: Current={current_goal['current']}")
        assert current_goal["current"] == 2
        
        # 4. Simulate Session 3 (Completion)
        print("\n--- Simulating Session 3 ---")
        engine.update_goals_from_session(user_id, session_data)
        user_goals = engine.get_user_goals(user_id)
        current_goal = next(g for g in user_goals if g["id"] == goal_id)
        print(f"Goal Status: Current={current_goal['current']}, Status={current_goal['status']}")
        
        assert current_goal["current"] == 3
        assert current_goal["status"] == "completed"
        assert "completed_at" in current_goal
        
        print("\n✅ SUCCESS: Goal automation logic verified!")
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    test_goal_automation_logic()
