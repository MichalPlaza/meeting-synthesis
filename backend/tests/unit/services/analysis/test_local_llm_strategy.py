"""Unit tests for LocalLLMStrategy - Ollama-based AI analysis."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.services.analysis.strategies.local_llm import LocalLLMStrategy
from app.models.ai_analysis import AIAnalysis


@pytest.mark.asyncio
class TestLocalLLMStrategy:
    """Tests for LocalLLMStrategy using Ollama."""

    async def test_analyze_success_with_clean_json(self):
        """Test successful analysis with clean JSON response."""
        # Arrange
        strategy = LocalLLMStrategy()
        prompt = "Analyze this meeting transcription"
        
        mock_analysis_data = {
            "summary": "Test meeting summary",
            "key_topics": [
                {"topic": "Project Planning", "details": "Discussed Q4 roadmap"},
                {"topic": "Budget", "details": "Approved new budget"}
            ],
            "action_items": [
                {"description": "Complete documentation", "assigned_to": "John", "due_date": "2025-11-10"}
            ],
            "decisions_made": [
                {"description": "Approved new feature"}
            ],
            "mentioned_dates": [
                {"text_mention": "next Monday", "parsed_date": "2025-11-04T00:00:00"}
            ]
        }
        
        mock_response = {
            "message": {
                "content": json.dumps(mock_analysis_data)
            }
        }
        
        # Act
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await strategy.analyze(prompt)
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Test meeting summary"
        assert len(result.key_topics) == 2
        assert result.key_topics[0].topic == "Project Planning"
        assert len(result.action_items) == 1
        assert result.action_items[0].description == "Complete documentation"
        mock_client.chat.assert_awaited_once()

    async def test_analyze_success_with_json_code_block(self):
        """Test successful analysis when JSON is wrapped in markdown code block."""
        # Arrange
        strategy = LocalLLMStrategy()
        prompt = "Analyze this"
        
        mock_analysis_data = {
            "summary": "Test summary",
            "key_topics": [],
            "action_items": [],
            "decisions_made": [],
            "mentioned_dates": []
        }
        
        # Response wrapped in markdown code block
        mock_response = {
            "message": {
                "content": f"```json\n{json.dumps(mock_analysis_data)}\n```"
            }
        }
        
        # Act
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await strategy.analyze(prompt)
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Test summary"

    async def test_analyze_success_with_plain_code_block(self):
        """Test successful analysis when JSON is in plain code block (no language)."""
        # Arrange
        strategy = LocalLLMStrategy()
        
        mock_analysis_data = {
            "summary": "Test",
            "key_topics": [],
            "action_items": [],
            "decisions_made": [],
            "mentioned_dates": []
        }
        
        mock_response = {
            "message": {
                "content": f"```\n{json.dumps(mock_analysis_data)}\n```"
            }
        }
        
        # Act
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await strategy.analyze("prompt")
        
        # Assert
        assert result.summary == "Test"

    async def test_analyze_invalid_json_raises_error(self):
        """Test that invalid JSON raises ValueError."""
        # Arrange
        strategy = LocalLLMStrategy()
        
        mock_response = {
            "message": {
                "content": "This is not valid JSON"
            }
        }
        
        # Act & Assert
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            with pytest.raises(ValueError) as exc_info:
                await strategy.analyze("prompt")
            
            assert "Failed to parse LLM response as JSON" in str(exc_info.value)

    async def test_analyze_empty_response_raises_error(self):
        """Test that empty response raises ValueError."""
        # Arrange
        strategy = LocalLLMStrategy()
        
        mock_response = {
            "message": {
                "content": None
            }
        }
        
        # Act & Assert
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            with pytest.raises(ValueError) as exc_info:
                await strategy.analyze("prompt")
            
            assert "Empty response from local LLM" in str(exc_info.value)

    async def test_analyze_missing_message_key_raises_error(self):
        """Test that response without 'message' key raises ValueError."""
        # Arrange
        strategy = LocalLLMStrategy()
        
        mock_response = {
            "no_message_key": "data"
        }
        
        # Act & Assert
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            with pytest.raises(ValueError) as exc_info:
                await strategy.analyze("prompt")
            
            assert "Empty response from local LLM" in str(exc_info.value)

    async def test_analyze_ollama_connection_error_propagates(self):
        """Test that Ollama connection errors are propagated."""
        # Arrange
        strategy = LocalLLMStrategy()
        
        # Act & Assert
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.side_effect = ConnectionError("Cannot connect to Ollama")
            mock_client_class.return_value = mock_client
            
            with pytest.raises(ConnectionError) as exc_info:
                await strategy.analyze("prompt")
            
            assert "Cannot connect to Ollama" in str(exc_info.value)

    async def test_analyze_calls_ollama_with_correct_params(self):
        """Test that analyze calls Ollama with correct parameters."""
        # Arrange
        strategy = LocalLLMStrategy()
        prompt = "Test prompt for analysis"
        
        mock_response = {
            "message": {
                "content": json.dumps({
                    "summary": "Test",
                    "key_topics": [],
                    "action_items": [],
                    "decisions_made": [],
                    "mentioned_dates": []
                })
            }
        }
        
        # Act
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            await strategy.analyze(prompt)
            
            # Assert
            mock_client.chat.assert_awaited_once_with(
                model="gemma2:2b",  # Default model from local_llm.py
                messages=[{"role": "user", "content": prompt}],
                format="json"
            )

    async def test_analyze_incomplete_json_fields(self):
        """Test that AIAnalysis handles incomplete JSON fields gracefully."""
        # Arrange
        strategy = LocalLLMStrategy()
        
        # Minimal valid JSON (AIAnalysis model should handle missing optional fields)
        mock_analysis_data = {
            "summary": "Only summary provided"
            # Missing: key_topics, action_items, decisions_made, mentioned_dates
        }
        
        mock_response = {
            "message": {
                "content": json.dumps(mock_analysis_data)
            }
        }
        
        # Act
        with patch("app.services.analysis.strategies.local_llm.ollama.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.chat.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await strategy.analyze("prompt")
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Only summary provided"

    async def test_clean_json_block_with_triple_backticks(self):
        """Test _clean_json_block static method with triple backticks."""
        # Arrange
        json_content = '{"key": "value"}'
        wrapped_content = f"```json\n{json_content}\n```"
        
        # Act
        cleaned = LocalLLMStrategy._clean_json_block(wrapped_content)
        
        # Assert
        assert cleaned == json_content

    async def test_clean_json_block_without_backticks(self):
        """Test _clean_json_block with plain JSON (no backticks)."""
        # Arrange
        json_content = '{"key": "value"}'
        
        # Act
        cleaned = LocalLLMStrategy._clean_json_block(json_content)
        
        # Assert
        assert cleaned == json_content

    async def test_clean_json_block_with_whitespace(self):
        """Test _clean_json_block strips whitespace."""
        # Arrange
        json_content = '  {"key": "value"}  '
        
        # Act
        cleaned = LocalLLMStrategy._clean_json_block(json_content)
        
        # Assert
        assert cleaned == '{"key": "value"}'

    async def test_clean_json_block_with_nested_backticks(self):
        """Test _clean_json_block handles nested/multiple backticks."""
        # Arrange
        json_content = '{"code": "```example```"}'
        wrapped = f"```\n{json_content}\n```"
        
        # Act
        cleaned = LocalLLMStrategy._clean_json_block(wrapped)
        
        # Assert
        assert cleaned == json_content
