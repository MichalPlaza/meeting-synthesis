"""Unit tests for OpenAIStrategy - OpenAI-based AI analysis."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.services.analysis.strategies.openai_llm import OpenAIStrategy
from app.models.ai_analysis import AIAnalysis


@pytest.mark.asyncio
class TestOpenAIStrategy:
    """Tests for OpenAIStrategy using OpenAI API."""

    async def test_analyze_success_with_clean_json(self):
        """Test successful analysis with clean JSON response from OpenAI."""
        # Arrange
        mock_analysis_data = {
            "summary": "Meeting about Q4 planning",
            "key_topics": [
                {"topic": "Budget", "details": "Discussed budget allocation"}
            ],
            "action_items": [
                {"description": "Prepare report", "assigned_to": "Alice", "due_date": "2025-11-15"}
            ],
            "decisions_made": [
                {"description": "Approved new hiring"}
            ],
            "mentioned_dates": []
        }
        
        # Mock OpenAI response structure
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_analysis_data)
        
        # Act
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                
                # Mock the synchronous completion.create to return our response
                mock_client.chat.completions.create.return_value = mock_response
                
                strategy = OpenAIStrategy()
                result = await strategy.analyze("Test prompt")
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Meeting about Q4 planning"
        assert len(result.key_topics) == 1
        assert result.key_topics[0].topic == "Budget"
        assert len(result.action_items) == 1

    async def test_analyze_success_with_json_code_block(self):
        """Test successful analysis when JSON is wrapped in markdown code block."""
        # Arrange
        mock_analysis_data = {
            "summary": "Test summary",
            "key_topics": [],
            "action_items": [],
            "decisions_made": [],
            "mentioned_dates": []
        }
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = f"```json\n{json.dumps(mock_analysis_data)}\n```"
        
        # Act
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                mock_client.chat.completions.create.return_value = mock_response
                
                strategy = OpenAIStrategy()
                result = await strategy.analyze("Test prompt")
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Test summary"

    async def test_analyze_empty_prompt_raises_error(self):
        """Test that empty prompt raises ValueError."""
        # Act & Assert
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI"):
                strategy = OpenAIStrategy()
                
                with pytest.raises(ValueError) as exc_info:
                    await strategy.analyze("")
                
                assert "Empty prompt supplied to OpenAIStrategy" in str(exc_info.value)

    async def test_analyze_whitespace_only_prompt_raises_error(self):
        """Test that whitespace-only prompt raises ValueError."""
        # Act & Assert
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI"):
                strategy = OpenAIStrategy()
                
                with pytest.raises(ValueError) as exc_info:
                    await strategy.analyze("   \n\t  ")
                
                assert "Empty prompt supplied to OpenAIStrategy" in str(exc_info.value)

    async def test_analyze_invalid_json_raises_error(self):
        """Test that invalid JSON raises ValueError."""
        # Arrange
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "This is not valid JSON"
        
        # Act & Assert
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                mock_client.chat.completions.create.return_value = mock_response
                
                strategy = OpenAIStrategy()
                
                with pytest.raises(ValueError) as exc_info:
                    await strategy.analyze("prompt")
                
                assert "Failed to parse OpenAI response as JSON" in str(exc_info.value)

    async def test_analyze_empty_response_raises_error(self):
        """Test that empty response raises ValueError."""
        # Arrange
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = None
        
        # Act & Assert
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                mock_client.chat.completions.create.return_value = mock_response
                
                strategy = OpenAIStrategy()
                
                with pytest.raises(ValueError) as exc_info:
                    await strategy.analyze("prompt")
                
                assert "Empty response from OpenAI" in str(exc_info.value)

    async def test_analyze_openai_api_error_propagates(self):
        """Test that OpenAI API errors are propagated."""
        # Act & Assert
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                mock_client.chat.completions.create.side_effect = Exception("OpenAI API Error")
                
                strategy = OpenAIStrategy()
                
                with pytest.raises(Exception) as exc_info:
                    await strategy.analyze("prompt")
                
                assert "OpenAI API Error" in str(exc_info.value)

    async def test_analyze_calls_openai_with_correct_params(self):
        """Test that analyze calls OpenAI with correct parameters."""
        # Arrange
        prompt = "Analyze this meeting transcription"
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "summary": "Test",
            "key_topics": [],
            "action_items": [],
            "decisions_made": [],
            "mentioned_dates": []
        })
        
        # Act
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                mock_client.chat.completions.create.return_value = mock_response
                
                strategy = OpenAIStrategy()
                await strategy.analyze(prompt)
                
                # Assert
                mock_client.chat.completions.create.assert_called_once_with(
                    model="gpt-4.1-mini",  # Default model from openai_llm.py
                    messages=[{"role": "user", "content": prompt}]
                )

    async def test_analyze_uses_asyncio_to_thread(self):
        """Test that analyze properly uses asyncio.to_thread for sync OpenAI call."""
        # Arrange
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "summary": "Test",
            "key_topics": [],
            "action_items": [],
            "decisions_made": [],
            "mentioned_dates": []
        })
        
        # Act
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                with patch("app.services.analysis.strategies.openai_llm.asyncio.to_thread") as mock_to_thread:
                    mock_client = MagicMock()
                    mock_openai_class.return_value = mock_client
                    mock_to_thread.return_value = mock_response
                    
                    strategy = OpenAIStrategy()
                    result = await strategy.analyze("prompt")
                    
                    # Assert
                    mock_to_thread.assert_awaited_once()
                    assert isinstance(result, AIAnalysis)

    async def test_constructor_initializes_client_with_api_key(self):
        """Test that constructor initializes OpenAI client with API key from env."""
        # Act
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'my-secret-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                strategy = OpenAIStrategy()
                
                # Assert
                mock_openai_class.assert_called_once_with(api_key='my-secret-key')
                assert strategy.client is not None

    async def test_clean_json_block_with_triple_backticks(self):
        """Test _clean_json_block static method with triple backticks."""
        # Arrange
        json_content = '{"key": "value"}'
        wrapped_content = f"```json\n{json_content}\n```"
        
        # Act
        cleaned = OpenAIStrategy._clean_json_block(wrapped_content)
        
        # Assert
        assert cleaned == json_content

    async def test_clean_json_block_without_backticks(self):
        """Test _clean_json_block with plain JSON (no backticks)."""
        # Arrange
        json_content = '{"key": "value"}'
        
        # Act
        cleaned = OpenAIStrategy._clean_json_block(json_content)
        
        # Assert
        assert cleaned == json_content

    async def test_clean_json_block_with_whitespace(self):
        """Test _clean_json_block strips whitespace."""
        # Arrange
        json_content = '  {"key": "value"}  '
        
        # Act
        cleaned = OpenAIStrategy._clean_json_block(json_content)
        
        # Assert
        assert cleaned == '{"key": "value"}'

    async def test_analyze_handles_complex_ai_analysis_structure(self):
        """Test that analyze handles complex AIAnalysis with all fields."""
        # Arrange
        mock_analysis_data = {
            "summary": "Comprehensive meeting summary",
            "key_topics": [
                {"topic": "Topic 1", "details": "Details 1"},
                {"topic": "Topic 2", "details": "Details 2"},
                {"topic": "Topic 3", "details": None}
            ],
            "action_items": [
                {"description": "Task 1", "assigned_to": "Person A", "due_date": "2025-11-20"},
                {"description": "Task 2", "assigned_to": None, "due_date": None}
            ],
            "decisions_made": [
                {"description": "Decision 1"},
                {"description": "Decision 2"}
            ],
            "mentioned_dates": [
                {"text_mention": "tomorrow", "parsed_date": "2025-11-03T00:00:00"},
                {"text_mention": "next week", "parsed_date": "2025-11-09T00:00:00"}
            ]
        }
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(mock_analysis_data)
        
        # Act
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            with patch("app.services.analysis.strategies.openai_llm.OpenAI") as mock_openai_class:
                mock_client = MagicMock()
                mock_openai_class.return_value = mock_client
                mock_client.chat.completions.create.return_value = mock_response
                
                strategy = OpenAIStrategy()
                result = await strategy.analyze("prompt")
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Comprehensive meeting summary"
        assert len(result.key_topics) == 3
        assert len(result.action_items) == 2
        assert len(result.decisions_made) == 2
        assert len(result.mentioned_dates) == 2
