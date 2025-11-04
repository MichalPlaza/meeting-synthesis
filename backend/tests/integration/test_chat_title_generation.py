"""
Integration tests for Knowledge Base chat with automatic title generation.

⚠️ TRUE INTEGRATION TESTS ⚠️
These tests require full infrastructure (Ollama, MongoDB, Elasticsearch, Redis).

PHASE 3 DECISION: Keep as @pytest.mark.skip for unit test runs
RECOMMENDED: Use testcontainers for CI/CD or run manually against dev environment

To run manually: docker-compose -f docker-compose.dev.yml up
Then: poetry run pytest tests/integration/ -v --run-integration
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.mongodb_utils import get_database
from app.auth_dependencies import get_current_user
from app.models.user import User

# Skip by default - require --run-integration flag to execute
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.integration,
    pytest.mark.skip(reason="Phase 3: True integration tests - require full infrastructure. Use testcontainers or run manually with docker-compose."),
]


@pytest.fixture
def mock_user():
    """Mock authenticated user."""
    return User(
        id="507f1f77bcf86cd799439011",
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
    )


@pytest.fixture
def mock_db():
    """Mock MongoDB database."""
    db = AsyncMock()
    
    # Mock conversations collection
    db.conversations.insert_one = AsyncMock(return_value=AsyncMock(inserted_id="conv_123"))
    db.conversations.find_one = AsyncMock(return_value=None)
    db.conversations.find = AsyncMock()
    
    # Mock messages collection
    db.messages.insert_one = AsyncMock(return_value=AsyncMock(inserted_id="msg_123"))
    db.messages.find = AsyncMock()
    
    return db


@pytest.mark.asyncio
class TestChatTitleGeneration:
    """Integration tests for automatic conversation title generation."""

    async def test_chat_creates_conversation_with_generated_title(self, mock_db, mock_user):
        """Test that chat creates conversation with AI-generated title."""
        # Setup
        app.dependency_overrides[get_database] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        # Mock search results
        with patch("app.services.knowledge_base_rag_service.hybrid_search") as mock_search:
            mock_search.return_value = []  # No search results
            
            # Mock title generation
            with patch("app.services.knowledge_base_rag_service.generate_conversation_title") as mock_title:
                mock_title.return_value = "Q4 Goals Discussion"
                
                # Mock RAG response
                with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_ollama:
                    mock_client = AsyncMock()
                    mock_client.generate.return_value = {
                        "response": "Based on the available information, I don't have specific details about Q4 goals."
                    }
                    mock_ollama.return_value = mock_client
                    
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        response = await client.post(
                            "/api/v1/knowledge-base/chat",
                            json={
                                "query": "What are our Q4 goals?",
                                "conversation_id": None,  # New conversation
                            },
                            headers={"Authorization": "Bearer fake_token"}
                        )
                    
                    # Assertions
                    assert response.status_code == 200
                    mock_title.assert_awaited_once_with("What are our Q4 goals?")
                    
                    # Verify conversation was created with generated title
                    insert_call = mock_db.conversations.insert_one.call_args
                    assert insert_call is not None
                    conversation_data = insert_call[0][0]
                    assert conversation_data["title"] == "Q4 Goals Discussion"
        
        app.dependency_overrides.clear()

    async def test_chat_uses_existing_conversation_without_generating_title(self, mock_db, mock_user):
        """Test that existing conversation doesn't trigger title generation."""
        # Setup existing conversation
        existing_conv_id = "507f1f77bcf86cd799439012"
        mock_db.conversations.find_one.return_value = {
            "_id": existing_conv_id,
            "user_id": mock_user.id,
            "title": "Existing Conversation",
            "created_at": "2025-11-02T10:00:00Z",
            "updated_at": "2025-11-02T10:00:00Z",
        }
        
        app.dependency_overrides[get_database] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        with patch("app.services.knowledge_base_rag_service.hybrid_search") as mock_search:
            mock_search.return_value = []
            
            with patch("app.services.knowledge_base_rag_service.generate_conversation_title") as mock_title:
                with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_ollama:
                    mock_client = AsyncMock()
                    mock_client.generate.return_value = {"response": "Answer"}
                    mock_ollama.return_value = mock_client
                    
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        await client.post(
                            "/api/v1/knowledge-base/chat",
                            json={
                                "query": "Follow-up question",
                                "conversation_id": existing_conv_id,
                            },
                            headers={"Authorization": "Bearer fake_token"}
                        )
                    
                    # Should NOT generate a new title
                    mock_title.assert_not_awaited()
        
        app.dependency_overrides.clear()

    async def test_chat_title_generation_fallback_on_error(self, mock_db, mock_user):
        """Test that chat falls back gracefully if title generation fails."""
        app.dependency_overrides[get_database] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        query = "What were the action items from yesterday's meeting?"
        
        with patch("app.services.knowledge_base_rag_service.hybrid_search") as mock_search:
            mock_search.return_value = []
            
            # Mock title generation to raise error
            with patch("app.services.knowledge_base_rag_service.generate_conversation_title") as mock_title:
                mock_title.side_effect = Exception("Ollama connection failed")
                
                # Even with title generation error, chat should work
                with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_ollama:
                    mock_client = AsyncMock()
                    mock_client.generate.return_value = {"response": "Answer"}
                    mock_ollama.return_value = mock_client
                    
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        response = await client.post(
                            "/api/v1/knowledge-base/chat",
                            json={"query": query},
                            headers={"Authorization": "Bearer fake_token"}
                        )
                    
                    # Chat should still work (status 200)
                    assert response.status_code == 200
                    
                    # Should have created conversation with fallback title
                    insert_call = mock_db.conversations.insert_one.call_args
                    conversation_data = insert_call[0][0]
                    # Fallback should be truncated query
                    assert len(conversation_data["title"]) <= 50
        
        app.dependency_overrides.clear()

    async def test_streaming_chat_generates_title(self, mock_db, mock_user):
        """Test that streaming chat also generates conversation titles."""
        app.dependency_overrides[get_database] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        query = "Tell me about the product roadmap"
        
        with patch("app.services.knowledge_base_rag_service.hybrid_search") as mock_search:
            mock_search.return_value = []
            
            with patch("app.services.knowledge_base_rag_service.generate_conversation_title") as mock_title:
                mock_title.return_value = "Product Roadmap Discussion"
                
                with patch("app.services.knowledge_base_rag_service.ollama.AsyncClient") as mock_ollama:
                    mock_client = AsyncMock()
                    
                    mock_client.generate.return_value = {"response": "Answer"}
                    mock_ollama.return_value = mock_client
                    
                    transport = ASGITransport(app=app)
                    async with AsyncClient(transport=transport, base_url="http://test") as client:
                        await client.post(
                            "/api/v1/knowledge-base/chat-stream",
                            json={"query": query},
                            headers={"Authorization": "Bearer fake_token"}
                        )
                    
                    # Should have generated title
                    mock_title.assert_awaited_once_with(query)
        
        app.dependency_overrides.clear()
