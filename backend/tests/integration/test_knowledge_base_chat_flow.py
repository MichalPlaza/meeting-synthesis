"""
Integration tests for Knowledge Base chat flow with sources, filtering, and streaming.

⚠️  REQUIRES FULL DEV ENVIRONMENT ⚠️
These tests require Elasticsearch and Ollama running.
Start with: docker-compose -f docker-compose.dev.yml up

To run ONLY unit tests (no integration):
    poetry run pytest tests/unit/ -v
    
To run with integration tests (requires dev environment):
    poetry run pytest tests/ -v
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock
from bson import ObjectId

# Mark all tests in this file as integration tests requiring full stack
pytestmark = [pytest.mark.asyncio, pytest.mark.integration]


@pytest.mark.asyncio
class TestKnowledgeBaseChatFlow:
    """Test complete chat flow from request to response with sources."""

    async def test_chat_with_sources_complete_flow(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test complete chat flow that returns answer with sources."""
        # Mock conversation creation
        conversation_id = str(ObjectId())
        
        # Mock hybrid_search to return results
        mock_search_results = [
            {
                "_source": {
                    "meeting_id": str(ObjectId()),
                    "meeting_title": "Team Standup",
                    "content": "Discussed project timeline and milestones",
                    "content_type": "transcription",
                    "timestamp": "2025-11-01T10:00:00Z",
                },
                "_score": 0.95,
            }
        ]
        
        # Mock Ollama response
        mock_ollama_response = "Based on the meeting, the project timeline was discussed with key milestones identified."
        
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_search.return_value = mock_search_results
                
                # Setup Ollama mock
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value={
                    "message": {"content": mock_ollama_response}
                })
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                # Send chat message
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "What was discussed in the last meeting?",
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "conversation_id" in data
        assert "message" in data
        assert "sources" in data
        
        # Verify message content
        assert data["message"]["role"] == "assistant"
        assert data["message"]["content"] == mock_ollama_response
        
        # Verify sources
        assert len(data["sources"]) > 0
        source = data["sources"][0]
        assert source["meeting_id"] is not None
        assert source["meeting_title"] == "Team Standup"
        assert source["content_type"] == "transcription"
        assert "relevance_score" in source

    async def test_chat_with_filters_applied(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test chat with project and tag filters applied."""
        project_id = str(ObjectId())
        
        mock_search_results = [
            {
                "_source": {
                    "meeting_id": str(ObjectId()),
                    "meeting_title": "Filtered Meeting",
                    "content": "Project-specific content",
                    "content_type": "summary",
                    "project_id": project_id,
                },
                "_score": 0.88,
            }
        ]
        
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_search.return_value = mock_search_results
                
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value={
                    "message": {"content": "Here's the filtered information."}
                })
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                # Send chat with filters
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "Tell me about project updates",
                        "filters": {
                            "project_ids": [project_id],
                            "tags": ["sprint-planning"],
                            "start_date": "2025-10-01T00:00:00Z",
                            "end_date": "2025-11-01T00:00:00Z",
                        },
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify search was called with filters
        mock_search.assert_awaited_once()
        call_kwargs = mock_search.call_args.kwargs
        assert "filters" in call_kwargs
        assert call_kwargs["filters"]["project_ids"] == [project_id]
        assert call_kwargs["filters"]["tags"] == ["sprint-planning"]

    async def test_streaming_chat_flow(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test streaming chat returns SSE events with content and sources."""
        mock_search_results = [
            {
                "_source": {
                    "meeting_id": str(ObjectId()),
                    "meeting_title": "Design Review",
                    "content": "UI/UX improvements discussed",
                    "content_type": "key_topic",
                },
                "_score": 0.92,
            }
        ]
        
        # Mock streaming response from Ollama
        async def mock_stream():
            chunks = ["Design ", "improvements ", "were ", "discussed."]
            for chunk in chunks:
                yield {"message": {"content": chunk}}
        
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_search.return_value = mock_search_results
                
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value=mock_stream())
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                # Send streaming chat
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "What design changes were made?",
                        "stream": True,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        # Verify SSE stream contains expected events
        content = response.text
        assert "data: " in content
        assert "'type': 'content'" in content or '"type": "content"' in content

    async def test_chat_creates_conversation_if_missing(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test chat creates new conversation when conversation_id not provided."""
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_search.return_value = []
                
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value={
                    "message": {"content": "I don't have specific information about that."}
                })
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                # Send chat without conversation_id
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "First message",
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify conversation was created
        assert "conversation_id" in data
        assert data["conversation_id"] is not None

    async def test_chat_with_no_sources_found(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test chat handles case when no sources are found."""
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                # Return empty search results
                mock_search.return_value = []
                
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value={
                    "message": {"content": "I don't have information about that in the meeting records."}
                })
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "Tell me about quantum physics",
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid response, just no sources
        assert "sources" in data
        assert len(data["sources"]) == 0

    async def test_chat_with_multiple_content_types(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test chat retrieves sources from different content types."""
        mock_search_results = [
            {
                "_source": {
                    "meeting_id": str(ObjectId()),
                    "meeting_title": "Sprint Planning",
                    "content": "We discussed the sprint goals",
                    "content_type": "summary",
                },
                "_score": 0.95,
            },
            {
                "_source": {
                    "meeting_id": str(ObjectId()),
                    "meeting_title": "Sprint Planning",
                    "content": "Action: Complete user stories",
                    "content_type": "action_item",
                },
                "_score": 0.90,
            },
            {
                "_source": {
                    "meeting_id": str(ObjectId()),
                    "meeting_title": "Sprint Planning",
                    "content": "Decision: Use React for frontend",
                    "content_type": "decision",
                },
                "_score": 0.85,
            },
        ]
        
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_search.return_value = mock_search_results
                
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value={
                    "message": {"content": "Sprint goals, action items, and decisions were documented."}
                })
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "What happened in sprint planning?",
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify different content types in sources
        sources = data["sources"]
        assert len(sources) == 3
        
        content_types = {s["content_type"] for s in sources}
        assert "summary" in content_types
        assert "action_item" in content_types
        assert "decision" in content_types

    async def test_conversation_title_auto_generation(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test that conversation title is automatically generated."""
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock) as mock_search:
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_search.return_value = []
                
                mock_ollama_instance = AsyncMock()
                
                # Mock both chat calls (RAG and title generation)
                mock_ollama_instance.chat = AsyncMock(side_effect=[
                    {"message": {"content": "Here's the answer to your question."}},
                    {"message": {"content": "Project Timeline Discussion"}},
                ])
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                response = await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "What's the status of the project timeline?",
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify Ollama was called twice (once for RAG, once for title)
        assert mock_ollama_instance.chat.call_count == 2


