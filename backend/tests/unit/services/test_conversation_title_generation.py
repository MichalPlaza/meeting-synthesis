"""Unit tests for conversation title generation."""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.knowledge_base_rag_service import generate_conversation_title


@pytest.mark.asyncio
class TestConversationTitleGeneration:
    """Test conversation title generation from user queries."""

    async def test_generate_title_short_query(self):
        """Test title generation for short query."""
        query = "What are our Q4 goals?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.return_value = {
                "response": "Q4 Goals Discussion"
            }
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            assert title == "Q4 Goals Discussion"
            assert len(title) <= 50
            mock_instance.generate.assert_awaited_once()

    async def test_generate_title_long_query(self):
        """Test title generation for long query."""
        query = "Can you tell me everything that was discussed in the last marketing meeting about our social media strategy and budget allocation?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.return_value = {
                "response": "Marketing Meeting: Social Media & Budget"
            }
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            assert len(title) <= 50
            assert title != query  # Should be a summary, not the full query

    async def test_generate_title_truncates_long_response(self):
        """Test that overly long generated titles are truncated."""
        query = "What are the action items?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            # Return a very long title
            mock_instance.generate.return_value = {
                "response": "This is an extremely long conversation title that exceeds fifty characters by a lot"
            }
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            assert len(title) <= 50
            assert title.endswith("...")

    async def test_generate_title_removes_quotes(self):
        """Test that quotes are removed from generated titles."""
        query = "Who attended the meeting?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.return_value = {
                "response": '"Meeting Attendees"'
            }
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            assert title == "Meeting Attendees"
            assert '"' not in title
            assert "'" not in title

    async def test_generate_title_handles_empty_response(self):
        """Test fallback when LLM returns empty response."""
        query = "What are the key decisions?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.return_value = {
                "response": ""
            }
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            # Should fallback to truncated query
            assert title == query  # Query is already short
            assert len(title) <= 50

    async def test_generate_title_handles_error(self):
        """Test fallback when LLM encounters an error."""
        query = "What were the action items from last week's standup meeting?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.side_effect = Exception("Ollama connection failed")
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            # Should fallback to truncated query
            assert len(title) <= 50
            if len(query) > 50:
                assert title.endswith("...")

    async def test_generate_title_with_special_characters(self):
        """Test title generation with special characters in query."""
        query = "What's the budget for Q4? Are we on track?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.return_value = {
                "response": "Q4 Budget & Progress"
            }
            mock_client.return_value = mock_instance
            
            title = await generate_conversation_title(query)
            
            assert title == "Q4 Budget & Progress"
            assert len(title) <= 50

    async def test_generate_title_uses_low_temperature(self):
        """Test that title generation uses appropriate LLM parameters."""
        query = "What are the meeting notes?"
        
        with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.generate.return_value = {
                "response": "Meeting Notes Review"
            }
            mock_client.return_value = mock_instance
            
            await generate_conversation_title(query)
            
            # Verify it was called with appropriate options
            call_args = mock_instance.generate.call_args
            assert call_args.kwargs["options"]["temperature"] == 0.3
            assert call_args.kwargs["options"]["num_predict"] == 20

    async def test_generate_title_different_query_types(self):
        """Test title generation for different types of queries."""
        test_cases = [
            ("Show me action items", "Action Items Overview"),
            ("Who made what decisions?", "Decision Makers Summary"),
            ("Find meetings about marketing", "Marketing Meetings Search"),
        ]
        
        for query, expected_title in test_cases:
            with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_client:
                mock_instance = AsyncMock()
                mock_instance.generate.return_value = {
                    "response": expected_title
                }
                mock_client.return_value = mock_instance
                
                title = await generate_conversation_title(query)
                
                assert title == expected_title
                assert len(title) <= 50
