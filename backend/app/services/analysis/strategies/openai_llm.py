import asyncio
import os
import json
import logging
from typing import Any

from openai import OpenAI
from app.models.ai_analysis import AIAnalysis
from .base import BaseAIAnalysisStrategy

LOGGER = logging.getLogger(__name__)

OPENAI_MODEL = "gpt-4.1-mini"


class OpenAIStrategy(BaseAIAnalysisStrategy):

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def analyze(self, prompt: str) -> AIAnalysis:
        if not prompt.strip():
            raise ValueError("Empty prompt supplied to OpenAIStrategy")

        try:
            response: Any = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}]
            )
        except Exception as e:
            LOGGER.exception("OpenAI request failed")
            raise

        raw_content = response.choices[0].message.content
        if not raw_content:
            LOGGER.error("No content returned from OpenAI: %s", response)
            raise ValueError("Empty response from OpenAI")

        cleaned_json_str = self._clean_json_block(raw_content)

        try:
            analysis_data = json.loads(cleaned_json_str)
        except json.JSONDecodeError as e:
            LOGGER.exception("Error decoding JSON from OpenAI response: %s", e)
            raise ValueError(f"Failed to parse OpenAI response as JSON. Response: {raw_content}") from e

        return AIAnalysis(**analysis_data)

    @staticmethod
    def _clean_json_block(raw: str) -> str:

        s = raw.strip()
        if s.startswith("```"):
            s = s.split("```", 1)[1]
            if "```" in s:
                s = s.rsplit("```", 1)[0]
        return s.strip()
