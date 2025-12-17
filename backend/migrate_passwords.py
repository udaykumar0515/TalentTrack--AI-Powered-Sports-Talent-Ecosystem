#!/usr/bin/env python3
"""
Password Migration Script
Migrates existing plain-text passwords to bcrypt hashed passwords
Run this ONCE after implementing password hashing
"""

import json
import bcrypt
import os
from pathlib import Path

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def is_hashed(password: str) -> bool:
    """Check if password is already hashed (bcrypt starts with $2b$)"""
    return password.startswith('$2b$') or password.startswith('$2a$')

def migrate_users_file(filepath: Path):
    """Migrate passwords in a user JSON file"""
    if not filepath.exists():
        print(f"�� File not found: {filepath}")
        return 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            users = json.load(f)
        
        if not isinstance(users, list):
            print(f"⚠️ {filepath} is not a list")
            return 0
        
        migrated = 0
        for user in users:
            if 'password' in user and not is_hashed(user['password']):
                user['password'] = hash_password(user['password'])
                migrated += 1
                print(f"✅ Migrated: {user.get('email', 'unknown')}")
        
        if migrated > 0:
            # Create backup
            backup_path = filepath.with_suffix('.json.backup')
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(users, f, indent=2)
            print(f"📦 Backup created: {backup_path}")
            
            # Save migrated data
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(users, f, indent=2)
            
            return migrated
        else:
            print(f"ℹ️  No migration needed for {filepath}")
            return 0
            
    except Exception as e:
        print(f"❌ Error migrating {filepath}: {e}")
        return 0

if __name__ == "__main__":
    print("🔐 Password Migration Script")
    print("=" * 50)
    
    # Paths to user files
    data_dir = Path("data")
    athlete_file = data_dir / "athletes" / "athletes.json"
    coach_file = data_dir / "athletes" / "coaches.json"
    
    total_migrated = 0
    
    print("\n📁 Migrating Athletes...")
    total_migrated += migrate_users_file(athlete_file)
    
    print("\n📁 Migrating Coaches...")
    total_migrated += migrate_users_file(coach_file)
    
    print("\n" + "=" * 50)
    print(f"✅ Migration complete! {total_migrated} passwords hashed.")
    print("⚠️  NOTE: Old passwords backed up with .backup extension")
    print("🔒 All new registrations will use hashed passwords")
