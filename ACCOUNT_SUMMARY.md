# Fresh Website Data - Account Summary

## Athletes (Password: 123456)
1. **uday** - uday@example.com (Coach: coach_mike)
2. **bhanu** - bhanu@example.com (Coach: coach_mike)  
3. **teja** - teja@example.com (Coach: coach_sarah)
4. **madhan** - madhan@example.com (Coach: coach_sarah)
5. **sai_ram** - sai_ram@example.com (Coach: coach_david)
6. **arjun** - arjun@example.com (Coach: coach_mike)
7. **priya** - priya@example.com (Coach: coach_sarah)
8. **vikram** - vikram@example.com (Coach: coach_david)
9. **kavya** - kavya@example.com (Coach: coach_mike)
10. **rakesh** - rakesh@example.com (Coach: coach_sarah)

## Coaches (Password: 000000)
1. **coach_mike** - coach_mike@example.com (Athletes: uday, bhanu, arjun, kavya)
2. **coach_sarah** - coach_sarah@example.com (Athletes: teja, madhan, priya, rakesh)
3. **coach_david** - coach_david@example.com (Athletes: sai_ram, vikram)

## Session Data
- Each athlete has 6 fake sessions with different exercises
- Sessions include: squats, pushups, jumping jacks
- Form scores range from 78-95%
- All sessions marked as "Low" risk
- Sessions span over 6 days (Jan 14-19, 2025)
- Each session includes complete metrics (reps, duration, form score, symmetry score, waist angle)
- All sessions have status "completed" and empty injury flags
- Sessions are properly linked to their assigned coaches

## Chat Messages
- 20 sample chat messages between athletes and coaches
- Messages include feedback, notes, and retest requests
- Messages are linked to specific sessions
- Mix of coach-to-athlete and athlete-to-coach messages
- Messages span across different time periods

## Data Structure
- **athletes.json**: Array of athlete objects with id, email, password, username, role, created_at, coachId, coachName
- **coaches.json**: Array of coach objects with id, email, password, username, role, created_at
- **sessions.json**: Object with athlete IDs as keys, each containing sessions array
- **coach_messages.json**: Array of message objects with coachId, athleteId, sessionId, type, message, timestamp
- **videos.json**: Empty object for video metadata

## Data Reset Complete
- All previous data cleared
- All video files removed
- All cache cleared
- Fresh start with demo data
- Proper JSON structure matching backend expectations
