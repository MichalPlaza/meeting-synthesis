"""Unit tests for Knowledge Base RAG service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, UTC

from app.services.knowledge_base_rag_service import (
    build_rag_prompt,
    generate_rag_response,
    generate_rag_response_stream,
)
from app.models.knowledge_base import FilterContext
from app.services.elasticsearch_search_service import SearchResult


@pytest.mark.asyncio
class TestRAGPromptBuilder:
    """Tests for RAG prompt building."""

    def test_build_rag_prompt_basic(self):
        """Test building RAG prompt with search results."""
        query = "What were the key decisions in the sprint planning?"
        
        # Mock search results
        results = [
            SearchResult({
                "_score": 0.95,
                "_source": {
                    "meeting_id": "meeting_1",
                    "title": "Sprint Planning Q4",
                    "content": "Decided to focus on feature X and Y for Q4",
                    "content_type": "summary",
                }
            }),
            SearchResult({
                "_score": 0.85,
                "_source": {
                    "meeting_id": "meeting_2",
                    "title": "Daily Standup",
                    "content": "Team agreed on new deployment strategy",
                    "content_type": "transcription",
                }
            })
        ]
        
        prompt = build_rag_prompt(query, results)
        
        # Verify prompt structure
        assert query in prompt
        assert "Sprint Planning Q4" in prompt
        assert "Decided to focus on feature X and Y" in prompt
        assert "Daily Standup" in prompt
        assert "deployment strategy" in prompt
        assert "Context:" in prompt or "CONTEXT" in prompt

    def test_build_rag_prompt_empty_results(self):
        """Test building RAG prompt with no search results."""
        query = "What happened yesterday?"
        results = []
        
        prompt = build_rag_prompt(query, results)
        
        assert query in prompt
        assert "could not find" in prompt.lower() or "no relevant" in prompt.lower() or "not found" in prompt.lower()

    def test_build_rag_prompt_truncate_long_content(self):
        """Test that long content is truncated appropriately."""
        query = "Tell me about the meeting"
        
        # Create result with very long content
        long_content = "A" * 5000
        results = [
            SearchResult({
                "_score": 0.90,
                "_source": {
                    "meeting_id": "meeting_1",
                    "title": "Long Meeting",
                    "content": long_content,
                    "content_type": "transcription",
                }
            })
        ]
        
        prompt = build_rag_prompt(query, results, max_context_length=2000)
        
        # Prompt should not be excessively long
        assert len(prompt) < 3000
        assert query in prompt


@pytest.mark.asyncio
class TestRAGGeneration:
    """Tests for RAG response generation."""

    @patch('app.services.knowledge_base_rag_service.hybrid_search')
    @patch('app.services.knowledge_base_rag_service.ollama.AsyncClient')
    async def test_generate_rag_response_success(self, mock_ollama, mock_search):
        """Test successful RAG response generation."""
        # Mock search results
        mock_results = [
            SearchResult({
                "_score": 0.95,
                "_source": {
                    "meeting_id": "meeting_1",
                    "title": "Sprint Planning",
                    "content": "Discussed Q4 roadmap and priorities",
                    "content_type": "summary",
                }
            })
        ]
        mock_search.return_value = mock_results
        
        # Mock Ollama response
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "message": {
                "content": "Based on the Sprint Planning meeting, the team discussed Q4 roadmap."
            }
        }
        mock_ollama.return_value = mock_client
        
        # Execute
        response = await generate_rag_response(
            query="What was discussed?",
            user_id="user_123"
        )
        
        # Verify
        assert "Sprint Planning" in response or "Q4 roadmap" in response
        mock_search.assert_awaited_once()
        mock_client.chat.assert_awaited_once()

    @patch('app.services.knowledge_base_rag_service.hybrid_search')
    @patch('app.services.knowledge_base_rag_service.ollama.AsyncClient')
    async def test_generate_rag_response_with_filters(self, mock_ollama, mock_search):
        """Test RAG response with filters."""
        mock_search.return_value = []
        
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "message": {"content": "No relevant information found."}
        }
        mock_ollama.return_value = mock_client
        
        filters = FilterContext(project_ids=["proj_1"], tags=["sprint"])
        
        await generate_rag_response(
            query="What happened?",
            user_id="user_123",
            filters=filters
        )
        
        # Verify filters were passed to search
        call_args = mock_search.call_args
        assert call_args[1]["filters"] == filters

    @patch('app.services.knowledge_base_rag_service.hybrid_search')
    @patch('app.services.knowledge_base_rag_service.ollama.AsyncClient')
    async def test_generate_rag_response_no_results(self, mock_ollama, mock_search):
        """Test RAG response when no search results found."""
        mock_search.return_value = []
        
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "message": {"content": "I don't have relevant information to answer that."}
        }
        mock_ollama.return_value = mock_client
        
        response = await generate_rag_response(
            query="Nonexistent topic",
            user_id="user_123"
        )
        
        assert response is not None
        mock_search.assert_awaited_once()

    @patch('app.services.knowledge_base_rag_service.hybrid_search')
    async def test_generate_rag_response_search_error(self, mock_search):
        """Test RAG response handles search errors."""
        mock_search.side_effect = Exception("Search failed")
        
        with pytest.raises(Exception, match="Search failed"):
            await generate_rag_response(
                query="Test query",
                user_id="user_123"
            )


@pytest.mark.asyncio
class TestRAGStreaming:
    """Tests for streaming RAG responses."""

    @patch('app.services.knowledge_base_rag_service.hybrid_search')
    @patch('app.services.knowledge_base_rag_service.ollama.AsyncClient')
    async def test_generate_rag_response_stream(self, mock_ollama, mock_search):
        """Test streaming RAG response generation."""
        # Mock search results
        mock_results = [
            SearchResult({
                "_score": 0.95,
                "_source": {
                    "meeting_id": "meeting_1",
                    "title": "Test Meeting",
                    "content": "Test content",
                    "content_type": "summary",
                }
            })
        ]
        mock_search.return_value = mock_results
        
        # Mock streaming response
        async def mock_stream():
            chunks = [
                {"message": {"content": "Hello "}},
                {"message": {"content": "world"}},
                {"message": {"content": "!"}}
            ]
            for chunk in chunks:
                yield chunk
        
        mock_client = AsyncMock()
        mock_client.chat.return_value = mock_stream()
        mock_ollama.return_value = mock_client
        
        # Collect streamed chunks
        chunks = []
        async for chunk in generate_rag_response_stream(
            query="Test query",
            user_id="user_123"
        ):
            chunks.append(chunk)
        
        # Verify streaming worked
        assert len(chunks) > 0
        full_response = "".join(chunks)
        assert "Hello" in full_response
        assert "world" in full_response

    @patch('app.services.knowledge_base_rag_service.hybrid_search')
    @patch('app.services.knowledge_base_rag_service.ollama.AsyncClient')
    async def test_stream_includes_sources(self, mock_ollama, mock_search):
        """Test that stream includes source information."""
        mock_results = [
            SearchResult({
                "_score": 0.95,
                "_source": {
                    "meeting_id": "meeting_123",
                    "title": "Source Meeting",
                    "content": "Important information",
                    "content_type": "summary",
                }
            })
        ]
        mock_search.return_value = mock_results
        
        async def mock_stream():
            yield {"message": {"content": "Response based on sources"}}
        
        mock_client = AsyncMock()
        mock_client.chat.return_value = mock_stream()
        mock_ollama.return_value = mock_client
        
        chunks = []
        sources_received = []
        
        async for chunk_data in generate_rag_response_stream(
            query="Test query",
            user_id="user_123",
            include_sources=True
        ):
            if isinstance(chunk_data, dict):
                if "content" in chunk_data:
                    chunks.append(chunk_data["content"])
                if "sources" in chunk_data:
                    sources_received = chunk_data["sources"]
        
        # Verify sources were included
        assert len(sources_received) > 0
        assert sources_received[0]["meeting_id"] == "meeting_123"