@pytest.mark.asyncio
class TestConversationManagement:
    """Test conversation CRUD operations."""

    async def test_create_conversation(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test creating a new conversation."""
        response = await client.post(
            "/api/v1/knowledge-base/conversations",
            json={"title": "My Custom Title"},
            headers=auth_headers,
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["title"] == "My Custom Title"
        assert "id" in data
        assert "created_at" in data
        assert data["message_count"] == 0

    async def test_list_conversations(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test listing user conversations."""
        # Create a few conversations first
        for i in range(3):
            await client.post(
                "/api/v1/knowledge-base/conversations",
                json={"title": f"Conversation {i}"},
                headers=auth_headers,
            )
        
        response = await client.get(
            "/api/v1/knowledge-base/conversations",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 3

    async def test_get_conversation_messages(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test retrieving messages from a conversation."""
        # Create conversation and send message
        conv_response = await client.post(
            "/api/v1/knowledge-base/conversations",
            headers=auth_headers,
        )
        conversation_id = conv_response.json()["id"]
        
        with patch("app.services.elasticsearch_search_service.hybrid_search", new_callable=AsyncMock):
            with patch("app.services.knowledge_base_rag_service.AsyncClient") as mock_ollama:
                mock_ollama_instance = AsyncMock()
                mock_ollama_instance.chat = AsyncMock(return_value={
                    "message": {"content": "Test response"}
                })
                mock_ollama.return_value.__aenter__.return_value = mock_ollama_instance
                
                await client.post(
                    "/api/v1/knowledge-base/chat",
                    json={
                        "message": "Test message",
                        "conversation_id": conversation_id,
                        "stream": False,
                    },
                    headers=auth_headers,
                )
        
        # Get messages
        response = await client.get(
            f"/api/v1/knowledge-base/conversations/{conversation_id}/messages",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        messages = response.json()
        
        assert len(messages) >= 2  # User message + assistant message
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"

    async def test_delete_conversation(self, client: AsyncClient, auth_headers: dict, db_mock):
        """Test deleting a conversation."""
        # Create conversation
        conv_response = await client.post(
            "/api/v1/knowledge-base/conversations",
            headers=auth_headers,
        )
        conversation_id = conv_response.json()["id"]
        
        # Delete it
        response = await client.delete(
            f"/api/v1/knowledge-base/conversations/{conversation_id}",
            headers=auth_headers,
        )
        
        assert response.status_code == 204
        
        # Verify it's gone
        get_response = await client.get(
            f"/api/v1/knowledge-base/conversations/{conversation_id}/messages",
            headers=auth_headers,
        )
        assert get_response.status_code == 404
