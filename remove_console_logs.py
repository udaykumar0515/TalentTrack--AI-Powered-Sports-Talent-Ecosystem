#!/usr/bin/env python3
"""
Batch remove all console.log statements from frontend files
Keeps console.error for error reporting
"""

import re
import os
from pathlib import Path

# Patterns to remove
PATTERNS_TO_REMOVE = [
    r"console\.log\([^)]*\);?\s*",
   r"console\.warn\([^)]*\);?\s*",
    r"console\.info\([^)]*\);?\s*",
    r"console\.debug\([^)]*\);?\s*",
]

# Keep console.error - it's important
# Pattern for catching console.log in .catch(console.log)
CATCH_PATTERN = r"\.catch\(console\.log\)"
CATCH_REPLACEMENT = ".catch((e) => console.error('Error:', e))"

frontend_src = Path("frontend/src")

def remove_console_logs(file_path):
    """Remove console.logs from a file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Replace .catch(console.log) first
    content = re.sub(CATCH_PATTERN, CATCH_REPLACEMENT, content)
    
    # Remove other console statements
    for pattern in PATTERNS_TO_REMOVE:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    # Clean up multiple blank lines
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

if __name__ == "__main__":
    count = 0
    for tsx_file in frontend_src.rglob("*.tsx"):
        if remove_console_logs(tsx_file):
            print(f"Cleaned: {tsx_file}")
            count += 1
    
    for ts_file in frontend_src.rglob("*.ts"):
        if "node_modules" not in str(ts_file):
            if remove_console_logs(ts_file):
                print(f"Cleaned: {ts_file}")
                count += 1
    
    print(f"\n✅ Removed console.logs from {count} files")
