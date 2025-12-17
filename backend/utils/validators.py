"""
Input validation utilities for the TalentTrack API
"""

import re
from fastapi import HTTPException

# Exercise name mapping
EXERCISE_MAPPING = {
    "squat": "squat",
    "pushup": "pushups",
    "pushups": "pushups", 
    "jumping_jack": "jumping_jacks",
    "jumping_jacks": "jumping_jacks"
}

def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filename"""
    # Remove path separators and dangerous chars
    safe = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
    # Remove leading/trailing dots and spaces
    safe = safe.strip('. ')
    # Limit length
    return safe[:100]

def validate_exercise_name(exercise: str) -> str:
    """Validate and normalize exercise name"""
    clean = exercise.lower().strip()
    if clean not in EXERCISE_MAPPING:
        raise HTTPException(400, f"Invalid exercise. Must be one of: {list(EXERCISE_MAPPING.keys())}")
    return EXERCISE_MAPPING[clean]

def validate_email(email: str) -> str:
    """Basic email validation"""
    email = email.strip().lower()
    # Simple regex for email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(400, "Invalid email format")
    if len(email) > 254:  # RFC 5321
        raise HTTPException(400, "Email too long")
    return email

def validate_username(username: str) -> str:
    """Validate username"""
    username = username.strip()
    if len(username) < 2:
        raise HTTPException(400, "Username must be at least 2 characters")
    if len(username) > 50:
        raise HTTPException(400, "Username too long (max 50 characters)")
    # Allow alphanumeric, spaces, dots, underscores, hyphens
    if not re.match(r'^[a-zA-Z0-9 ._-]+$', username):
        raise HTTPException(400, "Username contains invalid characters")
    return username

def validate_password(password: str) -> None:
    """Validate password strength"""
    if len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if len(password) > 128:
        raise HTTPException(400, "Password too long (max 128 characters)")
    # At least one number or special character for basic security
    if not re.search(r'[0-9!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(400, "Password must contain at least one number or special character")
