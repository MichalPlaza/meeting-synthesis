import json
import ollama
import os

from .prompt_template import PROMPT_TEMPLATE
from ..models.ai_analysis import AIAnalysis

LOCAL_LLM_MODEL = "gemma2:2b"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


async def analyze_transcription(transcription: str) -> AIAnalysis:
    try:
        prompt = PROMPT_TEMPLATE.format(transcription_text=transcription)

        async_client = ollama.AsyncClient(host=OLLAMA_HOST)

        response = await async_client.chat(
            model=LOCAL_LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            format="json",
        )

        raw_content = response["message"]["content"]
        cleaned_json_str = raw_content.strip().lstrip("```json").rstrip("```").strip()
        analysis_data = json.loads(cleaned_json_str)

        return AIAnalysis(**analysis_data)

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from LLM response: {e}")
        raise ValueError(f"Failed to parse LLM response as JSON. Response: {raw_content}")
    except Exception as e:
        print(f"An unexpected error occurred during AI analysis: {e}")
        raise
