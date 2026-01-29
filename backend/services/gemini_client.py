
import os
import json
import logging
from typing import Optional
from google import genai

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found")
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)

        # Prioritized list of models to try
        self.models_to_try = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash", 
            "gemini-1.5-flash-latest"
        ]

    async def generate_content(self, prompt: str) -> Optional[str]:
        if not self.client:
            return None

        for model in self.models_to_try:
            try:
                # logger.info(f"Attempting generation with model: {model}")
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                logger.warning(f"{model} failed: {e}")

        logger.error("All Gemini models failed")
        return None

    async def generate_json(self, prompt: str) -> Optional[dict]:
        prompt += "\nRespond ONLY with valid JSON."

        text = await self.generate_content(prompt)
        if not text:
            return None

        try:
            return json.loads(text.replace("```json", "").replace("```", "").strip())
        except Exception as e:
            logger.error(f"JSON parse error: {e}")
            return None

gemini_client = GeminiClient()
