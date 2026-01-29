
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found.")
    exit(1)

genai.configure(api_key=api_key)

MODELS_TO_TEST = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-2.0-flash-lite-001",
    "gemini-flash-latest",
    "gemini-pro"
]

print("--- Testing Models Live Generation ---")
for model_name in MODELS_TO_TEST:
    print(f"\nTesting: {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        print(f"✅ SUCCESS! Response: {response.text[:20]}")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    time.sleep(1) # Backoff slightly
