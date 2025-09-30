import json
from unittest.mock import patch, AsyncMock

import pytest

from app.models.ai_analysis import AIAnalysis
from app.services import ai_analysis_service
from app.services.prompt_template import PROMPT_TEMPLATE

PROMPT_OUTPUT = {
    "summary": "This is a test summary",
    "key_topics": [
        {"topic": "point1", "details": "some details"},
        {"topic": "point2", "details": None},
    ],
    "action_items": [
        {"description": "Do something", "assigned_to": "user1", "due_date": "2025-09-30", "user_comment": None}
    ],
    "decisions_made": [
        {"description": "Decision A"}
    ],
    "mentioned_dates": [
        {"text_mention": "tomorrow", "parsed_date": "2025-10-01T00:00:00"}
    ]
}

MOCK_RESPONSE = {
    "message": {
        "content": f"```json{json.dumps(PROMPT_OUTPUT)}```"
    }
}


@pytest.mark.asyncio
class TestAIAnalysisService:

    async def test_analyze_transcription_happy(self):
        transcription_text = "Some transcription text"

        with patch("app.services.ai_analysis_service.ollama.AsyncClient") as mock_client_class:
            mock_client_instance = AsyncMock()
            mock_client_instance.chat.return_value = MOCK_RESPONSE
            mock_client_class.return_value = mock_client_instance

            analysis: AIAnalysis = await ai_analysis_service.analyze_transcription(transcription_text)

            assert isinstance(analysis, AIAnalysis)
            assert analysis.summary == PROMPT_OUTPUT["summary"]
            assert analysis.key_topics[0].topic == PROMPT_OUTPUT["key_topics"][0]["topic"]
            assert analysis.key_topics[1].topic == PROMPT_OUTPUT["key_topics"][1]["topic"]
            assert analysis.action_items[0].description == PROMPT_OUTPUT["action_items"][0]["description"]
            assert analysis.decisions_made[0].description == PROMPT_OUTPUT["decisions_made"][0]["description"]
            assert analysis.mentioned_dates[0].text_mention == PROMPT_OUTPUT["mentioned_dates"][0]["text_mention"]

    async def test_analyze_transcription_invalid_json(self):
        transcription_text = "Bad transcription"

        with patch("app.services.ai_analysis_service.ollama.AsyncClient") as mock_client_class:
            mock_client_instance = AsyncMock()
            mock_client_instance.chat.return_value = {"message": {"content": "not json"}}
            mock_client_class.return_value = mock_client_instance

            with pytest.raises(ValueError):
                await ai_analysis_service.analyze_transcription(transcription_text)

    async def test_analyze_transcription_unexpected_exception(self):
        transcription_text = "Exception transcription"

        with patch("app.services.ai_analysis_service.ollama.AsyncClient") as mock_client_class:
            mock_client_instance = AsyncMock()
            mock_client_instance.chat.side_effect = Exception("LLM service down")
            mock_client_class.return_value = mock_client_instance

            with pytest.raises(Exception):
                await ai_analysis_service.analyze_transcription(transcription_text)

    async def test_analyze_transcription_prompt_formatting(self):
        transcription_text = "Check formatting"

        with patch("app.services.ai_analysis_service.ollama.AsyncClient") as mock_client_class:
            mock_client_instance = AsyncMock()
            mock_client_instance.chat.return_value = MOCK_RESPONSE
            mock_client_class.return_value = mock_client_instance

            analysis: AIAnalysis = await ai_analysis_service.analyze_transcription(transcription_text)

            expected_prompt = PROMPT_TEMPLATE.format(transcription_text=transcription_text)
            mock_client_instance.chat.assert_awaited_with(
                model=ai_analysis_service.LOCAL_LLM_MODEL,
                messages=[{"role": "user", "content": expected_prompt}],
                format="json",
            )

    async def test_analyze_transcription_missing_fields(self):
        transcription_text = "Missing fields test"

        incomplete_output = {
            "summary": "Summary only"
        }
        mock_response = {"message": {"content": f"```json{json.dumps(incomplete_output)}```"}}

        with patch("app.services.ai_analysis_service.ollama.AsyncClient") as mock_client_class:
            mock_client_instance = AsyncMock()
            mock_client_instance.chat.return_value = mock_response
            mock_client_class.return_value = mock_client_instance

            analysis = await ai_analysis_service.analyze_transcription(transcription_text)

            assert analysis.summary == "Summary only"
            assert analysis.key_topics == []
            assert analysis.action_items == []
            assert analysis.decisions_made == []
            assert analysis.mentioned_dates == []
