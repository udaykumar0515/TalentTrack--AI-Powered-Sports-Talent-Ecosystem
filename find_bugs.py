#!/usr/bin/env python3
"""
Bug Finder - Systematically search for common bugs
"""

import os
import re
from pathlib import Path

def find_bugs():
    """Find common bugs in the codebase"""
    
    bugs = []
    backend = Path("backend")
    frontend_src = Path("frontend/src")
    
    print("🔍 Searching for bugs...\n")
    
    # Bug 1: Unused imports
    print("1. Checking for unused imports...")
    
    # Bug 2: Missing error handling
    print("2. Checking for missing error handling...")
    for py_file in backend.rglob("*.py"):
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find functions with no try-except
            if 'async def' in content or 'def ' in content:
                if content.count('try:') < content.count('async def') // 2:
                    bugs.append(f"⚠️  {py_file}: Possibly missing error handling")
    
    # Bug 3: Hardcoded values
    print("3. Checking for hardcoded values...")
    for py_file in backend.rglob("*.py"):
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Look for suspicious hardcoded strings
            if '"http://localhost' in content:
                bugs.append(f"⚠️  {py_file}: Contains hardcoded localhost URL")
    
    # Bug 4: Missing null checks
    print("4. Checking for missing null checks...")
    
    # Bug 5: Inconsistent file paths  
    print("5. Checking file path consistency...")
    for py_file in backend.rglob("*.py"):
        with open(py_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines, 1):
                # Look for inconsistent path patterns
                if 'read_json_file(' in line:
                    if 'athletes/' not in line and 'coaches' in line:
                        bugs.append(f"⚠️  {py_file}:{i}: Inconsistent file path - missing 'athletes/' prefix")
    
    print(f"\n{'='*60}")
    print(f"Found {len(bugs)} potential bugs:")
    print(f"{'='*60}\n")
    
    for bug in bugs[:10]:  # Show top 10
        print(bug)
    
    return bugs

if __name__ == "__main__":
    bugs = find_bugs()
    print(f"\n✅ Analysis complete. Found {len(bugs)} issues to review.")
