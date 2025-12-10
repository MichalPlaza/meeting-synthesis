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

        # Normalize LLM output - convert strings to proper objects
        analysis_data = self._normalize_analysis_data(analysis_data)

        return AIAnalysis(**analysis_data)

    @staticmethod
    def _normalize_analysis_data(data: dict) -> dict:
        """Normalize LLM output to match expected schema.

        LLMs sometimes return strings instead of objects for nested fields.
        This converts them to the expected format.
        """
        # Normalize key_topics: string -> {"topic": string, "details": null}
        if "key_topics" in data and isinstance(data["key_topics"], list):
            data["key_topics"] = [
                {"topic": item, "details": None} if isinstance(item, str) else item
                for item in data["key_topics"]
            ]

        # Normalize action_items: string -> {"description": string}
        if "action_items" in data and isinstance(data["action_items"], list):
            data["action_items"] = [
                {"description": item} if isinstance(item, str) else item
                for item in data["action_items"]
            ]

        # Normalize decisions_made: string -> {"decision": string}
        if "decisions_made" in data and isinstance(data["decisions_made"], list):
            data["decisions_made"] = [
                {"decision": item} if isinstance(item, str) else item
                for item in data["decisions_made"]
            ]

        # Normalize mentioned_dates: string -> {"date": string, "context": null}
        if "mentioned_dates" in data and isinstance(data["mentioned_dates"], list):
            data["mentioned_dates"] = [
                {"date": item, "context": None} if isinstance(item, str) else item
                for item in data["mentioned_dates"]
            ]

        return data

    @staticmethod
    def _clean_json_block(raw: str) -> str:
        """Remove markdown code block wrappers from JSON response."""
        s = raw.strip()
        if s.startswith("```"):
            # Remove opening ```json or ```
            s = s.split("```", 1)[1]
            # Remove language marker (e.g., "json\n")
            if s.startswith("json"):
                s = s[4:].lstrip()
            # Remove closing ```
            if "```" in s:
                s = s.rsplit("```", 1)[0]
        return s.strip()
