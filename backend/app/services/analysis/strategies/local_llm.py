import json
import os
import logging
from typing import Any

from ....models.ai_analysis import AIAnalysis
from .base import BaseAIAnalysisStrategy

import ollama

LOGGER = logging.getLogger(__name__)

LOCAL_LLM_MODEL = "gemma2:2b"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


class LocalLLMStrategy(BaseAIAnalysisStrategy):

    async def analyze(self, prompt: str) -> AIAnalysis:
        async_client = ollama.AsyncClient(host=OLLAMA_HOST)
        try:
            response: Any = await async_client.chat(
                model=LOCAL_LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                format="json",
            )
        except Exception as e:
            LOGGER.exception("Local LLM (ollama) request failed")
            raise

        raw_content = response.get("message", {}).get("content")
        if raw_content is None:
            LOGGER.error("No content returned from local LLM: %s", response)
            raise ValueError("Empty response from local LLM")

        cleaned_json_str = self._clean_json_block(raw_content)

        try:
            analysis_data = json.loads(cleaned_json_str)
        except json.JSONDecodeError as e:
            LOGGER.exception("Error decoding JSON from local LLM response: %s", e)
            raise ValueError(f"Failed to parse LLM response as JSON. Response: {raw_content}") from e

        return AIAnalysis(**analysis_data)

    @staticmethod
    def _clean_json_block(raw: str) -> str:
        s = raw.strip()
        if s.startswith("```"):
            s = s.split("```", 1)[1]
            if "```" in s:
                s = s.rsplit("```", 1)[0]
        return s.strip()
