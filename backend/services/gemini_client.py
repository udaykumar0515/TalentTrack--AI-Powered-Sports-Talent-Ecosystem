
import os
import google.generativeai as genai
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables")
        else:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')

    async def generate_content(self, prompt: str) -> Optional[str]:
        """Generate content from Gemini"""
        if not self.api_key:
            logger.error("Cannot generate content: GEMINI_API_KEY not set")
            return None

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return None

    async def generate_json(self, prompt: str) -> Optional[dict]:
        """Generate valid JSON from Gemini"""
        full_prompt = f"{prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting like ```json."
        
        response_text = await self.generate_content(full_prompt)
        if not response_text:
            return None
        
        print(f"DEBUG GEMINI RAW: {response_text[:200]}...") # Debug log
        
        try:
            # Clean up potential markdown formatting
            cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Gemini: {e}")
            logger.error(f"Raw response: {response_text}")
            return None

# Global instance
gemini_client = GeminiClient()
